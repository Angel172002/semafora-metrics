/**
 * POST /api/auth/signup — Auto-registro público (self-service)
 *
 * Crea un nuevo tenant + usuario admin en una sola llamada.
 * No requiere autenticación previa.
 *
 * Body: { nombre, empresa, email, password }
 * Returns: session cookie + user info
 *
 * Rate limit: 5 signups per hour per IP (anti-spam)
 */
import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { insertRow, listAllRows } from '@/lib/nocodb';
import { signSession, COOKIE_NAME, sessionCookieOptions } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { z } from 'zod';

const MASTER_PROJ   = process.env.NOCODB_PROJECT_ID  ?? '';
const USERS_TABLE   = process.env.NOCODB_TABLE_USERS  ?? '';
const TENANTS_TABLE = process.env.NOCODB_TABLE_TENANTS ?? '';

const SignupSchema = z.object({
  nombre:   z.string().min(2).max(100),
  empresa:  z.string().min(2).max(200),
  email:    z.string().email().max(200),
  password: z.string().min(8).max(128),
});

export async function POST(req: NextRequest) {
  // Rate limit: 5 registros por hora por IP
  const ip = getClientIp(req);
  const rl = checkRateLimit(`signup:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera antes de registrarte de nuevo.' },
      { status: 429 }
    );
  }

  if (!USERS_TABLE || !MASTER_PROJ) {
    return NextResponse.json(
      { error: 'El sistema de registro no está configurado. Contacta al administrador.' },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    const msgs = parsed.error.issues?.map((e) =>
      `${e.path.join('.')}: ${e.message}`
    ).join('; ') || 'Datos inválidos';
    return NextResponse.json({ error: msgs }, { status: 400 });
  }

  const { nombre, empresa, email, password } = parsed.data;
  const emailNorm = email.toLowerCase().trim();

  // Verificar que el email no exista
  try {
    const existing = await listAllRows<{ Id: number }>(MASTER_PROJ, USERS_TABLE, {
      where:  `(Email,eq,${emailNorm})`,
      fields: 'Id',
      limit:  '1',
    });
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con ese email. ¿Quieres iniciar sesión?' },
        { status: 409 }
      );
    }
  } catch { /* table scan failed — proceed */ }

  // Crear tenant
  let tenantId = 1;
  if (TENANTS_TABLE) {
    try {
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const tenant = await insertRow<Record<string, unknown>>(MASTER_PROJ, TENANTS_TABLE, {
        Nombre:        empresa,
        Plan:          'trial',
        Status:        'active',
        Created_At:    now,
        Trial_Ends_At: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          .toISOString().replace('T', ' ').slice(0, 19),
      });
      tenantId = (tenant as { Id?: number })?.Id ?? 1;
    } catch (e) {
      console.warn('[signup] Could not create tenant row:', e);
      // Assign a timestamp-based ID as fallback
      tenantId = Date.now() % 100000;
    }
  }

  // Hash contraseña
  const { hash, salt } = hashPassword(password);

  // Crear usuario admin
  try {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    await insertRow(MASTER_PROJ, USERS_TABLE, {
      Email:           emailNorm,
      Nombre:          nombre,
      Password_Hash:   hash,
      Password_Salt:   salt,
      Rol:             'admin',
      Activo:          true,
      Tenant_Id:       tenantId,
      Tenant_Nombre:   empresa,
      Noco_Project_Id: MASTER_PROJ,
      Fecha_Creacion:  now,
    });
  } catch (e) {
    const msg = String(e);
    if (msg.includes('duplicate') || msg.includes('unique')) {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese email.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al crear la cuenta. Intenta de nuevo.' }, { status: 500 });
  }

  // Crear sesión
  const sessionPayload = {
    sub:           0,
    email:         emailNorm,
    nombre,
    role:          'admin' as const,
    tenant_id:     tenantId,
    tenant_nombre: empresa,
    project_id:    MASTER_PROJ,
  };

  const token    = signSession(sessionPayload);
  const response = NextResponse.json({
    success: true,
    user: {
      email:         emailNorm,
      nombre,
      role:          'admin',
      tenant_nombre: empresa,
    },
  }, { status: 201 });

  response.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
  return response;
}
