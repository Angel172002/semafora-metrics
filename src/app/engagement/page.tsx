'use client';

import { useState } from 'react';
import { useMetrics } from '@/hooks/useMetrics';
import EngagementTable from '@/components/EngagementTable';
import KpiCard from '@/components/KpiCard';
import type { DateRange } from '@/types';
import { formatCOP } from '@/lib/format';
import { useTheme } from '@/hooks/useTheme';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

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

const PLATFORM_COLORS: Record<string, string> = {
  meta: '#1877F2', google: '#4285F4', tiktok: '#FF0050',
  instagram: '#E1306C', linkedin: '#0A66C2',
};
const PLATFORM_LABELS: Record<string, string> = {
  meta: 'Meta', google: 'Google', tiktok: 'TikTok',
  instagram: 'Instagram', linkedin: 'LinkedIn',
};

function EngagementTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip text-xs">
      <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-3">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-mono font-bold" style={{ color: p.color }}>
            {p.value.toLocaleString('es-CO')}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function EngagementPage() {
  const [range, setRange] = useState<DateRange>('7d');
  const { data, loading, syncing, triggerSync } = useMetrics(range);
  const { isDark, toggle } = useTheme();

  const table = data?.engagementTable ?? [];
  const totalLikes      = table.reduce((s, r) => s + r.likes, 0);
  const totalComments   = table.reduce((s, r) => s + r.comments, 0);
  const totalVideoViews = table.reduce((s, r) => s + r.video_views, 0);
  const totalSpent      = table.reduce((s, r) => s + r.spent, 0);

  // Chart data: top 6 campaigns by total engagement
  const chartData = [...table]
    .filter((r) => r.likes + r.comments + r.shares + r.video_views > 0)
    .sort((a, b) => (b.likes + b.comments + b.video_views) - (a.likes + a.comments + a.video_views))
    .slice(0, 6)
    .map((r) => ({
      name: r.name.length > 20 ? r.name.substring(0, 18) + '…' : r.name,
      Likes: r.likes,
      Comentarios: r.comments,
      'Video Views': r.video_views,
    }));

  // Platform breakdown (pie)
  const platformMap: Record<string, number> = {};
  for (const r of table) {
    if (r.likes + r.comments + r.shares + r.video_views > 0) {
      platformMap[r.platform] = (platformMap[r.platform] || 0) + r.likes + r.comments + r.shares;
    }
  }
  const platTotal = Object.values(platformMap).reduce((s, v) => s + v, 0);
  const platformPie = Object.entries(platformMap)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({
      platform: k,
      label: PLATFORM_LABELS[k] || k,
      color: PLATFORM_COLORS[k] || '#6b7280',
      value: v,
      pct: platTotal > 0 ? Math.round((v / platTotal) * 100) : 0,
    }));

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
        </div>

        {/* ── Charts ── */}
        {!loading && chartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* BarChart: engagement por campaña */}
            <div className="card p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                    Engagement por Campaña
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                    Top campañas por interacciones totales
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'var(--muted)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--muted)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}K` : v}
                    width={36}
                  />
                  <Tooltip content={<EngagementTooltip />} />
                  <Bar dataKey="Likes" fill="#ec4899" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Comentarios" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Video Views" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                {[
                  { color: '#ec4899', label: 'Likes' },
                  { color: '#8b5cf6', label: 'Comentarios' },
                  { color: '#f59e0b', label: 'Video Views' },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: l.color }} />
                    <span className="text-[11px]" style={{ color: 'var(--muted)' }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pie: desglose por plataforma */}
            <div className="card p-5">
              <div className="mb-4">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                  Por Plataforma
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  Distribución de interacciones
                </p>
              </div>
              {platformPie.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie
                        data={platformPie}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {platformPie.map((entry) => (
                          <Cell key={entry.platform} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number, name) => [v.toLocaleString('es-CO'), name]}
                        contentStyle={{
                          background: 'var(--surface2)', border: '1px solid var(--border)',
                          borderRadius: 8, fontSize: 11,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2 mt-3">
                    {platformPie.map((p) => (
                      <div key={p.platform} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                          <span className="text-xs" style={{ color: 'var(--text)' }}>{p.label}</span>
                        </div>
                        <span className="text-xs font-bold font-mono" style={{ color: p.color }}>
                          {p.pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-center py-8" style={{ color: 'var(--muted)' }}>
                  Sin datos de plataforma
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Engagement table ── */}
        <EngagementTable data={table} loading={loading} />

      </main>
    </div>
  );
}
