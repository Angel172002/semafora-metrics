/**
 * plans.ts — Plan definitions, feature limits, and feature gates
 *
 * Plans:
 *   starter    $49/mes  — 1 ad account, 5 users, 500 leads/mes
 *   agencia    $149/mes — 5 ad accounts, 15 users, 2k leads/mes, PDF exports
 *   enterprise $399/mes — unlimited everything, white-label, API key, priority support
 */

// ─── Plan IDs ─────────────────────────────────────────────────────────────────

export type PlanId = 'starter' | 'agencia' | 'enterprise' | 'trial' | 'none';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'none';

// ─── Plan definitions ─────────────────────────────────────────────────────────

export interface Plan {
  id:           PlanId;
  nombre:       string;
  precio:       number;      // USD/mes
  precioAnual:  number;      // USD/año (descuento ~20%)
  descripcion:  string;
  color:        string;
  limits: {
    adAccounts:    number;   // -1 = unlimited
    users:         number;   // -1 = unlimited
    leadsPerMonth: number;   // -1 = unlimited
    syncsPerDay:   number;   // -1 = unlimited
  };
  features: {
    metaAds:        boolean;
    googleAds:      boolean;
    tiktokAds:      boolean;
    crmKanban:      boolean;
    crmAnalytics:   boolean;
    pdfExports:     boolean;
    webhooks:       boolean;
    apiAccess:      boolean;
    whiteLabel:     boolean;
    prioritySupport: boolean;
    aiInsights:     boolean;
  };
}

export const PLANS: Record<PlanId, Plan> = {
  none: {
    id: 'none', nombre: 'Sin plan', precio: 0, precioAnual: 0,
    descripcion: 'Sin suscripción activa', color: '#6b7280',
    limits: { adAccounts: 0, users: 0, leadsPerMonth: 0, syncsPerDay: 0 },
    features: {
      metaAds: false, googleAds: false, tiktokAds: false,
      crmKanban: false, crmAnalytics: false, pdfExports: false,
      webhooks: false, apiAccess: false, whiteLabel: false,
      prioritySupport: false, aiInsights: false,
    },
  },

  trial: {
    id: 'trial', nombre: 'Prueba gratuita', precio: 0, precioAnual: 0,
    descripcion: '14 días gratis con todas las funciones Agencia', color: '#8b5cf6',
    limits: { adAccounts: 5, users: 15, leadsPerMonth: 2000, syncsPerDay: 4 },
    features: {
      metaAds: true, googleAds: true, tiktokAds: true,
      crmKanban: true, crmAnalytics: true, pdfExports: true,
      webhooks: true, apiAccess: false, whiteLabel: false,
      prioritySupport: false, aiInsights: false,
    },
  },

  starter: {
    id: 'starter', nombre: 'Starter', precio: 49, precioAnual: 470,
    descripcion: 'Para freelancers y agencias pequeñas', color: '#3b82f6',
    limits: { adAccounts: 1, users: 5, leadsPerMonth: 500, syncsPerDay: 2 },
    features: {
      metaAds: true, googleAds: false, tiktokAds: false,
      crmKanban: true, crmAnalytics: false, pdfExports: false,
      webhooks: false, apiAccess: false, whiteLabel: false,
      prioritySupport: false, aiInsights: false,
    },
  },

  agencia: {
    id: 'agencia', nombre: 'Agencia', precio: 149, precioAnual: 1430,
    descripcion: 'Para agencias con múltiples clientes', color: '#10b981',
    limits: { adAccounts: 5, users: 15, leadsPerMonth: 2000, syncsPerDay: 4 },
    features: {
      metaAds: true, googleAds: true, tiktokAds: true,
      crmKanban: true, crmAnalytics: true, pdfExports: true,
      webhooks: true, apiAccess: false, whiteLabel: false,
      prioritySupport: false, aiInsights: false,
    },
  },

  enterprise: {
    id: 'enterprise', nombre: 'Enterprise', precio: 399, precioAnual: 3830,
    descripcion: 'Para grandes equipos que necesitan más control', color: '#f59e0b',
    limits: { adAccounts: -1, users: -1, leadsPerMonth: -1, syncsPerDay: -1 },
    features: {
      metaAds: true, googleAds: true, tiktokAds: true,
      crmKanban: true, crmAnalytics: true, pdfExports: true,
      webhooks: true, apiAccess: true, whiteLabel: true,
      prioritySupport: true, aiInsights: true,
    },
  },
};

export const ORDERED_PLANS: PlanId[] = ['starter', 'agencia', 'enterprise'];

// ─── Subscription record (stored in NocoDB) ────────────────────────────────────

export interface Subscription {
  Id?:                    number;
  Tenant_Id:              number;
  Stripe_Customer_Id:     string;
  Stripe_Subscription_Id: string;
  Plan:                   PlanId;
  Status:                 SubscriptionStatus;
  Current_Period_End:     string;   // ISO date
  Cancel_At_Period_End:   boolean;
  Trial_End?:             string;   // ISO date, if trialing
}

// ─── NocoDB lookup ────────────────────────────────────────────────────────────

import { listAllRows, insertRow, updateRow } from './nocodb';

const MASTER_PROJ  = process.env.NOCODB_PROJECT_ID          ?? '';
const SUBS_TABLE   = process.env.NOCODB_TABLE_SUBSCRIPTIONS ?? '';

export async function getSubscription(tenantId: number): Promise<Subscription | null> {
  if (!SUBS_TABLE || !MASTER_PROJ) return null;
  try {
    const rows = await listAllRows<Subscription>(MASTER_PROJ, SUBS_TABLE, {
      where: `(Tenant_Id,eq,${tenantId})`,
      limit: '1',
    });
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function upsertSubscription(
  tenantId: number,
  data: Partial<Subscription>
): Promise<void> {
  if (!SUBS_TABLE || !MASTER_PROJ) return;
  try {
    const existing = await getSubscription(tenantId);
    if (existing?.Id) {
      await updateRow(MASTER_PROJ, SUBS_TABLE, existing.Id, data);
    } else {
      await insertRow(MASTER_PROJ, SUBS_TABLE, { Tenant_Id: tenantId, ...data });
    }
  } catch (e) {
    console.warn('[plans] upsertSubscription error:', e);
  }
}

// ─── Feature gate helpers ─────────────────────────────────────────────────────

/**
 * Get the plan for a given subscription status.
 * Returns 'none' if not active/trialing.
 */
export function effectivePlan(sub: Subscription | null): PlanId {
  if (!sub) return 'none';
  if (sub.Status === 'active' || sub.Status === 'trialing') return sub.Plan;
  if (sub.Status === 'past_due') return sub.Plan; // Grace period: keep access
  return 'none';
}

export function planHasFeature(
  planId: PlanId,
  feature: keyof Plan['features']
): boolean {
  return PLANS[planId]?.features[feature] ?? false;
}

export function planWithinLimit(
  planId: PlanId,
  limit: keyof Plan['limits'],
  current: number
): boolean {
  const max = PLANS[planId]?.limits[limit] ?? 0;
  if (max === -1) return true; // unlimited
  return current < max;
}

/**
 * Quick check — is the tenant allowed to use a feature?
 * Accepts the plan stored in the session (fast) or a fresh DB lookup (slow but accurate).
 */
export function canUseFeature(
  planId: PlanId,
  feature: keyof Plan['features']
): boolean {
  return planHasFeature(planId, feature);
}
