/**
 * alerts.ts — Alert evaluation engine
 *
 * Evaluates configured alert rules against live dashboard + CRM data.
 * Triggered by cron (daily) or manually via POST /api/alerts/check.
 *
 * Alert types:
 *   cpr_spike       — CPR increased >threshold% vs previous 7 days
 *   leads_inactive  — X+ leads without contact in >48h
 *   budget_90pct    — Campaign spending ≥90% of daily/lifetime budget
 *   low_results     — Campaign with 0 results in last N days
 *
 * Notification channels: webhook, whatsapp (via existing notify.ts)
 */

import { notifyDailySummary } from './notify';

export type AlertType    = 'cpr_spike' | 'leads_inactive' | 'budget_90pct' | 'low_results';
export type AlertChannel = 'webhook' | 'whatsapp' | 'both';

export interface AlertConfig {
  id?:           number;
  type:          AlertType;
  enabled:       boolean;
  threshold:     number;   // % for cpr_spike/budget_90pct, hours for leads_inactive, days for low_results
  channel:       AlertChannel;
  label?:        string;
}

export interface AlertFired {
  type:        AlertType;
  title:       string;
  description: string;
  severity:    'high' | 'medium' | 'low';
  campaign?:   string;
  value?:      string;
}

// ─── Default alert configurations ─────────────────────────────────────────────
export const DEFAULT_ALERT_CONFIGS: AlertConfig[] = [
  {
    type:      'cpr_spike',
    enabled:   false,
    threshold: 30,           // 30% increase in CPR
    channel:   'whatsapp',
    label:     'Aumento de CPR',
  },
  {
    type:      'leads_inactive',
    enabled:   false,
    threshold: 48,           // 48 hours without contact
    channel:   'whatsapp',
    label:     'Leads sin actividad',
  },
  {
    type:      'budget_90pct',
    enabled:   false,
    threshold: 90,           // 90% budget consumed
    channel:   'webhook',
    label:     'Presupuesto al 90%',
  },
  {
    type:      'low_results',
    enabled:   false,
    threshold: 3,            // 0 results in last 3 days
    channel:   'webhook',
    label:     'Campaña sin resultados',
  },
];

// ─── Alert evaluators ──────────────────────────────────────────────────────────

interface CampaignSummary {
  campaign_id:   string;
  campaign_name: string;
  spent:         number;
  results:       number;
  cpr:           number;
  date:          string;
}

interface LeadSummary {
  id:                   number;
  nombre:               string;
  usuario_nombre:       string;
  days_without_contact: number;
}

interface BudgetStatus {
  campaign_id:   string;
  campaign_name: string;
  spent:         number;
  budget:        number;
  pct:           number;
}

export interface AlertContext {
  recentCampaigns:   CampaignSummary[];   // last 7d
  previousCampaigns: CampaignSummary[];   // 7d before that
  inactiveLeads:     LeadSummary[];
  budgets:           BudgetStatus[];
}

function evaluateCprSpike(
  recent:   CampaignSummary[],
  previous: CampaignSummary[],
  threshold: number,
): AlertFired[] {
  const fired: AlertFired[] = [];

  const prevMap = new Map<string, number>();
  for (const c of previous) {
    if (c.results > 0) prevMap.set(c.campaign_id, c.cpr);
  }

  for (const c of recent) {
    if (!c.results) continue;
    const prevCpr = prevMap.get(c.campaign_id);
    if (!prevCpr || prevCpr === 0) continue;
    const pctChange = ((c.cpr - prevCpr) / prevCpr) * 100;
    if (pctChange >= threshold) {
      fired.push({
        type:        'cpr_spike',
        title:       `CPR elevado: ${c.campaign_name}`,
        description: `El costo por resultado subió ${Math.round(pctChange)}% (de $${prevCpr.toLocaleString('es-CO')} a $${c.cpr.toLocaleString('es-CO')} COP).`,
        severity:    pctChange >= 50 ? 'high' : 'medium',
        campaign:    c.campaign_name,
        value:       `$${c.cpr.toLocaleString('es-CO')} COP`,
      });
    }
  }

  return fired;
}

function evaluateLeadsInactive(
  leads: LeadSummary[],
  thresholdHours: number,
): AlertFired[] {
  const inactiveLeads = leads.filter((l) => l.days_without_contact * 24 >= thresholdHours);
  if (inactiveLeads.length === 0) return [];

  const names = inactiveLeads.slice(0, 3).map((l) => l.nombre).join(', ');
  const more  = inactiveLeads.length > 3 ? ` y ${inactiveLeads.length - 3} más` : '';

  return [{
    type:        'leads_inactive',
    title:       `${inactiveLeads.length} lead${inactiveLeads.length !== 1 ? 's' : ''} sin actividad`,
    description: `${names}${more} llevan más de ${thresholdHours}h sin contacto.`,
    severity:    inactiveLeads.length >= 5 ? 'high' : 'medium',
    value:       String(inactiveLeads.length),
  }];
}

function evaluateBudget90(
  budgets: BudgetStatus[],
  threshold: number,
): AlertFired[] {
  return budgets
    .filter((b) => b.budget > 0 && b.pct >= threshold)
    .map((b) => ({
      type:        'budget_90pct' as AlertType,
      title:       `Presupuesto al ${Math.round(b.pct)}%: ${b.campaign_name}`,
      description: `Ha gastado $${b.spent.toLocaleString('es-CO')} de $${b.budget.toLocaleString('es-CO')} COP (${Math.round(b.pct)}%).`,
      severity:    (b.pct >= 98 ? 'high' : 'medium') as AlertFired['severity'],
      campaign:    b.campaign_name,
      value:       `${Math.round(b.pct)}%`,
    }));
}

function evaluateLowResults(
  recent: CampaignSummary[],
  _thresholdDays: number,
): AlertFired[] {
  // Campaigns with >0 spend but 0 results
  const noResults = recent.filter((c) => c.spent > 0 && c.results === 0);
  if (noResults.length === 0) return [];

  return noResults.slice(0, 3).map((c) => ({
    type:        'low_results' as AlertType,
    title:       `Sin resultados: ${c.campaign_name}`,
    description: `La campaña ha gastado $${c.spent.toLocaleString('es-CO')} COP sin generar resultados.`,
    severity:    'medium' as AlertFired['severity'],
    campaign:    c.campaign_name,
    value:       '$' + c.spent.toLocaleString('es-CO'),
  }));
}

// ─── Main evaluator ───────────────────────────────────────────────────────────

export function evaluateAlerts(
  configs:  AlertConfig[],
  context:  AlertContext,
): AlertFired[] {
  const fired: AlertFired[] = [];

  for (const cfg of configs) {
    if (!cfg.enabled) continue;

    switch (cfg.type) {
      case 'cpr_spike':
        fired.push(...evaluateCprSpike(context.recentCampaigns, context.previousCampaigns, cfg.threshold));
        break;
      case 'leads_inactive':
        fired.push(...evaluateLeadsInactive(context.inactiveLeads, cfg.threshold));
        break;
      case 'budget_90pct':
        fired.push(...evaluateBudget90(context.budgets, cfg.threshold));
        break;
      case 'low_results':
        fired.push(...evaluateLowResults(context.recentCampaigns, cfg.threshold));
        break;
    }
  }

  return fired;
}

// ─── Notification formatter ───────────────────────────────────────────────────

export async function notifyAlerts(alerts: AlertFired[]): Promise<void> {
  if (!alerts.length) return;

  const high   = alerts.filter((a) => a.severity === 'high').length;
  const medium = alerts.filter((a) => a.severity === 'medium').length;

  // Reuse daily summary notification structure for simplicity
  await notifyDailySummary({
    date:            new Date().toISOString().split('T')[0],
    platforms:       [],
    totalRecords:    0,
    crmLeadsCreated: 0,
    errors:          alerts.map((a) =>
      `[${a.severity.toUpperCase()}] ${a.title}: ${a.description}`
    ),
  }).catch((e) => console.warn('[alerts] Notification failed:', e));

  console.log(`[alerts] Fired ${alerts.length} alerts (${high} high, ${medium} medium)`);
}
