import { NextRequest, NextResponse } from 'next/server';
import { listAllRows, insertRow, updateRow } from '@/lib/nocodb';
import type { CrmActivity, CrmLead } from '@/types';

const PROJECT        = process.env.NOCODB_PROJECT_ID           || '';
const TABLE          = process.env.NOCODB_TABLE_CRM_ACTIVITIES || '';
const TABLE_LEADS    = process.env.NOCODB_TABLE_CRM_LEADS      || '';

// ─── GET /api/crm/activities?leadId=X ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!TABLE) {
    return NextResponse.json({ success: false, data: [], error: 'CRM Activities table not configured.' }, { status: 503 });
  }
  const { searchParams } = new URL(req.url);
  const leadIdRaw = searchParams.get('leadId');
  const leadId    = leadIdRaw && /^\d+$/.test(leadIdRaw) ? leadIdRaw : null;

  if (leadIdRaw && !leadId) {
    return NextResponse.json({ success: false, data: [], error: 'leadId inválido' }, { status: 400 });
  }

  try {
    const params: Record<string, string> = { sort: '-Fecha' };
    if (leadId) params.where = `(Lead_Id,eq,${leadId})`;

    const rows = await listAllRows<CrmActivity>(PROJECT, TABLE, params);
    return NextResponse.json({ success: true, data: rows });
  } catch (e) {
    return NextResponse.json({ success: false, data: [], error: String(e) }, { status: 500 });
  }
}

// ─── POST /api/crm/activities ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!TABLE) return NextResponse.json({ success: false, error: 'CRM Activities table not configured.' }, { status: 503 });

  try {
    const body = await req.json();
    const now  = new Date().toISOString();

    const row = await insertRow<CrmActivity>(PROJECT, TABLE, {
      Lead_Id:              Number(body.Lead_Id),
      Lead_Nombre:          body.Lead_Nombre          || '',
      Usuario_Id:           Number(body.Usuario_Id)   || 1,
      Usuario_Nombre:       body.Usuario_Nombre       || 'Administrador',
      Tipo:                 body.Tipo                 || 'Nota',
      Resultado:            body.Resultado            || '',
      Nota:                 body.Nota                 || '',
      Fecha:                body.Fecha                || now,
      Proxima_Accion_Fecha: body.Proxima_Accion_Fecha || '',
      Proxima_Accion_Nota:  body.Proxima_Accion_Nota  || '',
    });

    // Update Fecha_Ultimo_Contacto (and optionally Proxima_Accion_Fecha) on the related lead
    if (body.Lead_Id && TABLE_LEADS) {
      const updateData: Record<string, unknown> = { Fecha_Ultimo_Contacto: now };
      if (body.Proxima_Accion_Fecha) updateData.Proxima_Accion_Fecha = body.Proxima_Accion_Fecha;
      if (body.Proxima_Accion_Nota)  updateData.Proxima_Accion_Nota  = body.Proxima_Accion_Nota;
      try {
        await updateRow<CrmLead>(PROJECT, TABLE_LEADS, Number(body.Lead_Id), updateData as Partial<CrmLead>);
      } catch (updateErr) {
        // Activity was saved — only log the lead update failure, don't fail the request
        console.warn('[activities] Failed to update lead contact date:', updateErr);
      }
    }

    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
