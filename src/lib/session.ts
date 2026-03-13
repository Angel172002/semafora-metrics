/**
 * session.ts — HMAC-SHA256 signed session tokens
 * No external dependencies — uses node:crypto only.
 *
 * Token format:  base64url(JSON payload) + "." + base64url(HMAC-SHA256 signature)
 *
 * Required env var:
 *   SESSION_SECRET  — at least 32 random chars (generate with: openssl rand -hex 32)
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const SECRET       = process.env.SESSION_SECRET ?? 'dev-secret-change-in-production-min-32ch';
export const COOKIE_NAME    = 'semafora_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

// ─── Payload ──────────────────────────────────────────────────────────────────

export interface SessionPayload {
  sub:            number;   // user ID (0 = env-var fallback user)
  email:          string;
  nombre:         string;
  role:           'admin' | 'analista' | 'comercial';
  tenant_id:      number;   // 0 = default single-tenant
  tenant_nombre:  string;
  project_id:     string;   // NocoDB project ID for this tenant
  iat:            number;   // issued at (unix seconds)
  exp:            number;   // expires at (unix seconds)
}

// ─── Sign ─────────────────────────────────────────────────────────────────────

export function signSession(
  payload: Omit<SessionPayload, 'iat' | 'exp'>
): string {
  const now  = Math.floor(Date.now() / 1000);
  const full: SessionPayload = { ...payload, iat: now, exp: now + SESSION_MAX_AGE };
  const data = Buffer.from(JSON.stringify(full)).toString('base64url');
  const sig  = createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

// ─── Verify ───────────────────────────────────────────────────────────────────

export function verifySession(token: string): SessionPayload | null {
  // Split on LAST dot so dots inside base64url data don't confuse us
  const dotIdx = token.lastIndexOf('.');
  if (dotIdx === -1) return null;

  const data = token.slice(0, dotIdx);
  const sig  = token.slice(dotIdx + 1);
  if (!data || !sig) return null;

  // Constant-time signature comparison
  const expected = createHmac('sha256', SECRET).update(data).digest('base64url');
  try {
    const bufSig = Buffer.from(sig,      'base64url');
    const bufExp = Buffer.from(expected, 'base64url');
    if (bufSig.length !== bufExp.length) return null;
    if (!timingSafeEqual(bufSig, bufExp)) return null;
  } catch {
    return null;
  }

  // Decode and validate expiry
  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge:   SESSION_MAX_AGE,
    path:     '/',
  };
}
