import { NextRequest, NextResponse } from 'next/server';
import { listAllRows, updateRow } from '@/lib/nocodb';
import type { CrmLead } from '@/types';

const PROJECT      = process.env.NOCODB_PROJECT_ID          || '';
const TABLE        = process.env.NOCODB_TABLE_CRM_LEADS     || '';
const TABLE_STAGES = process.env.NOCODB_TABLE_CRM_STAGES    || '';

type RouteParams = { params: Promise<{ id: string }> };

/** NocoDB DateTime fields require "YYYY-MM-DD HH:mm:ss" — not ISO with timezone */
function nowForNoco(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

// ─── GET /api/crm/leads/[id] ──────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: RouteParams) {
  if (!TABLE) return NextResponse.json({ success: false, error: 'CRM Leads table not configured.' }, { status: 503 });
  const { id } = await params;
  try {
    const rows = await listAllRows<CrmLead>(PROJECT, TABLE, { where: `(Id,eq,${id})`, limit: '1' });
    if (!rows.length) return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

// ─── PATCH /api/crm/leads/[id] ────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  if (!TABLE) return NextResponse.json({ success: false, error: 'CRM Leads table not configured.' }, { status: 503 });
  const { id } = await params;
  try {
    const body = await req.json();
    const updates: Partial<CrmLead> = { ...body };

    // If stage changed, resolve stage name and color
    if (body.Stage_Id && TABLE_STAGES && !body.Stage_Nombre) {
      try {
        const stages = await listAllRows<{ Id: number; Nombre: string; Color: string }>(PROJECT, TABLE_STAGES);
        const found  = stages.find((s) => s.Id === Number(body.Stage_Id));
        if (found) { updates.Stage_Nombre = found.Nombre; updates.Stage_Color = found.Color; }
      } catch { /* ignore */ }
    }

    // Auto-set Fecha_Cierre when closing (NocoDB needs "YYYY-MM-DD HH:mm:ss" format)
    if (body.Estado === 'ganado' || body.Estado === 'perdido') {
      if (!body.Fecha_Cierre) updates.Fecha_Cierre = nowForNoco();
    }

    const updated = await updateRow<CrmLead>(PROJECT, TABLE, Number(id), updates);
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

// ─── DELETE /api/crm/leads/[id] (soft delete — Estado=archivado) ─────────────
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  if (!TABLE) return NextResponse.json({ success: false, error: 'CRM Leads table not configured.' }, { status: 503 });
  const { id } = await params;
  try {
    // Soft delete: dedicated 'archivado' status — does NOT mix with real 'perdido' leads
    await updateRow<CrmLead>(PROJECT, TABLE, Number(id), {
      Estado: 'archivado',
      Fecha_Cierre: nowForNoco(),
    } as Partial<CrmLead>);
    return NextResponse.json({ success: true, message: 'Lead archivado' });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
