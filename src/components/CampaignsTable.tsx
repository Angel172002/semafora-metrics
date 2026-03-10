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

const PLATFORM_COLORS: Record<Platform, string> = {
  meta: '#1877F2', google: '#4285F4', tiktok: '#FF0050', instagram: '#E1306C', linkedin: '#0A66C2',
};

function fmt(n: number): string { return n.toLocaleString('es-CO'); }

// ─── Result type badge ─────────────────────────────────────────────────────────
interface ResultBadge { label: string; color: string; bg: string }

function getResultBadge(t: string): ResultBadge {
  if (!t) return { label: 'Sin resultado', color: '#6b7280', bg: '#6b728020' };
  if (t.includes('messaging_conversation'))
    return { label: 'WhatsApp', color: '#25D366', bg: '#25D36618' };
  if (t.includes('lead_grouped') || t === 'lead')
    return { label: 'Lead', color: '#3b82f6', bg: '#3b82f618' };
  if (t.includes('omni_landing_page') || t.includes('landing_page'))
    return { label: 'Vista Landing', color: '#f59e0b', bg: '#f59e0b18' };
  if (t.includes('omni_purchase') || t.includes('purchase'))
    return { label: 'Compra', color: '#e20613', bg: '#e2061318' };
  if (t.includes('complete_registration'))
    return { label: 'Registro', color: '#ec4899', bg: '#ec489918' };
  if (t.includes('post_engagement') || t.includes('engagement'))
    return { label: 'Interacción', color: '#f59e0b', bg: '#f59e0b18' };
  if (t === 'google_search')
    return { label: 'G. Búsqueda', color: '#4285F4', bg: '#4285F418' };
  if (t === 'google_display')
    return { label: 'G. Display', color: '#34A853', bg: '#34A85318' };
  if (t === 'google_video')
    return { label: 'YouTube', color: '#FF0000', bg: '#FF000018' };
  if (t === 'google' || t.startsWith('google'))
    return { label: 'Google', color: '#4285F4', bg: '#4285F418' };
  if (t.includes('video'))
    return { label: 'Video', color: '#a855f7', bg: '#a855f718' };
  return { label: t.split('.').pop() || t, color: '#6b7280', bg: '#6b728020' };
}

function getFilterKey(t: string): string {
  if (!t) return 'sin_resultado';
  if (t.includes('messaging_conversation')) return 'whatsapp';
  if (t.includes('lead')) return 'lead';
  if (t.includes('landing_page') || t.includes('omni_landing')) return 'landing';
  if (t.includes('engagement')) return 'interaccion';
  if (t === 'google_search')   return 'google_search';
  if (t === 'google_display')  return 'google_display';
  if (t === 'google_video')    return 'google_video';
  if (t.startsWith('google'))  return 'google';
  if (t.includes('video'))     return 'video';
  return 'otro';
}

const FILTER_LABELS: Record<string, string> = {
  all: 'Todas', whatsapp: 'WhatsApp', lead: 'Leads', landing: 'Landing',
  video: 'Video', interaccion: 'Interacción', sin_resultado: 'Sin resultado',
  google_search: 'G. Búsqueda', google_display: 'G. Display', google_video: 'YouTube',
  google: 'Google', otro: 'Otro',
};

const LEGEND_ITEMS = [
  { key: 'whatsapp',       label: 'WhatsApp',       color: '#25D366', desc: 'Conversaciones iniciadas en WhatsApp Business (7 días)' },
  { key: 'lead',           label: 'Lead',            color: '#3b82f6', desc: 'Formularios de contacto completados' },
  { key: 'landing',        label: 'Vista Landing',   color: '#f59e0b', desc: 'Clics que abrieron la página de destino' },
  { key: 'google_search',  label: 'G. Búsqueda',    color: '#4285F4', desc: 'Conversiones en campañas de Google Search' },
  { key: 'google_display', label: 'G. Display',     color: '#34A853', desc: 'Conversiones en campañas de Display / GDN' },
  { key: 'google_video',   label: 'YouTube',         color: '#FF0000', desc: 'Conversiones en anuncios de YouTube' },
  { key: 'sin_resultado',  label: 'Sin resultado',   color: '#6b7280', desc: 'Publicaciones impulsadas (objetivo: alcance/interacción)' },
];

// ─── Sort types ────────────────────────────────────────────────────────────────
type SortKey = 'name' | 'impressions' | 'clicks' | 'ctr' | 'results' | 'cost_per_result' | 'cpm' | 'reach' | 'spent';
type SortDir = 'asc' | 'desc';

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span style={{ color: active ? '#1877F2' : 'var(--muted)', opacity: active ? 1 : 0.4, fontSize: 10 }}>
      {active ? (dir === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
    </span>
  );
}

export default function CampaignsTable({ data, loading }: Props) {
  const [filter, setFilter]       = useState<string>('all');
  const [showLegend, setShowLegend] = useState(false);
  const [sortKey, setSortKey]     = useState<SortKey>('spent');
  const [sortDir, setSortDir]     = useState<SortDir>('desc');

  if (loading) {
    return (
      <div className="card p-5">
        <div className="skeleton h-5 w-48 mb-4" />
        {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 w-full mb-2" />)}
      </div>
    );
  }

  const filterCounts: Record<string, number> = { all: data.length };
  for (const row of data) {
    const key = getFilterKey(row.result_type);
    filterCounts[key] = (filterCounts[key] || 0) + 1;
  }
  const filterKeys = ['all', ...Object.keys(filterCounts).filter((k) => k !== 'all')];

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
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
        style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
        onClick={() => handleSort(key)}
      >
        {label}<SortIcon active={sortKey === key} dir={sortDir} />
      </th>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* ── Header ── */}
      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Campañas</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              {filtered.length} de {data.length} campañas · acumulado del período
            </p>
          </div>
          <button
            onClick={() => setShowLegend((v) => !v)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{
              background: showLegend ? 'rgba(24,119,242,0.15)' : 'var(--surface2)',
              color: showLegend ? '#1877F2' : 'var(--muted)',
              border: 'none', cursor: 'pointer',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 12.5A5.5 5.5 0 118 2.5a5.5 5.5 0 010 11zM7.25 5.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75 5.75a.75.75 0 100-1.5.75.75 0 000 1.5z"/>
            </svg>
            ¿Qué es cada tipo?
          </button>
        </div>

        {showLegend && (
          <div className="mt-3 rounded-lg p-3 text-xs grid gap-1.5" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>Tipos de resultado (conversiones)</p>
            {LEGEND_ITEMS.map((item) => (
              <div key={item.key} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 inline-block w-2 h-2 rounded-full" style={{ background: item.color }} />
                <span>
                  <span className="font-medium" style={{ color: 'var(--text)' }}>{item.label}:</span>{' '}
                  <span style={{ color: 'var(--muted)' }}>{item.desc}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-3">
          {filterKeys.map((key) => {
            const isActive = filter === key;
            const count = filterCounts[key] || 0;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className="flex items-center gap-1 text-xs px-3 py-1 rounded-full transition-colors font-medium"
                style={{
                  background: isActive ? '#1877F2' : 'var(--surface2)',
                  color: isActive ? '#fff' : 'var(--muted)',
                  border: 'none', cursor: 'pointer',
                }}
              >
                {FILTER_LABELS[key] || key}
                <span className="text-xs px-1 rounded" style={{
                  background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--border)',
                  color: isActive ? '#fff' : 'var(--muted)',
                }}>
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
              <th className="text-right">Tipo resultado</th>
              {th('CPR', 'cost_per_result')}
              {th('CPM', 'cpm')}
              {th('Alcance', 'reach')}
              {th('Invertido (COP)', 'spent')}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const badge = getResultBadge(row.result_type);
              return (
                <tr key={row.id}>
                  <td>
                    <span className="font-medium text-xs" style={{ color: 'var(--text)' }}>
                      {row.name.length > 30 ? row.name.substring(0, 28) + '…' : row.name}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs font-semibold" style={{ color: PLATFORM_COLORS[row.platform] }}>
                      {PLATFORM_LABELS[row.platform]}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${row.status}`}>{STATUS_LABELS[row.status] || row.status}</span>
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
                  <td className="text-right">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="text-right font-mono text-xs" style={{ color: '#f59e0b' }}>
                    {row.cost_per_result > 0 ? formatCOPFull(row.cost_per_result) : '—'}
                  </td>
                  <td className="text-right font-mono text-xs" style={{ color: 'var(--muted)' }}>
                    {row.cpm > 0 ? formatCOPFull(row.cpm) : '—'}
                  </td>
                  <td className="text-right font-mono text-xs" style={{ color: 'var(--muted)' }}>
                    {fmt(row.reach)}
                  </td>
                  <td className="text-right font-mono text-xs font-semibold" style={{ color: 'var(--text)' }}>
                    {formatCOPFull(row.spent)}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="text-center py-8" style={{ color: 'var(--muted)' }}>
                  No hay campañas para este filtro
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
