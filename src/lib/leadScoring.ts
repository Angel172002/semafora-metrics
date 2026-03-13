/**
 * leadScoring.ts — Motor de puntuación de leads
 *
 * Calcula un score de 0–100 basado en señales de actividad, tiempo en pipeline,
 * completitud del perfil y señales económicas. También estima la probabilidad
 * de cierre (0–100%).
 */

import type { CrmLead, CrmActivity } from '@/types';

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export type ScoreLabel = 'frio' | 'tibio' | 'caliente' | 'listo';

export interface LeadScore {
  score: number;           // 0-100
  label: ScoreLabel;       // frio | tibio | caliente | listo
  closeProbability: number; // 0-100 (%)
  breakdown: ScoreBreakdown;
  recommendation: string;
}

export interface ScoreBreakdown {
  actividadReciente: number;   // -30 a +15
  cantidadActividades: number; // 0 a +25
  calidadActividades: number;  // 0 a +20
  progresoPipeline: number;    // 0 a +20
  senalesEconomicas: number;   // 0 a +15
  completitudPerfil: number;   // 0 a +5
  penalizaciones: number;      // 0 a -30
}

// ─── Constantes ────────────────────────────────────────────────────────────────

/** Puntos por etapa del pipeline (1-7) */
const STAGE_POINTS: Record<number, number> = {
  1: 2,   // Agendamiento Tenida
  2: 5,   // Agendamiento Cerrada
  3: 10,  // Reunión de Cierre Agendada
  4: 15,  // Reunión de Cierre Tenida
  5: 10,  // Negocio Pendiente (duda = no sube tanto)
  6: 20,  // Cliente Pagó ← ganado
  7: 0,   // Negocio Perdido
};

/** Factor de probabilidad de cierre por etapa (0-1) */
const STAGE_CLOSE_FACTOR: Record<number, number> = {
  1: 0.10,
  2: 0.20,
  3: 0.35,
  4: 0.55,
  5: 0.45,
  6: 1.00,
  7: 0.00,
};

/** Puntos por tipo de actividad */
const ACTIVITY_TYPE_POINTS: Record<string, number> = {
  'Reunión':              10,
  'Envío de Propuesta':    8,
  'WhatsApp':              3,
  'Llamada':               2,
};

/** Puntos por resultado de actividad */
const ACTIVITY_RESULT_POINTS: Record<string, number> = {
  'Cerrado':              15,
  'Interesado':            8,
  'Propuesta enviada':     6,
  'Contactó':              2,
  'No contestó':          -2,
  'No interesado':        -5,
};

// ─── Utilidades ────────────────────────────────────────────────────────────────

function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 999;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 999;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function labelFromScore(score: number): ScoreLabel {
  if (score >= 86) return 'listo';
  if (score >= 61) return 'caliente';
  if (score >= 31) return 'tibio';
  return 'frio';
}

function recommendationForLabel(label: ScoreLabel, lead: CrmLead): string {
  const name = lead.Nombre?.split(' ')[0] ?? 'el lead';
  switch (label) {
    case 'listo':
      return `${name} está listo para cerrar. Programa una reunión de firma esta semana.`;
    case 'caliente':
      return `${name} tiene alto interés. Envía propuesta formal y haz seguimiento en 24h.`;
    case 'tibio':
      return `${name} necesita más nutrición. Agenda una reunión y comparte casos de éxito.`;
    case 'frio':
      return `${name} muestra poca actividad. Intenta reactivar con una oferta especial o archiva.`;
  }
}

// ─── Motor principal ───────────────────────────────────────────────────────────

/**
 * Quick inline score — solo usa datos del lead (sin actividades).
 * Útil para el Kanban (evita N llamadas API por tarjeta).
 * Rango: 0-100.
 */
export function calculateQuickScore(lead: CrmLead): { score: number; label: ScoreLabel; closeProbability: number } {
  let score = 0;

  // Recencia de contacto
  const dias = daysSince(lead.Fecha_Ultimo_Contacto);
  if (dias <= 1)        score += 15;
  else if (dias <= 3)   score += 10;
  else if (dias <= 7)   score += 5;
  else if (dias <= 14)  score += 0;
  else if (dias <= 30)  score -= 10;
  else                  score -= 20;

  // Cantidad de actividades (si está en el computed field)
  const acts = lead.activity_count ?? 0;
  score += clamp(acts * 5, 0, 25);

  // Pipeline
  score += STAGE_POINTS[lead.Stage_Id ?? 1] ?? 0;

  // Señales económicas
  if ((lead.Valor_Estimado ?? 0) > 0)  score += 5;
  if ((lead.Precio_Plan   ?? 0) > 0)   score += 5;
  if ((lead.Plan_Separe   ?? 0) > 0)   score += 3;
  if (lead.Comprobante)                 score += 5;

  // Penalizaciones
  if (lead.Estado === 'perdido') score -= 30;
  const diasPipeline = daysSince(lead.Fecha_Creacion);
  if (diasPipeline > 90) score -= 15;
  else if (diasPipeline > 45) score -= 8;

  const clamped = clamp(Math.round(score), 0, 100);
  const stageFactor = STAGE_CLOSE_FACTOR[lead.Stage_Id ?? 1] ?? 0.1;
  const closeProbability = clamp(Math.round((stageFactor * 0.6 + (clamped / 100) * 0.4) * 100), 0, 100);

  return { score: clamped, label: labelFromScore(clamped), closeProbability };
}

export function calculateLeadScore(
  lead: CrmLead,
  activities: CrmActivity[],
): LeadScore {
  const breakdown: ScoreBreakdown = {
    actividadReciente:   0,
    cantidadActividades: 0,
    calidadActividades:  0,
    progresoPipeline:    0,
    senalesEconomicas:   0,
    completitudPerfil:   0,
    penalizaciones:      0,
  };

  // 1. Actividad reciente (basado en Fecha_Ultimo_Contacto)
  const diasSinContacto = daysSince(lead.Fecha_Ultimo_Contacto);
  if (diasSinContacto <= 1)       breakdown.actividadReciente = 15;
  else if (diasSinContacto <= 3)  breakdown.actividadReciente = 10;
  else if (diasSinContacto <= 7)  breakdown.actividadReciente = 5;
  else if (diasSinContacto <= 14) breakdown.actividadReciente = 0;
  else if (diasSinContacto <= 30) breakdown.actividadReciente = -10;
  else                            breakdown.actividadReciente = -20;

  // 2. Cantidad de actividades (max +25)
  const totalActivities = activities.length;
  breakdown.cantidadActividades = clamp(totalActivities * 5, 0, 25);

  // 3. Calidad de actividades (tipo + resultado, max +20)
  let qualityPoints = 0;
  for (const act of activities) {
    qualityPoints += ACTIVITY_TYPE_POINTS[act.Tipo] ?? 1;
    qualityPoints += ACTIVITY_RESULT_POINTS[act.Resultado] ?? 0;
  }
  breakdown.calidadActividades = clamp(qualityPoints, 0, 20);

  // 4. Progreso en el pipeline (0 a +20)
  const stageId = lead.Stage_Id ?? 1;
  breakdown.progresoPipeline = STAGE_POINTS[stageId] ?? 0;

  // 5. Señales económicas (max +15)
  let econ = 0;
  if (lead.Valor_Estimado && lead.Valor_Estimado > 0) econ += 5;
  if (lead.Precio_Plan     && lead.Precio_Plan > 0)   econ += 5;
  if (lead.Plan_Separe     && lead.Plan_Separe > 0)   econ += 3;
  if (lead.Comprobante)                                econ += 2;
  breakdown.senalesEconomicas = clamp(econ, 0, 15);

  // 6. Completitud del perfil (max +5)
  let profile = 0;
  if (lead.Email)   profile += 1;
  if (lead.Telefono) profile += 1;
  if (lead.Empresa)  profile += 1;
  if (lead.Ciudad)   profile += 1;
  if (lead.Origen)   profile += 1;
  breakdown.completitudPerfil = profile;

  // 7. Penalizaciones
  let penalties = 0;
  const diasEnPipeline = daysSince(lead.Fecha_Creacion);
  if (diasEnPipeline > 90) penalties -= 15;
  else if (diasEnPipeline > 45) penalties -= 8;

  if (lead.Estado === 'perdido') penalties -= 30;
  breakdown.penalizaciones = penalties;

  // Score total (clamped 0-100)
  const rawScore =
    breakdown.actividadReciente +
    breakdown.cantidadActividades +
    breakdown.calidadActividades +
    breakdown.progresoPipeline +
    breakdown.senalesEconomicas +
    breakdown.completitudPerfil +
    breakdown.penalizaciones;

  const score = clamp(Math.round(rawScore), 0, 100);
  const label = labelFromScore(score);

  // Probabilidad de cierre: ponderación entre score y factor de etapa
  const stageFactor = STAGE_CLOSE_FACTOR[stageId] ?? 0.1;
  const scoreFactor = score / 100;
  const closeProbability = Math.round(
    (stageFactor * 0.6 + scoreFactor * 0.4) * 100
  );

  return {
    score,
    label,
    closeProbability: clamp(closeProbability, 0, 100),
    breakdown,
    recommendation: recommendationForLabel(label, lead),
  };
}
