'use client';

import { CrmLead } from '@/types';
import { formatCOP } from '@/lib/format';
import { ORIGIN_COLOR, ACTIVITY_ICONS, ACTIVITY_TYPES } from '@/lib/crmConstants';
import { calculateQuickScore } from '@/lib/leadScoring';

interface Props {
  lead: CrmLead;
  onClick: (lead: CrmLead) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6', '#f59e0b', '#ef4444', '#10b981'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

function toWALink(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  const num = clean.startsWith('57') ? clean : `57${clean}`;
  return `https://wa.me/${num}`;
}

export default function LeadCard({ lead, onClick }: Props) {
  const originColor = ORIGIN_COLOR[lead.Origen] ?? '#6b7280';
  const daysWithout = lead.days_without_activity ?? 0;
  const showWarning = daysWithout > 2;
  const hasPrecio   = (lead.Precio_Plan ?? 0) > 0;
  const hasSepare   = (lead.Plan_Separe ?? 0) > 0;
  const stageColor  = lead.Stage_Color ?? '#6366f1';
  const initials    = getInitials(lead.Nombre);
  const avatarColor = getAvatarColor(lead.Nombre);
  const actCount    = lead.activity_count ?? 0;
  const hasPhone    = !!(lead.Telefono && lead.Telefono.trim());
  const leadId      = `#SEM-${String(lead.Id).padStart(3, '0')}`;

  const { score, label } = calculateQuickScore(lead);
  const scoreEmoji = label === 'listo' ? '🎯' : label === 'caliente' ? '🔥' : label === 'tibio' ? '🌡️' : '❄️';
  const scoreColor = label === 'listo' ? '#10b981' : label === 'caliente' ? '#f97316' : label === 'tibio' ? '#fbbf24' : '#60a5fa';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(lead)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(lead)}
      className="lead-card"
      style={{ borderLeft: `3px solid ${stageColor}`, cursor: 'pointer' }}
    >
      {/* ── Header: Avatar + Nombre + ID ── */}
      <div className="flex items-start gap-2.5 mb-2.5">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
          style={{ background: `${avatarColor}cc` }}
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight truncate" style={{ color: 'var(--text)' }} title={lead.Nombre}>
            {lead.Nombre}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {lead.Ciudad && (
              <span className="text-[10px]" style={{ color: 'var(--muted2)' }}>{lead.Ciudad}</span>
            )}
            {lead.Ciudad && lead.Usuario_Nombre && (
              <span style={{ color: 'var(--border2)', fontSize: 9 }}>·</span>
            )}
            {lead.Usuario_Nombre && (
              <span className="text-[10px]" style={{ color: 'var(--muted2)' }}>{lead.Usuario_Nombre}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {showWarning && (
            <span className="semaforo-dot red" title={`${daysWithout} días sin contacto`} />
          )}
          <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded"
            style={{ background: 'var(--surface3)', color: 'var(--muted2)' }}>
            {leadId}
          </span>
        </div>
      </div>

      {/* ── Origen + Comprobante ── */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${originColor}18`, color: originColor, border: `1px solid ${originColor}30` }}
        >
          {lead.Origen}
        </span>
        {lead.Comprobante && (
          <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Comprobante
          </span>
        )}
      </div>

      {/* ── Precios ── */}
      {(hasPrecio || hasSepare) && (
        <div className="flex items-center gap-3 mb-2 px-2 py-1.5 rounded-lg"
          style={{ background: 'var(--surface3)', border: '1px solid var(--border)' }}>
          {hasPrecio && (
            <div className="flex flex-col">
              <span className="text-[9px] font-semibold" style={{ color: 'var(--muted2)' }}>PLAN</span>
              <span className="text-xs font-bold" style={{ color: '#4ade80' }}>
                {formatCOP(lead.Precio_Plan!, true)}
              </span>
            </div>
          )}
          {hasPrecio && hasSepare && <div className="w-px h-6" style={{ background: 'var(--border)' }} />}
          {hasSepare && (
            <div className="flex flex-col">
              <span className="text-[9px] font-semibold" style={{ color: 'var(--muted2)' }}>SEPARE</span>
              <span className="text-xs font-bold" style={{ color: '#fbbf24' }}>
                {formatCOP(lead.Plan_Separe!, true)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── WhatsApp / Advertencia ── */}
      {hasPhone ? (
        <div className="mb-2">
          <a
            href={toWALink(lead.Telefono)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all"
            style={{ background: 'rgba(37,211,102,0.12)', color: '#25D366', border: '1px solid rgba(37,211,102,0.2)', textDecoration: 'none' }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.124.557 4.118 1.527 5.845L0 24l6.336-1.502A11.938 11.938 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.89 0-3.663-.5-5.19-1.373l-.373-.217-3.863.916.952-3.773-.237-.388A9.953 9.953 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
            </svg>
            {lead.Telefono.length > 12 ? lead.Telefono.slice(-10) : lead.Telefono}
          </a>
        </div>
      ) : (
        <div className="mb-2">
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.25)' }}>
            📱 Sin teléfono · toca para agregar
          </span>
        </div>
      )}

      {/* ── Actividades (iconos) ── */}
      <div className="flex items-center gap-1.5 mb-2">
        {ACTIVITY_TYPES.map((tipo) => (
          <span
            key={tipo}
            title={tipo}
            className="text-sm leading-none"
            style={{ opacity: actCount > 0 ? 1 : 0.25 }}
          >
            {ACTIVITY_ICONS[tipo]}
          </span>
        ))}
        {actCount > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1"
            style={{ background: 'var(--surface3)', color: 'var(--muted)' }}>
            {actCount}
          </span>
        )}
      </div>

      {/* ── Warning / Próxima acción ── */}
      {showWarning ? (
        <div className="flex items-center gap-1.5 mb-1.5">
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#fb923c" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-[10px] font-semibold" style={{ color: '#fb923c' }}>
            {daysWithout}d sin contacto
          </span>
        </div>
      ) : lead.Proxima_Accion_Fecha ? (
        <div className="flex items-center gap-1.5 mb-1.5">
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="text-[11px]" style={{ color: 'var(--muted)' }}>{formatDate(lead.Proxima_Accion_Fecha)}</span>
        </div>
      ) : null}

      {/* ── Footer: score + detalle ── */}
      <div className="flex items-center justify-between pt-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
        {/* Score badge */}
        <div
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
          style={{ background: `${scoreColor}15`, color: scoreColor, border: `1px solid ${scoreColor}30` }}
          title={`Score: ${score}/100`}
        >
          <span>{scoreEmoji}</span>
          <span>{score}</span>
        </div>
        <a
          href={`/crm/leads/${lead.Id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full transition-colors"
          style={{ background: 'rgba(99,102,241,0.10)', color: 'var(--accent)', textDecoration: 'none', border: '1px solid rgba(99,102,241,0.2)' }}
          title="Ver perfil completo"
        >
          Ver →
        </a>
      </div>
    </div>
  );
}
