/**
 * POST /api/insights
 * Generates AI-powered insights from campaign + CRM data using Claude.
 *
 * Body: { campaigns: DailyMetric[], adSets?: AdSetMetric[], crmStats?: CrmStats, range?: DateRange }
 * Returns: { success: boolean, insights: AiInsight[] }
 *
 * Required env var:
 *   ANTHROPIC_API_KEY — from console.anthropic.com
 */
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth, getProjectId, getTenantId } from '@/lib/apiAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { cacheGet, cacheSet } from '@/lib/cache';
import type { DailyMetric, AdSetMetric, DateRange } from '@/types';

export interface AiInsight {
  id:          string;
  type:        'warning' | 'opportunity' | 'success' | 'info';
  title:       string;
  description: string;
  metric?:     string;
  value?:      string;
  change?:     string;
  action?:     string;
  campaigns?:  string[];
  priority:    'high' | 'medium' | 'low';
}

interface InsightsRequest {
  campaigns:  DailyMetric[];
  adSets?:    AdSetMetric[];
  range?:     DateRange;
  crmStats?: {
    leads_total:      number;
    tasa_cierre:      number;
    pipeline_total:   number;
    leads_sin_actividad: number;
    ciclo_promedio_dias: number;
  };
}

// ─── Helper: aggregate campaign data for the prompt ───────────────────────────
function summarizeCampaigns(campaigns: DailyMetric[]) {
  const byId: Record<string, {
    name: string; platform: string;
    spent: number; results: number; impressions: number;
    clicks: number; cpr: number; days: number;
  }> = {};

  for (const c of campaigns) {
    if (!byId[c.campaign_id]) {
      byId[c.campaign_id] = {
        name: c.campaign_name, platform: c.platform,
        spent: 0, results: 0, impressions: 0, clicks: 0, cpr: 0, days: 0,
      };
    }
    const e = byId[c.campaign_id];
    e.spent       += c.spent;
    e.results     += c.results;
    e.impressions += c.impressions;
    e.clicks      += c.clicks;
    e.days++;
  }

  return Object.values(byId).map((e) => ({
    ...e,
    cpr: e.results > 0 ? Math.round(e.spent / e.results) : 0,
    ctr: e.impressions > 0 ? ((e.clicks / e.impressions) * 100).toFixed(2) : '0',
  }));
}

function buildPrompt(data: InsightsRequest): string {
  const campaignSummaries = summarizeCampaigns(data.campaigns || []);
  const totalSpent   = campaignSummaries.reduce((s, c) => s + c.spent,   0);
  const totalResults = campaignSummaries.reduce((s, c) => s + c.results, 0);
  const avgCpr       = totalResults > 0 ? Math.round(totalSpent / totalResults) : 0;

  const campaignLines = campaignSummaries
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 8)
    .map((c) =>
      `- ${c.name} (${c.platform}): $${c.spent.toLocaleString()} gastado, ${c.results} resultados, CPR $${c.cpr.toLocaleString()}, CTR ${c.ctr}%`
    )
    .join('\n');

  const crmSection = data.crmStats
    ? `\nCRM Pipeline:
- Leads totales: ${data.crmStats.leads_total}
- Tasa de cierre: ${data.crmStats.tasa_cierre}%
- Pipeline total: $${data.crmStats.pipeline_total.toLocaleString()} COP
- Leads sin actividad +48h: ${data.crmStats.leads_sin_actividad}
- Ciclo promedio de venta: ${data.crmStats.ciclo_promedio_dias} días`
    : '';

  return `Eres un analista experto en publicidad digital y ventas para el mercado latinoamericano.

Analiza estos datos del dashboard de publicidad de los últimos ${data.range || '30d'} y genera entre 4 y 6 insights accionables en español.

Métricas globales:
- Inversión total: $${totalSpent.toLocaleString()} COP
- Resultados totales: ${totalResults}
- Costo por resultado promedio: $${avgCpr.toLocaleString()} COP
- Campañas activas: ${campaignSummaries.length}
${crmSection}

Desglose por campaña:
${campaignLines || 'Sin datos de campaña disponibles'}

Genera un JSON con el siguiente formato exacto (sin markdown, solo el JSON):
{
  "insights": [
    {
      "id": "unique-id",
      "type": "warning|opportunity|success|info",
      "title": "Título corto y claro",
      "description": "Explicación de 1-2 oraciones con contexto de negocio",
      "metric": "nombre de la métrica principal (opcional)",
      "value": "valor actual (opcional)",
      "change": "cambio observado (opcional)",
      "action": "Acción concreta recomendada (opcional)",
      "campaigns": ["nombre campaña si aplica"],
      "priority": "high|medium|low"
    }
  ]
}

Reglas:
- Máximo 6 insights, mínimo 4
- Prioriza anomalías, oportunidades de optimización y alertas de rendimiento
- Usa pesos colombianos (COP) en ejemplos de valor
- Sé específico con nombres de campañas cuando sea relevante
- "priority: high" solo para alertas críticas (CPR muy alto, leads sin atender)`;
}

// ─── POST /api/insights ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Rate limit: 20 per hour per IP (insight generation is expensive)
  const ip = getClientIp(req);
  const rl = checkRateLimit(`insights:${ip}`, 20, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: 'Demasiadas solicitudes. Espera un momento.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  // Auth check (optional — if no auth configured, allow)
  const session  = requireAuth(req);
  const tenantId = getTenantId(req);

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'ANTHROPIC_API_KEY no configurado.' },
      { status: 503 }
    );
  }

  const body: InsightsRequest = await req.json().catch(() => ({ campaigns: [] }));
  if (!body.campaigns?.length) {
    return NextResponse.json(
      { success: false, error: 'Se requieren datos de campaña.' },
      { status: 400 }
    );
  }

  // Cache per tenant + range (insights are expensive — 10 min TTL)
  const projectId = getProjectId(req);
  const cacheKey  = `insights:t${tenantId}:p${projectId}:${body.range || '30d'}`;
  const cached    = await cacheGet<{ success: boolean; insights: AiInsight[] }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { 'X-Cache': 'HIT' } });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model:      'claude-haiku-4-5',   // fast + cheap for structured data analysis
      max_tokens: 2048,
      messages: [
        { role: 'user', content: buildPrompt(body) },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text block in response');
    }

    // Extract JSON — Claude may wrap in markdown fences
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');

    const parsed = JSON.parse(jsonMatch[0]) as { insights: AiInsight[] };
    if (!Array.isArray(parsed.insights)) throw new Error('Invalid insights format');

    // Assign stable IDs if missing
    parsed.insights = parsed.insights.map((ins, i) => ({
      ...ins,
      id: ins.id || `insight-${i}-${Date.now()}`,
    }));

    const result = { success: true, insights: parsed.insights };
    await cacheSet(cacheKey, result, 10 * 60); // 10 min TTL

    return NextResponse.json(result, { headers: { 'X-Cache': 'MISS' } });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[/api/insights] Error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
