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
  status: 'todos' | CrmLeadStatus | 'archivado';
  onStatusChange: (v: 'todos' | CrmLeadStatus | 'archivado') => void;
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

const STATUS_FILTERS: { value: 'todos' | CrmLeadStatus | 'archivado'; label: string }[] = [
  { value: 'todos',     label: 'Todos'      },
  { value: 'abierto',   label: 'Abiertos'   },
  { value: 'ganado',    label: 'Ganados'    },
  { value: 'perdido',   label: 'Perdidos'   },
  { value: 'archivado', label: 'Archivados' },
];

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  abierto:   { bg: 'rgba(59,130,246,0.13)',   text: '#60a5fa', label: 'Abierto'   },
  ganado:    { bg: 'rgba(74,222,128,0.13)',   text: '#4ade80', label: 'Ganado'    },
  perdido:   { bg: 'rgba(248,113,113,0.13)', text: '#f87171', label: 'Perdido'   },
  archivado: { bg: 'rgba(156,163,175,0.13)', text: '#9ca3af', label: 'Archivado' },
};

const ORIGIN_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '',              label: 'Todos los orígenes' },
  { value: 'Meta Ads',      label: 'Meta Ads'           },
  { value: 'Google Ads',    label: 'Google Ads'         },
  { value: 'TikTok Ads',    label: 'TikTok Ads'         },
  { value: 'Orgánico',      label: 'Orgánico'           },
  { value: 'Chatbot Lex',   label: 'Chatbot Lex'        },
  { value: 'Referido',      label: 'Referido'           },
  { value: 'Otro',          label: 'Otro'               },
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

function toWALink(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  const num = clean.startsWith('57') ? clean : `57${clean}`;
  return `https://wa.me/${num}`;
}

function exportCsv(leads: CrmLead[]) {
  const headers = ['ID','Nombre','Teléfono','Origen','Ciudad','Asesor','Etapa','Precio Plan','Plan Separe','Comprobante','Estado','Días sin actividad','Fecha Inicio','Día Cierre'];
  const rows = leads.map((l) => [
    `#SEM-${String(l.Id).padStart(3,'0')}`,
    l.Nombre, l.Telefono, l.Origen, l.Ciudad || '',
    l.Usuario_Nombre, l.Stage_Nombre,
    l.Precio_Plan || 0, l.Plan_Separe || 0,
    l.Comprobante ? 'Sí' : 'No',
    l.Estado, l.days_without_activity ?? 0,
    l.Fecha_Inicio || '', l.Dia_Cierre || '',
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
      {Array.from({ length: 9 }).map((_, i) => (
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
                  ? value === 'todos' ? 'var(--accent)' : (STATUS_BADGE[value]?.bg ?? 'rgba(59,130,246,0.2)')
                  : 'var(--chip-bg)',
                color: active
                  ? value === 'todos' ? '#fff' : (STATUS_BADGE[value]?.text ?? '#60a5fa')
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
                {th('Etapa', 'Stage_Nombre')}
                {th('Asesor', 'Usuario_Nombre')}
                {th('Origen', 'Origen')}
                {th('Precio Plan', 'Valor_Estimado', 'right')}
                {th('Sin act.', 'days_without_activity', 'right')}
                {th('Próx. acción', 'Proxima_Accion_Fecha')}
                <th>Estado</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
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
                  const stageColor  = lead.Stage_Color ?? '#6366f1';
                  const hasPhone    = !!(lead.Telefono && lead.Telefono.trim());

                  return (
                    <tr
                      key={lead.Id}
                      onClick={() => onLeadClick(lead)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Nombre con avatar + teléfono debajo */}
                      <td style={{ maxWidth: 220 }}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white"
                            style={{ background: `${getAvatarColor(lead.Nombre)}bb` }}
                          >
                            {getInitials(lead.Nombre)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }} title={lead.Nombre}>
                                {lead.Nombre}
                              </p>
                              {lead.Comprobante && (
                                <span className="text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0"
                                  style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>✓</span>
                              )}
                            </div>
                            <p className="text-[10px]" style={{ color: 'var(--muted2)' }}>
                              {lead.Ciudad || ''}{lead.Ciudad && hasPhone ? ' · ' : ''}{hasPhone ? lead.Telefono : '⚠ Sin teléfono'}
                            </p>
                          </div>
                        </div>
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

                      <td style={{ color: 'var(--muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {lead.Origen || '—'}
                      </td>

                      <td className="text-right font-mono text-xs font-semibold" style={{ color: '#4ade80', whiteSpace: 'nowrap' }}>
                        {(lead.Precio_Plan ?? 0) > 0 ? formatCOP(lead.Precio_Plan!, true) : '—'}
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

                      {/* Acciones rápidas */}
                      <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                        <div className="flex items-center justify-center gap-1.5">
                          {hasPhone ? (
                            <a
                              href={toWALink(lead.Telefono)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-icon"
                              style={{ background: 'rgba(37,211,102,0.12)', color: '#25D366', border: '1px solid rgba(37,211,102,0.2)', width: 30, height: 30, flexShrink: 0 }}
                              title={`WhatsApp: ${lead.Telefono}`}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.124.557 4.118 1.527 5.845L0 24l6.336-1.502A11.938 11.938 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.89 0-3.663-.5-5.19-1.373l-.373-.217-3.863.916.952-3.773-.237-.388A9.953 9.953 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                              </svg>
                            </a>
                          ) : (
                            <button
                              onClick={() => onLeadClick(lead)}
                              className="btn btn-icon"
                              style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.2)', width: 30, height: 30, flexShrink: 0 }}
                              title="Agregar teléfono"
                            >
                              📱
                            </button>
                          )}
                          <button
                            onClick={() => onLeadClick(lead)}
                            className="btn btn-icon"
                            style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)', width: 30, height: 30, flexShrink: 0 }}
                            title="Editar lead"
                          >
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                          </button>
                          <a
                            href={`/crm/leads/${lead.Id}`}
                            className="btn btn-icon"
                            style={{ background: 'rgba(99,102,241,0.10)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,0.2)', width: 30, height: 30, flexShrink: 0, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Ver detalle completo"
                          >
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                            </svg>
                          </a>
                        </div>
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
