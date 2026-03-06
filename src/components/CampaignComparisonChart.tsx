'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { CampaignChartItem } from '@/types';

interface Props {
  data: CampaignChartItem[];
  loading?: boolean;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="font-semibold mb-2 text-xs" style={{ color: 'var(--text)' }}>{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs mb-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.fill }} />
          <span style={{ color: 'var(--muted)' }}>{entry.name}:</span>
          <span className="font-semibold" style={{ color: entry.fill }}>
            {entry.value.toLocaleString('es-CO')}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function CampaignComparisonChart({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="card p-5">
        <div className="skeleton h-5 w-44 mb-4" />
        <div className="skeleton h-52 w-full" />
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
          Comparación por Campaña
        </h3>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: 'var(--muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            angle={-20}
            textAnchor="end"
            height={48}
          />
          <YAxis
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Legend
            wrapperStyle={{ paddingTop: 8, fontSize: 12 }}
            formatter={(value) => <span style={{ color: 'var(--muted)' }}>{value}</span>}
          />
          <Bar dataKey="clicks" name="Clicks" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={24} />
          <Bar dataKey="results" name="Resultados" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={24} />
          <Bar dataKey="likes" name="Likes" fill="#ec4899" radius={[3, 3, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
