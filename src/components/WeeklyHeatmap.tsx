'use client';

import type { HeatmapDay } from '@/types';
import { formatCOP } from '@/lib/format';

interface Props {
  data: HeatmapDay[];
  loading: boolean;
}

function lerp(intensity: number, darkColor: string, lightColor: string): string {
  // Returns color between transparent and full color
  const alpha = Math.round(intensity * 220 + 20);
  return `${darkColor}${alpha.toString(16).padStart(2, '0')}`;
}

function fmtShort(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString('es-CO');
}

export default function WeeklyHeatmap({ data, loading }: Props) {
  const hasData = data.some((d) => d.spent > 0 || d.results > 0);

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div>
        <p className="chart-card-title">Actividad por Día de la Semana</p>
        <p className="chart-card-subtitle">Inversión y resultados acumulados según el día</p>
      </div>

      {loading ? (
        <div className="flex gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col gap-2">
              <div className="skeleton h-3 w-8 mx-auto" />
              <div className="skeleton h-16 rounded-xl animate-pulse" />
              <div className="skeleton h-16 rounded-xl animate-pulse" style={{ opacity: 0.6 }} />
            </div>
          ))}
        </div>
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2"
          style={{ color: 'var(--muted2)', border: '1.5px dashed var(--border)', borderRadius: 12 }}>
          <span style={{ fontSize: 28, opacity: 0.4 }}>◈</span>
          <span className="text-sm">Sin datos para el período seleccionado</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Row labels */}
          <div className="flex gap-2">
            <div style={{ width: 70, flexShrink: 0 }} />
            {data.map((d) => (
              <div key={d.day} className="flex-1 text-center">
                <span className="text-[11px] font-bold" style={{ color: 'var(--muted)' }}>{d.day}</span>
              </div>
            ))}
          </div>

          {/* Spend row */}
          <div className="flex gap-2 items-center">
            <div style={{ width: 70, flexShrink: 0 }}>
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#a78bfa' }}>
                Invertido
              </span>
            </div>
            {data.map((d) => (
              <div
                key={d.day}
                className="flex-1 rounded-xl flex flex-col items-center justify-center py-3 gap-0.5"
                style={{
                  background:  lerp(d.spentIntensity, '#6366f1', '#6366f1'),
                  minHeight:   64,
                  transition:  'background 0.3s',
                }}
                title={`${d.day}: ${formatCOP(d.spent, true)}`}
              >
                <span className="text-[10px] font-bold tabular-nums"
                  style={{ color: d.spentIntensity > 0.4 ? '#fff' : 'var(--muted)' }}>
                  {d.spent > 0 ? fmtShort(d.spent) : '—'}
                </span>
              </div>
            ))}
          </div>

          {/* Results row */}
          <div className="flex gap-2 items-center">
            <div style={{ width: 70, flexShrink: 0 }}>
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#4ade80' }}>
                Resultados
              </span>
            </div>
            {data.map((d) => (
              <div
                key={d.day}
                className="flex-1 rounded-xl flex flex-col items-center justify-center py-3 gap-0.5"
                style={{
                  background: lerp(d.resultsIntensity, '#22c55e', '#22c55e'),
                  minHeight:  64,
                  transition: 'background 0.3s',
                }}
                title={`${d.day}: ${d.results} resultados`}
              >
                <span className="text-[10px] font-bold tabular-nums"
                  style={{ color: d.resultsIntensity > 0.4 ? '#fff' : 'var(--muted)' }}>
                  {d.results > 0 ? d.results : '—'}
                </span>
              </div>
            ))}
          </div>

          {/* Clicks row */}
          <div className="flex gap-2 items-center">
            <div style={{ width: 70, flexShrink: 0 }}>
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#38bdf8' }}>
                Clics
              </span>
            </div>
            {data.map((d) => {
              const maxClicks = Math.max(...data.map((x) => x.clicks), 1);
              const intensity = d.clicks / maxClicks;
              return (
                <div
                  key={d.day}
                  className="flex-1 rounded-xl flex flex-col items-center justify-center py-3 gap-0.5"
                  style={{
                    background: lerp(intensity, '#0ea5e9', '#0ea5e9'),
                    minHeight:  64,
                    transition: 'background 0.3s',
                  }}
                  title={`${d.day}: ${fmtShort(d.clicks)} clics`}
                >
                  <span className="text-[10px] font-bold tabular-nums"
                    style={{ color: intensity > 0.4 ? '#fff' : 'var(--muted)' }}>
                    {d.clicks > 0 ? fmtShort(d.clicks) : '—'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 pt-1 flex-wrap">
            {[
              { label: 'Más inversión', color: '#6366f1' },
              { label: 'Más resultados', color: '#22c55e' },
              { label: 'Más clics', color: '#0ea5e9' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: item.color }} />
                <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
