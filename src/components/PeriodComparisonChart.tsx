'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import type { PeriodComparisonItem } from '@/types';
import { formatCOP } from '@/lib/format';

interface Props {
  data: PeriodComparisonItem[];
  loading: boolean;
  range: string;
}

function fmtAxis(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const item: PeriodComparisonItem = payload[0]?.payload;
  const fmtVal = (v: number) =>
    item?.isMonetary ? formatCOP(v, true) : v.toLocaleString('es-CO');

  return (
    <div className="card p-3 text-xs" style={{ minWidth: 160 }}>
      <p className="font-bold mb-2" style={{ color: 'var(--text)' }}>{label}</p>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-bold tabular-nums" style={{ color: 'var(--text)' }}>
            {fmtVal(p.value)}
          </span>
        </div>
      ))}
      {item?.change !== 0 && (
        <div className="mt-2 pt-2 border-t flex justify-between gap-4" style={{ borderColor: 'var(--border)' }}>
          <span style={{ color: 'var(--muted)' }}>Variación</span>
          <span className="font-bold tabular-nums"
            style={{ color: (item.change ?? 0) >= 0 ? '#4ade80' : '#f87171' }}>
            {item.change > 0 ? '+' : ''}{item.change}%
          </span>
        </div>
      )}
    </div>
  );
}

const PERIOD_LABELS: Record<string, string> = {
  '7d':  'últimos 7 días',
  '30d': 'últimos 30 días',
  '90d': 'últimos 90 días',
  'all': 'todo el período',
};

export default function PeriodComparisonChart({ data, loading, range }: Props) {
  const hasData = data.some((d) => d.current > 0 || d.previous > 0);
  const prevLabel = `Período anterior`;
  const curLabel  = `Período actual`;

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="chart-card-title">Comparación de Períodos</p>
          <p className="chart-card-subtitle">
            {PERIOD_LABELS[range] ?? range} vs período anterior
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#6366f1' }} />
            <span className="text-[11px]" style={{ color: 'var(--muted)' }}>{curLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#374151' }} />
            <span className="text-[11px]" style={{ color: 'var(--muted)' }}>{prevLabel}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="skeleton h-52 rounded-xl animate-pulse" />
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center h-52 gap-2"
          style={{ color: 'var(--muted2)', border: '1.5px dashed var(--border)', borderRadius: 12 }}>
          <span style={{ fontSize: 28, opacity: 0.4 }}>◈</span>
          <span className="text-sm">Sin datos para comparar</span>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} barCategoryGap="28%" barGap={4}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={fmtAxis}
                tick={{ fill: 'var(--muted)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface2)', opacity: 0.5 }} />
              <Legend wrapperStyle={{ display: 'none' }} />
              <Bar dataKey="previous" name={prevLabel} fill="#374151" radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Bar dataKey="current"  name={curLabel}  fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>

          {/* Change badges */}
          <div className="flex gap-2 flex-wrap">
            {data.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
              >
                <span style={{ color: 'var(--muted)' }}>{item.label}</span>
                <span className="font-bold tabular-nums"
                  style={{ color: item.change >= 0 ? '#4ade80' : '#f87171' }}>
                  {item.change > 0 ? '+' : ''}{item.change}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
