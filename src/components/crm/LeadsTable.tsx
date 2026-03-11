'use client';

import { useState, useMemo } from 'react';
import type { CrmLead, CrmStage, CrmLeadStatus, CrmLeadOrigin } from '@/types';
import { formatCOP } from '@/lib/format';

interface Props {
  leads: CrmLead[];
  stages: CrmStage[];
  loading: boolean;
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
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

type SortKey = keyof Pick<CrmLead,
  | 'Nombre' | 'Telefono' | 'Origen' | 'Nombre_Campana' | 'Stage_Nombre'
  | 'Usuario_Nombre' | 'Valor_Estimado' | 'days_without_activity' | 'Proxima_Accion_Fecha'
>;
type SortDir = 'asc' | 'desc';

const STATUS_FILTERS: { value: 'todos' | CrmLeadStatus; label: string }[] = [
  { value: 'todos',   label: 'Todos'    },
  { value: 'abierto', label: 'Abiertos' },
  { value: 'ganado',  label: 'Ganados'  },
  { value: 'perdido', label: 'Perdidos' },
];

const STATUS_BADGE: Record<CrmLeadStatus, { bg: string; text: string; label: string }> = {
  abierto: { bg: 'rgba(59,130,246,0.13)',  text: '#60a5fa', label: 'Abierto' },
  ganado:  { bg: 'rgba(74,222,128,0.13)',  text: '#4ade80', label: 'Ganado'  },
  perdido: { bg: 'rgba(248,113,113,0.13)', text: '#f87171', label: 'Perdido' },
};

const ORIGIN_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '',           label: 'Todos los orígenes' },
  { value: 'Meta Ads',   label: 'Meta Ads'           },
  { value: 'Google Ads', label: 'Google Ads'         },
  { value: 'TikTok Ads', label: 'TikTok Ads'         },
  { value: 'WhatsApp',   label: 'WhatsApp'           },
  { value: 'Orgánico',   label: 'Orgánico'           },
  { value: 'Referido',   label: 'Referido'           },
  { value: 'Otro',       label: 'Otro'               },
];

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' });
}

function getInitials(name: string): string {
  const p = name.trim().split(' ').filter(Boolean);
  if (p.length === 0) return '?';
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[1][0]).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = ['#6366f1','#8b5cf6','#ec4899','#3b82f6','#14b8a6','#f59e0b','#10b981'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function exportCsv(leads: CrmLead[]) {
  const headers = ['Nombre','Teléfono','Email','Empresa','Origen','Campaña','Etapa','Asesor','Valor Estimado','Estado','Días sin actividad','Próxima acción','Fecha creación'];
  const rows = leads.map((l) => [
    l.Nombre, l.Telefono, l.Email, l.Empresa, l.Origen, l.Nombre_Campana,
    l.Stage_Nombre, l.Usuario_Nombre, l.Valor_Estimado, l.Estado,
    l.days_without_activity ?? 0, l.Proxima_Accion_Fecha || '', l.Fecha_Creacion,
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `leads_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 10 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="skeleton h-3" style={{ width: `${50 + (i % 4) * 15}%` }} />
        </td>
      ))}
    </tr>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span style={{ color: active ? 'var(--accent)' : 'var(--muted2)', opacity: active ? 1 : 0.4, fontSize: 9, marginLeft: 3 }}>
      {active ? (dir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );
}

export default function LeadsTable({
  leads, stages, loading, total, page, totalPages, onPageChange,
  search, onSearchChange, status, onStatusChange,
  origin, onOriginChange, stageId, onStageIdChange, onLeadClick,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('Nombre');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const sorted = useMemo(() => [...leads].sort((a, b) => {
    const av = a[sortKey] ?? '', bv = b[sortKey] ?? '';
    let cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), 'es');
    return sortDir === 'asc' ? cmp : -cmp;
  }), [leads, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    key === sortKey ? setSortDir((d) => d === 'asc' ? 'desc' : 'asc') : (setSortKey(key), setSortDir('asc'));
  }

  function th(label: string, key: SortKey, align: 'left' | 'right' = 'left') {
    return (
      <th className={align === 'right' ? 'text-right' : ''} style={{ cursor: 'pointer' }} onClick={() => handleSort(key)}>
        {label}<SortIcon active={sortKey === key} dir={sortDir} />
      </th>
    );
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1" style={{ minWidth: 200, maxWidth: 300 }}>
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="13" height="13"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--muted)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre..."
            className="input-field"
            style={{ paddingLeft: 34 }}
          />
        </div>

        {/* Stage filter */}
        {stages.length > 0 && (
          <select value={stageId} onChange={(e) => onStageIdChange(e.target.value)} className="select-control">
            <option value="">Todas las etapas</option>
            {stages.map((s) => <option key={s.Id} value={String(s.Id)}>{s.Nombre}</option>)}
          </select>
        )}

        {/* Origin filter */}
        <select value={origin} onChange={(e) => onOriginChange(e.target.value)} className="select-control">
          {ORIGIN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Export */}
        <button onClick={() => exportCsv(sorted)} className="btn btn-secondary ml-auto" style={{ fontSize: 12 }}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Exportar CSV
        </button>
      </div>

      {/* Status pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_FILTERS.map(({ value, label }) => {
          const active = status === value;
          return (
            <button
              key={value}
              onClick={() => onStatusChange(value)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={{
                background: active
                  ? value === 'todos'   ? 'var(--accent)'
                  : value === 'ganado'  ? 'rgba(74,222,128,0.2)'
                  : value === 'perdido' ? 'rgba(248,113,113,0.2)'
                  :                       'rgba(59,130,246,0.2)'
                  : 'var(--chip-bg)',
                color: active
                  ? value === 'todos'   ? '#fff'
                  : value === 'ganado'  ? '#4ade80'
                  : value === 'perdido' ? '#f87171'
                  :                       '#60a5fa'
                  : 'var(--muted)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          );
        })}
        <span className="text-xs ml-1" style={{ color: 'var(--muted2)' }}>
          {loading ? '—' : `${total.toLocaleString('es-CO')} resultado${total !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {th('Nombre', 'Nombre')}
                {th('Teléfono', 'Telefono')}
                {th('Origen', 'Origen')}
                {th('Campaña', 'Nombre_Campana')}
                {th('Etapa', 'Stage_Nombre')}
                {th('Asesor', 'Usuario_Nombre')}
                {th('Valor Est.', 'Valor_Estimado', 'right')}
                {th('Sin act.', 'days_without_activity', 'right')}
                {th('Próx. acción', 'Proxima_Accion_Fecha')}
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12" style={{ color: 'var(--muted)' }}>
                    No hay leads con los filtros actuales
                  </td>
                </tr>
              ) : (
                sorted.map((lead) => {
                  const daysWithout = lead.days_without_activity ?? 0;
                  const statusBadge = STATUS_BADGE[lead.Estado] ?? STATUS_BADGE.abierto;
                  const stageColor  = lead.Stage_Color ?? 'var(--muted2)';

                  return (
                    <tr
                      key={lead.Id}
                      onClick={() => onLeadClick(lead)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Nombre con avatar */}
                      <td style={{ maxWidth: 180 }}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white"
                            style={{ background: `${getAvatarColor(lead.Nombre)}bb` }}
                          >
                            {getInitials(lead.Nombre)}
                          </div>
                          <span className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }} title={lead.Nombre}>
                            {lead.Nombre}
                          </span>
                        </div>
                      </td>

                      <td style={{ color: 'var(--muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {lead.Telefono || '—'}
                      </td>

                      <td style={{ color: 'var(--muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {lead.Origen || '—'}
                      </td>

                      <td style={{ maxWidth: 140 }}>
                        <span className="text-xs truncate block" style={{ color: 'var(--muted)' }} title={lead.Nombre_Campana}>
                          {lead.Nombre_Campana || '—'}
                        </span>
                      </td>

                      {/* Etapa con dot de color */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stageColor }} />
                          <span className="text-sm" style={{ color: 'var(--text)' }}>{lead.Stage_Nombre || '—'}</span>
                        </div>
                      </td>

                      <td className="text-xs" style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {lead.Usuario_Nombre || '—'}
                      </td>

                      <td className="text-right font-mono text-xs font-semibold" style={{ color: '#4ade80', whiteSpace: 'nowrap' }}>
                        {lead.Valor_Estimado > 0 ? formatCOP(lead.Valor_Estimado, true) : '—'}
                      </td>

                      {/* Días sin actividad con semáforo */}
                      <td className="text-right">
                        <span
                          className="text-xs font-semibold"
                          style={{ color: daysWithout > 5 ? '#f87171' : daysWithout > 2 ? '#fb923c' : 'var(--muted)' }}
                        >
                          {daysWithout > 2 ? `⚠ ${daysWithout}d` : `${daysWithout}d`}
                        </span>
                      </td>

                      <td className="text-xs" style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {formatDate(lead.Proxima_Accion_Fecha)}
                      </td>

                      <td>
                        <span className="badge" style={{ background: statusBadge.bg, color: statusBadge.text, border: 'none' }}>
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
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            Página {page} de {totalPages} · {total.toLocaleString('es-CO')} leads
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}
              className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}>
              ← Ant.
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - page) <= 2)
              .map((p) => (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className="btn"
                  style={{
                    width: 32, height: 32, padding: 0, fontSize: 12, justifyContent: 'center',
                    background: p === page ? 'var(--accent)' : 'var(--surface2)',
                    color:      p === page ? '#fff' : 'var(--muted)',
                    border:     '1px solid var(--border)',
                  }}
                >
                  {p}
                </button>
              ))}
            <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}
              className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}>
              Sig. →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
