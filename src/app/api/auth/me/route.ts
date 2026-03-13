/**
 * GET /api/auth/me — Returns the current authenticated user's info
 * Used by the frontend to display user name/role and check permissions.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';

export async function GET(req: NextRequest) {
  const session = requireAuth(req);
  if (!session) {
    return NextResponse.json(
      { error: 'No autenticado' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    user: {
      id:            session.sub,
      email:         session.email,
      nombre:        session.nombre,
      role:          session.role,
      tenant_id:     session.tenant_id,
      tenant_nombre: session.tenant_nombre,
    },
  });
}
