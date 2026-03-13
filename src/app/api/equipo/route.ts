/**
 * GET /api/equipo — Lista los usuarios del tenant actual
 */
import { NextRequest, NextResponse } from 'next/server';
import { listAllRows } from '@/lib/nocodb';
import { requireAuth, getProjectId, getTenantId } from '@/lib/apiAuth';

const USERS_TABLE = process.env.NOCODB_TABLE_USERS ?? '';

export async function GET(req: NextRequest) {
  const session = requireAuth(req);
  if (!session) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  if (!USERS_TABLE) {
    // Tabla no configurada — devolver lista vacía (modo env-var)
    return NextResponse.json({ success: true, data: [] });
  }

  const PROJECT  = getProjectId(req);
  const tenantId = getTenantId(req);

  try {
    const where = tenantId > 0 ? `(Tenant_Id,eq,${tenantId})` : '';
    const rows = await listAllRows<{
      Id: number; Email: string; Nombre: string;
      Rol: string; Activo: boolean; Fecha_Creacion?: string;
    }>(PROJECT, USERS_TABLE, {
      where,
      fields: 'Id,Email,Nombre,Rol,Activo,Fecha_Creacion',
      sort:   'Nombre',
      limit:  '100',
    });
    return NextResponse.json({ success: true, data: rows });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
