/**
 * POST /api/billing/webhook
 * Handles Stripe webhook events to keep subscription state in sync with NocoDB.
 *
 * Stripe → Webhook → NocoDB (subscriptions table)
 *
 * Events handled:
 *   checkout.session.completed          — new subscription created
 *   customer.subscription.updated       — plan changed, status changed
 *   customer.subscription.created       — subscription created
 *   customer.subscription.deleted       — subscription canceled/expired
 *   invoice.payment_failed              — mark as past_due
 *   invoice.payment_succeeded           — restore to active if it was past_due
 *
 * Note: Uses Stripe API 2026-02-25.clover
 *   - Subscription no longer has current_period_end; use billing_cycle_anchor
 *   - Invoice subscription is accessed via parent.subscription_details.subscription
 */
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { upsertSubscription } from '@/lib/plans';
import type { PlanId, SubscriptionStatus } from '@/lib/plans';

export const dynamic = 'force-dynamic';

function toIsoDate(ts: number | null | undefined): string {
  if (!ts) return '';
  return new Date(ts * 1000).toISOString().replace('T', ' ').slice(0, 19);
}

function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':     return 'active';
    case 'trialing':   return 'trialing';
    case 'past_due':   return 'past_due';
    case 'canceled':   return 'canceled';
    case 'incomplete': return 'incomplete';
    default:           return 'none';
  }
}

function extractPlan(sub: Stripe.Subscription): PlanId {
  const meta = sub.metadata?.plan as PlanId | undefined;
  if (meta) return meta;
  const priceId = sub.items.data[0]?.price?.id ?? '';
  if (priceId === process.env.STRIPE_PRICE_STARTER)    return 'starter';
  if (priceId === process.env.STRIPE_PRICE_AGENCIA)    return 'agencia';
  if (priceId === process.env.STRIPE_PRICE_ENTERPRISE) return 'enterprise';
  return 'starter';
}

function extractTenantId(meta: Stripe.Metadata | null): number {
  return parseInt(meta?.tenant_id ?? '0', 10);
}

/**
 * In API 2026-02-25.clover, current_period_end is removed.
 * Use billing_cycle_anchor as next billing/period marker.
 */
function getPeriodEnd(sub: Stripe.Subscription): string {
  // cancel_at takes priority if the subscription will end
  if (sub.cancel_at) return toIsoDate(sub.cancel_at);
  // Otherwise use billing_cycle_anchor as an approximation
  return toIsoDate(sub.billing_cycle_anchor);
}

async function handleSubscription(sub: Stripe.Subscription): Promise<void> {
  const tenantId = extractTenantId(sub.metadata);
  if (!tenantId) {
    console.warn('[webhook] Subscription without tenant_id metadata:', sub.id);
    return;
  }

  await upsertSubscription(tenantId, {
    Tenant_Id:              tenantId,
    Stripe_Customer_Id:     String(sub.customer),
    Stripe_Subscription_Id: sub.id,
    Plan:                   extractPlan(sub),
    Status:                 mapStatus(sub.status),
    Current_Period_End:     getPeriodEnd(sub),
    Cancel_At_Period_End:   sub.cancel_at_period_end,
    Trial_End:              sub.trial_end ? toIsoDate(sub.trial_end) : undefined,
  });

  console.log(`[webhook] Subscription ${sub.id} → tenant ${tenantId} | status=${sub.status} plan=${extractPlan(sub)}`);
}

/** Safely get subscription ID from Invoice (API 2026-02-25.clover) */
function getInvoiceSubscriptionId(inv: Stripe.Invoice): string | null {
  // New API: parent.subscription_details.subscription
  const parent = (inv as unknown as { parent?: { subscription_details?: { subscription?: string | Stripe.Subscription } } }).parent;
  const detail = parent?.subscription_details?.subscription;
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object') return detail.id;
  return null;
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET no configurado.' }, { status: 500 });
  }

  const body      = await req.text();
  const signature = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[webhook] Signature verification failed:', msg);
    return NextResponse.json({ error: `Webhook signature inválida: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const cs = event.data.object as Stripe.Checkout.Session;
        if (cs.mode !== 'subscription' || !cs.subscription) break;
        const subId = typeof cs.subscription === 'string' ? cs.subscription : cs.subscription.id;
        const sub   = await getStripe().subscriptions.retrieve(subId);
        if (!sub.metadata?.tenant_id && cs.metadata?.tenant_id) {
          await getStripe().subscriptions.update(sub.id, {
            metadata: { ...sub.metadata, ...cs.metadata },
          });
          sub.metadata = { ...sub.metadata, ...cs.metadata };
        }
        await handleSubscription(sub);
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        await handleSubscription(event.data.object as Stripe.Subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub      = event.data.object as Stripe.Subscription;
        const tenantId = extractTenantId(sub.metadata);
        if (tenantId) {
          await upsertSubscription(tenantId, {
            Stripe_Subscription_Id: sub.id,
            Status:                 'canceled',
            Cancel_At_Period_End:   false,
          });
          console.log(`[webhook] Subscription ${sub.id} → tenant ${tenantId} | CANCELED`);
        }
        break;
      }

      case 'invoice.payment_failed':
      case 'invoice.payment_succeeded': {
        const inv   = event.data.object as Stripe.Invoice;
        const subId = getInvoiceSubscriptionId(inv);
        if (!subId) break;
        const sub = await getStripe().subscriptions.retrieve(subId);
        await handleSubscription(sub);
        break;
      }

      default:
        break;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[webhook] Error processing event:', event.type, msg);
  }

  return NextResponse.json({ received: true });
}
