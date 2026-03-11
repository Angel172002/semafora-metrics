'use client';

import { CrmStats } from '@/types';
import { formatCOP } from '@/lib/format';

interface Props {
  stats: CrmStats | null;
  loading: boolean;
}

function Skeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pb-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="card p-4 flex flex-col gap-2">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-7 w-28" />
          <div className="skeleton h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

interface StatBoxProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  valueColor?: string;
  subColor?: string;
  alert?: boolean;
}

function StatBox({ label, value, sub, icon, iconBg, valueColor, subColor, alert }: StatBoxProps) {
  return (
    <div className={`card p-4 flex flex-col gap-3 transition-all ${alert ? 'border-red-500/30' : ''}`}
      style={alert ? { borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.03)' } : {}}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          {label}
        </span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
          {icon}
        </div>
      </div>
      <div>
        <p
          className="text-2xl font-extrabold leading-none"
          style={{ fontFamily: 'var(--font-space-mono)', color: valueColor ?? 'var(--text)', letterSpacing: '-0.02em' }}
        >
          {value}
        </p>
        {sub && (
          <p className="text-xs mt-1.5" style={{ color: subColor ?? 'var(--muted2)' }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

export default function CrmStatsBar({ stats, loading }: Props) {
  if (loading || !stats) return <Skeleton />;

  const sinActividad = stats.leads_sin_actividad;
  const tasaCierre   = stats.tasa_cierre ?? 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pb-4">

      <StatBox
        label="Leads Abiertos"
        value={String(stats.leads_abiertos)}
        sub={`${stats.leads_esta_semana} nuevos esta semana`}
        iconBg="rgba(96,165,250,0.12)"
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        }
      />

      <StatBox
        label="Pipeline Total"
        value={formatCOP(stats.pipeline_total, true)}
        sub={`${stats.leads_abiertos} leads activos`}
        iconBg="rgba(74,222,128,0.12)"
        valueColor="#4ade80"
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        }
      />

      <StatBox
        label="Tasa de Cierre"
        value={`${tasaCierre}%`}
        sub={`${stats.leads_ganados} ganados / ${stats.leads_perdidos} perdidos`}
        iconBg="rgba(251,191,36,0.12)"
        valueColor={tasaCierre >= 30 ? '#4ade80' : tasaCierre >= 15 ? '#fbbf24' : '#f87171'}
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            <polyline points="17 6 23 6 23 12"/>
          </svg>
        }
      />

      <StatBox
        label="Revenue Este Mes"
        value={formatCOP(stats.revenue_ganado_mes, true)}
        sub={`Ticket prom. ${formatCOP(stats.ticket_promedio, true)}`}
        iconBg="rgba(99,102,241,0.12)"
        valueColor="#a5b4fc"
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
        }
      />

      <StatBox
        label="Sin Actividad +48h"
        value={String(sinActividad)}
        sub={sinActividad > 0 ? 'Requieren seguimiento' : 'Todo al día'}
        iconBg={sinActividad > 0 ? 'rgba(248,113,113,0.12)' : 'rgba(74,222,128,0.08)'}
        valueColor={sinActividad > 0 ? '#f87171' : '#4ade80'}
        subColor={sinActividad > 0 ? '#fb923c' : 'var(--muted2)'}
        alert={sinActividad > 0}
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={sinActividad > 0 ? '#f87171' : '#4ade80'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        }
      />

    </div>
  );
}
