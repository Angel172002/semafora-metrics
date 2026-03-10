import { NextRequest, NextResponse } from 'next/server';

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
    return NextResponse.json({ success: true, result: data, timestamp: new Date().toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cron] Sync failed:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
