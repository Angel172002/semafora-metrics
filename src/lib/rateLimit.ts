/**
 * In-memory rate limiter with tenant-aware keys.
 * Works for single-instance deployments (Vercel serverless functions share memory per instance).
 * For multi-instance production use, replace with Upstash Redis.
 *
 * Preset limiters:
 *   rateLimitSync(req)   — 5 syncs per 10 min per IP
 *   rateLimitApi(req)    — 100 API calls per min per tenant+IP
 *   rateLimitAuth(req)   — 10 login attempts per 15 min per IP
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;  // unix ms
}

/**
 * @param key    Unique key (e.g. `ip:${ip}:sync`)
 * @param limit  Max requests per window
 * @param windowMs  Window in milliseconds
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // New window
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Extracts the real IP from Next.js request headers.
 */
export function getClientIp(req: Request): string {
  const headers = new Headers((req as Request).headers);
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    'unknown'
  );
}

// ─── Preset rate limiters ─────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitCheck {
  blocked: NextResponse | null;
}

/** 5 syncs per 10 minutes per IP — replaces boilerplate in sync route */
export function rateLimitSync(req: NextRequest): RateLimitCheck {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`sync:${ip}`, 5, 10 * 60 * 1000);
  if (rl.allowed) return { blocked: null };
  return {
    blocked: NextResponse.json(
      { success: false, error: 'Demasiadas solicitudes de sync. Espera antes de intentar de nuevo.' },
      {
        status: 429,
        headers: {
          'Retry-After':          String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      }
    ),
  };
}

/** 10 login attempts per 15 minutes per IP */
export function rateLimitAuth(req: NextRequest): RateLimitCheck {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`auth:${ip}`, 10, 15 * 60 * 1000);
  if (rl.allowed) return { blocked: null };
  return {
    blocked: NextResponse.json(
      { error: 'Demasiados intentos de login. Espera 15 minutos.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    ),
  };
}

/** 60 requests per minute per tenant (or IP if no tenant) */
export function rateLimitTenant(req: NextRequest, tenantId: number): RateLimitCheck {
  const key = tenantId > 0 ? `api:tenant:${tenantId}` : `api:ip:${getClientIp(req)}`;
  const rl  = checkRateLimit(key, 60, 60 * 1000);
  if (rl.allowed) return { blocked: null };
  return {
    blocked: NextResponse.json(
      { error: 'Límite de requests alcanzado. Intenta en un minuto.' },
      {
        status: 429,
        headers: {
          'Retry-After':           String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      }
    ),
  };
}
