/**
 * Next.js Middleware — Autenticación por cookie de sesión.
 *
 * Flujo:
 *   - /login y /api/auth/* → siempre accesibles (sin autenticación)
 *   - Resto de rutas → requieren cookie de sesión válida
 *     · Páginas → redirigen a /login
 *     · API     → devuelven 401 JSON
 */
import { NextRequest, NextResponse } from 'next/server';

const COOKIE     = 'semafora_session';
const LOGIN_PATH = '/login';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rutas públicas — siempre accesibles
  if (pathname === LOGIN_PATH || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Permitir llamadas servidor-a-servidor con x-cron-secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get('x-cron-secret') === cronSecret) {
    return NextResponse.next();
  }

  const user     = process.env.DASHBOARD_USER;
  const password = process.env.DASHBOARD_PASSWORD;

  if (!user || !password) {
    return new NextResponse(
      'Dashboard bloqueado: configura DASHBOARD_USER y DASHBOARD_PASSWORD en las variables de entorno.',
      { status: 503 }
    );
  }

  // Verificar cookie de sesión
  const expectedCookie = btoa(`${user}:${password}`);
  const sessionCookie  = req.cookies.get(COOKIE);

  if (sessionCookie?.value === expectedCookie) {
    return NextResponse.next();
  }

  // Sin sesión válida:
  // - Rutas API → 401 JSON
  // - Páginas   → redirect a /login
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'No autorizado', redirectTo: LOGIN_PATH }, { status: 401 });
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = LOGIN_PATH;
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
