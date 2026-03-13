/**
 * POST /api/alerts/check
 * Evaluates configured alerts against current data and fires notifications.
 * Called by cron or manually from the alerts UI.
 */
import { NextRequest, NextResponse } from 'next/server';
import { listAllRows } from '@/lib/nocodb';
import { getProjectId, getTenantId, requireAuth } from '@/lib/apiAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import {
  evaluateAlerts, notifyAlerts, DEFAULT_ALERT_CONFIGS,
  type AlertConfig, type AlertContext,
} from '@/lib/alerts';
import type { DailyMetric, CrmLead } from '@/types';

const TABLE_CAMPAIGNS = process.env.NOCODB_TABLE_METRICS     || '';
const TABLE_CRM_LEADS = process.env.NOCODB_TABLE_CRM_LEADS   || '';
const TABLE_ALERTS    = process.env.NOCODB_TABLE_ALERTS_CONFIG || '';

function aggreageCampaigns(rows: DailyMetric[]) {
  const map = new Map<string, { name: string; spent: number; results: number }>();
  for (const r of rows) {
    const e = map.get(r.campaign_id) ?? { name: r.campaign_name, spent: 0, results: 0 };
    e.spent   += r.spent;
    e.results += r.results;
    map.set(r.campaign_id, e);
  }
  return [...map.entries()].map(([id, e]) => ({
    campaign_id:   id,
    campaign_name: e.name,
    spent:         e.spent,
    results:       e.results,
    cpr:           e.results > 0 ? Math.round(e.spent / e.results) : 0,
    date:          new Date().toISOString().split('T')[0],
  }));
}

function getDateSince(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

export async function POST(req: NextRequest) {
  const ip      = getClientIp(req);
  const rl      = checkRateLimit(`alerts_check:${ip}`, 10, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Rate limited' }, { status: 429 });
  }

  const PROJECT  = getProjectId(req);
  const tenantId = getTenantId(req);
  requireAuth(req); // logs who triggered it

  if (!TABLE_CAMPAIGNS) {
    return NextResponse.json({ success: false, error: 'Metrics table not configured.' }, { status: 503 });
  }

  try {
    // Load alert configs
    let configs: AlertConfig[] = DEFAULT_ALERT_CONFIGS;
    if (TABLE_ALERTS) {
      const rows = await listAllRows<{
        Id: number; Type: string; Enabled: boolean; Threshold: number; Channel: string;
      }>(PROJECT, TABLE_ALERTS);
      if (rows.length > 0) {
        configs = rows.map((r) => ({
          id:        r.Id,
          type:      r.Type as AlertConfig['type'],
          enabled:   Boolean(r.Enabled),
          threshold: r.Threshold ?? 30,
          channel:   (r.Channel || 'webhook') as AlertConfig['channel'],
        }));
      }
    }

    if (!configs.some((c) => c.enabled)) {
      return NextResponse.json({ success: true, fired: [], message: 'No alerts enabled' });
    }

    // ── Fetch data for context ──────────────────────────────────────────────
    const since7d  = getDateSince(7);
    const since14d = getDateSince(14);
    const now      = new Date().toISOString().split('T')[0];

    const [recentRows, previousRows, leadsRows] = await Promise.all([
      listAllRows<DailyMetric>(PROJECT, TABLE_CAMPAIGNS, {
        where: `(Fecha,gte,${since7d})~and(Fecha,lte,${now})`,
      }),
      listAllRows<DailyMetric>(PROJECT, TABLE_CAMPAIGNS, {
        where: `(Fecha,gte,${since14d})~and(Fecha,lt,${since7d})`,
      }),
      TABLE_CRM_LEADS
        ? listAllRows<CrmLead>(PROJECT, TABLE_CRM_LEADS, {
            where: '(Estado,eq,abierto)',
            fields: 'Id,Nombre,Usuario_Nombre,Fecha_Ultimo_Contacto,Fecha_Creacion',
          })
        : Promise.resolve([] as CrmLead[]),
    ]);

    // Build inactive leads
    const nowMs = Date.now();
    const inactiveLeads = leadsRows.map((l) => {
      const last = l.Fecha_Ultimo_Contacto
        ? new Date(l.Fecha_Ultimo_Contacto).getTime()
        : l.Fecha_Creacion
        ? new Date(l.Fecha_Creacion).getTime()
        : nowMs;
      return {
        id:                   l.Id,
        nombre:               l.Nombre || `Lead #${l.Id}`,
        usuario_nombre:       l.Usuario_Nombre || '',
        days_without_contact: Math.floor((nowMs - last) / 86400000),
      };
    });

    const context: AlertContext = {
      recentCampaigns:   aggreageCampaigns(recentRows as unknown as DailyMetric[]),
      previousCampaigns: aggreageCampaigns(previousRows as unknown as DailyMetric[]),
      inactiveLeads,
      budgets:           [], // populated if Meta budgets are available
    };

    const fired = evaluateAlerts(configs, context);

    // Send notifications fire-and-forget
    if (fired.length > 0) {
      notifyAlerts(fired).catch(console.warn);
    }

    return NextResponse.json({
      success: true,
      fired:   fired.length,
      alerts:  fired,
      tenantId,
    });

  } catch (e) {
    console.error('[/api/alerts/check]', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
