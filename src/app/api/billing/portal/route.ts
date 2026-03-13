/**
 * POST /api/billing/portal
 * Creates a Stripe Customer Portal session for managing subscriptions.
 * Requires the tenant to already have a Stripe customer ID (i.e., at least one past checkout).
 *
 * Returns: { url } — redirect to Stripe billing portal
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { getStripe, getAppUrl, isStripeConfigured } from '@/lib/stripe';
import { getSubscription } from '@/lib/plans';

export async function POST(req: NextRequest) {
  const session = requireAuth(req);
  if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe no configurado.' }, { status: 503 });
  }

  const sub = await getSubscription(session.tenant_id);
  if (!sub?.Stripe_Customer_Id) {
    return NextResponse.json(
      { error: 'No tienes una suscripción activa. Selecciona un plan primero.' },
      { status: 404 }
    );
  }

  const stripe = getStripe();
  const appUrl = getAppUrl();

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer:   sub.Stripe_Customer_Id,
      return_url: `${appUrl}/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
