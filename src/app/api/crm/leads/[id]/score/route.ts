/**
 * GET /api/crm/leads/[id]/score
 * Calcula el lead score y la probabilidad de cierre en tiempo real.
 * Cacheable 5 min por lead.
 */
import { NextRequest, NextResponse } from 'next/server';
import { listAllRows } from '@/lib/nocodb';
import { getProjectId, requireAuth } from '@/lib/apiAuth';
import { cacheGet, cacheSet } from '@/lib/cache';
import { calculateLeadScore } from '@/lib/leadScoring';
import type { CrmLead, CrmActivity } from '@/types';

const TABLE_LEADS      = process.env.NOCODB_TABLE_CRM_LEADS       || '';
const TABLE_ACTIVITIES = process.env.NOCODB_TABLE_CRM_ACTIVITIES  || '';
const TTL_MS = 5 * 60 * 1000; // 5 min

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = requireAuth(req);
  if (!session) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const PROJECT = getProjectId(req);
  const { id } = await params;
  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
  }

  const cacheKey = `lead_score:${id}`;
  const cached = await cacheGet<ReturnType<typeof calculateLeadScore>>(cacheKey);
  if (cached) {
    return NextResponse.json({ success: true, data: cached }, { headers: { 'X-Cache': 'HIT' } });
  }

  try {
    // Fetch lead
    if (!TABLE_LEADS) {
      return NextResponse.json({ success: false, error: 'CRM Leads table not configured' }, { status: 503 });
    }
    const leads = await listAllRows<CrmLead>(PROJECT, TABLE_LEADS, {
      where: `(Id,eq,${id})`,
      limit: '1',
    });
    if (!leads.length) {
      return NextResponse.json({ success: false, error: 'Lead no encontrado' }, { status: 404 });
    }
    const lead = leads[0];

    // Fetch activities for this lead
    let activities: CrmActivity[] = [];
    if (TABLE_ACTIVITIES) {
      activities = await listAllRows<CrmActivity>(PROJECT, TABLE_ACTIVITIES, {
        where: `(Lead_Id,eq,${id})`,
        limit: '100',
        sort: '-Fecha',
      }).catch(() => []);
    }

    const scoreResult = calculateLeadScore(lead, activities);
    await cacheSet(cacheKey, scoreResult, TTL_MS);

    return NextResponse.json(
      { success: true, data: scoreResult },
      { headers: { 'X-Cache': 'MISS' } },
    );
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
