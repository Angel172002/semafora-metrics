/**
 * Next.js Middleware — Basic Auth + cookie de sesión.
 *
 * Flujo:
 * 1. Primera visita → el navegador pide usuario/contraseña (diálogo nativo)
 * 2. Si son correctos → el middleware fija una cookie httpOnly segura
 * 3. Peticiones siguientes (incluyendo fetch() del frontend) → se valida la cookie
 *    sin necesidad de volver a pedir credenciales
 *
 * Variables requeridas:
 *   DASHBOARD_USER     — nombre de usuario
 *   DASHBOARD_PASSWORD — contraseña
 */
import { NextRequest, NextResponse } from 'next/server';

const COOKIE = 'semafora_session';

export function middleware(req: NextRequest) {
  const user     = process.env.DASHBOARD_USER;
  const password = process.env.DASHBOARD_PASSWORD;

  if (!user || !password) {
    return new NextResponse(
      'Dashboard bloqueado: configura DASHBOARD_USER y DASHBOARD_PASSWORD en las variables de entorno.',
      { status: 503 }
    );
  }

  // Valor esperado de la cookie = base64(user:password)
  const expectedCookie = btoa(`${user}:${password}`);

  // 1. Verificar cookie de sesión existente
  const sessionCookie = req.cookies.get(COOKIE);
  if (sessionCookie?.value === expectedCookie) {
    return NextResponse.next();
  }

  // 2. Verificar cabecera Basic Auth
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Basic ')) {
    const base64      = authHeader.slice(6);
    const decoded     = atob(base64);
    const colonIndex  = decoded.indexOf(':');
    const reqUser     = decoded.slice(0, colonIndex);
    const reqPassword = decoded.slice(colonIndex + 1);

    if (reqUser === user && reqPassword === password) {
      // Credenciales correctas → establecer cookie de sesión (24 horas)
      const response = NextResponse.next();
      response.cookies.set(COOKIE, expectedCookie, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge:   60 * 60 * 24,
        path:     '/',
      });
      return response;
    }
  }

  // 3. Sin credenciales válidas → pedir autenticación
  return new NextResponse('No autorizado', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Semafora Metrics", charset="UTF-8"',
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
