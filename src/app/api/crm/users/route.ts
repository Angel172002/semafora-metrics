import { NextResponse } from 'next/server';
import { listAllRows, insertRow } from '@/lib/nocodb';
import type { CrmUser } from '@/types';

const PROJECT = process.env.NOCODB_PROJECT_ID    || '';
const TABLE   = process.env.NOCODB_TABLE_CRM_USERS || '';

export async function GET() {
  if (!TABLE) {
    return NextResponse.json({ success: false, data: [], error: 'CRM Users table not configured.' }, { status: 503 });
  }
  try {
    const rows = await listAllRows<CrmUser>(PROJECT, TABLE, { where: '(Activo,eq,true)', sort: 'Nombre' });
    return NextResponse.json({ success: true, data: rows });
  } catch (e) {
    return NextResponse.json({ success: false, data: [], error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!TABLE) return NextResponse.json({ success: false, error: 'CRM Users table not configured.' }, { status: 503 });
  try {
    const body = await req.json();
    const row = await insertRow<CrmUser>(PROJECT, TABLE, {
      Nombre: body.Nombre,
      Email:  body.Email  || '',
      Rol:    body.Rol    || 'asesor',
      Activo: true,
    });
    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
