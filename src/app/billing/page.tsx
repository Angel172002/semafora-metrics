'use client';

import { useState, useEffect, useCallback } from 'react';
import { PLANS, ORDERED_PLANS, type PlanId, type SubscriptionStatus } from '@/lib/plans';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BillingStatus {
  subscription: {
    plan:              PlanId;
    status:            SubscriptionStatus;
    currentPeriodEnd:  string;
    cancelAtPeriodEnd: boolean;
    trialEnd:          string | null;
  } | null;
  effectivePlan: PlanId;
  plan: {
    nombre:   string;
    precio:   number;
    color:    string;
    limits:   Record<string, number>;
    features: Record<string, boolean>;
  };
  usage: {
    leadsThisMonth: number;
    activeUsers:    number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

function limitLabel(val: number) {
  return val === -1 ? 'Ilimitado' : val.toLocaleString('es-CO');
}

function usageBar(current: number, max: number) {
  if (max === -1) return 0;
  return Math.min(100, Math.round((current / max) * 100));
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:    { label: 'Activa',         color: '#10b981' },
  trialing:  { label: 'Prueba gratis',  color: '#8b5cf6' },
  past_due:  { label: 'Pago pendiente', color: '#f59e0b' },
  canceled:  { label: 'Cancelada',      color: '#ef4444' },
  none:      { label: 'Sin suscripción',color: '#6b7280' },
};

// ─── Feature check icon ────────────────────────────────────────────────────────

function Check({ ok }: { ok: boolean }) {
  return ok
    ? <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
    : <span style={{ color: 'var(--muted2)' }}>—</span>;
}

// ─── Plan card ─────────────────────────────────────────────────────────────────

interface PlanCardProps {
  planId:      PlanId;
  currentPlan: PlanId;
  onSelect:    (p: PlanId) => void;
  loading:     boolean;
}

function PlanCard({ planId, currentPlan, onSelect, loading }: PlanCardProps) {
  const plan      = PLANS[planId];
  const isCurrent = planId === currentPlan;
  const isUpgrade = ORDERED_PLANS.indexOf(planId) > ORDERED_PLANS.indexOf(currentPlan as PlanId);

  const features = [
    { label: 'Meta Ads',       key: 'metaAds' },
    { label: 'Google Ads',     key: 'googleAds' },
    { label: 'TikTok Ads',     key: 'tiktokAds' },
    { label: 'CRM Kanban',     key: 'crmKanban' },
    { label: 'CRM Analytics',  key: 'crmAnalytics' },
    { label: 'Exportar PDF',   key: 'pdfExports' },
    { label: 'Webhooks',       key: 'webhooks' },
    { label: 'API Key',        key: 'apiAccess' },
    { label: 'White-label',    key: 'whiteLabel' },
    { label: 'AI Insights',    key: 'aiInsights' },
  ] as const;

  return (
    <div
      className="flex flex-col rounded-2xl p-5 gap-4"
      style={{
        background:   isCurrent ? `${plan.color}10` : 'var(--surface2)',
        border:       `2px solid ${isCurrent ? plan.color : 'var(--border)'}`,
        position:     'relative',
        transition:   'border-color 0.2s',
      }}
    >
      {isCurrent && (
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            position: 'absolute', top: 12, right: 12,
            background: plan.color, color: '#fff',
          }}
        >
          Plan actual
        </span>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: plan.color }} />
          <span className="text-base font-extrabold" style={{ color: 'var(--text)' }}>{plan.nombre}</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>{plan.descripcion}</p>
      </div>

      {/* Price */}
      <div>
        <span className="text-3xl font-extrabold" style={{ color: 'var(--text)' }}>
          ${plan.precio}
        </span>
        <span className="text-xs ml-1" style={{ color: 'var(--muted)' }}>USD/mes</span>
        {plan.precio > 0 && (
          <p className="text-xs mt-0.5" style={{ color: '#10b981' }}>
            ${plan.precioAnual} USD/año (ahorra ${plan.precio * 12 - plan.precioAnual})
          </p>
        )}
      </div>

      {/* Limits */}
      <div className="flex flex-col gap-1.5">
        {[
          { label: 'Cuentas publicitarias', val: plan.limits.adAccounts },
          { label: 'Usuarios',              val: plan.limits.users },
          { label: 'Leads/mes',             val: plan.limits.leadsPerMonth },
        ].map(({ label, val }) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--muted)' }}>{label}</span>
            <span className="font-semibold" style={{ color: 'var(--text)' }}>{limitLabel(val)}</span>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="flex flex-col gap-1 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        {features.map(({ label, key }) => (
          <div key={key} className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--muted)' }}>{label}</span>
            <Check ok={plan.features[key]} />
          </div>
        ))}
      </div>

      {/* CTA */}
      {!isCurrent && (
        <button
          onClick={() => onSelect(planId)}
          disabled={loading}
          className="btn w-full mt-auto"
          style={{
            background: loading ? 'var(--surface3)' : plan.color,
            color:       '#fff',
            border:      'none',
            fontWeight:  700,
            opacity:     loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Redirigiendo…' : isUpgrade ? `Subir a ${plan.nombre}` : `Cambiar a ${plan.nombre}`}
        </button>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const [status,     setStatus]   = useState<BillingStatus | null>(null);
  const [loading,    setLoading]  = useState(true);
  const [actionLoad, setActionLoad] = useState(false);
  const [toast,      setToast]    = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/billing/status');
      const data = await res.json();
      if (data.success) setStatus(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Handle redirect back from Stripe
    const params = new URLSearchParams(window.location.search);
    if (params.get('success')) showToast('¡Suscripción activada con éxito!');
    if (params.get('canceled')) showToast('Checkout cancelado.');
  }, [fetchStatus]);

  async function handleSelectPlan(plan: PlanId) {
    setActionLoad(true);
    try {
      const res  = await fetch('/api/billing/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        showToast(data.error || 'Error al crear sesión de pago.');
        setActionLoad(false);
      }
    } catch {
      showToast('Error de conexión.');
      setActionLoad(false);
    }
  }

  async function handlePortal() {
    setActionLoad(true);
    try {
      const res  = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        showToast(data.error || 'Error al abrir el portal de facturación.');
        setActionLoad(false);
      }
    } catch {
      showToast('Error de conexión.');
      setActionLoad(false);
    }
  }

  const effectivePlan  = status?.effectivePlan ?? 'none';
  const sub            = status?.subscription;
  const statusInfo     = STATUS_LABELS[sub?.status ?? 'none'];
  const leadsUsage     = status?.usage.leadsThisMonth ?? 0;
  const usersUsage     = status?.usage.activeUsers ?? 0;
  const planLimits     = status?.plan.limits ?? {};

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl text-sm font-semibold shadow-lg"
          style={{ background: '#10b981', color: '#fff' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="px-4 md:px-6 pt-5 pb-4 border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <p className="section-title">Cuenta</p>
        <h1 className="text-xl font-extrabold" style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}>
          Plan y facturación
        </h1>
      </div>

      <div className="px-4 md:px-6 py-6 flex flex-col gap-6 max-w-5xl">

        {/* Current plan summary */}
        {!loading && sub && (
          <div className="card p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold" style={{ color: 'var(--text)' }}>
                  Plan {status?.plan.nombre}
                </span>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${statusInfo.color}18`, color: statusInfo.color }}
                >
                  {statusInfo.label}
                </span>
              </div>
              {sub.trialEnd && sub.status === 'trialing' && (
                <p className="text-xs" style={{ color: '#8b5cf6' }}>
                  Prueba gratis hasta: {formatDate(sub.trialEnd)}
                </p>
              )}
              {sub.cancelAtPeriodEnd && (
                <p className="text-xs" style={{ color: '#f59e0b' }}>
                  Cancela el: {formatDate(sub.currentPeriodEnd)}
                </p>
              )}
              {!sub.cancelAtPeriodEnd && sub.status === 'active' && (
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Próximo cobro: {formatDate(sub.currentPeriodEnd)}
                </p>
              )}
            </div>
            <button
              onClick={handlePortal}
              disabled={actionLoad}
              className="btn flex-shrink-0"
              style={{ opacity: actionLoad ? 0.6 : 1 }}
            >
              Gestionar suscripción
            </button>
          </div>
        )}

        {/* Usage stats */}
        {!loading && effectivePlan !== 'none' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Leads */}
            <div className="card p-4">
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Leads este mes
              </p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-extrabold" style={{ color: 'var(--text)' }}>
                  {leadsUsage.toLocaleString('es-CO')}
                </span>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  / {limitLabel(planLimits.leadsPerMonth as number)}
                </span>
              </div>
              {planLimits.leadsPerMonth !== -1 && (
                <div className="w-full rounded-full h-1.5" style={{ background: 'var(--surface3)' }}>
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${usageBar(leadsUsage, planLimits.leadsPerMonth as number)}%`,
                      background: usageBar(leadsUsage, planLimits.leadsPerMonth as number) > 85 ? '#ef4444' : '#10b981',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Users */}
            <div className="card p-4">
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Usuarios activos
              </p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-extrabold" style={{ color: 'var(--text)' }}>
                  {usersUsage}
                </span>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  / {limitLabel(planLimits.users as number)}
                </span>
              </div>
              {planLimits.users !== -1 && (
                <div className="w-full rounded-full h-1.5" style={{ background: 'var(--surface3)' }}>
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${usageBar(usersUsage, planLimits.users as number)}%`,
                      background: usageBar(usersUsage, planLimits.users as number) > 85 ? '#ef4444' : '#3b82f6',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Plans grid */}
        <div>
          <h2 className="text-sm font-extrabold mb-4" style={{ color: 'var(--text)' }}>
            {effectivePlan === 'none' ? 'Elige tu plan' : 'Cambiar de plan'}
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl h-96 animate-pulse" style={{ background: 'var(--surface2)' }} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ORDERED_PLANS.map((planId) => (
                <PlanCard
                  key={planId}
                  planId={planId}
                  currentPlan={effectivePlan}
                  onSelect={handleSelectPlan}
                  loading={actionLoad}
                />
              ))}
            </div>
          )}
        </div>

        {/* Stripe not configured notice */}
        {!loading && !process.env.NEXT_PUBLIC_STRIPE_CONFIGURED && (
          <div className="rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24' }}>
            <strong>Modo demostración:</strong> Configura <code>STRIPE_SECRET_KEY</code> y las variables de precio en Vercel para activar pagos reales.
          </div>
        )}
      </div>
    </div>
  );
}
