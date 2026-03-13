import { NextRequest, NextResponse } from 'next/server';
import { listAllRows, updateRow } from '@/lib/nocodb';
import { getProjectId, getTenantId, requireAuth } from '@/lib/apiAuth';
import { validate, LeadUpdateSchema } from '@/lib/validators';
import { audit } from '@/lib/audit';
import { cacheDel, CacheKeys } from '@/lib/cache';
import { getClientIp } from '@/lib/rateLimit';
import type { CrmLead } from '@/types';

const TABLE        = process.env.NOCODB_TABLE_CRM_LEADS     || '';
const TABLE_STAGES = process.env.NOCODB_TABLE_CRM_STAGES    || '';

type RouteParams = { params: Promise<{ id: string }> };

/** NocoDB DateTime fields require "YYYY-MM-DD HH:mm:ss" — not ISO with timezone */
function nowForNoco(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

// ─── GET /api/crm/leads/[id] ──────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: RouteParams) {
  const PROJECT = getProjectId(req);
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
  const PROJECT  = getProjectId(req);
  const tenantId = getTenantId(req);
  const session  = requireAuth(req);
  if (!TABLE) return NextResponse.json({ success: false, error: 'CRM Leads table not configured.' }, { status: 503 });
  const { id } = await params;
  try {
    const raw    = await req.json().catch(() => ({}));
    const result = validate(LeadUpdateSchema, raw);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    const body    = result.data;
    const updates: Partial<CrmLead> = { ...body } as Partial<CrmLead>;

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

    // Audit: distinguish a stage change from a general update
    const isStageChange = body.Stage_Id !== undefined || body.Estado !== undefined;
    audit({
      tenantId,
      userId:     session?.sub   ?? 0,
      userEmail:  session?.email ?? '',
      action:     isStageChange ? 'lead.stage_change' : 'lead.update',
      resource:   'crm_lead',
      resourceId: id,
      ip:         getClientIp(req),
      after:      { Stage_Id: body.Stage_Id, Estado: body.Estado },
    });

    // Invalidate CRM stats cache (stage/estado changes affect pipeline totals)
    if (isStageChange) cacheDel(CacheKeys.crmStats(tenantId)).catch(() => null);

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

// ─── DELETE /api/crm/leads/[id] (soft delete — Estado=archivado) ─────────────
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const PROJECT  = getProjectId(req);
  const tenantId = getTenantId(req);
  const session  = requireAuth(req);
  if (!TABLE) return NextResponse.json({ success: false, error: 'CRM Leads table not configured.' }, { status: 503 });
  const { id } = await params;
  try {
    // Soft delete: dedicated 'archivado' status — does NOT mix with real 'perdido' leads
    await updateRow<CrmLead>(PROJECT, TABLE, Number(id), {
      Estado: 'archivado',
      Fecha_Cierre: nowForNoco(),
    } as Partial<CrmLead>);

    audit({
      tenantId,
      userId:     session?.sub   ?? 0,
      userEmail:  session?.email ?? '',
      action:     'lead.delete',
      resource:   'crm_lead',
      resourceId: id,
      ip:         getClientIp(req),
      after:      { Estado: 'archivado' },
    });

    cacheDel(CacheKeys.crmStats(tenantId)).catch(() => null);

    return NextResponse.json({ success: true, message: 'Lead archivado' });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
