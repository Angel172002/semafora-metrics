'use client';

import { useState } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { DailyChartPoint } from '@/types';

interface Props {
  data: DailyChartPoint[];
  loading?: boolean;
}

type ChartMode = 'performance' | 'cpl';

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="font-semibold mb-2" style={{ color: 'var(--text)' }}>{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs mb-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
          <span style={{ color: 'var(--muted)' }}>{entry.name}:</span>
          <span className="font-semibold" style={{ color: entry.color }}>
            {entry.dataKey === 'cpl' || entry.dataKey === 'spent'
              ? `$${entry.value.toLocaleString('es-CO')}`
              : entry.value.toLocaleString('es-CO')}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function DailyPerformanceChart({ data, loading }: Props) {
  const [mode, setMode] = useState<ChartMode>('performance');

  if (loading) {
    return (
      <div className="card p-5">
        <div className="skeleton h-5 w-40 mb-4" />
        <div className="skeleton h-52 w-full" />
      </div>
    );
  }

  // CPL view: only show days where leads were generated
  const cplData = data.filter((d) => d.cpl > 0);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
          Rendimiento Diario
        </h3>
        <div
          className="flex rounded-lg overflow-hidden text-xs"
          style={{ border: '1px solid var(--border)' }}
        >
          {(['performance', 'cpl'] as ChartMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-3 py-1 transition-colors"
              style={{
                background: mode === m ? '#1877F2' : 'var(--surface)',
                color: mode === m ? '#fff' : 'var(--muted)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: mode === m ? 600 : 400,
              }}
            >
              {m === 'performance' ? 'Clics/Leads' : 'CPL'}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        {mode === 'performance' ? (
          <ComposedChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border2)', strokeWidth: 1 }} />
            <Legend
              wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
              formatter={(value) => <span style={{ color: 'var(--muted)' }}>{value}</span>}
            />
            <Line type="monotone" dataKey="clicks" name="Clicks" stroke="#3b82f6" strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
            <Line type="monotone" dataKey="results" name="Resultados" stroke="#22c55e" strokeWidth={2}
              dot={{ fill: '#22c55e', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
          </ComposedChart>
        ) : (
          <ComposedChart data={cplData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border2)', strokeWidth: 1 }} />
            <Legend
              wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
              formatter={(value) => <span style={{ color: 'var(--muted)' }}>{value}</span>}
            />
            <Line type="monotone" dataKey="cpl" name="CPL (COP)" stroke="#f59e0b" strokeWidth={2.5}
              strokeDasharray="5 3"
              dot={{ fill: '#f59e0b', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              connectNulls
            />
          </ComposedChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
