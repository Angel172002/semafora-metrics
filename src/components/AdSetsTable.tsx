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

// ─── Result badge ─────────────────────────────────────────────────────────────
interface ResultBadge { label: string; color: string; bg: string }

function getResultBadge(t: string): ResultBadge {
  if (!t) return { label: 'Sin resultado', color: '#6b7280', bg: '#6b728015' };
  if (t.includes('messaging_conversation')) return { label: 'WhatsApp',     color: '#25D366', bg: '#25D36615' };
  if (t.includes('lead_grouped') || t === 'lead') return { label: 'Lead',  color: '#3b82f6', bg: '#3b82f615' };
  if (t.includes('omni_landing_page') || t.includes('landing_page')) return { label: 'Landing', color: '#f59e0b', bg: '#f59e0b15' };
  if (t.includes('omni_purchase') || t.includes('purchase')) return { label: 'Compra',    color: '#e20613', bg: '#e2061315' };
  if (t.includes('post_engagement') || t.includes('engagement')) return { label: 'Interacción', color: '#f59e0b', bg: '#f59e0b15' };
  if (t === 'google_search')  return { label: 'G. Búsqueda', color: '#4285F4', bg: '#4285F415' };
  if (t === 'google_display') return { label: 'G. Display',  color: '#34A853', bg: '#34A85315' };
  if (t === 'google_video')   return { label: 'YouTube',     color: '#FF0000', bg: '#FF000015' };
  if (t.startsWith('google')) return { label: 'Google',      color: '#4285F4', bg: '#4285F415' };
  if (t.includes('video'))    return { label: 'Video',       color: '#a855f7', bg: '#a855f715' };
  return { label: t.split('.').pop() || t, color: '#6b7280', bg: '#6b728015' };
}

function getFilterKey(t: string): string {
  if (!t) return 'sin_resultado';
  if (t.includes('messaging_conversation')) return 'whatsapp';
  if (t.includes('lead')) return 'lead';
  if (t.includes('landing_page') || t.includes('omni_landing')) return 'landing';
  if (t.includes('engagement')) return 'interaccion';
  if (t === 'google_search')  return 'google_search';
  if (t === 'google_display') return 'google_display';
  if (t === 'google_video')   return 'google_video';
  if (t.startsWith('google')) return 'google';
  if (t.includes('video'))    return 'video';
  return 'otro';
}

const FILTER_LABELS: Record<string, string> = {
  all: 'Todos', whatsapp: 'WhatsApp', lead: 'Leads', landing: 'Landing',
  video: 'Video', interaccion: 'Interacción', sin_resultado: 'Sin resultado',
  google_search: 'G. Búsqueda', google_display: 'G. Display', google_video: 'YouTube',
  google: 'Google', otro: 'Otro',
};

// ─── Semáforo CPR ─────────────────────────────────────────────────────────────
function getCPRClass(cpr: number, allCPRs: number[]): 'green' | 'yellow' | 'red' | '' {
  const valid = allCPRs.filter((v) => v > 0);
  if (valid.length < 3 || cpr <= 0) return '';
  const sorted = [...valid].sort((a, b) => a - b);
  const p33 = sorted[Math.floor(sorted.length * 0.33)];
  const p66 = sorted[Math.floor(sorted.length * 0.66)];
  if (cpr <= p33) return 'green';
  if (cpr <= p66) return 'yellow';
  return 'red';
}

// ─── Sort ─────────────────────────────────────────────────────────────────────
type SortKey = 'adset_name' | 'campaign_name' | 'impressions' | 'clicks' | 'ctr' | 'results' | 'cost_per_result' | 'cpm' | 'cpc' | 'spent';
type SortDir = 'asc' | 'desc';

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span style={{ color: active ? 'var(--accent)' : 'var(--muted2)', opacity: active ? 1 : 0.5, fontSize: 9, marginLeft: 4 }}>
      {active ? (dir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );
}

export default function AdSetsTable({ data, loading }: Props) {
  const [filter, setFilter]   = useState<string>('all');
  const [search, setSearch]   = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('spent');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  if (loading) {
    return (
      <div className="p-5">
        <div className="skeleton h-5 w-48 mb-4" />
        {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-11 w-full mb-2" style={{ borderRadius: 8 }} />)}
      </div>
    );
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const totalSpent = data.reduce((s, r) => s + r.spent, 0);
  const totalResults = data.reduce((s, r) => s + r.results, 0);
  const totalImpressions = data.reduce((s, r) => s + r.impressions, 0);
  const totalClicks = data.reduce((s, r) => s + r.clicks, 0);
  const allCPRs = data.map((r) => r.cost_per_result);

  const filterCounts: Record<string, number> = { all: data.length };
  for (const row of data) {
    const key = getFilterKey(row.result_type);
    filterCounts[key] = (filterCounts[key] || 0) + 1;
  }
  const filterKeys = ['all', ...Object.keys(filterCounts).filter((k) => k !== 'all')];

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const searchLower = search.toLowerCase();
  const filtered = (filter === 'all' ? [...data] : data.filter((r) => getFilterKey(r.result_type) === filter))
    .filter((r) => !searchLower || r.adset_name.toLowerCase().includes(searchLower) || r.campaign_name.toLowerCase().includes(searchLower))
    .sort((a, b) => {
      const av = sortKey === 'adset_name' ? a.adset_name : sortKey === 'campaign_name' ? a.campaign_name : (a[sortKey] as number);
      const bv = sortKey === 'adset_name' ? b.adset_name : sortKey === 'campaign_name' ? b.campaign_name : (b[sortKey] as number);
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

  function th(label: string, key: SortKey, align: 'left' | 'right' = 'right') {
    return (
      <th className={align === 'right' ? 'text-right' : ''} style={{ cursor: 'pointer' }} onClick={() => handleSort(key)}>
        {label}<SortIcon active={sortKey === key} dir={sortDir} />
      </th>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* ── Header ── */}
      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <h3 className="font-bold text-sm" style={{ color: 'var(--text)' }}>Conjuntos de Anuncios</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              {filtered.length} de {data.length} conjuntos · acumulado del período
              {totalSpent > 0 && (
                <span style={{ color: 'var(--muted2)' }}> · {formatCOPFull(totalSpent)} total</span>
              )}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conjunto o campaña…"
            className="w-full text-xs pl-7 pr-3 py-1.5 rounded-lg border"
            style={{
              background: 'var(--surface2)', color: 'var(--text)',
              borderColor: 'var(--border)', outline: 'none',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--muted)', fontSize: 10 }}>✕</button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-1.5">
          {filterKeys.map((key) => {
            const isActive = filter === key;
            const count = filterCounts[key] || 0;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: isActive ? 'var(--accent)' : 'var(--surface2)',
                  color: isActive ? '#fff' : 'var(--muted)',
                  border: isActive ? '1px solid transparent' : '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                {FILTER_LABELS[key] || key}
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.22)' : 'var(--border)',
                    color: isActive ? '#fff' : 'var(--muted2)',
                    fontSize: 10, fontWeight: 700,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table ── */}
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
              <th className="text-right">Participación</th>
              {th('Invertido (COP)', 'spent')}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => {
              const netColor  = NETWORK_COLORS[row.network] || '#6b7280';
              const badge     = getResultBadge(row.result_type);
              const cprClass  = getCPRClass(row.cost_per_result, allCPRs);
              const spentPct  = totalSpent > 0 ? Math.round((row.spent / totalSpent) * 100) : 0;

              return (
                <tr key={`${row.id}-${i}`}>
                  {/* Conjunto */}
                  <td style={{ maxWidth: 200 }}>
                    <span className="font-semibold text-xs block truncate" style={{ color: 'var(--text)' }} title={row.adset_name}>
                      {row.adset_name}
                    </span>
                  </td>

                  {/* Campaña */}
                  <td style={{ maxWidth: 160 }}>
                    <span className="text-xs block truncate" style={{ color: 'var(--muted)' }} title={row.campaign_name}>
                      {row.campaign_name}
                    </span>
                  </td>

                  {/* Red */}
                  <td>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${netColor}22`, color: netColor }}>
                      {row.network || 'Meta'}
                    </span>
                  </td>

                  {/* Impresiones */}
                  <td className="text-right font-mono text-xs" style={{ color: 'var(--muted)' }}>{fmt(row.impressions)}</td>

                  {/* Clics */}
                  <td className="text-right font-mono text-xs" style={{ color: 'var(--info)' }}>{fmt(row.clicks)}</td>

                  {/* CTR */}
                  <td className="text-right font-mono text-xs font-semibold" style={{ color: '#60a5fa' }}>{row.ctr.toFixed(2)}%</td>

                  {/* Resultados */}
                  <td className="text-right">
                    <span className="font-mono text-xs font-bold" style={{ color: '#4ade80' }}>{fmt(row.results)}</span>
                  </td>

                  {/* Tipo resultado */}
                  <td className="text-right">
                    <span className="text-xs font-semibold px-2 py-1 rounded-lg whitespace-nowrap"
                      style={{ background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                  </td>

                  {/* CPR con semáforo */}
                  <td className="text-right">
                    {row.cost_per_result > 0 ? (
                      <div className="flex items-center justify-end gap-1.5">
                        {cprClass && <span className={`semaforo-dot ${cprClass}`} />}
                        <span className={`font-mono text-xs font-semibold semaforo-${cprClass || 'yellow'}`}>
                          {formatCOPFull(row.cost_per_result)}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--muted2)', fontSize: 12 }}>—</span>
                    )}
                  </td>

                  {/* CPM */}
                  <td className="text-right font-mono text-xs" style={{ color: 'var(--muted)' }}>
                    {row.cpm > 0 ? formatCOPFull(row.cpm) : '—'}
                  </td>

                  {/* CPC */}
                  <td className="text-right font-mono text-xs" style={{ color: 'var(--muted)' }}>
                    {row.cpc > 0 ? formatCOPFull(row.cpc) : '—'}
                  </td>

                  {/* Participación del gasto */}
                  <td className="text-right" style={{ minWidth: 90 }}>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-mono text-xs font-semibold" style={{ color: 'var(--text-soft)' }}>
                        {spentPct}%
                      </span>
                      <div className="progress-bar" style={{ width: 70 }}>
                        <div className="progress-fill meta" style={{ width: `${spentPct}%` }} />
                      </div>
                    </div>
                  </td>

                  {/* Invertido */}
                  <td className="text-right font-mono text-xs font-bold" style={{ color: 'var(--text)' }}>
                    {formatCOPFull(row.spent)}
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={13} className="text-center py-10" style={{ color: 'var(--muted)' }}>
                  No hay conjuntos para este filtro
                </td>
              </tr>
            )}
          </tbody>

          {/* ── Fila totales ── */}
          {filtered.length > 0 && (
            <tfoot>
              <tr style={{ background: 'var(--surface2)', borderTop: '2px solid var(--border)' }}>
                <td colSpan={3}>
                  <span className="font-bold text-xs" style={{ color: 'var(--text)' }}>
                    Total · {filtered.length} conjuntos
                  </span>
                </td>
                <td className="text-right font-mono text-xs font-bold" style={{ color: 'var(--muted)' }}>
                  {fmt(totalImpressions)}
                </td>
                <td className="text-right font-mono text-xs font-bold" style={{ color: 'var(--info)' }}>
                  {fmt(totalClicks)}
                </td>
                <td className="text-right font-mono text-xs font-bold" style={{ color: '#60a5fa' }}>
                  {totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00'}%
                </td>
                <td className="text-right font-mono text-xs font-bold" style={{ color: '#4ade80' }}>
                  {fmt(totalResults)}
                </td>
                <td />
                <td className="text-right font-mono text-xs font-bold" style={{ color: 'var(--text-soft)' }}>
                  {totalResults > 0 ? formatCOPFull(totalSpent / totalResults) : '—'}
                </td>
                <td colSpan={3} />
                <td className="text-right font-mono text-xs font-bold" style={{ color: 'var(--text)' }}>
                  {formatCOPFull(totalSpent)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
