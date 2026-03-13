'use client';

/**
 * AiInsightsPanel — Displays AI-generated insights from Claude.
 *
 * Usage:
 *   <AiInsightsPanel campaigns={data.dailyMetrics} range={range} crmStats={stats} />
 */

import { useState, useCallback } from 'react';
import type { DailyMetric, DateRange } from '@/types';
import type { AiInsight } from '@/app/api/insights/route';

interface Props {
  campaigns:  DailyMetric[];
  range:      DateRange;
  crmStats?: {
    leads_total:         number;
    tasa_cierre:         number;
    pipeline_total:      number;
    leads_sin_actividad: number;
    ciclo_promedio_dias: number;
  } | null;
}

// ─── Icon helpers ─────────────────────────────────────────────────────────────
function InsightIcon({ type }: { type: AiInsight['type'] }) {
  switch (type) {
    case 'warning':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      );
    case 'opportunity':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      );
    case 'success':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
}

const COLORS: Record<AiInsight['type'], { bg: string; icon: string; badge: string; border: string }> = {
  warning:     { bg: 'bg-red-500/10',    icon: 'text-red-400',    badge: 'bg-red-500/20 text-red-400',    border: 'border-red-500/20' },
  opportunity: { bg: 'bg-blue-500/10',   icon: 'text-blue-400',   badge: 'bg-blue-500/20 text-blue-400',   border: 'border-blue-500/20' },
  success:     { bg: 'bg-green-500/10',  icon: 'text-green-400',  badge: 'bg-green-500/20 text-green-400',  border: 'border-green-500/20' },
  info:        { bg: 'bg-yellow-500/10', icon: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-400', border: 'border-yellow-500/20' },
};

const TYPE_LABELS: Record<AiInsight['type'], string> = {
  warning:     'Alerta',
  opportunity: 'Oportunidad',
  success:     'Éxito',
  info:        'Info',
};

const PRIORITY_LABELS: Record<AiInsight['priority'], string> = {
  high:   'Alta',
  medium: 'Media',
  low:    'Baja',
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function AiInsightsPanel({ campaigns, range, crmStats }: Props) {
  const [insights,  setInsights]  = useState<AiInsight[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  const generate = useCallback(async () => {
    if (!campaigns.length) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/insights', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          campaigns: campaigns.slice(0, 200), // cap to avoid huge payloads
          range,
          crmStats,
        }),
      });

      const json = await res.json() as { success: boolean; insights?: AiInsight[]; error?: string };
      if (!json.success) throw new Error(json.error || 'Error generando insights');
      setInsights(json.insights || []);
      setGenerated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [campaigns, range, crmStats]);

  // ── Empty / idle state ──────────────────────────────────────────────────────
  if (!generated && !loading) {
    return (
      <div className="rounded-xl border border-surface3 bg-surface p-6 flex flex-col items-center gap-4 text-center">
        {/* Claude sparkle icon */}
        <div className="w-12 h-12 rounded-full bg-[#FF6B35]/10 flex items-center justify-center">
          <svg className="w-6 h-6 text-[#FF6B35]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-white">Insights con IA</p>
          <p className="text-xs text-zinc-500 mt-1">
            Analiza tus campañas con Claude y recibe recomendaciones accionables.
          </p>
        </div>
        <button
          onClick={generate}
          disabled={!campaigns.length}
          className="px-4 py-2 rounded-lg bg-[#FF6B35] hover:bg-[#e55a25] text-white text-sm font-medium
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generar insights
        </button>
        {!campaigns.length && (
          <p className="text-xs text-zinc-600">Carga los datos del dashboard primero</p>
        )}
      </div>
    );
  }

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-xl border border-surface3 bg-surface p-6 flex flex-col items-center gap-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-[#FF6B35] animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <p className="text-sm text-zinc-400">Claude está analizando tus campañas…</p>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-3">
        <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={generate} className="text-xs text-red-300 underline mt-1">Reintentar</button>
        </div>
      </div>
    );
  }

  // ── Insights list ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[#FF6B35]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="text-sm font-medium text-white">Insights generados por IA</span>
          <span className="text-xs text-zinc-500">{insights.length} resultados</span>
        </div>
        <button
          onClick={generate}
          className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>
      </div>

      {/* Insight cards */}
      {insights.map((ins) => {
        const colors = COLORS[ins.type] || COLORS.info;
        return (
          <div
            key={ins.id}
            className={`rounded-xl border ${colors.border} ${colors.bg} p-4 space-y-2`}
          >
            {/* Top row */}
            <div className="flex items-start gap-2">
              <div className={`mt-0.5 shrink-0 ${colors.icon}`}>
                <InsightIcon type={ins.type} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white leading-tight">{ins.title}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${colors.badge}`}>
                    {TYPE_LABELS[ins.type]}
                  </span>
                  {ins.priority === 'high' && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-500/30 text-red-300">
                      Prioridad {PRIORITY_LABELS[ins.priority]}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{ins.description}</p>
              </div>
            </div>

            {/* Metric pill */}
            {(ins.value || ins.change) && (
              <div className="flex gap-2 pl-6 flex-wrap">
                {ins.value && (
                  <span className="text-xs bg-surface2 text-zinc-300 px-2 py-0.5 rounded-full">
                    {ins.metric && <span className="text-zinc-500">{ins.metric}: </span>}
                    {ins.value}
                  </span>
                )}
                {ins.change && (
                  <span className="text-xs bg-surface2 text-zinc-300 px-2 py-0.5 rounded-full">
                    {ins.change}
                  </span>
                )}
              </div>
            )}

            {/* Action */}
            {ins.action && (
              <div className="pl-6">
                <p className="text-xs text-zinc-300 flex items-center gap-1">
                  <svg className="w-3 h-3 text-zinc-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  {ins.action}
                </p>
              </div>
            )}

            {/* Campaigns tags */}
            {ins.campaigns?.length ? (
              <div className="pl-6 flex gap-1 flex-wrap">
                {ins.campaigns.slice(0, 3).map((c) => (
                  <span key={c} className="text-[10px] bg-surface2 text-zinc-400 px-2 py-0.5 rounded-full truncate max-w-[160px]">
                    {c}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
