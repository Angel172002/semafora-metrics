'use client';
import { formatCOPFull, formatCOPAxis } from '@/lib/format';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DailyChartPoint } from '@/types';

interface Props {
  data: DailyChartPoint[];
  loading?: boolean;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="font-semibold mb-2" style={{ color: 'var(--text)' }}>{label}</p>
      <div className="flex items-center gap-2 text-xs">
        <span className="w-2 h-2 rounded-full" style={{ background: '#a855f7' }} />
        <span style={{ color: 'var(--muted)' }}>Invertido (COP):</span>
        <span className="font-semibold" style={{ color: '#a855f7' }}>
          {formatCOPFull(payload[0].value)}
        </span>
      </div>
    </div>
  );
}

export default function BudgetChart({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="card p-5">
        <div className="skeleton h-5 w-40 mb-4" />
        <div className="skeleton h-52 w-full" />
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
          Presupuesto Invertido
        </h3>
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="budgetGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#a855f7" stopOpacity={0.02} />
            </linearGradient>
          </defs>
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
            tickFormatter={(v) => formatCOPAxis(v)}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border2)', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="spent"
            stroke="#a855f7"
            strokeWidth={2}
            fill="url(#budgetGradient)"
            dot={false}
            activeDot={{ r: 5, fill: '#a855f7', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
