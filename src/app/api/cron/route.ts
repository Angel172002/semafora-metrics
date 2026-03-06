import { NextResponse } from 'next/server';

/**
 * Internal cron endpoint — called by node-cron in instrumentation.ts
 * Triggers the sync for all configured platforms.
 */
export async function GET() {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:4000';

  try {
    const res = await fetch(`${baseUrl}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platforms: ['meta', 'google', 'tiktok'], days: 7 }),
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
