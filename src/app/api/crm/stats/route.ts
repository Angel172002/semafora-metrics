import { NextRequest, NextResponse } from 'next/server';
import { listAllRows } from '@/lib/nocodb';
import { getProjectId, getTenantId } from '@/lib/apiAuth';
import { cacheGet, cacheSet, CacheKeys, CacheTTL } from '@/lib/cache';
import type { CrmLead, CrmStats, AsesorStats, StageStats } from '@/types';

const TABLE = process.env.NOCODB_TABLE_CRM_LEADS || '';

export async function GET(req: NextRequest) {
  const PROJECT  = getProjectId(req);
  const tenantId = getTenantId(req);

  if (!TABLE) {
    return NextResponse.json({ success: false, data: null, error: 'CRM Leads table not configured.' }, { status: 503 });
  }

  // ── Cache check ──────────────────────────────────────────────────────────
  const cacheKey = CacheKeys.crmStats(tenantId);
  const cached   = await cacheGet<{ success: boolean; data: CrmStats }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { 'X-Cache': 'HIT' } });
  }

  try {
    const leads = await listAllRows<CrmLead>(PROJECT, TABLE);
    const now   = new Date();

    // Date helpers
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const abiertos  = leads.filter((l) => l.Estado === 'abierto');
    const ganados   = leads.filter((l) => l.Estado === 'ganado');
    const perdidos  = leads.filter((l) => l.Estado === 'perdido');

    const leadsEstaSemana = leads.filter((l) => {
      const d = l.Fecha_Creacion ? new Date(l.Fecha_Creacion) : null;
      return d && d >= startOfWeek;
    }).length;

    const revenueMes = ganados
      .filter((l) => {
        const d = l.Fecha_Cierre ? new Date(l.Fecha_Cierre) : null;
        return d && d >= startOfMonth;
      })
      .reduce((s, l) => s + (Number(l.Valor_Estimado) || 0), 0);

    const pipelineTotal = abiertos.reduce((s, l) => s + (Number(l.Valor_Estimado) || 0), 0);

    const totalCierres = ganados.length + perdidos.length;
    const tasaCierre   = totalCierres > 0 ? Math.round((ganados.length / totalCierres) * 100) : 0;

    const ticketPromedio = ganados.length > 0
      ? Math.round(ganados.reduce((s, l) => s + (Number(l.Valor_Estimado) || 0), 0) / ganados.length)
      : 0;

    const leadsSinActividad = abiertos.filter((l) => {
      const last = l.Fecha_Ultimo_Contacto
        ? new Date(l.Fecha_Ultimo_Contacto)
        : l.Fecha_Creacion
        ? new Date(l.Fecha_Creacion)
        : now;
      return (now.getTime() - last.getTime()) / 3600000 > 48;
    }).length;

    // Average sales cycle (creation → close for won leads)
    const ciclos = ganados
      .filter((l) => l.Fecha_Creacion && l.Fecha_Cierre)
      .map((l) => {
        const ms = new Date(l.Fecha_Cierre).getTime() - new Date(l.Fecha_Creacion).getTime();
        return Math.max(0, Math.floor(ms / 86400000));
      });
    const cicloPromedio = ciclos.length > 0
      ? Math.round(ciclos.reduce((a, b) => a + b, 0) / ciclos.length)
      : 0;

    // Forecast = pipeline value × tasa de cierre histórica
    const forecast = Math.round(pipelineTotal * (tasaCierre / 100));

    // ─── Ranking de asesores ───────────────────────────────────────────────
    const asesorMap = new Map<number, AsesorStats>();

    for (const lead of leads) {
      if (!lead.Usuario_Id) continue;
      if (!asesorMap.has(lead.Usuario_Id)) {
        asesorMap.set(lead.Usuario_Id, {
          id: lead.Usuario_Id,
          nombre: lead.Usuario_Nombre || `Asesor ${lead.Usuario_Id}`,
          activos: 0,
          ganados: 0,
          perdidos: 0,
          revenue: 0,
          tasa_cierre: 0,
        });
      }
      const a = asesorMap.get(lead.Usuario_Id)!;
      if (lead.Estado === 'abierto')  a.activos++;
      if (lead.Estado === 'ganado')  { a.ganados++; a.revenue += Number(lead.Valor_Estimado) || 0; }
      if (lead.Estado === 'perdido')   a.perdidos++;
    }

    const rankingAsesores: AsesorStats[] = [...asesorMap.values()].map((a) => {
      const tot = a.ganados + a.perdidos;
      return { ...a, tasa_cierre: tot > 0 ? Math.round((a.ganados / tot) * 100) : 0 };
    }).sort((a, b) => b.revenue - a.revenue);

    // ─── Distribución por etapa (leads abiertos) ──────────────────────────
    const stageMap = new Map<number, StageStats>();

    for (const lead of abiertos) {
      if (!lead.Stage_Id) continue;
      if (!stageMap.has(lead.Stage_Id)) {
        stageMap.set(lead.Stage_Id, {
          id: lead.Stage_Id,
          nombre: lead.Stage_Nombre || `Etapa ${lead.Stage_Id}`,
          color: lead.Stage_Color || '#6366f1',
          count: 0,
          valor_total: 0,
        });
      }
      const s = stageMap.get(lead.Stage_Id)!;
      s.count++;
      s.valor_total += Number(lead.Valor_Estimado) || 0;
    }

    const distribucionEtapas: StageStats[] = [...stageMap.values()]
      .sort((a, b) => b.valor_total - a.valor_total);

    const stats: CrmStats = {
      leads_total:          leads.length,
      leads_abiertos:       abiertos.length,
      leads_ganados:        ganados.length,
      leads_perdidos:       perdidos.length,
      leads_esta_semana:    leadsEstaSemana,
      pipeline_total:       pipelineTotal,
      revenue_ganado_mes:   revenueMes,
      tasa_cierre:          tasaCierre,
      ticket_promedio:      ticketPromedio,
      leads_sin_actividad:  leadsSinActividad,
      ciclo_promedio_dias:  cicloPromedio,
      forecast,
      ranking_asesores:     rankingAsesores,
      distribucion_etapas:  distribucionEtapas,
    };

    const response = { success: true, data: stats };
    await cacheSet(cacheKey, response, CacheTTL.CRM_STATS);
    return NextResponse.json(response, { headers: { 'X-Cache': 'MISS' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, data: null, error: msg }, { status: 500 });
  }
}
