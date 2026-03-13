/**
 * GET  /api/alerts      — Get alert configurations for the current tenant
 * POST /api/alerts      — Save alert configurations
 */
import { NextRequest, NextResponse } from 'next/server';
import { listAllRows, insertRow, updateRow } from '@/lib/nocodb';
import { getProjectId, getTenantId } from '@/lib/apiAuth';
import { DEFAULT_ALERT_CONFIGS, type AlertConfig } from '@/lib/alerts';
import { cacheGet, cacheSet, cacheDel } from '@/lib/cache';

const TABLE = process.env.NOCODB_TABLE_ALERTS_CONFIG || '';

const CACHE_TTL = 10 * 60; // 10 min

function cacheKey(tenantId: number) {
  return `alerts_config:t${tenantId}`;
}

// ─── GET /api/alerts ──────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const PROJECT  = getProjectId(req);
  const tenantId = getTenantId(req);

  // Try cache
  const cached = await cacheGet<AlertConfig[]>(cacheKey(tenantId));
  if (cached) return NextResponse.json({ success: true, data: cached });

  if (!TABLE) {
    // Return defaults if table not configured
    return NextResponse.json({ success: true, data: DEFAULT_ALERT_CONFIGS });
  }

  try {
    const rows = await listAllRows<{
      Id: number; Type: string; Enabled: boolean;
      Threshold: number; Channel: string; Label: string;
    }>(PROJECT, TABLE);

    let configs: AlertConfig[];
    if (rows.length === 0) {
      // Seed defaults on first load
      configs = DEFAULT_ALERT_CONFIGS;
    } else {
      configs = rows.map((r) => ({
        id:        r.Id,
        type:      r.Type as AlertConfig['type'],
        enabled:   Boolean(r.Enabled),
        threshold: r.Threshold ?? 30,
        channel:   (r.Channel || 'webhook') as AlertConfig['channel'],
        label:     r.Label || r.Type,
      }));
    }

    await cacheSet(cacheKey(tenantId), configs, CACHE_TTL);
    return NextResponse.json({ success: true, data: configs });
  } catch (e) {
    return NextResponse.json({ success: true, data: DEFAULT_ALERT_CONFIGS });
  }
}

// ─── POST /api/alerts ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const PROJECT  = getProjectId(req);
  const tenantId = getTenantId(req);

  if (!TABLE) {
    return NextResponse.json(
      { success: false, error: 'Alerts config table not configured. Run /api/setup first.' },
      { status: 503 }
    );
  }

  const body: AlertConfig[] = await req.json().catch(() => []);
  if (!Array.isArray(body)) {
    return NextResponse.json({ success: false, error: 'Expected array of alert configs' }, { status: 400 });
  }

  try {
    for (const cfg of body) {
      const row = {
        Type:      cfg.type,
        Enabled:   cfg.enabled,
        Threshold: cfg.threshold,
        Channel:   cfg.channel,
        Label:     cfg.label || cfg.type,
        Tenant_Id: tenantId,
      };

      if (cfg.id) {
        await updateRow(PROJECT, TABLE, cfg.id, row);
      } else {
        await insertRow(PROJECT, TABLE, row);
      }
    }

    await cacheDel(cacheKey(tenantId));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
