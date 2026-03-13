/**
 * GET /api/billing/status
 * Returns the current subscription status, plan details, and usage for the authenticated tenant.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { getSubscription, effectivePlan, PLANS } from '@/lib/plans';
import { listAllRows } from '@/lib/nocodb';

const MASTER_PROJ  = process.env.NOCODB_PROJECT_ID       ?? '';
const USERS_TABLE  = process.env.NOCODB_TABLE_USERS      ?? '';
const LEADS_TABLE  = process.env.NOCODB_TABLE_CRM_LEADS  ?? '';

export async function GET(req: NextRequest) {
  const session = requireAuth(req);
  if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const sub    = await getSubscription(session.tenant_id);
  const planId = effectivePlan(sub);
  const plan   = PLANS[planId];

  // Usage counts (best-effort — don't fail the whole response if these error)
  let usageLeads = 0;
  let usageUsers = 0;

  try {
    if (LEADS_TABLE && MASTER_PROJ) {
      // Count leads created this month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const rows = await listAllRows<{ Id: number }>(MASTER_PROJ, LEADS_TABLE, {
        fields: 'Id',
        where:  `(Tenant_Id,eq,${session.tenant_id})~and(Fecha_Creacion,gte,${monthStart.toISOString().split('T')[0]})`,
        limit:  '9999',
      });
      usageLeads = rows.length;
    }
  } catch { /* ignore */ }

  try {
    if (USERS_TABLE && MASTER_PROJ) {
      const rows = await listAllRows<{ Id: number }>(MASTER_PROJ, USERS_TABLE, {
        fields: 'Id',
        where:  `(Tenant_Id,eq,${session.tenant_id})~and(Activo,eq,true)`,
        limit:  '999',
      });
      usageUsers = rows.length;
    }
  } catch { /* ignore */ }

  return NextResponse.json({
    success: true,
    subscription: sub
      ? {
          plan:               sub.Plan,
          status:             sub.Status,
          currentPeriodEnd:   sub.Current_Period_End,
          cancelAtPeriodEnd:  sub.Cancel_At_Period_End,
          trialEnd:           sub.Trial_End ?? null,
        }
      : null,
    effectivePlan: planId,
    plan: {
      nombre:    plan.nombre,
      precio:    plan.precio,
      color:     plan.color,
      limits:    plan.limits,
      features:  plan.features,
    },
    usage: {
      leadsThisMonth: usageLeads,
      activeUsers:    usageUsers,
    },
  });
}
