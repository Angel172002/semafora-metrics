/**
 * POST /api/billing/checkout
 * Creates a Stripe Checkout Session for subscribing to a plan.
 *
 * Body: { plan: 'starter' | 'agencia' | 'enterprise' }
 * Returns: { url } — redirect to Stripe checkout
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { getStripe, getPriceId, getAppUrl, isStripeConfigured } from '@/lib/stripe';
import { getSubscription } from '@/lib/plans';
import type { PlanId } from '@/lib/plans';

export async function POST(req: NextRequest) {
  const session = requireAuth(req);
  if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Stripe no configurado. Agrega STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET.' },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const plan = body.plan as PlanId;

  const priceId = getPriceId(plan);
  if (!priceId) {
    return NextResponse.json(
      { error: `Plan '${plan}' no válido o STRIPE_PRICE_${plan?.toUpperCase()} no configurado.` },
      { status: 400 }
    );
  }

  const stripe  = getStripe();
  const appUrl  = getAppUrl();

  // Check if this tenant already has a Stripe customer ID
  const existing = await getSubscription(session.tenant_id);
  const customerId = existing?.Stripe_Customer_Id || undefined;

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode:               'subscription',
      payment_method_types: ['card'],
      line_items:         [{ price: priceId, quantity: 1 }],
      success_url:        `${appUrl}/billing?success=1&plan=${plan}`,
      cancel_url:         `${appUrl}/billing?canceled=1`,
      customer:           customerId,
      customer_email:     customerId ? undefined : session.email,
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: existing ? undefined : 14, // 14-day trial for new customers
        metadata: {
          tenant_id:     String(session.tenant_id),
          tenant_nombre: session.tenant_nombre,
          plan,
        },
      },
      metadata: {
        tenant_id:     String(session.tenant_id),
        tenant_nombre: session.tenant_nombre,
        plan,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
