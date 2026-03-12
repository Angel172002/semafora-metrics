import { NextResponse } from 'next/server';
import { listAllRows, insertRow } from '@/lib/nocodb';
import type { CrmStage } from '@/types';

const PROJECT  = process.env.NOCODB_PROJECT_ID || '';
const TABLE    = process.env.NOCODB_TABLE_CRM_STAGES || '';

const DEFAULT_STAGES = [
  { Nombre: 'Agendamiento Tenida',       Orden: 1, Color: '#fbbf24', Es_Ganado: false, Es_Perdido: false, Activo: true },
  { Nombre: 'Agendamiento Cerrada',       Orden: 2, Color: '#3b82f6', Es_Ganado: false, Es_Perdido: false, Activo: true },
  { Nombre: 'Reunión de Cierre Agendada', Orden: 3, Color: '#f97316', Es_Ganado: false, Es_Perdido: false, Activo: true },
  { Nombre: 'Reunión de Cierre Tenida',   Orden: 4, Color: '#a855f7', Es_Ganado: false, Es_Perdido: false, Activo: true },
  { Nombre: 'Negocio Pendiente',          Orden: 5, Color: '#6b7280', Es_Ganado: false, Es_Perdido: false, Activo: true },
  { Nombre: 'Cliente Pagó',               Orden: 6, Color: '#10b981', Es_Ganado: true,  Es_Perdido: false, Activo: true },
  { Nombre: 'Negocio Perdido',            Orden: 7, Color: '#ef4444', Es_Ganado: false, Es_Perdido: true,  Activo: true },
];

export async function GET() {
  if (!TABLE) {
    return NextResponse.json({ success: false, data: [], error: 'CRM Stages table not configured. Run POST /api/setup first.' }, { status: 503 });
  }
  try {
    const rows = await listAllRows<CrmStage>(PROJECT, TABLE, { sort: 'Orden' });
    return NextResponse.json({ success: true, data: rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, data: [], error: msg }, { status: 500 });
  }
}

/**
 * POST /api/crm/stages
 * Seeds default pipeline stages when the table is empty.
 * Safe to call multiple times — only inserts if table is empty.
 */
export async function POST() {
  if (!TABLE) {
    return NextResponse.json({ success: false, error: 'CRM Stages table not configured.' }, { status: 503 });
  }
  try {
    const existing = await listAllRows<CrmStage>(PROJECT, TABLE);
    if (existing.length > 0) {
      return NextResponse.json({ success: true, message: `La tabla ya tiene ${existing.length} etapas. No se realizaron cambios.`, data: existing });
    }
    const inserted: CrmStage[] = [];
    for (const stage of DEFAULT_STAGES) {
      const row = await insertRow<CrmStage>(PROJECT, TABLE, stage);
      inserted.push(row);
    }
    return NextResponse.json({ success: true, message: `${inserted.length} etapas creadas correctamente.`, data: inserted }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
