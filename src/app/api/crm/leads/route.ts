import { NextRequest, NextResponse } from 'next/server';
import { listAllRows, listRowsPage, insertRow } from '@/lib/nocodb';
import type { CrmLead } from '@/types';

const PROJECT          = process.env.NOCODB_PROJECT_ID            || '';
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
  if (origin)   filters.push(`(Origen,eq,${origin})`);
  if (search)   filters.push(`(Nombre,like,%${search}%)`);

  const params: Record<string, string> = { sort: '-Fecha_Creacion' };
  if (filters.length === 1) params.where = filters[0];
  if (filters.length > 1)  params.where = filters.join('~and');

  // ── Helper: enrich a single lead with derived fields ──────────────────────
  function enrich(
    lead: CrmLead,
    stageMap?: Map<number, { Color: string; Nombre: string }>,
    firstStageId?: number,
  ): CrmLead {
    const now         = new Date();
    const createdAt   = lead.Fecha_Creacion         ? new Date(lead.Fecha_Creacion)         : now;
    const lastContact = lead.Fecha_Ultimo_Contacto  ? new Date(lead.Fecha_Ultimo_Contacto)  : createdAt;

    // Resolve Stage_Id — if missing/0/NaN or doesn't exist in stageMap, fall back to first stage
    let stageId = Number(lead.Stage_Id);
    if (stageMap && stageMap.size > 0) {
      if (!stageId || isNaN(stageId) || !stageMap.has(stageId)) {
        stageId = firstStageId ?? [...stageMap.keys()][0];
      }
    }

    const stage = stageMap?.get(stageId);
    return {
      ...lead,
      Stage_Id:              stageId,
      Stage_Color:           stage?.Color  || lead.Stage_Color  || '#6366f1',
      Stage_Nombre:          stage?.Nombre || lead.Stage_Nombre || '',
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

    // Build stage color/name map if available
    let stageMap: Map<number, { Color: string; Nombre: string }> | undefined;
    let firstStageId: number | undefined;
    if (TABLE_STAGES) {
      try {
        const stages = await listAllRows<{ Id: number; Nombre: string; Color: string; Orden: number }>(
          PROJECT, TABLE_STAGES, { fields: 'Id,Nombre,Color,Orden', sort: 'Orden' }
        );
        stageMap = new Map(stages.map((s) => [Number(s.Id), { Color: s.Color, Nombre: s.Nombre }]));
        if (stages.length > 0) firstStageId = Number(stages[0].Id);
      } catch { /* ignore */ }
    }

    const enriched = rows.map((r) => enrich(r, stageMap, firstStageId));

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
      Ciudad:               body.Ciudad                || '',
      ID_Campana:           body.ID_Campana            || '',
      Nombre_Campana:       body.Nombre_Campana        || '',
      Plataforma_Origen:    body.Plataforma_Origen     || '',
      Valor_Estimado:       Number(body.Valor_Estimado) || 0,
      Precio_Plan:          Number(body.Precio_Plan)   || 0,
      Plan_Separe:          Number(body.Plan_Separe)   || 0,
      Comprobante:          Boolean(body.Comprobante)  || false,
      Stage_Id:             Number(body.Stage_Id)      || 1,
      Stage_Nombre:         stageName || 'Agendamiento Tenida',
      Stage_Color:          stageColor,
      Usuario_Id:           Number(body.Usuario_Id)    || 1,
      Usuario_Nombre:       body.Usuario_Nombre        || 'Oscar',
      Fecha_Creacion:       now,
      Fecha_Inicio:         body.Fecha_Inicio          || '',
      Dia_Primer_Contacto:  body.Dia_Primer_Contacto   || '',
      Dia_Cierre:           body.Dia_Cierre            || '',
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
