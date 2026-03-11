'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
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
      <p className="font-bold mb-2" style={{ color: 'var(--text)', fontSize: 12 }}>{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs mb-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
          <span style={{ color: 'var(--muted)' }}>{entry.name}:</span>
          <span className="font-bold" style={{ color: entry.color }}>
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
        <div className="flex items-center justify-between mb-4">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton h-7 w-28 rounded-lg" />
        </div>
        <div className="skeleton h-52 w-full rounded-xl" />
      </div>
    );
  }

  const cplData = data.filter((d) => d.cpl > 0);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="chart-card-title">Rendimiento Diario</h3>
          <p className="chart-card-subtitle">
            {mode === 'performance' ? 'Evolución de clics y resultados' : 'Costo por Lead diario'}
          </p>
        </div>
        <div
          className="flex rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)', background: 'var(--surface2)' }}
        >
          {(['performance', 'cpl'] as ChartMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '5px 12px',
                fontSize: 11,
                fontWeight: m === mode ? 700 : 500,
                background: m === mode ? 'var(--accent)' : 'transparent',
                color: m === mode ? '#fff' : 'var(--muted)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
                borderRadius: 10,
              }}
            >
              {m === 'performance' ? 'Clics / Leads' : 'CPL'}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        {mode === 'performance' ? (
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="gradClicks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradResults" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border2)', strokeWidth: 1 }} />
            <Legend wrapperStyle={{ paddingTop: 12, fontSize: 11 }} formatter={(v) => <span style={{ color: 'var(--muted)' }}>{v}</span>} />
            <Area type="monotone" dataKey="clicks"  name="Clics"      stroke="#3b82f6" strokeWidth={2} fill="url(#gradClicks)"  dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#3b82f6' }} />
            <Area type="monotone" dataKey="results" name="Resultados" stroke="#22c55e" strokeWidth={2} fill="url(#gradResults)" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#22c55e' }} />
          </AreaChart>
        ) : (
          <LineChart data={cplData} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border2)', strokeWidth: 1 }} />
            <Legend wrapperStyle={{ paddingTop: 12, fontSize: 11 }} formatter={(v) => <span style={{ color: 'var(--muted)' }}>{v}</span>} />
            <Line
              type="monotone"
              dataKey="cpl"
              name="CPL (COP)"
              stroke="#f59e0b"
              strokeWidth={2.5}
              strokeDasharray="6 3"
              dot={{ fill: '#f59e0b', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              connectNulls
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
