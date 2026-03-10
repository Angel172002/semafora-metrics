import { NextResponse } from 'next/server';
import { listAllRows } from '@/lib/nocodb';
import type { CrmStage } from '@/types';

const PROJECT  = process.env.NOCODB_PROJECT_ID || '';
const TABLE    = process.env.NOCODB_TABLE_CRM_STAGES || '';

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
