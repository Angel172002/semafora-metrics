import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { signSession, COOKIE_NAME, sessionCookieOptions } from '@/lib/session';
import { validate, LoginSchema } from '@/lib/validators';
import { rateLimitAuth, getClientIp } from '@/lib/rateLimit';
import { audit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  // Rate limit: 10 attempts per 15 min per IP
  const { blocked } = rateLimitAuth(req);
  if (blocked) return blocked;

  const body   = await req.json().catch(() => ({}));
  const result = validate(LoginSchema, body);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { username, email, password } = result.data;
  const identifier = (email ?? username ?? '').trim();

  const userPayload = await authenticate(identifier, password);

  if (!userPayload) {
    audit({
      tenantId: 0, userId: 0, userEmail: identifier,
      action: 'auth.login',
      ip: getClientIp(req),
      metadata: { success: false },
    });
    return NextResponse.json({ error: 'Usuario o contraseña incorrectos.' }, { status: 401 });
  }

  const token    = signSession(userPayload);
  const response = NextResponse.json({
    success: true,
    user: {
      email:         userPayload.email,
      nombre:        userPayload.nombre,
      role:          userPayload.role,
      tenant_nombre: userPayload.tenant_nombre,
    },
  });

  response.cookies.set(COOKIE_NAME, token, sessionCookieOptions());

  audit({
    tenantId: userPayload.tenant_id, userId: userPayload.sub, userEmail: userPayload.email,
    action: 'auth.login',
    ip: getClientIp(req),
    metadata: { success: true, role: userPayload.role },
  });

  return response;
}
