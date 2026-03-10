'use client';

import { useState } from 'react';
import type { AdSetTableRow } from '@/types';
import { formatCOPFull } from '@/lib/format';

interface Props {
  data: AdSetTableRow[];
  loading?: boolean;
}

const NETWORK_COLORS: Record<string, string> = {
  'Facebook': '#1877F2', 'Instagram': '#E1306C', 'Audience Net.': '#F0A500',
  'Messenger': '#00B2FF', 'FB + IG': '#1877F2', 'FB + MSG': '#1877F2',
  'Multi-red': '#6b7280', 'Meta': '#1877F2',
  'Google Búsqueda': '#4285F4', 'Google Display': '#34A853', 'YouTube': '#FF0000', 'Google': '#4285F4',
  'google_search': '#4285F4', 'google_display': '#34A853', 'google_video': '#FF0000', 'google': '#4285F4',
  'Total': '#6b7280',
};

function fmt(n: number): string { return n.toLocaleString('es-CO'); }

function shortResultType(t: string): string {
  if (!t) return '—';
  if (t.includes('messaging_conversation')) return 'WhatsApp';
  if (t.includes('lead_grouped') || t.includes('lead')) return 'Lead';
  if (t.includes('landing_page')) return 'Landing';
  if (t.includes('video')) return 'Video';
  return t.split('.').pop() || t;
}

type SortKey = 'adset_name' | 'campaign_name' | 'impressions' | 'clicks' | 'ctr' | 'results' | 'cost_per_result' | 'cpm' | 'cpc' | 'spent';
type SortDir = 'asc' | 'desc';

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span style={{ color: active ? '#1877F2' : 'var(--muted)', opacity: active ? 1 : 0.4, fontSize: 10 }}>
      {active ? (dir === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
    </span>
  );
}

export default function AdSetsTable({ data, loading }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('spent');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  if (loading) {
    return (
      <div className="card p-5">
        <div className="skeleton h-5 w-48 mb-4" />
        {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 w-full mb-2" />)}
      </div>
    );
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const sorted = [...data].sort((a, b) => {
    const av = sortKey === 'adset_name' ? a.adset_name : sortKey === 'campaign_name' ? a.campaign_name : (a[sortKey] as number);
    const bv = sortKey === 'adset_name' ? b.adset_name : sortKey === 'campaign_name' ? b.campaign_name : (b[sortKey] as number);
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  function th(label: string, key: SortKey, align: 'left' | 'right' = 'right') {
    return (
      <th className={align === 'right' ? 'text-right' : ''}
        style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
        onClick={() => handleSort(key)}>
        {label}<SortIcon active={sortKey === key} dir={sortDir} />
      </th>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <div>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Conjuntos de Anuncios</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {sorted.length} conjuntos únicos · acumulado del período
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {th('Conjunto', 'adset_name', 'left')}
              {th('Campaña', 'campaign_name', 'left')}
              <th>Red</th>
              {th('Impresiones', 'impressions')}
              {th('Clics', 'clicks')}
              {th('CTR', 'ctr')}
              {th('Resultados', 'results')}
              <th className="text-right">Tipo</th>
              {th('CPR', 'cost_per_result')}
              {th('CPM', 'cpm')}
              {th('CPC', 'cpc')}
              {th('Invertido (COP)', 'spent')}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const netColor = NETWORK_COLORS[row.network] || '#6b7280';
              return (
                <tr key={`${row.id}-${i}`}>
                  <td>
                    <span className="font-medium text-xs" style={{ color: 'var(--text)' }}>{row.adset_name}</span>
                  </td>
                  <td>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {row.campaign_name.length > 24 ? row.campaign_name.substring(0, 22) + '…' : row.campaign_name}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${netColor}22`, color: netColor }}>
                      {row.network || 'Meta'}
                    </span>
                  </td>
                  <td className="text-right font-mono text-xs" style={{ color: 'var(--muted)' }}>{fmt(row.impressions)}</td>
                  <td className="text-right font-mono text-xs" style={{ color: '#3b82f6' }}>{fmt(row.clicks)}</td>
                  <td className="text-right font-mono text-xs font-semibold" style={{ color: '#60a5fa' }}>{row.ctr.toFixed(2)}%</td>
                  <td className="text-right font-mono text-xs font-bold" style={{ color: '#22c55e' }}>{fmt(row.results)}</td>
                  <td className="text-right text-xs" style={{ color: 'var(--muted)' }}>{shortResultType(row.result_type)}</td>
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
