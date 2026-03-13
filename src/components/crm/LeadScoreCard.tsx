'use client';

import { useEffect, useState } from 'react';
import type { LeadScore, ScoreLabel } from '@/lib/leadScoring';

interface Props {
  leadId: number;
}

const LABEL_CONFIG: Record<ScoreLabel, { label: string; color: string; bg: string; emoji: string }> = {
  frio:     { label: 'Frío',    color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  emoji: '❄️' },
  tibio:    { label: 'Tibio',   color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  emoji: '🌡️' },
  caliente: { label: 'Caliente',color: '#f97316', bg: 'rgba(249,115,22,0.12)', emoji: '🔥' },
  listo:    { label: 'Listo',   color: '#10b981', bg: 'rgba(16,185,129,0.12)', emoji: '🎯' },
};

function ScoreArc({ score }: { score: number }) {
  // SVG arc meter — half circle
  const r = 52;
  const cx = 60, cy = 60;
  const startAngle = 180;
  const sweepAngle = 180 * (score / 100);
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const endAngle = startAngle + sweepAngle;
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const largeArc = sweepAngle > 180 ? 1 : 0;
  const arcPath = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;

  const trackPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  const scoreColor =
    score >= 86 ? '#10b981' :
    score >= 61 ? '#f97316' :
    score >= 31 ? '#fbbf24' : '#60a5fa';

  return (
    <svg width="120" height="68" viewBox="0 0 120 68">
      <path d={trackPath} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" strokeLinecap="round" />
      {score > 0 && (
        <path d={arcPath} fill="none" stroke={scoreColor} strokeWidth="10" strokeLinecap="round" />
      )}
      <text x="60" y="58" textAnchor="middle" fill="white" fontSize="22" fontWeight="700">
        {score}
      </text>
    </svg>
  );
}

function BreakdownBar({ label, value, max, positive = true }: {
  label: string; value: number; max: number; positive?: boolean;
}) {
  const pct = Math.abs(value) / max * 100;
  const color = value >= 0 ? (positive ? '#10b981' : '#fbbf24') : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
      <span style={{ color: 'var(--muted)', flex: '0 0 130px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', position: 'relative' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0,
          width: `${pct}%`, height: '100%',
          background: color, borderRadius: '2px',
          transition: 'width 0.5s ease',
        }} />
      </div>
      <span style={{ color: value >= 0 ? '#a1a1aa' : '#f87171', flex: '0 0 30px', textAlign: 'right' }}>
        {value > 0 ? `+${value}` : value}
      </span>
    </div>
  );
}

export default function LeadScoreCard({ leadId }: Props) {
  const [data, setData]       = useState<LeadScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen]       = useState(false);

  useEffect(() => {
    if (!leadId) return;
    fetch(`/api/crm/leads/${leadId}/score`)
      .then(r => r.json())
      .then(j => { if (j.success) setData(j.data); })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [leadId]);

  if (loading) {
    return (
      <div style={{
        background: 'var(--surface2)', border: '1px solid var(--border)',
        borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease infinite' }} />
        <div>
          <div style={{ width: '80px', height: '12px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', marginBottom: '6px' }} />
          <div style={{ width: '50px', height: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' }} />
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      </div>
    );
  }

  if (!data) return null;

  const cfg = LABEL_CONFIG[data.label];

  return (
    <div style={{
      background: 'var(--surface2)', border: `1px solid ${cfg.color}40`,
      borderRadius: '12px', overflow: 'hidden',
    }}>
      {/* Header compacto */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
          padding: '14px 16px', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        {/* Arc score */}
        <div style={{ flexShrink: 0 }}>
          <ScoreArc score={data.score} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em',
              padding: '2px 8px', borderRadius: '20px',
              background: cfg.bg, color: cfg.color,
            }}>
              {cfg.emoji} {cfg.label.toUpperCase()}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0, lineHeight: 1.4 }}>
            Cierre estimado: <strong style={{ color: 'var(--text)' }}>{data.closeProbability}%</strong>
          </p>
        </div>

        {/* Toggle */}
        <svg
          width="14" height="14" fill="none" viewBox="0 0 24 24"
          stroke="var(--muted)" strokeWidth={2}
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Detalle expandible */}
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Recomendación */}
          <div style={{
            marginTop: '12px', padding: '10px 12px', borderRadius: '8px',
            background: cfg.bg, color: cfg.color,
            fontSize: '12px', lineHeight: 1.5,
          }}>
            {data.recommendation}
          </div>

          {/* Desglose */}
          <p style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '14px 0 8px' }}>
            Desglose del score
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <BreakdownBar label="Actividad reciente"     value={data.breakdown.actividadReciente}   max={15} />
            <BreakdownBar label="Cantidad actividades"   value={data.breakdown.cantidadActividades} max={25} />
            <BreakdownBar label="Calidad actividades"    value={data.breakdown.calidadActividades}  max={20} />
            <BreakdownBar label="Progreso pipeline"      value={data.breakdown.progresoPipeline}    max={20} />
            <BreakdownBar label="Señales económicas"     value={data.breakdown.senalesEconomicas}   max={15} />
            <BreakdownBar label="Completitud perfil"     value={data.breakdown.completitudPerfil}   max={5} />
            <BreakdownBar label="Penalizaciones"         value={data.breakdown.penalizaciones}      max={30} positive={false} />
          </div>
        </div>
      )}
    </div>
  );
}
