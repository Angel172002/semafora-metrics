'use client';

import { CrmLead } from '@/types';
import { formatCOP } from '@/lib/format';

interface Props {
  lead: CrmLead;
  onClick: (lead: CrmLead) => void;
}

const ORIGIN_CONFIG: Record<string, { color: string; label: string }> = {
  'Meta Ads':    { color: '#60a5fa', label: 'Meta'      },
  'Google Ads':  { color: '#4ade80', label: 'Google'    },
  'WhatsApp':    { color: '#34d399', label: 'WhatsApp'  },
  'TikTok Ads':  { color: '#f472b6', label: 'TikTok'   },
  'Orgánico':    { color: '#fbbf24', label: 'Orgánico'  },
  'Referido':    { color: '#a78bfa', label: 'Referido'  },
  'Otro':        { color: '#9ca3af', label: 'Otro'      },
};

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = ['#6366f1','#8b5cf6','#ec4899','#3b82f6','#14b8a6','#f59e0b','#ef4444','#10b981'];
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

export default function LeadCard({ lead, onClick }: Props) {
  const origin      = ORIGIN_CONFIG[lead.Origen] ?? { color: '#9ca3af', label: lead.Origen };
  const daysWithout = lead.days_without_activity ?? 0;
  const showWarning = daysWithout > 2;
  const hasValue    = lead.Valor_Estimado > 0;
  const stageColor  = lead.Stage_Color ?? '#6366f1';
  const initials    = getInitials(lead.Nombre);
  const avatarColor = getAvatarColor(lead.Nombre);
  const actCount    = lead.activity_count ?? 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(lead)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(lead)}
      className="lead-card"
      style={{ borderLeft: `3px solid ${stageColor}` }}
    >
      {/* Header row: avatar + name + warning */}
      <div className="flex items-start gap-2.5 mb-2">
        {/* Avatar */}
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
          {lead.Empresa && (
            <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{lead.Empresa}</p>
          )}
        </div>

        {/* Urgency dot */}
        {showWarning && (
          <span className="semaforo-dot red flex-shrink-0 mt-1" title={`${daysWithout} días sin contacto`} />
        )}
      </div>

      {/* Value + Origin */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${origin.color}18`, color: origin.color, border: `1px solid ${origin.color}25` }}
        >
          {origin.label}
        </span>
        {hasValue && (
          <span className="text-xs font-bold" style={{ color: '#4ade80' }}>
            {formatCOP(lead.Valor_Estimado, true)}
          </span>
        )}
      </div>

      {/* Warning / Next action */}
      {showWarning ? (
        <div className="flex items-center gap-1.5 mb-1.5">
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#fb923c" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span className="text-[10px] font-semibold" style={{ color: '#fb923c' }}>
            {daysWithout}d sin contacto
          </span>
        </div>
      ) : lead.Proxima_Accion_Fecha ? (
        <div className="flex items-center gap-1.5 mb-1.5">
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span className="text-[11px]" style={{ color: 'var(--muted)' }}>{formatDate(lead.Proxima_Accion_Fecha)}</span>
        </div>
      ) : null}

      {/* Footer: asesor + activity count */}
      <div className="flex items-center justify-between pt-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
        <span className="text-[11px] truncate" style={{ color: 'var(--muted2)' }}>
          {lead.Usuario_Nombre || '—'}
        </span>
        {actCount > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: 'var(--surface3)', color: 'var(--muted)' }}>
            {actCount} act.
          </span>
        )}
      </div>
    </div>
  );
}
