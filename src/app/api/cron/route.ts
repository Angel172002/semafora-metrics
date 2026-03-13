import { NextRequest, NextResponse } from 'next/server';
import { notifyDailySummary, isNotifyConfigured } from '@/lib/notify';

/**
 * Cron endpoint — called by:
 *   - Vercel Cron Jobs (vercel.json)  → every 6 hours in production
 *   - node-cron (instrumentation.ts)  → locally every SYNC_INTERVAL_HOURS
 *
 * Security: verifies CRON_SECRET header when set.
 * Vercel passes: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  // ── Security check — CRON_SECRET es obligatorio ──────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET no configurado. Agrega esta variable en Vercel y en .env.local.' },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (token !== cronSecret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // ── Resolve base URL ────────────────────────────────────────────────────────
  // VERCEL_URL is auto-set by Vercel (without protocol)
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:4000');

  try {
    const res = await fetch(`${baseUrl}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.CRON_SECRET ? { 'x-cron-secret': process.env.CRON_SECRET } : {}),
      },
      body: JSON.stringify({ platforms: ['meta', 'google', 'tiktok'], days: 30 }),
    });

    const data = await res.json();
    console.log('[cron] Sync completed:', data);

    // Send daily summary notification after sync
    if (isNotifyConfigured()) {
      const today = new Date().toISOString().split('T')[0];
      notifyDailySummary({
        date:            today,
        platforms:       data.platforms ?? [],
        totalRecords:    data.synced    ?? 0,
        crmLeadsCreated: data.crmLeadsCreated ?? 0,
        errors:          data.error ? [data.error] : [],
      }).catch(console.warn);
    }

    // Evaluate alerts after sync (fire-and-forget)
    fetch(`${baseUrl}/api/alerts/check`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.CRON_SECRET ? { 'x-cron-secret': process.env.CRON_SECRET } : {}),
      },
    })
      .then((r) => r.json())
      .then((r) => console.log('[cron] Alerts check:', r))
      .catch((e) => console.warn('[cron] Alerts check failed:', e));

    // Send weekly report every Monday (fire-and-forget)
    const reportEmail = process.env.REPORT_EMAIL;
    if (reportEmail && new Date().getDay() === 1 /* Monday */) {
      fetch(`${baseUrl}/api/reports`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: 'semanal', email: reportEmail, sections: { kpis: true, campaigns: true, crm: true, topCampaigns: true } }),
      })
        .then((r) => r.json())
        .then((r) => console.log('[cron] Weekly report:', r))
        .catch((e) => console.warn('[cron] Weekly report failed:', e));
    }

    return NextResponse.json({ success: true, result: data, timestamp: new Date().toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cron] Sync failed:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
