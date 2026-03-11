'use client';

import { useState } from 'react';
import type { CampaignTableRow, Platform } from '@/types';
import { formatCOPFull } from '@/lib/format';

interface Props {
  data: CampaignTableRow[];
  loading?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activa', paused: 'Pausada', ended: 'Finalizada',
};

const PLATFORM_LABELS: Record<Platform, string> = {
  meta: 'Meta', google: 'Google', tiktok: 'TikTok', instagram: 'Instagram', linkedin: 'LinkedIn',
};

const PLATFORM_CLASS: Record<Platform, string> = {
  meta: 'meta', google: 'google', tiktok: 'tiktok', instagram: 'instagram', linkedin: 'meta',
};

function fmt(n: number): string { return n.toLocaleString('es-CO'); }

// ─── Result badge ────────────────────────────────────────────────────────────
interface ResultBadge { label: string; color: string; bg: string }

function getResultBadge(t: string): ResultBadge {
  if (!t) return { label: 'Sin resultado', color: '#6b7280', bg: '#6b728015' };
  if (t.includes('messaging_conversation')) return { label: 'WhatsApp',      color: '#25D366', bg: '#25D36615' };
  if (t.includes('lead_grouped') || t === 'lead') return { label: 'Lead',   color: '#3b82f6', bg: '#3b82f615' };
  if (t.includes('omni_landing_page') || t.includes('landing_page')) return { label: 'Landing', color: '#f59e0b', bg: '#f59e0b15' };
  if (t.includes('omni_purchase') || t.includes('purchase')) return { label: 'Compra',     color: '#e20613', bg: '#e2061315' };
  if (t.includes('complete_registration')) return { label: 'Registro',       color: '#ec4899', bg: '#ec489915' };
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
  all: 'Todas', whatsapp: 'WhatsApp', lead: 'Leads', landing: 'Landing',
  video: 'Video', interaccion: 'Interacción', sin_resultado: 'Sin resultado',
  google_search: 'G. Búsqueda', google_display: 'G. Display', google_video: 'YouTube',
  google: 'Google', otro: 'Otro',
};

const LEGEND_ITEMS = [
  { key: 'whatsapp',       label: 'WhatsApp',     color: '#25D366', desc: 'Conversaciones iniciadas en WhatsApp Business (7 días)' },
  { key: 'lead',           label: 'Lead',          color: '#3b82f6', desc: 'Formularios de contacto completados' },
  { key: 'landing',        label: 'Vista Landing', color: '#f59e0b', desc: 'Clics que abrieron la página de destino' },
  { key: 'google_search',  label: 'G. Búsqueda',  color: '#4285F4', desc: 'Conversiones en campañas de Google Search' },
  { key: 'google_display', label: 'G. Display',   color: '#34A853', desc: 'Conversiones en campañas de Display / GDN' },
  { key: 'google_video',   label: 'YouTube',       color: '#FF0000', desc: 'Conversiones en anuncios de YouTube' },
  { key: 'sin_resultado',  label: 'Sin resultado', color: '#6b7280', desc: 'Publicaciones impulsadas (objetivo: alcance/interacción)' },
];

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
type SortKey = 'name' | 'impressions' | 'clicks' | 'ctr' | 'results' | 'cost_per_result' | 'cpm' | 'reach' | 'spent';
type SortDir = 'asc' | 'desc';

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span style={{ color: active ? 'var(--accent)' : 'var(--muted2)', opacity: active ? 1 : 0.5, fontSize: 9, marginLeft: 4 }}>
      {active ? (dir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );
}

export default function CampaignsTable({ data, loading }: Props) {
  const [filter, setFilter]         = useState<string>('all');
  const [showLegend, setShowLegend] = useState(false);
  const [sortKey, setSortKey]       = useState<SortKey>('spent');
  const [sortDir, setSortDir]       = useState<SortDir>('desc');

  if (loading) {
    return (
      <div className="p-5">
        <div className="skeleton h-5 w-40 mb-4" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton h-11 w-full mb-2" style={{ borderRadius: 8 }} />
        ))}
      </div>
    );
  }

  // ── Derived data ────────────────────────────────────────────────────────────
  const totalSpent = data.reduce((s, r) => s + r.spent, 0);
  const totalImpressions = data.reduce((s, r) => s + r.impressions, 0);
  const totalClicks = data.reduce((s, r) => s + r.clicks, 0);
  const totalResults = data.reduce((s, r) => s + r.results, 0);
  const totalReach = data.reduce((s, r) => s + r.reach, 0);
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
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

  const filtered = (filter === 'all' ? [...data] : data.filter((r) => getFilterKey(r.result_type) === filter))
    .sort((a, b) => {
      const aVal = sortKey === 'name' ? a.name : (a[sortKey] as number);
      const bVal = sortKey === 'name' ? b.name : (b[sortKey] as number);
      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

  function th(label: string, key: SortKey, align: 'left' | 'right' = 'right') {
    return (
      <th
        className={align === 'right' ? 'text-right' : ''}
        style={{ cursor: 'pointer' }}
        onClick={() => handleSort(key)}
      >
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
            <h3 className="font-bold text-sm" style={{ color: 'var(--text)' }}>Campañas</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              {filtered.length} de {data.length} campañas · acumulado del período
              {totalSpent > 0 && (
                <span style={{ color: 'var(--muted2)' }}> · {formatCOPFull(totalSpent)} total</span>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowLegend((v) => !v)}
            className="btn btn-ghost"
            style={{ fontSize: 11, padding: '5px 10px' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            ¿Qué es cada tipo?
          </button>
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="mb-3 rounded-xl p-4 text-xs animate-slide-up" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            <p className="font-bold mb-3" style={{ color: 'var(--text)', fontSize: 12 }}>Tipos de resultado</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {LEGEND_ITEMS.map((item) => (
                <div key={item.key} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 w-2 h-2 rounded-full" style={{ background: item.color }} />
                  <span>
                    <span className="font-semibold" style={{ color: 'var(--text)' }}>{item.label}:</span>{' '}
                    <span style={{ color: 'var(--muted)' }}>{item.desc}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

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
                    fontSize: 10,
                    fontWeight: 700,
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
              {th('Campaña', 'name', 'left')}
              <th>Plataforma</th>
              <th>Estado</th>
              {th('Impresiones', 'impressions')}
              {th('Clics', 'clicks')}
              {th('CTR', 'ctr')}
              {th('Resultados', 'results')}
              <th className="text-right">Tipo</th>
              {th('CPR', 'cost_per_result')}
              {th('CPM', 'cpm')}
              {th('Alcance', 'reach')}
              <th className="text-right">Participación</th>
              {th('Invertido', 'spent')}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const badge   = getResultBadge(row.result_type);
              const cprClass = getCPRClass(row.cost_per_result, allCPRs);
              const spentPct = totalSpent > 0 ? Math.round((row.spent / totalSpent) * 100) : 0;

              return (
                <tr key={row.id}>
                  {/* Campaña */}
                  <td style={{ maxWidth: 220 }}>
                    <span className="font-semibold text-xs block truncate" style={{ color: 'var(--text)' }} title={row.name}>
                      {row.name}
                    </span>
                  </td>

                  {/* Plataforma */}
                  <td>
                    <span className={`platform-chip ${PLATFORM_CLASS[row.platform]}`}>
                      {PLATFORM_LABELS[row.platform]}
                    </span>
                  </td>

                  {/* Estado */}
                  <td>
                    <span className={`badge badge-${row.status}`}>
                      {STATUS_LABELS[row.status] || row.status}
                    </span>
                  </td>

                  {/* Impresiones */}
                  <td className="text-right font-mono text-xs" style={{ color: 'var(--muted)' }}>
                    {fmt(row.impressions)}
                  </td>

                  {/* Clics */}
                  <td className="text-right font-mono text-xs" style={{ color: 'var(--info)' }}>
                    {fmt(row.clicks)}
                  </td>

                  {/* CTR */}
                  <td className="text-right font-mono text-xs font-semibold" style={{ color: '#60a5fa' }}>
                    {row.ctr.toFixed(2)}%
                  </td>

                  {/* Resultados */}
                  <td className="text-right">
                    <span className="font-mono text-xs font-bold" style={{ color: '#4ade80' }}>
                      {fmt(row.results)}
                    </span>
                  </td>

                  {/* Tipo resultado */}
                  <td className="text-right">
                    <span
                      className="text-xs font-semibold px-2 py-1 rounded-lg whitespace-nowrap"
                      style={{ background: badge.bg, color: badge.color }}
                    >
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

                  {/* Alcance */}
                  <td className="text-right font-mono text-xs" style={{ color: 'var(--muted)' }}>
                    {fmt(row.reach)}
                  </td>

                  {/* Participación del gasto (barra) */}
                  <td className="text-right" style={{ minWidth: 90 }}>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-mono text-xs font-semibold" style={{ color: 'var(--text-soft)' }}>
                        {spentPct}%
                      </span>
                      <div className="progress-bar" style={{ width: 70 }}>
                        <div
                          className="progress-fill meta"
                          style={{ width: `${spentPct}%` }}
                        />
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
                  No hay campañas para este filtro
                </td>
              </tr>
            )}
          </tbody>

          {/* Totals footer */}
          {filtered.length > 1 && (
            <tfoot>
              <tr>
                <td colSpan={3} style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Totales ({filtered.length} campañas)
                </td>
                <td className="text-right font-mono" style={{ color: 'var(--text-soft)', fontSize: 12 }}>
                  {fmt(totalImpressions)}
                </td>
                <td className="text-right font-mono" style={{ color: 'var(--info)', fontSize: 12 }}>
                  {fmt(totalClicks)}
                </td>
                <td className="text-right font-mono font-semibold" style={{ color: '#60a5fa', fontSize: 12 }}>
                  {avgCTR.toFixed(2)}%
                </td>
                <td className="text-right font-mono font-bold" style={{ color: '#4ade80', fontSize: 12 }}>
                  {fmt(totalResults)}
                </td>
                <td colSpan={4} />
                <td className="text-right" style={{ fontSize: 11, color: 'var(--muted2)' }}>100%</td>
                <td className="text-right font-mono font-bold" style={{ color: 'var(--text)', fontSize: 13 }}>
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
