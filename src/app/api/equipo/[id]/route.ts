/**
 * PATCH /api/equipo/[id] — Actualiza un usuario (solo admin)
 * Permite cambiar Activo, Rol, Nombre
 */
import { NextRequest, NextResponse } from 'next/server';
import { updateRow } from '@/lib/nocodb';
import { requireAuth, hasRole, getProjectId } from '@/lib/apiAuth';

const USERS_TABLE = process.env.NOCODB_TABLE_USERS ?? '';
const MASTER_PROJ = process.env.NOCODB_PROJECT_ID  ?? '';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = requireAuth(req);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!hasRole(session, ['admin'])) {
    return NextResponse.json({ error: 'Solo administradores pueden modificar usuarios.' }, { status: 403 });
  }
  if (!USERS_TABLE) {
    return NextResponse.json({ error: 'NOCODB_TABLE_USERS no configurado' }, { status: 503 });
  }

  const { id } = await params;
  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const PROJECT = getProjectId(req);
  const body    = await req.json().catch(() => ({}));

  // Only allow safe fields to be updated
  const allowed: Record<string, unknown> = {};
  if (typeof body.Activo === 'boolean')                                   allowed.Activo = body.Activo;
  if (typeof body.Nombre === 'string' && body.Nombre.length > 0)         allowed.Nombre = body.Nombre;
  if (['admin','analista','comercial'].includes(body.Rol))               allowed.Rol    = body.Rol;

  if (!Object.keys(allowed).length) {
    return NextResponse.json({ error: 'Sin campos válidos para actualizar' }, { status: 400 });
  }

  try {
    await updateRow(PROJECT, USERS_TABLE, Number(id), allowed);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
