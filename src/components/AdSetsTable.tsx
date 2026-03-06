'use client';

import type { AdSetTableRow } from '@/types';
import { formatCOPFull } from '@/lib/format';

interface Props {
  data: AdSetTableRow[];
  loading?: boolean;
}

const NETWORK_COLORS: Record<string, string> = {
  // Meta — display labels returned by combineNetworkLabel()
  'Facebook':        '#1877F2',
  'Instagram':       '#E1306C',
  'Audience Net.':   '#F0A500',
  'Messenger':       '#00B2FF',
  'FB + IG':         '#1877F2',
  'FB + MSG':        '#1877F2',
  'Multi-red':       '#6b7280',
  'Meta':            '#1877F2',
  // Google — NETWORK_LABELS resolves lowercase keys to these display labels,
  // which are then passed through combineNetworkLabel as the network value
  'Google Búsqueda': '#4285F4',
  'Google Display':  '#34A853',
  'YouTube':         '#FF0000',
  'Google':          '#4285F4',
  // Raw keys (fallback, in case label lookup skipped)
  'google_search':   '#4285F4',
  'google_display':  '#34A853',
  'google_video':    '#FF0000',
  'google':          '#4285F4',
  // Generic
  'Total':           '#6b7280',
};

function fmt(n: number): string {
  return n.toLocaleString('es-CO');
}

function shortResultType(t: string): string {
  if (!t) return '—';
  if (t.includes('messaging_conversation')) return 'WhatsApp';
  if (t.includes('lead_grouped')) return 'Lead';
  if (t.includes('lead')) return 'Lead';
  if (t.includes('landing_page')) return 'Landing';
  if (t.includes('video')) return 'Video';
  return t.split('.').pop() || t;
}

export default function AdSetsTable({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="card p-5">
        <div className="skeleton h-5 w-48 mb-4" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton h-10 w-full mb-2" />
        ))}
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.spent - a.spent);

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <div>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
            Conjuntos de Anuncios
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {sorted.length} conjuntos únicos · acumulado del período
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Conjunto</th>
              <th>Campaña</th>
              <th>Red</th>
              <th className="text-right">Impresiones</th>
              <th className="text-right">Clics</th>
              <th className="text-right">CTR</th>
              <th className="text-right">Resultados</th>
              <th className="text-right">Tipo</th>
              <th className="text-right">CPR</th>
              <th className="text-right">CPM</th>
              <th className="text-right">CPC</th>
              <th className="text-right">Invertido (COP)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const netColor = NETWORK_COLORS[row.network] || '#6b7280';
              const netLabel = row.network || 'Meta';
              return (
                <tr key={`${row.id}-${i}`}>
                  <td>
                    <span className="font-medium text-xs" style={{ color: 'var(--text)' }}>
                      {row.adset_name}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {row.campaign_name.length > 24
                        ? row.campaign_name.substring(0, 22) + '…'
                        : row.campaign_name}
                    </span>
                  </td>
                  <td>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${netColor}22`, color: netColor }}
                    >
                      {netLabel}
                    </span>
                  </td>
                  <td className="text-right font-mono text-xs" style={{ color: 'var(--muted)' }}>
                    {fmt(row.impressions)}
                  </td>
                  <td className="text-right font-mono text-xs" style={{ color: '#3b82f6' }}>
                    {fmt(row.clicks)}
                  </td>
                  <td className="text-right font-mono text-xs font-semibold" style={{ color: '#60a5fa' }}>
                    {row.ctr.toFixed(2)}%
                  </td>
                  <td className="text-right font-mono text-xs font-bold" style={{ color: '#22c55e' }}>
                    {fmt(row.results)}
                  </td>
                  <td className="text-right text-xs" style={{ color: 'var(--muted)' }}>
                    {shortResultType(row.result_type)}
                  </td>
                  <td className="text-right font-mono text-xs" style={{ color: '#f59e0b' }}>
                    {row.cost_per_result > 0 ? formatCOPFull(row.cost_per_result) : '—'}
                  </td>
                  <td className="text-right font-mono text-xs" style={{ color: 'var(--muted)' }}>
                    {row.cpm > 0 ? formatCOPFull(row.cpm) : '—'}
                  </td>
                  <td className="text-right font-mono text-xs" style={{ color: 'var(--muted)' }}>
                    {row.cpc > 0 ? formatCOPFull(row.cpc) : '—'}
                  </td>
                  <td className="text-right font-mono text-xs font-semibold" style={{ color: 'var(--text)' }}>
                    {formatCOPFull(row.spent)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
