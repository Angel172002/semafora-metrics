'use client';
import { formatCOPFull } from '@/lib/format';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { PlatformBudget } from '@/types';

interface Props {
  data: PlatformBudget[];
  loading?: boolean;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload as PlatformBudget;
  return (
    <div className="custom-tooltip">
      <div className="flex items-center gap-2 text-xs">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
        <span style={{ color: 'var(--text)' }}>{item.label}</span>
      </div>
      <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
        {formatCOPFull(item.spent)} — {item.percentage}%
      </p>
    </div>
  );
}

export default function BudgetDistributionChart({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="card p-5">
        <div className="skeleton h-5 w-48 mb-4" />
        <div className="skeleton h-52 w-full rounded-full mx-auto" style={{ maxWidth: 200 }} />
      </div>
    );
  }

  const totalSpent = data.reduce((s, d) => s + d.spent, 0);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
          Distribución de Presupuesto
        </h3>
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
        </svg>
      </div>

      {/* Chart + center label */}
      <div className="relative">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={82}
              paddingAngle={3}
              dataKey="spent"
              nameKey="label"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Total</p>
            <p className="text-sm font-bold font-mono leading-tight" style={{ color: 'var(--text)' }}>
              {formatCOPFull(totalSpent)}
            </p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        {data.map((item) => (
          <div key={item.platform} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>{item.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-semibold" style={{ color: item.color }}>
                {item.percentage}%
              </span>
              <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
                {formatCOPFull(item.spent)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
