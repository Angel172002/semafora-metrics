/**
 * Next.js Middleware — Basic Auth para todo el dashboard.
 * Protege páginas y rutas API con usuario/contraseña.
 *
 * Variables requeridas en .env.local (y en Vercel Dashboard):
 *   DASHBOARD_USER     — nombre de usuario
 *   DASHBOARD_PASSWORD — contraseña
 */
import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const user     = process.env.DASHBOARD_USER;
  const password = process.env.DASHBOARD_PASSWORD;

  // Si las credenciales no están configuradas, bloquear todo acceso
  if (!user || !password) {
    return new NextResponse(
      'Dashboard bloqueado: configura DASHBOARD_USER y DASHBOARD_PASSWORD en las variables de entorno.',
      { status: 503 }
    );
  }

  const authHeader = req.headers.get('authorization');

  if (authHeader?.startsWith('Basic ')) {
    const base64      = authHeader.slice(6);
    const decoded     = atob(base64);
    const colonIndex  = decoded.indexOf(':');
    const reqUser     = decoded.slice(0, colonIndex);
    const reqPassword = decoded.slice(colonIndex + 1);

    if (reqUser === user && reqPassword === password) {
      return NextResponse.next();
    }
  }

  return new NextResponse('No autorizado', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Semafora Metrics", charset="UTF-8"',
    },
  });
}

export const config = {
  // Aplica a todas las rutas excepto archivos estáticos de Next.js
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
