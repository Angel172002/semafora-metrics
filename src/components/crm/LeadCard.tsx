'use client';

import { CrmLead, CrmLeadOrigin } from '@/types';
import { formatCOP } from '@/lib/format';

interface Props {
  lead: CrmLead;
  onClick: (lead: CrmLead) => void;
}

// ─── Origin badge config ──────────────────────────────────────────────────────

const ORIGIN_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  'Meta Ads':    { bg: 'rgba(59,130,246,0.15)',  text: '#60a5fa', label: 'Meta'      },
  'Google Ads':  { bg: 'rgba(74,222,128,0.15)',  text: '#4ade80', label: 'Google'    },
  'WhatsApp':    { bg: 'rgba(52,211,153,0.15)',  text: '#34d399', label: 'WhatsApp'  },
  'TikTok Ads':  { bg: 'rgba(244,114,182,0.15)', text: '#f472b6', label: 'TikTok'   },
  'Orgánico':    { bg: 'rgba(251,191,36,0.15)',  text: '#fbbf24', label: 'Orgánico'  },
  'Referido':    { bg: 'rgba(167,139,250,0.15)', text: '#a78bfa', label: 'Referido'  },
  'Otro':        { bg: 'rgba(156,163,175,0.15)', text: '#9ca3af', label: 'Otro'      },
};

function getOriginConfig(origin: string) {
  return ORIGIN_CONFIG[origin] ?? { bg: 'rgba(156,163,175,0.15)', text: '#9ca3af', label: origin };
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconPhone() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.58 3.44 2 2 0 0 1 3.55 1.26h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6.29 6.29l.87-.87a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LeadCard({ lead, onClick }: Props) {
  const originCfg = getOriginConfig(lead.Origen);
  const daysWithout = lead.days_without_activity ?? 0;
  const showWarning = daysWithout > 2; // >48h = >2 days
  const hasValue = lead.Valor_Estimado > 0;
  const hasNextAction = !!lead.Proxima_Accion_Fecha;
  const activityCount = lead.activity_count ?? 0;

  const leftBorderColor = lead.Stage_Color ?? '#4b5563';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(lead)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(lead)}
      className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 cursor-pointer hover:border-[var(--primary)]/50 transition-all shadow-sm"
      style={{ borderLeft: `3px solid ${leftBorderColor}` }}
    >
      {/* Name */}
      <p
        className="font-semibold text-sm leading-tight truncate mb-1"
        style={{ color: 'var(--text)' }}
        title={lead.Nombre}
      >
        {lead.Nombre}
      </p>

      {/* Phone */}
      <div className="flex items-center gap-1 mb-2" style={{ color: 'var(--muted)' }}>
        <IconPhone />
        <span className="text-xs">{lead.Telefono || '—'}</span>
      </div>

      {/* Origin badge + Valor */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: originCfg.bg, color: originCfg.text }}
        >
          {originCfg.label}
        </span>

        {hasValue && (
          <span className="text-[11px] font-semibold" style={{ color: '#4ade80' }}>
            {formatCOP(lead.Valor_Estimado, true)}
          </span>
        )}
      </div>

      {/* Warning: days without activity */}
      {showWarning && (
        <div
          className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 w-fit"
          style={{ background: 'rgba(251,146,60,0.15)', color: '#fb923c' }}
        >
          <span>⚠</span>
          <span>{daysWithout} días sin contacto</span>
        </div>
      )}

      {/* Next action date */}
      {hasNextAction && (
        <div className="flex items-center gap-1 mb-2" style={{ color: 'var(--muted)' }}>
          <IconCalendar />
          <span className="text-[11px]">{formatDate(lead.Proxima_Accion_Fecha)}</span>
        </div>
      )}

      {/* Bottom row: asesor + activity count */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-[11px] truncate max-w-[70%]" style={{ color: 'var(--muted)' }}>
          {lead.Usuario_Nombre || '—'}
        </span>
        {activityCount > 0 && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ background: 'rgba(148,163,184,0.12)', color: 'var(--muted)' }}
          >
            {activityCount} act.
          </span>
        )}
      </div>
    </div>
  );
}
