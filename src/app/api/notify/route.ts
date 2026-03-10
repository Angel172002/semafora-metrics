/**
 * POST /api/notify — Test notification delivery
 * GET  /api/notify — Show notification configuration status
 *
 * POST body (optional):
 *   { "leads": [...] }   — Send specific leads; omit to send a test lead
 */

import { NextRequest, NextResponse } from 'next/server';
import { notifyNewLeads, isNotifyConfigured, type LeadNotification } from '@/lib/notify';

export async function GET() {
  const webhookUrl = process.env.NOTIFY_WEBHOOK_URL;
  const waPhone    = process.env.NOTIFY_WA_PHONE_NUMBER_ID;
  const waToken    = process.env.NOTIFY_WA_ACCESS_TOKEN;
  const waTo       = process.env.NOTIFY_WA_TO;

  return NextResponse.json({
    configured: isNotifyConfigured(),
    channels: {
      webhook: {
        active: !!webhookUrl,
        url:    webhookUrl ? `${webhookUrl.slice(0, 30)}…` : 'NOT SET',
      },
      whatsapp: {
        active:  !!(waPhone && waToken && waTo),
        phoneId: waPhone   || 'NOT SET',
        token:   waToken   ? '***configured***' : 'NOT SET',
        to:      waTo      || 'NOT SET',
      },
    },
    usage: 'POST /api/notify to send a test notification',
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const leads: LeadNotification[] = body.leads ?? [
    {
      leadId:       0,
      nombre:       'Lead WA · Campaña de Prueba',
      campaña:      'Campaña de Prueba',
      plataforma:   'Meta',
      stageName:    'Nuevo Lead',
      cpl:          45000,
      fecha:        new Date().toISOString(),
      totalCreated: 1,
    },
  ];

  if (!isNotifyConfigured()) {
    return NextResponse.json({
      success: false,
      message: 'No hay canales de notificación configurados. Agrega NOTIFY_WEBHOOK_URL o las variables NOTIFY_WA_* en .env.local',
      channels: {
        NOTIFY_WEBHOOK_URL:        process.env.NOTIFY_WEBHOOK_URL        ? '✅ set' : '❌ missing',
        NOTIFY_WA_PHONE_NUMBER_ID: process.env.NOTIFY_WA_PHONE_NUMBER_ID ? '✅ set' : '❌ missing',
        NOTIFY_WA_ACCESS_TOKEN:    process.env.NOTIFY_WA_ACCESS_TOKEN    ? '✅ set' : '❌ missing',
        NOTIFY_WA_TO:              process.env.NOTIFY_WA_TO              ? '✅ set' : '❌ missing',
      },
    }, { status: 400 });
  }

  await notifyNewLeads(leads);

  return NextResponse.json({
    success: true,
    message: `Notificación enviada (${leads.length} lead${leads.length !== 1 ? 's' : ''})`,
    leads,
  });
}
