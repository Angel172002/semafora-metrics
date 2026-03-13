/**
 * Sentry server-side configuration (Node.js runtime)
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  enabled: process.env.NODE_ENV === 'production' || !!process.env.SENTRY_DEV_MODE,

  // Add tenant context to all server errors
  beforeSend(event) {
    // Scrub sensitive fields from request bodies
    if (event.request?.data) {
      const data = event.request.data as Record<string, unknown>;
      if (data.password)      data.password      = '[REDACTED]';
      if (data.Password_Hash) data.Password_Hash = '[REDACTED]';
      if (data.Password_Salt) data.Password_Salt = '[REDACTED]';
    }
    return event;
  },
});
