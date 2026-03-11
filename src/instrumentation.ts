/**
 * Next.js instrumentation hook — runs server-side on startup.
 * Sets up the automatic cron job for syncing ads metrics.
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamic import to avoid loading node-cron in Edge runtime
    const cron = await import('node-cron');

    const intervalHours = parseInt(process.env.SYNC_INTERVAL_HOURS || '2');
    const cronExpression = `0 */${intervalHours} * * *`; // Every N hours

    console.log(`[semafora-metrics] Cron scheduler started — every ${intervalHours}h (${cronExpression})`);

    cron.default.schedule(cronExpression, async () => {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:4000';
      console.log(`[cron] Triggering sync at ${new Date().toISOString()}`);

      try {
        const res = await fetch(`${baseUrl}/api/cron`);
        const result = await res.json();
        console.log('[cron] Result:', result);
      } catch (err) {
        console.error('[cron] Failed:', err);
      }
    });
  }
}
