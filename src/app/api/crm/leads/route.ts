import { NextRequest, NextResponse } from 'next/server';
import { listAllRows, listRowsPage, insertRow } from '@/lib/nocodb';
import type { CrmLead } from '@/types';

const PROJECT          = process.env.NOCODB_PROJECT_ID            || 'p0txioylznnyf39';
const TABLE            = process.env.NOCODB_TABLE_CRM_LEADS       || '';
const TABLE_STAGES     = process.env.NOCODB_TABLE_CRM_STAGES      || '';
const TABLE_ACTIVITIES = process.env.NOCODB_TABLE_CRM_ACTIVITIES  || '';

// ─── GET /api/crm/leads ───────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!TABLE) {
    return NextResponse.json(
      { success: false, data: [], total: 0, pages: 1, error: 'CRM Leads table not configured. Run POST /api/setup first.' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const stageId  = searchParams.get('stage');
  const status   = searchParams.get('status');
  const userId   = searchParams.get('usuario');
  const search   = searchParams.get('search');
  const origin   = searchParams.get('origin');
  const includeActivities = searchParams.get('withActivities') === 'true';

  // Server-side pagination — if page+limit are provided, use listRowsPage
  const pageParam  = parseInt(searchParams.get('page')  || '0', 10);
  const limitParam = parseInt(searchParams.get('limit') || '0', 10);
  const isPaginated = pageParam > 0 && limitParam > 0;

  // ── Build NocoDB where filter ──────────────────────────────────────────────
  const filters: string[] = [];
  if (stageId)  filters.push(`(Stage_Id,eq,${stageId})`);
  if (status)   filters.push(`(Estado,eq,${status})`);
  if (userId)   filters.push(`(Usuario_Id,eq,${userId})`);
  if (origin)   filters.push(`(Origen,eq,${encodeURIComponent(origin)})`);
  if (search)   filters.push(`(Nombre,like,%${search}%)`);

  const params: Record<string, string> = { sort: '-Fecha_Creacion' };
  if (filters.length === 1) params.where = filters[0];
  if (filters.length > 1)  params.where = filters.join('~and');

  // ── Helper: enrich a single lead with derived fields ──────────────────────
  function enrich(lead: CrmLead): CrmLead {
    const now        = new Date();
    const createdAt  = lead.Fecha_Creacion      ? new Date(lead.Fecha_Creacion)      : now;
    const lastContact = lead.Fecha_Ultimo_Contacto ? new Date(lead.Fecha_Ultimo_Contacto) : createdAt;
    return {
      ...lead,
      days_without_activity: Math.floor((now.getTime() - lastContact.getTime()) / 86400000),
    };
  }

  try {
    let rows: CrmLead[];
    let total: number;
    let pages = 1;

    if (isPaginated) {
      // ── Server-side: only fetch the requested page ─────────────────────────
      const result = await listRowsPage<CrmLead>(PROJECT, TABLE, pageParam, limitParam, params);
      rows  = result.list;
      total = result.total;
      pages = result.pages;
    } else {
      // ── Legacy / Kanban: fetch all matching rows ───────────────────────────
      rows  = await listAllRows<CrmLead>(PROJECT, TABLE, params);
      total = rows.length;
    }

    const enriched = rows.map(enrich);

    // Optionally attach activity counts (only for full fetch, too slow for paginated)
    let finalRows = enriched;
    if (includeActivities && TABLE_ACTIVITIES && !isPaginated) {
      const allActivities = await listAllRows<{ Lead_Id: number }>(PROJECT, TABLE_ACTIVITIES, { fields: 'Lead_Id' });
      const countMap: Record<number, number> = {};
      allActivities.forEach((a) => { countMap[a.Lead_Id] = (countMap[a.Lead_Id] || 0) + 1; });
      finalRows = enriched.map((l) => ({ ...l, activity_count: countMap[l.Id] || 0 }));
    }

    return NextResponse.json({
      success:  true,
      data:     finalRows,
      total,
      page:     isPaginated ? pageParam : 1,
      pageSize: isPaginated ? limitParam : total,
      pages,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, data: [], total: 0, pages: 1, error: msg }, { status: 500 });
  }
}

// ─── POST /api/crm/leads ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!TABLE) return NextResponse.json({ success: false, error: 'CRM Leads table not configured.' }, { status: 503 });

  try {
    const body = await req.json();

    // Lookup stage name & color if only stage_id provided
    let stageName  = body.Stage_Nombre || '';
    let stageColor = body.Stage_Color  || '#3b82f6';
    if (body.Stage_Id && TABLE_STAGES && !stageName) {
      try {
        const stages = await listAllRows<{ Id: number; Nombre: string; Color: string }>(PROJECT, TABLE_STAGES);
        const found  = stages.find((s) => s.Id === Number(body.Stage_Id));
        if (found) { stageName = found.Nombre; stageColor = found.Color; }
      } catch { /* ignore lookup error */ }
    }

    const now = new Date().toISOString();
    const row = await insertRow<CrmLead>(PROJECT, TABLE, {
      Nombre:               body.Nombre               || '',
      Telefono:             body.Telefono              || '',
      Email:                body.Email                 || '',
      Empresa:              body.Empresa               || '',
      Origen:               body.Origen                || 'Otro',
      ID_Campana:           body.ID_Campana            || '',
      Nombre_Campana:       body.Nombre_Campana        || '',
      Plataforma_Origen:    body.Plataforma_Origen     || '',
      Valor_Estimado:       Number(body.Valor_Estimado) || 0,
      Stage_Id:             Number(body.Stage_Id)      || 1,
      Stage_Nombre:         stageName || 'Nuevo Lead',
      Stage_Color:          stageColor,
      Usuario_Id:           Number(body.Usuario_Id)    || 1,
      Usuario_Nombre:       body.Usuario_Nombre        || 'Administrador',
      Fecha_Creacion:       now,
      Fecha_Ultimo_Contacto: now,
      Proxima_Accion_Fecha: body.Proxima_Accion_Fecha  || '',
      Estado:               'abierto',
      Motivo_Perdida:       '',
      Notas:                body.Notas                 || '',
      Fecha_Cierre:         '',
    });

    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
