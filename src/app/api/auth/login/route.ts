import { NextRequest, NextResponse } from 'next/server';

const COOKIE = 'semafora_session';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json().catch(() => ({}));

  const validUser = process.env.DASHBOARD_USER;
  const validPass = process.env.DASHBOARD_PASSWORD;

  if (!validUser || !validPass) {
    return NextResponse.json(
      { error: 'Servidor no configurado. Contacta al administrador.' },
      { status: 503 }
    );
  }

  if (!username || !password || username !== validUser || password !== validPass) {
    return NextResponse.json(
      { error: 'Usuario o contraseña incorrectos' },
      { status: 401 }
    );
  }

  // Credenciales correctas — establecer cookie de sesión (24 horas)
  const sessionValue = btoa(`${validUser}:${validPass}`);
  const response = NextResponse.json({ success: true });

  response.cookies.set(COOKIE, sessionValue, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 24,
    path:     '/',
  });

  return response;
}
