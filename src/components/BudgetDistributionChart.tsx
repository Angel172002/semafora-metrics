'use client';
import { formatCOPFull } from '@/lib/format';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
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

function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percentage, label }: any) {
  if (percentage < 8) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5 + 28;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const shortLabel = label.replace(' Ads', '').replace('Google', 'Google').substring(0, 12);

  return (
    <text
      x={x}
      y={y}
      fill="var(--muted)"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={11}
    >
      {shortLabel} {percentage}%
    </text>
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
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={80}
            paddingAngle={2}
            dataKey="spent"
            nameKey="label"
            labelLine={false}
            label={(props) => renderCustomLabel({ ...props, label: props.payload.label, percentage: props.payload.percentage })}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
