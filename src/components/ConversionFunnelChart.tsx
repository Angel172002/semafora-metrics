'use client';

import type { FunnelStep } from '@/types';

interface Props {
  data: FunnelStep[];
  loading: boolean;
}

function fmt(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString('es-CO');
}

function SkeletonBar({ w }: { w: number }) {
  return (
    <div className="skeleton h-14 rounded-xl animate-pulse" style={{ width: `${w}%`, margin: '0 auto' }} />
  );
}

export default function ConversionFunnelChart({ data, loading }: Props) {
  const maxValue = data[0]?.value || 1;

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div>
        <p className="chart-card-title">Funnel de Conversión</p>
        <p className="chart-card-subtitle">Caída entre cada etapa del embudo publicitario</p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[100, 72, 48, 22].map((w, i) => <SkeletonBar key={i} w={w} />)}
        </div>
      ) : data.length === 0 || data[0]?.value === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2"
          style={{ color: 'var(--muted2)', border: '1.5px dashed var(--border)', borderRadius: 12 }}>
          <span style={{ fontSize: 28, opacity: 0.4 }}>◈</span>
          <span className="text-sm">Sin datos para el período seleccionado</span>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {data.map((step, i) => {
            const widthPct = maxValue > 0 ? Math.max((step.value / maxValue) * 100, 12) : 12;
            return (
              <div key={step.label}>
                {/* Drop-off arrow */}
                {i > 0 && (
                  <div className="flex items-center justify-center py-1 gap-2">
                    <div style={{ width: 1, height: 12, background: 'var(--border)' }} />
                    {step.dropOff > 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                        ↓ -{step.dropOff}% de caída
                      </span>
                    )}
                    <div style={{ width: 1, height: 12, background: 'var(--border)' }} />
                  </div>
                )}

                {/* Step bar */}
                <div
                  className="rounded-xl px-4 py-3 flex items-center justify-between gap-3 transition-all duration-500"
                  style={{
                    width:      `${widthPct}%`,
                    minWidth:   180,
                    margin:     '0 auto',
                    background: `${step.color}14`,
                    border:     `1.5px solid ${step.color}35`,
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: step.color }}>
                      {step.label}
                    </p>
                    <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--text)' }}>
                      {fmt(step.value)}
                    </p>
                  </div>
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 tabular-nums"
                    style={{ background: `${step.color}22`, color: step.color }}
                  >
                    {step.pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      {!loading && data.length > 0 && data[0].value > 0 && (
        <div className="flex flex-wrap gap-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          {data.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="text-[11px]" style={{ color: 'var(--muted)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
