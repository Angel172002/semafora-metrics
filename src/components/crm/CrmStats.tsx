'use client';

import { CrmStats } from '@/types';
import { formatCOP } from '@/lib/format';

interface Props {
  stats: CrmStats | null;
  loading: boolean;
}

function SkeletonCard() {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-3 flex-1 min-w-[180px]">
      <div className="w-10 h-10 rounded-lg bg-white/5 animate-pulse flex-shrink-0" />
      <div className="flex flex-col gap-2 flex-1">
        <div className="h-3 w-24 rounded bg-white/5 animate-pulse" />
        <div className="h-6 w-20 rounded bg-white/5 animate-pulse" />
      </div>
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  iconBg: string;
  icon: React.ReactNode;
  valueColor?: string;
}

function KpiCard({ label, value, iconBg, icon, valueColor }: KpiCardProps) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-3 flex-1 min-w-[180px]">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
          {label}
        </span>
        <span
          className="text-lg font-bold leading-tight truncate"
          style={{ color: valueColor ?? 'var(--text)', fontFamily: 'var(--font-space-mono)' }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

// ─── SVG icons ───────────────────────────────────────────────────────────────

function IconPeople() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#60a5fa' }}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconDollar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#4ade80' }}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fbbf24' }}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconTrending() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#4ade80' }}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#f87171' }}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CrmStatsBar({ stats, loading }: Props) {
  if (loading || !stats) {
    return (
      <div className="flex flex-wrap gap-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const sinActividad = stats.leads_sin_actividad;

  return (
    <div className="flex flex-wrap gap-3">
      <KpiCard
        label="Leads Abiertos"
        value={String(stats.leads_abiertos)}
        iconBg="rgba(96, 165, 250, 0.12)"
        icon={<IconPeople />}
      />
      <KpiCard
        label="Pipeline Total"
        value={formatCOP(stats.pipeline_total, true)}
        iconBg="rgba(74, 222, 128, 0.12)"
        icon={<IconDollar />}
      />
      <KpiCard
        label="Tasa de Cierre"
        value={`${stats.tasa_cierre}%`}
        iconBg="rgba(251, 191, 36, 0.12)"
        icon={<IconChart />}
      />
      <KpiCard
        label="Revenue Este Mes"
        value={formatCOP(stats.revenue_ganado_mes, true)}
        iconBg="rgba(74, 222, 128, 0.12)"
        icon={<IconTrending />}
      />
      <KpiCard
        label="Sin Actividad >48h"
        value={String(sinActividad)}
        iconBg="rgba(248, 113, 113, 0.12)"
        icon={<IconAlert />}
        valueColor={sinActividad > 0 ? '#f87171' : undefined}
      />
    </div>
  );
}
