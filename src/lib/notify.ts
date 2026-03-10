/**
 * notify.ts — Notification system for new CRM leads
 *
 * Supports two channels (configurable via .env.local):
 *   1. Generic webhook (Make, n8n, Zapier, Slack, Discord, etc.)
 *   2. WhatsApp Business API via Meta (if credentials are set)
 *
 * Env vars:
 *   NOTIFY_WEBHOOK_URL       — POST URL to receive lead payloads
 *   NOTIFY_WEBHOOK_SECRET    — Optional: added as Authorization header
 *   NOTIFY_WA_PHONE_NUMBER_ID — WhatsApp Business phone number ID
 *   NOTIFY_WA_ACCESS_TOKEN   — WhatsApp Business access token
 *   NOTIFY_WA_TO             — Recipient phone(s), comma-separated (e.g. "+573001234567")
 */

export interface LeadNotification {
  leadId:       number;
  nombre:       string;
  campaña:      string;
  plataforma:   string;
  stageName:    string;
  cpl:          number;          // costo por lead en COP
  fecha:        string;          // ISO
  totalCreated: number;          // total leads created in this sync batch
}

// ─── Generic Webhook ─────────────────────────────────────────────────────────

async function sendWebhook(leads: LeadNotification[]): Promise<void> {
  const url = process.env.NOTIFY_WEBHOOK_URL;
  if (!url) return;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const secret = process.env.NOTIFY_WEBHOOK_SECRET;
  if (secret) headers['Authorization'] = `Bearer ${secret}`;

  const payload = {
    event:     'new_leads',
    timestamp: new Date().toISOString(),
    count:     leads.length,
    leads,
  };

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers,
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn(`[notify] Webhook returned ${res.status}: ${await res.text().catch(() => '')}`);
    } else {
      console.log(`[notify] ✓ Webhook sent (${leads.length} leads) → ${res.status}`);
    }
  } catch (e) {
    console.warn('[notify] Webhook error:', e);
  }
}

// ─── WhatsApp via Meta Cloud API ─────────────────────────────────────────────

function formatWaMessage(leads: LeadNotification[]): string {
  const count = leads.length;
  const plural = count !== 1;
  const lines = [
    `🟢 *${count} nuevo${plural ? 's' : ''} lead${plural ? 's' : ''} en CRM*`,
    '',
  ];

  for (const l of leads.slice(0, 5)) {
    const cpl = l.cpl > 0 ? `  💰 CPL: $${l.cpl.toLocaleString('es-CO')} COP` : '';
    lines.push(
      `• *${l.nombre}*`,
      `  📣 Campaña: ${l.campaña}`,
      `  📊 Etapa: ${l.stageName}`,
      `  🌐 Plataforma: ${l.plataforma}`,
      cpl,
    );
  }

  if (leads.length > 5) {
    lines.push(`...y ${leads.length - 5} más.`);
  }

  lines.push('', '_Accede al CRM para gestionar los leads._');
  return lines.filter((l) => l !== undefined).join('\n');
}

async function sendWhatsApp(leads: LeadNotification[]): Promise<void> {
  const phoneId    = process.env.NOTIFY_WA_PHONE_NUMBER_ID;
  const token      = process.env.NOTIFY_WA_ACCESS_TOKEN;
  const recipients = process.env.NOTIFY_WA_TO;

  if (!phoneId || !token || !recipients) return;

  const message = formatWaMessage(leads);
  const toList  = recipients.split(',').map((p) => p.trim()).filter(Boolean);
  const version = process.env.META_API_VERSION || 'v19.0';
  const url     = `https://graph.facebook.com/${version}/${phoneId}/messages`;

  for (const to of toList) {
    try {
      const res = await fetch(url, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message },
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        console.warn(`[notify] WhatsApp to ${to} failed (${res.status}): ${errBody.slice(0, 200)}`);
      } else {
        console.log(`[notify] ✓ WhatsApp sent to ${to}`);
      }
    } catch (e) {
      console.warn(`[notify] WhatsApp error for ${to}:`, e);
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fire all configured notification channels for new CRM leads.
 * This is fire-and-forget: errors are logged but never thrown.
 */
export async function notifyNewLeads(leads: LeadNotification[]): Promise<void> {
  if (!leads.length) return;

  await Promise.allSettled([
    sendWebhook(leads),
    sendWhatsApp(leads),
  ]);
}

export function isNotifyConfigured(): boolean {
  return !!(
    process.env.NOTIFY_WEBHOOK_URL ||
    (process.env.NOTIFY_WA_PHONE_NUMBER_ID && process.env.NOTIFY_WA_ACCESS_TOKEN && process.env.NOTIFY_WA_TO)
  );
}
