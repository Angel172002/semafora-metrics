'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import type { NetworkBreakdownItem } from '@/types';
import { formatCOPFull } from '@/lib/format';

interface Props {
  data: NetworkBreakdownItem[];
  loading?: boolean;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString('es-CO');
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: NetworkBreakdownItem = payload[0].payload;
  return (
    <div className="custom-tooltip">
      <p className="font-semibold mb-2 text-sm" style={{ color: 'var(--text)' }}>{d.label}</p>
      <div className="flex flex-col gap-1 text-xs">
        <div className="flex justify-between gap-4">
          <span style={{ color: 'var(--muted)' }}>Invertido:</span>
          <span className="font-semibold" style={{ color: d.color }}>{formatCOPFull(d.spent)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: 'var(--muted)' }}>Resultados:</span>
          <span className="font-semibold" style={{ color: d.color }}>{d.results.toLocaleString('es-CO')}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: 'var(--muted)' }}>Impresiones:</span>
          <span className="font-semibold" style={{ color: 'var(--text)' }}>{formatNum(d.impressions)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: 'var(--muted)' }}>Participación:</span>
          <span className="font-semibold" style={{ color: d.color }}>{d.percentage}%</span>
        </div>
      </div>
    </div>
  );
}

export default function NetworkBreakdownChart({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="card p-5">
        <div className="skeleton h-5 w-48 mb-4" />
        <div className="skeleton h-52 w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="card p-5 flex items-center justify-center h-48">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Sin datos de red disponibles</p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
            Facebook vs Instagram
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            Distribución por red publicitaria
          </p>
        </div>
        {/* Network icons */}
        <div className="flex gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(24,119,242,0.15)', color: '#1877F2' }}>
            FB
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(225,48,108,0.15)', color: '#E1306C' }}>
            IG
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pie chart */}
        <div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="spent"
              >
                {data.map((entry) => (
                  <Cell key={entry.network} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value, entry: any) => (
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                    {entry.payload?.label || value}
                  </span>
                )}
                iconType="circle"
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Stats cards */}
        <div className="flex flex-col justify-center gap-3">
          {data.map((item) => (
            <div
              key={item.network}
              className="rounded-lg p-3 flex justify-between items-center"
              style={{ background: 'var(--surface2)' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: item.color }}
                />
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
                    {item.label}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    {item.percentage}% del total
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold font-mono" style={{ color: item.color }}>
                  {item.results.toLocaleString('es-CO')} res.
                </p>
                <p className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
                  {formatNum(item.impressions)} imp.
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
