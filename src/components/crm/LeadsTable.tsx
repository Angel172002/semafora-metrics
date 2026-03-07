'use client';

import { useState, useMemo } from 'react';
import type { CrmLead, CrmStage, CrmLeadStatus, CrmLeadOrigin } from '@/types';
import { formatCOP } from '@/lib/format';

// ─── Props: LeadsTable is a CONTROLLED component ──────────────────────────────
// Filtering and pagination happen server-side (managed by crm/page.tsx).
// LeadsTable only handles client-side SORTING within the current page.

interface Props {
  // Data
  leads: CrmLead[];
  stages: CrmStage[];
  loading: boolean;

  // Server-side pagination info
  total: number;        // total matching records across all pages
  page: number;         // current page (1-based)
  totalPages: number;
  onPageChange: (page: number) => void;

  // Controlled filters (bound to parent state)
  search: string;
  onSearchChange: (v: string) => void;
  status: 'todos' | CrmLeadStatus;
  onStatusChange: (v: 'todos' | CrmLeadStatus) => void;
  origin: string;
  onOriginChange: (v: string) => void;
  stageId: string;
  onStageIdChange: (v: string) => void;

  onLeadClick: (lead: CrmLead) => void;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = keyof Pick<
  CrmLead,
  | 'Nombre'
  | 'Telefono'
  | 'Origen'
  | 'Nombre_Campana'
  | 'Stage_Nombre'
  | 'Usuario_Nombre'
  | 'Valor_Estimado'
  | 'days_without_activity'
  | 'Proxima_Accion_Fecha'
>;

type SortDir = 'asc' | 'desc';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_FILTER_LABELS: { value: 'todos' | CrmLeadStatus; label: string }[] = [
  { value: 'todos',    label: 'Todos'    },
  { value: 'abierto',  label: 'Abiertos' },
  { value: 'ganado',   label: 'Ganados'  },
  { value: 'perdido',  label: 'Perdidos' },
];

const STATUS_BADGE: Record<CrmLeadStatus, { bg: string; text: string; label: string }> = {
  abierto: { bg: 'rgba(59,130,246,0.15)',  text: '#60a5fa', label: 'Abierto' },
  ganado:  { bg: 'rgba(74,222,128,0.15)',  text: '#4ade80', label: 'Ganado'  },
  perdido: { bg: 'rgba(248,113,113,0.15)', text: '#f87171', label: 'Perdido' },
};

const ORIGIN_OPTIONS: Array<{ value: '' | CrmLeadOrigin | string; label: string }> = [
  { value: '',           label: 'Todos los orígenes' },
  { value: 'Meta Ads',   label: 'Meta Ads'           },
  { value: 'Google Ads', label: 'Google Ads'         },
  { value: 'TikTok Ads', label: 'TikTok Ads'         },
  { value: 'WhatsApp',   label: 'WhatsApp'           },
  { value: 'Orgánico',   label: 'Orgánico'           },
  { value: 'Referido',   label: 'Referido'           },
  { value: 'Otro',       label: 'Otro'               },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' });
}

function exportCsv(leads: CrmLead[]) {
  const headers = [
    'Nombre', 'Teléfono', 'Email', 'Empresa', 'Origen', 'Campaña',
    'Etapa', 'Asesor', 'Valor Estimado', 'Estado', 'Días sin actividad',
    'Próxima acción', 'Fecha creación',
  ];

  const rows = leads.map((l) => [
    l.Nombre, l.Telefono, l.Email, l.Empresa, l.Origen, l.Nombre_Campana,
    l.Stage_Nombre, l.Usuario_Nombre, l.Valor_Estimado, l.Estado,
    l.days_without_activity ?? 0, l.Proxima_Accion_Fecha || '', l.Fecha_Creacion,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <div className="h-3 rounded bg-white/5 animate-pulse" style={{ width: `${60 + (i % 3) * 20}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Sort icon ────────────────────────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span style={{ color: 'var(--muted)', opacity: 0.4 }}> ↕</span>;
  return <span style={{ color: 'var(--primary)' }}>{dir === 'asc' ? ' ↑' : ' ↓'}</span>;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LeadsTable({
  leads, stages, loading,
  total, page, totalPages, onPageChange,
  search, onSearchChange,
  status, onStatusChange,
  origin, onOriginChange,
  stageId, onStageIdChange,
  onLeadClick,
}: Props) {
  // Client-side sorting within the current page (cheap, no refetch needed)
  const [sortKey, setSortKey] = useState<SortKey>('Nombre');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const sorted = useMemo(() => {
    return [...leads].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      let cmp = 0;
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv), 'es');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [leads, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function th(label: string, key: SortKey) {
    const active = sortKey === key;
    return (
      <th
        key={key}
        onClick={() => handleSort(key)}
        className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap cursor-pointer select-none hover:opacity-80 transition-opacity"
        style={{ color: 'var(--muted)' }}
      >
        {label}
        <SortIcon active={active} dir={sortDir} />
      </th>
    );
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ── Top bar: search + filters + export ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2"
            width="14" height="14"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ color: 'var(--muted)' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full pl-8 pr-3 py-2 rounded-lg text-sm outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          />
        </div>

        {/* Stage filter */}
        {stages.length > 0 && (
          <select
            value={stageId}
            onChange={(e) => onStageIdChange(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border)',
              color: stageId ? 'var(--text)' : 'var(--muted)',
            }}
          >
            <option value="" style={{ background: '#141414' }}>Todas las etapas</option>
            {stages.map((s) => (
              <option key={s.Id} value={String(s.Id)} style={{ background: '#141414' }}>
                {s.Nombre}
              </option>
            ))}
          </select>
        )}

        {/* Origin filter */}
        <select
          value={origin}
          onChange={(e) => onOriginChange(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
            color: origin ? 'var(--text)' : 'var(--muted)',
          }}
        >
          {ORIGIN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} style={{ background: '#141414' }}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Export — exports current page data */}
        <button
          onClick={() => exportCsv(sorted)}
          className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Exportar CSV
        </button>
      </div>

      {/* ── Status filter pills ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_FILTER_LABELS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onStatusChange(value)}
            className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
            style={{
              background:
                status === value
                  ? value === 'todos'   ? 'var(--primary)'
                  : value === 'ganado'  ? 'rgba(74,222,128,0.2)'
                  : value === 'perdido' ? 'rgba(248,113,113,0.2)'
                  :                      'rgba(59,130,246,0.2)'
                  : 'rgba(255,255,255,0.06)',
              color:
                status === value
                  ? value === 'todos'   ? '#fff'
                  : value === 'ganado'  ? '#4ade80'
                  : value === 'perdido' ? '#f87171'
                  :                      '#60a5fa'
                  : 'var(--muted)',
              border: '1px solid var(--border)',
            }}
          >
            {label}
          </button>
        ))}
        <span className="text-xs ml-1" style={{ color: 'var(--muted)' }}>
          {loading ? '—' : `${total.toLocaleString('es-CO')} resultado${total !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)' }}>
              {th('Nombre', 'Nombre')}
              {th('Teléfono', 'Telefono')}
              {th('Origen', 'Origen')}
              {th('Campaña', 'Nombre_Campana')}
              {th('Etapa', 'Stage_Nombre')}
              {th('Asesor', 'Usuario_Nombre')}
              {th('Valor Estimado', 'Valor_Estimado')}
              {th('Días sin actividad', 'days_without_activity')}
              {th('Próxima Acción', 'Proxima_Accion_Fecha')}
              <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-sm" style={{ color: 'var(--muted)' }}>
                  No hay leads con los filtros actuales
                </td>
              </tr>
            ) : (
              sorted.map((lead) => {
                const daysWithout  = lead.days_without_activity ?? 0;
                const statusBadge  = STATUS_BADGE[lead.Estado] ?? STATUS_BADGE.abierto;

                return (
                  <tr
                    key={lead.Id}
                    onClick={() => onLeadClick(lead)}
                    className="cursor-pointer transition-colors hover:bg-white/[0.03]"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td className="px-3 py-2.5 font-medium max-w-[160px]" style={{ color: 'var(--text)' }}>
                      <span className="truncate block" title={lead.Nombre}>{lead.Nombre}</span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                      {lead.Telefono || '—'}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                      {lead.Origen || '—'}
                    </td>
                    <td className="px-3 py-2.5 max-w-[140px]" style={{ color: 'var(--muted)' }}>
                      <span className="truncate block" title={lead.Nombre_Campana}>{lead.Nombre_Campana || '—'}</span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--text)' }}>
                      {lead.Stage_Nombre || '—'}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                      {lead.Usuario_Nombre || '—'}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-mono text-right" style={{ color: '#4ade80' }}>
                      {lead.Valor_Estimado > 0 ? formatCOP(lead.Valor_Estimado, true) : '—'}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-center">
                      {daysWithout > 2 ? (
                        <span style={{ color: '#fb923c' }}>⚠️ {daysWithout}d</span>
                      ) : (
                        <span style={{ color: 'var(--muted)' }}>{daysWithout}d</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                      {formatDate(lead.Proxima_Accion_Fecha)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: statusBadge.bg, color: statusBadge.text }}
                      >
                        {statusBadge.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination bar ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            Página {page} de {totalPages} · {total.toLocaleString('es-CO')} leads en total
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-30"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              ← Anterior
            </button>

            {/* Page numbers: show up to 5 around current */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - page) <= 2)
              .map((p) => (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className="w-8 h-8 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: p === page ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                    border:     '1px solid var(--border)',
                    color:      p === page ? '#fff' : 'var(--muted)',
                  }}
                >
                  {p}
                </button>
              ))}

            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-30"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
