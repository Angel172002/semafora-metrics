/**
 * middleware.ts — Route protection + role-based access
 *
 * Public routes (no auth required):
 *   /login, /api/auth/*, /api/cron (secured by CRON_SECRET header), /_next/*, /favicon.ico
 *
 * Role gates:
 *   /api/sync, /api/setup       → admin only
 *   /crm, /api/crm/*            → admin + comercial (analista excluded)
 *   everything else             → any authenticated user
 *
 * Session info injected into API request headers:
 *   x-session-sub, x-session-email, x-session-role, x-session-tenant, x-session-project
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/session';

// ─── Route classification ──────────────────────────────────────────────────────

const PUBLIC_PREFIXES = [
  '/login',
  '/landing',
  '/register',
  '/onboarding',
  '/api/auth/',
  '/api/billing/webhook', // Stripe webhooks — signed by Stripe, no session needed
  '/_next',
  '/favicon.ico',
];

const ADMIN_ONLY_PREFIXES = [
  '/api/sync',
  '/api/setup',
];

const CRM_PREFIXES = [
  '/crm',
  '/api/crm',
];

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?')
  );
}

// ─── Middleware ────────────────────────────────────────────────────────────────

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Always allow public routes
  if (startsWithAny(pathname, PUBLIC_PREFIXES)) return NextResponse.next();

  // 2. Allow cron endpoint when called with the cron secret header
  if (pathname.startsWith('/api/cron')) {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`) {
      return NextResponse.next();
    }
    // Fall through to session check (allow manual trigger when logged in)
  }

  // 3. Verify session token
  const token   = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'No autorizado. Sesión inválida o expirada.', redirectTo: '/login' },
        { status: 401 }
      );
    }
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Admin-only routes
  if (startsWithAny(pathname, ADMIN_ONLY_PREFIXES) && session.role !== 'admin') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Acceso denegado. Se requiere rol admin.' },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL('/', req.url));
  }

  // 5. CRM routes — admin + comercial only (analista cannot access)
  if (startsWithAny(pathname, CRM_PREFIXES) && session.role === 'analista') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Acceso denegado. El rol analista no tiene acceso al CRM.' },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL('/', req.url));
  }

  // 6. Inject session context into request headers (available in API routes via req.headers)
  const reqHeaders = new Headers(req.headers);
  reqHeaders.set('x-session-sub',     String(session.sub));
  reqHeaders.set('x-session-email',   session.email);
  reqHeaders.set('x-session-role',    session.role);
  reqHeaders.set('x-session-tenant',  String(session.tenant_id));
  reqHeaders.set('x-session-project', session.project_id);

  return NextResponse.next({ request: { headers: reqHeaders } });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
