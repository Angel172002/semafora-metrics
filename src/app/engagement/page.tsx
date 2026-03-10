'use client';

import { useState } from 'react';
import { useMetrics } from '@/hooks/useMetrics';
import EngagementTable from '@/components/EngagementTable';
import KpiCard from '@/components/KpiCard';
import type { DateRange } from '@/types';
import { formatCOP } from '@/lib/format';
import { useTheme } from '@/hooks/useTheme';

// ─── Icons ────────────────────────────────────────────────────────────────────
const LikesIcon = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#ec4899" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const CommentsIcon = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#8b5cf6" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const VideoIcon = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const BudgetIcon = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#a855f7" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SyncIcon = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

function formatKpiValue(key: string, val: number): string {
  if (key === 'spent') return formatCOP(val, true);
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toLocaleString('es-CO');
}

const RANGE_LABELS: Record<DateRange, string> = {
  '7d': 'Últimos 7 días',
  '30d': 'Últimos 30 días',
  '90d': 'Últimos 90 días',
  'all': 'Todo el historial',
};

export default function EngagementPage() {
  const [range, setRange] = useState<DateRange>('7d');
  const { data, loading, syncing, triggerSync } = useMetrics(range);
  const { isDark, toggle } = useTheme();

  const table = data?.engagementTable ?? [];
  const totalLikes      = table.reduce((s, r) => s + r.likes, 0);
  const totalComments   = table.reduce((s, r) => s + r.comments, 0);
  const totalVideoViews = table.reduce((s, r) => s + r.video_views, 0);
  const totalSpent      = table.reduce((s, r) => s + r.spent, 0);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* ── Page header ── */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 md:px-6 py-3 border-b"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div>
          <h1 className="font-display text-lg md:text-xl tracking-wider uppercase" style={{ color: 'var(--text)' }}>
            Engagement
          </h1>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Likes · Comentarios · Compartidos · Vistas de Video · Presupuesto
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as DateRange)}
            className="text-xs rounded-lg px-3 py-2 border"
            style={{
              background: 'var(--surface2)', color: 'var(--text)',
              borderColor: 'var(--border)', outline: 'none',
            }}
          >
            {(Object.entries(RANGE_LABELS) as [DateRange, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>

          <button
            onClick={triggerSync}
            disabled={syncing}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
            style={{
              background: syncing ? 'var(--border)' : 'var(--primary)',
              color: syncing ? 'var(--muted)' : '#fff',
              cursor: syncing ? 'not-allowed' : 'pointer',
            }}
          >
            <span className={syncing ? 'animate-spin' : ''}><SyncIcon /></span>
            {syncing ? 'Sincronizando…' : 'Sincronizar'}
          </button>

          <button
            onClick={toggle}
            className="p-2 rounded-lg border transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)', background: 'transparent' }}
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
          >
            {isDark
              ? <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5"/><path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              : <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            }
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 flex flex-col gap-5 max-w-screen-2xl mx-auto w-full">

        {/* ── Mock data banner ── */}
        {data?.isMockData && (
          <div className="text-xs px-3 py-2 rounded-lg border flex items-center gap-2"
            style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)', color: '#f59e0b' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Modo demo — datos de ejemplo. Configura tus credenciales en Configuración para ver datos reales.
          </div>
        )}

        {/* ── KPIs ── */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2 px-0.5" style={{ color: 'var(--text-muted)' }}>
            Métricas de interacción · {RANGE_LABELS[range]}
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              title="Total Likes"
              value={formatKpiValue('n', totalLikes)}
              change={0}
              icon={<LikesIcon />}
              iconBg="rgba(236,72,153,0.12)"
              loading={loading}
            />
            <KpiCard
              title="Comentarios"
              value={formatKpiValue('n', totalComments)}
              change={0}
              icon={<CommentsIcon />}
              iconBg="rgba(139,92,246,0.12)"
              loading={loading}
            />
            <KpiCard
              title="Vistas de Video"
              value={formatKpiValue('n', totalVideoViews)}
              change={0}
              icon={<VideoIcon />}
              iconBg="rgba(245,158,11,0.12)"
              loading={loading}
            />
            <KpiCard
              title="Invertido (COP)"
              value={formatKpiValue('spent', totalSpent)}
              change={0}
              icon={<BudgetIcon />}
              iconBg="rgba(168,85,247,0.12)"
              loading={loading}
            />
          </div>
          <p className="text-xs mt-2 px-0.5" style={{ color: 'var(--muted)' }}>
            💡 "Invertido" = campo "Importe Gastado" de Meta Ads · valor exacto de la API en COP
          </p>
        </div>

        {/* ── Engagement table ── */}
        <EngagementTable data={table} loading={loading} />

      </main>
    </div>
  );
}
