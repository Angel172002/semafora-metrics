/**
 * POST /api/auth/register — Create a new user (admin only)
 *
 * Body: { email, nombre, password, role, tenant_id, tenant_nombre, noco_project_id }
 *
 * Requires:
 *   - NOCODB_TABLE_USERS env var
 *   - Caller must be authenticated as admin
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, hasRole } from '@/lib/apiAuth';
import { hashPassword } from '@/lib/auth';
import { insertRow } from '@/lib/nocodb';

const MASTER_PROJ = process.env.NOCODB_PROJECT_ID  ?? '';
const USERS_TABLE = process.env.NOCODB_TABLE_USERS ?? '';

export async function POST(req: NextRequest) {
  // Only admins can create users
  const session = requireAuth(req);
  if (!session)              return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  if (!hasRole(session, ['admin'])) {
    return NextResponse.json({ error: 'Solo administradores pueden crear usuarios.' }, { status: 403 });
  }

  if (!USERS_TABLE || !MASTER_PROJ) {
    return NextResponse.json(
      { error: 'NOCODB_TABLE_USERS no configurado. Crea la tabla users en NocoDB primero.' },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { email, nombre, password, role, tenant_id, tenant_nombre, noco_project_id } = body;

  if (!email || !nombre || !password || !role) {
    return NextResponse.json(
      { error: 'Campos requeridos: email, nombre, password, role' },
      { status: 400 }
    );
  }

  if (!['admin', 'analista', 'comercial'].includes(role)) {
    return NextResponse.json(
      { error: 'Role inválido. Debe ser: admin, analista o comercial.' },
      { status: 400 }
    );
  }

  const { hash, salt } = hashPassword(password);

  try {
    const row = await insertRow(MASTER_PROJ, USERS_TABLE, {
      Email:           email.toLowerCase().trim(),
      Nombre:          nombre,
      Password_Hash:   hash,
      Password_Salt:   salt,
      Rol:             role,
      Activo:          true,
      Tenant_Id:       tenant_id     ?? session.tenant_id,
      Tenant_Nombre:   tenant_nombre ?? session.tenant_nombre,
      Noco_Project_Id: noco_project_id ?? session.project_id,
      Fecha_Creacion:  new Date().toISOString().replace('T', ' ').slice(0, 19),
    });

    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (e) {
    const msg = String(e);
    if (msg.includes('duplicate') || msg.includes('unique')) {
      return NextResponse.json({ error: 'Ya existe un usuario con ese email.' }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
