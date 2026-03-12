'use client';

import { CrmStats, AsesorStats, StageStats } from '@/types';
import { formatCOP } from '@/lib/format';

interface Props {
  stats: CrmStats | null;
  loading: boolean;
}

function Skeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card p-5 flex flex-col gap-3">
          <div className="skeleton h-4 w-32" />
          {[1, 2, 3].map((j) => (
            <div key={j} className="flex items-center gap-3">
              <div className="skeleton h-8 w-8 rounded-full" />
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="skeleton h-3 w-24" />
                <div className="skeleton h-2 w-full rounded-full" />
              </div>
              <div className="skeleton h-4 w-16" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Asesor Ranking Card ───────────────────────────────────────────────────────

function AsesorRanking({ asesores }: { asesores: AsesorStats[] }) {
  const maxRevenue = Math.max(...asesores.map((a) => a.revenue), 1);

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>
          Ranking asesores
        </h3>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>
          por revenue
        </span>
      </div>

      {asesores.length === 0 ? (
        <p className="text-xs text-center py-4" style={{ color: 'var(--muted)' }}>
          Sin datos de asesores
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {asesores.map((a, i) => {
            const pct = maxRevenue > 0 ? (a.revenue / maxRevenue) * 100 : 0;
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
            const initials = a.nombre.trim().split(' ').filter(Boolean)
              .slice(0, 2).map((p) => p[0].toUpperCase()).join('');
            const colors = ['#6366f1','#8b5cf6','#ec4899','#3b82f6','#14b8a6','#f59e0b'];
            const bg = colors[Math.abs(a.id) % colors.length];

            return (
              <div key={a.id} className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative w-8 h-8 flex-shrink-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                    style={{ background: `${bg}cc` }}
                  >
                    {initials || '?'}
                  </div>
                  {medal && (
                    <span className="absolute -top-1 -right-1 text-[10px] leading-none">{medal}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[11px] font-semibold truncate" style={{ color: 'var(--text)' }}>
                      {a.nombre}
                    </span>
                    <span className="text-[10px] font-bold flex-shrink-0" style={{ color: '#4ade80' }}>
                      {formatCOP(a.revenue, true)}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface3)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: `${bg}` }}
                    />
                  </div>
                  {/* Sub stats */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px]" style={{ color: 'var(--muted)' }}>
                      {a.activos} act.
                    </span>
                    <span className="text-[9px]" style={{ color: '#4ade80' }}>
                      {a.ganados} gan.
                    </span>
                    <span className="text-[9px]" style={{ color: '#f87171' }}>
                      {a.perdidos} perd.
                    </span>
                    <span className="text-[9px] font-semibold ml-auto" style={{ color: 'var(--accent)' }}>
                      {a.tasa_cierre}% cierre
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Stage Distribution Card ──────────────────────────────────────────────────

function StageDistribution({ etapas, pipelineTotal }: { etapas: StageStats[]; pipelineTotal: number }) {
  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>
          Pipeline por etapa
        </h3>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>
          leads abiertos
        </span>
      </div>

      {etapas.length === 0 ? (
        <p className="text-xs text-center py-4" style={{ color: 'var(--muted)' }}>
          Sin leads en pipeline
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {etapas.map((s) => {
            const pct = pipelineTotal > 0 ? (s.valor_total / pipelineTotal) * 100 : 0;
            const countPct = etapas.reduce((sum, e) => sum + e.count, 0);
            const leadPct = countPct > 0 ? Math.round((s.count / countPct) * 100) : 0;

            return (
              <div key={s.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: s.color }}
                    />
                    <span className="text-[11px] font-semibold truncate" style={{ color: 'var(--text)' }}>
                      {s.nombre}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                      {s.count} lead{s.count !== 1 ? 's' : ''} · {leadPct}%
                    </span>
                  </div>
                  <span className="text-[11px] font-bold" style={{ color: '#4ade80' }}>
                    {formatCOP(s.valor_total, true)}
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface3)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: s.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Forecast Card ────────────────────────────────────────────────────────────

function ForecastCard({ stats }: { stats: CrmStats }) {
  const achievementPct = stats.pipeline_total > 0
    ? Math.min(100, Math.round((stats.revenue_ganado_mes / stats.pipeline_total) * 100))
    : 0;

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>
          Forecast & métricas
        </h3>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,0.2)' }}>
          este mes
        </span>
      </div>

      {/* Forecast */}
      <div className="rounded-xl p-4 flex flex-col gap-1"
        style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)' }}>
        <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          Forecast estimado
        </p>
        <p className="text-2xl font-extrabold" style={{ color: 'var(--accent)', letterSpacing: '-0.02em' }}>
          {formatCOP(stats.forecast)}
        </p>
        <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
          pipeline × tasa de cierre histórica ({stats.tasa_cierre}%)
        </p>
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Pipeline total',    value: formatCOP(stats.pipeline_total, true),    color: '#4ade80' },
          { label: 'Revenue este mes',  value: formatCOP(stats.revenue_ganado_mes, true), color: '#60a5fa' },
          { label: 'Ticket promedio',   value: formatCOP(stats.ticket_promedio, true),    color: 'var(--text)' },
          { label: 'Ciclo promedio',    value: `${stats.ciclo_promedio_dias}d`,           color: 'var(--text)' },
        ].map((m) => (
          <div key={m.label} className="rounded-lg p-3" style={{ background: 'var(--surface2)' }}>
            <p className="text-[9px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--muted)' }}>
              {m.label}
            </p>
            <p className="text-sm font-bold" style={{ color: m.color }}>
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Achievement bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold" style={{ color: 'var(--muted)' }}>
            Revenue ganado vs pipeline
          </span>
          <span className="text-[10px] font-bold" style={{ color: achievementPct >= 50 ? '#4ade80' : '#fb923c' }}>
            {achievementPct}%
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface3)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${achievementPct}%`,
              background: achievementPct >= 50
                ? 'linear-gradient(90deg, #4ade80, #22c55e)'
                : 'linear-gradient(90deg, #fb923c, #f59e0b)',
            }}
          />
        </div>
      </div>

      {/* Alert: leads sin actividad */}
      {stats.leads_sin_actividad > 0 && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{ background: 'rgba(251,146,60,0.10)', border: '1px solid rgba(251,146,60,0.2)' }}>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#fb923c" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span className="text-[11px] font-semibold" style={{ color: '#fb923c' }}>
            {stats.leads_sin_actividad} lead{stats.leads_sin_actividad !== 1 ? 's' : ''} sin contacto en +48h
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function PipelineAnalytics({ stats, loading }: Props) {
  if (loading) return <Skeleton />;
  if (!stats) return (
    <div className="text-center py-12 text-sm" style={{ color: 'var(--muted)' }}>
      No hay datos disponibles
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <ForecastCard stats={stats} />
      <StageDistribution etapas={stats.distribucion_etapas} pipelineTotal={stats.pipeline_total} />
      <AsesorRanking asesores={stats.ranking_asesores} />
    </div>
  );
}
