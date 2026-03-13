/**
 * POST /api/onboarding — Guarda la configuración inicial del tenant
 *
 * Guarda en NocoDB:
 *   - Tokens de Meta Ads y Google Ads en la tabla Tenant_Config
 *   - Actualiza el nombre/industria en la tabla Tenants
 *   - Envía invitaciones por email a los teammates (si RESEND_API_KEY)
 *
 * Body: {
 *   empresa:       string,
 *   industria:     string,
 *   metaToken:     string,
 *   metaAccountId: string,
 *   googleToken:   string,
 *   teammates:     string,   // emails separados por coma
 * }
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { insertRow, listAllRows, updateRow } from '@/lib/nocodb';
import { z } from 'zod';

const MASTER_PROJ     = process.env.NOCODB_PROJECT_ID     ?? '';
const TENANTS_TABLE   = process.env.NOCODB_TABLE_TENANTS  ?? '';
const CONFIG_TABLE    = process.env.NOCODB_TABLE_CONFIG   ?? ''; // opcional
const RESEND_API_KEY  = process.env.RESEND_API_KEY        ?? '';
const FROM_EMAIL      = process.env.RESEND_FROM_EMAIL     ?? 'onboarding@semafora.co';

const OnboardingSchema = z.object({
  empresa:       z.string().max(200).optional(),
  industria:     z.string().max(100).optional(),
  metaToken:     z.string().max(500).optional(),
  metaAccountId: z.string().max(50).optional(),
  googleToken:   z.string().max(500).optional(),
  teammates:     z.string().max(1000).optional(),
});

// ─── Guardar config key-value en NocoDB ───────────────────────────────────────

async function saveConfig(tenantId: number, key: string, value: string) {
  if (!CONFIG_TABLE || !MASTER_PROJ || !value) return;
  try {
    // Check if key already exists for this tenant
    const existing = await listAllRows<{ Id: number }>(MASTER_PROJ, CONFIG_TABLE, {
      where: `(Tenant_Id,eq,${tenantId})~and(Key,eq,${key})`,
      fields: 'Id',
      limit: '1',
    }).catch(() => []);

    if (existing.length > 0) {
      await updateRow(MASTER_PROJ, CONFIG_TABLE, existing[0].Id, { Value: value, Updated_At: new Date().toISOString().replace('T', ' ').slice(0, 19) });
    } else {
      await insertRow(MASTER_PROJ, CONFIG_TABLE, {
        Tenant_Id: tenantId,
        Key: key,
        Value: value,
        Created_At: new Date().toISOString().replace('T', ' ').slice(0, 19),
      });
    }
  } catch (e) {
    console.warn(`[onboarding] Could not save config key "${key}":`, e);
  }
}

// ─── Enviar invitación por email ──────────────────────────────────────────────

async function sendInvite(toEmail: string, tenantNombre: string, inviterNombre: string) {
  if (!RESEND_API_KEY || !toEmail) return;
  try {
    const html = `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px">
        <h1 style="color:#e20613;font-size:24px;margin-bottom:8px">SEMÁFORA METRICS</h1>
        <p style="color:#374151">Hola,</p>
        <p style="color:#374151">
          <strong>${inviterNombre}</strong> te ha invitado a unirte al espacio de
          <strong>${tenantNombre}</strong> en Semáfora Metrics.
        </p>
        <p style="color:#374151">
          Semáfora Metrics es el dashboard de publicidad digital + CRM que tu equipo usará para
          gestionar campañas de Meta, Google y TikTok Ads.
        </p>
        <a href="${process.env.NEXTAUTH_URL ?? 'https://semafora-metrics.vercel.app'}/register"
           style="display:inline-block;margin-top:16px;padding:12px 28px;background:#e20613;color:#fff;border-radius:8px;text-decoration:none;font-weight:700">
          Crear mi cuenta →
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px">
          Este enlace es para ${toEmail}. Si no esperabas esta invitación, ignora este mensaje.
        </p>
      </div>`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: [toEmail], subject: `${inviterNombre} te invitó a Semáfora Metrics`, html }),
    });
  } catch (e) {
    console.warn('[onboarding] Invite email failed:', e);
  }
}

// ─── POST /api/onboarding ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = requireAuth(req);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body   = await req.json().catch(() => ({}));
  const parsed = OnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const { empresa, industria, metaToken, metaAccountId, googleToken, teammates } = parsed.data;
  const tenantId = session.tenant_id ?? 0;

  const results: string[] = [];

  // 1. Actualizar nombre/industria del tenant
  if ((empresa || industria) && TENANTS_TABLE && tenantId > 0) {
    try {
      const rows = await listAllRows<{ Id: number }>(MASTER_PROJ, TENANTS_TABLE, {
        where: `(Id,eq,${tenantId})`,
        fields: 'Id',
        limit: '1',
      }).catch(() => []);
      if (rows.length > 0) {
        const update: Record<string, string> = {};
        if (empresa)   update.Nombre     = empresa;
        if (industria) update.Industria  = industria;
        await updateRow(MASTER_PROJ, TENANTS_TABLE, rows[0].Id, update).catch(() => null);
        results.push('tenant actualizado');
      }
    } catch (e) {
      console.warn('[onboarding] Could not update tenant:', e);
    }
  }

  // 2. Guardar integraciones en Tenant_Config
  await saveConfig(tenantId, 'META_ACCESS_TOKEN',  metaToken     ?? '');
  await saveConfig(tenantId, 'META_AD_ACCOUNT_ID', metaAccountId ?? '');
  await saveConfig(tenantId, 'GOOGLE_REFRESH_TOKEN', googleToken ?? '');

  if (metaToken)     results.push('Meta Ads configurado');
  if (googleToken)   results.push('Google Ads configurado');

  // 3. Enviar invitaciones a teammates
  if (teammates) {
    const emails = teammates.split(',').map(e => e.trim()).filter(e => e.includes('@'));
    const inviterNombre = session.nombre ?? session.email;
    const tenantNombre  = session.tenant_nombre ?? empresa ?? 'tu equipo';
    for (const email of emails.slice(0, 10)) {
      await sendInvite(email, tenantNombre, inviterNombre);
    }
    if (emails.length > 0) results.push(`${emails.length} invitación(es) enviadas`);
  }

  return NextResponse.json({
    success: true,
    saved: results,
    message: results.length > 0 ? results.join(', ') : 'Onboarding completado',
  });
}
