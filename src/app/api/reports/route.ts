/**
 * POST /api/reports — Genera un reporte y lo envía por email
 *
 * Body: {
 *   period:   'semanal' | 'mensual',
 *   email:    string,        // destinatario
 *   sections: { kpis, campaigns, crm, topCampaigns }
 * }
 *
 * Envío de email: usa Resend (resend.com) o fallback a log de HTML en dev.
 * Variable requerida: RESEND_API_KEY
 */
import { NextRequest, NextResponse } from 'next/server';
import { listAllRows } from '@/lib/nocodb';
import { getProjectId, getTenantId, requireAuth } from '@/lib/apiAuth';
import { buildReportHtml } from '@/lib/reportGenerator';
import { z } from 'zod';
import type { CrmLead, DashboardData } from '@/types';

const TABLE_LEADS = process.env.NOCODB_TABLE_CRM_LEADS || '';

const ReportSchema = z.object({
  period:  z.enum(['semanal', 'mensual']),
  email:   z.string().email().max(200),
  sections: z.object({
    kpis:         z.boolean().default(true),
    campaigns:    z.boolean().default(true),
    crm:          z.boolean().default(true),
    topCampaigns: z.boolean().default(true),
  }).default({ kpis: true, campaigns: true, crm: true, topCampaigns: true }),
});

function getDateRange(period: 'semanal' | 'mensual'): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const dateTo = now.toISOString().slice(0, 10);
  const days = period === 'semanal' ? 7 : 30;
  const from = new Date(now.getTime() - days * 86_400_000);
  return { dateFrom: from.toISOString().slice(0, 10), dateTo };
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Dev fallback: log para revisión manual
    console.log('[reports] No RESEND_API_KEY — email not sent. Subject:', subject);
    console.log('[reports] To:', to, '| HTML length:', html.length);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    process.env.RESEND_FROM_EMAIL ?? 'reportes@semafora.co',
      to:      [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API error: ${err.slice(0, 200)}`);
  }
}

export async function POST(req: NextRequest) {
  const session = requireAuth(req);
  if (!session) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = ReportSchema.safeParse(body);
  if (!parsed.success) {
    const msgs = parsed.error.issues?.map(e => `${e.path.join('.')}: ${e.message}`).join('; ') || 'Datos inválidos';
    return NextResponse.json({ success: false, error: msgs }, { status: 400 });
  }

  const { period, email, sections } = parsed.data;
  const PROJECT   = getProjectId(req);
  const tenantId  = getTenantId(req);
  const { dateFrom, dateTo } = getDateRange(period);

  // Fetch dashboard data via internal API call
  let dashboard: DashboardData | null = null;
  try {
    const metricsUrl = new URL('/api/metrics', req.url);
    metricsUrl.searchParams.set('range', period === 'semanal' ? '7d' : '30d');
    const metricsRes = await fetch(metricsUrl.toString(), {
      headers: {
        'x-session-project': PROJECT,
        'x-session-tenant':  String(tenantId),
        'x-session-role':    req.headers.get('x-session-role') ?? 'admin',
        'x-session-sub':     req.headers.get('x-session-sub') ?? '0',
        'x-session-email':   req.headers.get('x-session-email') ?? '',
      },
    });
    if (metricsRes.ok) {
      const j = await metricsRes.json() as { success: boolean; data: DashboardData };
      if (j.success) dashboard = j.data;
    }
  } catch (e) {
    console.warn('[reports] Could not fetch metrics:', e);
  }

  // Fetch leads for CRM section
  let leads: CrmLead[] = [];
  if (TABLE_LEADS && sections.crm) {
    try {
      leads = await listAllRows<CrmLead>(PROJECT, TABLE_LEADS, {
        limit: '500',
        sort: '-Fecha_Creacion',
      });
    } catch (e) {
      console.warn('[reports] Could not fetch leads:', e);
    }
  }

  if (!dashboard) {
    return NextResponse.json({
      success: false,
      error: 'No se pudieron obtener las métricas. Verifica la configuración.',
    }, { status: 502 });
  }

  const tenantNombre = req.headers.get('x-session-email')?.split('@')[1]?.split('.')[0] ?? 'Mi Empresa';

  const html = buildReportHtml({
    config: {
      tenantNombre,
      period,
      dateFrom,
      dateTo,
      includeSections: sections,
    },
    dashboard,
    leads,
  });

  const subject = `📊 Reporte ${period === 'semanal' ? 'Semanal' : 'Mensual'} — Semáfora Metrics (${dateFrom} → ${dateTo})`;

  try {
    await sendEmail(email, subject, html);
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 502 });
  }

  return NextResponse.json({
    success: true,
    message: `Reporte ${period} enviado a ${email}`,
    period,
    dateRange: { dateFrom, dateTo },
  });
}

// GET — preview del reporte en el navegador
export async function GET(req: NextRequest) {
  const session = requireAuth(req);
  if (!session) return new Response('No autorizado', { status: 401 });

  const PROJECT  = getProjectId(req);
  const tenantId = getTenantId(req);
  const period   = (req.nextUrl.searchParams.get('period') ?? 'semanal') as 'semanal' | 'mensual';
  const { dateFrom, dateTo } = getDateRange(period);

  let dashboard: DashboardData | null = null;
  let leads: CrmLead[] = [];

  try {
    const metricsUrl = new URL('/api/metrics', req.url);
    metricsUrl.searchParams.set('range', period === 'semanal' ? '7d' : '30d');
    const r = await fetch(metricsUrl.toString(), {
      headers: {
        'x-session-project': PROJECT,
        'x-session-tenant':  String(tenantId),
        'x-session-role':    req.headers.get('x-session-role') ?? 'admin',
        'x-session-sub':     req.headers.get('x-session-sub') ?? '0',
        'x-session-email':   req.headers.get('x-session-email') ?? '',
      },
    });
    if (r.ok) { const j = await r.json(); if (j.success) dashboard = j.data; }
  } catch { /* ignore */ }

  if (TABLE_LEADS) {
    leads = await listAllRows<CrmLead>(PROJECT, TABLE_LEADS, { limit: '500' }).catch(() => []);
  }

  if (!dashboard) {
    return new Response('No hay datos disponibles.', { status: 502, headers: { 'Content-Type': 'text/plain' } });
  }

  const tenantNombre = req.headers.get('x-session-email')?.split('@')[1]?.split('.')[0] ?? 'Mi Empresa';
  const html = buildReportHtml({
    config: { tenantNombre, period, dateFrom, dateTo, includeSections: { kpis: true, campaigns: true, crm: true, topCampaigns: true } },
    dashboard,
    leads,
  });

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
