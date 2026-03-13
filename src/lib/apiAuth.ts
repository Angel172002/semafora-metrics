/**
 * apiAuth.ts — Helpers for protecting API routes
 *
 * Usage in API routes:
 *
 *   import { requireAuth, hasRole, getTenantProject } from '@/lib/apiAuth';
 *
 *   export async function GET(req: NextRequest) {
 *     const session = requireAuth(req);
 *     if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
 *
 *     const projectId = getTenantProject(req, session);
 *     // use projectId instead of process.env.NOCODB_PROJECT_ID
 *   }
 */
import type { NextRequest } from 'next/server';
import { verifySession, COOKIE_NAME, type SessionPayload } from './session';

// ─── Core auth check ──────────────────────────────────────────────────────────

/**
 * Reads and verifies the session from the request cookie.
 * Returns the session payload or null if not authenticated / expired.
 */
export function requireAuth(req: NextRequest): SessionPayload | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

// ─── Role check ───────────────────────────────────────────────────────────────

type Role = SessionPayload['role'];

export function hasRole(session: SessionPayload, allowed: Role[]): boolean {
  return allowed.includes(session.role);
}

// ─── Tenant project resolver ───────────────────────────────────────────────────

/**
 * Returns the NocoDB project ID for the current request's tenant.
 *
 * Priority:
 *   1. x-session-project header (injected by middleware — most reliable)
 *   2. session.project_id (from cookie — same value)
 *   3. NOCODB_PROJECT_ID env var (single-tenant backward compat)
 */
export function getTenantProject(
  req: NextRequest,
  session: SessionPayload | null
): string {
  return (
    req.headers.get('x-session-project') ||
    session?.project_id ||
    process.env.NOCODB_PROJECT_ID ||
    ''
  );
}

/**
 * Convenience: get tenant project ID without needing the session object.
 * Use when the route is already protected by middleware (session guaranteed).
 */
export function getProjectId(req: NextRequest): string {
  return (
    req.headers.get('x-session-project') ||
    process.env.NOCODB_PROJECT_ID ||
    ''
  );
}

/**
 * Get the tenant ID for the current request.
 * Useful for filtering data by tenant when using a shared NocoDB project.
 */
export function getTenantId(req: NextRequest): number {
  const fromHeader = req.headers.get('x-session-tenant');
  return fromHeader ? parseInt(fromHeader, 10) : 0;
}

/**
 * Get the authenticated user's role from the request.
 */
export function getSessionRole(req: NextRequest): Role | null {
  const fromHeader = req.headers.get('x-session-role');
  if (fromHeader === 'admin' || fromHeader === 'analista' || fromHeader === 'comercial') {
    return fromHeader;
  }
  return null;
}
