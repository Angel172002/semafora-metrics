/**
 * Sentry browser configuration
 *
 * Required env vars:
 *   NEXT_PUBLIC_SENTRY_DSN — from Sentry Dashboard → Project → Settings → Client Keys
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay (only in production, 10% of sessions)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate:  1.0,

  // Don't send errors in development unless explicitly enabled
  enabled: process.env.NODE_ENV === 'production' || !!process.env.SENTRY_DEV_MODE,

  // Enrich errors with breadcrumbs
  integrations: [
    Sentry.replayIntegration({
      maskAllText:   true,
      blockAllMedia: true,
    }),
  ],

  // Ignore common noise
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    /^Loading chunk \d+ failed/,
  ],
});
