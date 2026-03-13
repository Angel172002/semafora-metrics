/**
 * stripe.ts — Stripe client singleton
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY       — sk_live_... or sk_test_...
 *   STRIPE_WEBHOOK_SECRET   — whsec_... (from Stripe Dashboard → Webhooks)
 *   STRIPE_PRICE_STARTER    — price_... for Starter plan
 *   STRIPE_PRICE_AGENCIA    — price_... for Agencia plan
 *   STRIPE_PRICE_ENTERPRISE — price_... for Enterprise plan
 *
 * Optional:
 *   NEXT_PUBLIC_APP_URL     — used for success/cancel redirect URLs
 */
import Stripe from 'stripe';
import type { PlanId } from './plans';

// Lazy singleton — only instantiated when needed (avoids errors at build time)
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY no configurado.');
    _stripe = new Stripe(key, { apiVersion: '2026-02-25.clover' });
  }
  return _stripe;
}

export function isStripeConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

// ─── Price ID mapping ─────────────────────────────────────────────────────────

const PRICE_MAP: Record<string, string | undefined> = {
  starter:    process.env.STRIPE_PRICE_STARTER,
  agencia:    process.env.STRIPE_PRICE_AGENCIA,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
};

export function getPriceId(plan: PlanId): string | null {
  return PRICE_MAP[plan] ?? null;
}

// ─── App URL helper ────────────────────────────────────────────────────────────

export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:4000')
  );
}
