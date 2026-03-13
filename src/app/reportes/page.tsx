'use client';

import { useState } from 'react';
import Link from 'next/link';

type Period = 'semanal' | 'mensual';

interface Sections {
  kpis:         boolean;
  campaigns:    boolean;
  crm:          boolean;
  topCampaigns: boolean;
}

export default function ReportesPage() {
  const [period,   setPeriod]   = useState<Period>('semanal');
  const [email,    setEmail]    = useState('');
  const [sections, setSections] = useState<Sections>({
    kpis: true, campaigns: true, crm: true, topCampaigns: true,
  });
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<{ ok: boolean; message: string } | null>(null);

  function toggleSection(key: keyof Sections) {
    setSections(s => ({ ...s, [key]: !s[key] }));
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/reports', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ period, email, sections }),
      });
      const j = await res.json() as { success: boolean; message?: string; error?: string };
      setResult({ ok: j.success, message: j.message ?? j.error ?? 'Error desconocido' });
    } catch {
      setResult({ ok: false, message: 'Error de conexión' });
    } finally {
      setLoading(false);
    }
  }

  const sectionItems: { key: keyof Sections; label: string; desc: string; icon: string }[] = [
    { key: 'kpis',         label: 'KPIs Generales',   desc: 'Inversión, resultados, leads, CPL', icon: '📊' },
    { key: 'topCampaigns', label: 'Top Campañas',      desc: 'Las 5 campañas con más resultados',  icon: '🏆' },
    { key: 'campaigns',    label: 'Detalle campañas',  desc: 'Tabla completa por plataforma',       icon: '📋' },
    { key: 'crm',          label: 'CRM Pipeline',      desc: 'Leads, tasa de cierre, revenue',      icon: '👥' },
  ];

  return (
    <div className="flex-1 p-4 md:p-6 max-w-3xl mx-auto w-full">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Reportes Automáticos</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Genera y envía reportes ejecutivos por email con las métricas del período.
        </p>
      </div>

      <form onSubmit={handleSend} className="flex flex-col gap-5">

        {/* Período */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Período del reporte</h2>
          <div className="flex gap-3">
            {(['semanal', 'mensual'] as Period[]).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: period === p ? '#e20613' : 'var(--surface2)',
                  color:      period === p ? '#fff' : 'var(--muted)',
                  border:     `1px solid ${period === p ? '#e20613' : 'var(--border)'}`,
                }}
              >
                {p === 'semanal' ? '📅 Últimos 7 días' : '📆 Últimos 30 días'}
              </button>
            ))}
          </div>
        </div>

        {/* Secciones */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Secciones a incluir</h2>
          <div className="flex flex-col gap-2">
            {sectionItems.map(({ key, label, desc, icon }) => (
              <label
                key={key}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                style={{
                  background: sections[key] ? 'rgba(226,6,19,0.06)' : 'var(--surface2)',
                  border: `1px solid ${sections[key] ? 'rgba(226,6,19,0.2)' : 'var(--border)'}`,
                }}
              >
                <input
                  type="checkbox"
                  checked={sections[key]}
                  onChange={() => toggleSection(key)}
                  className="w-4 h-4 accent-red-600 flex-shrink-0"
                />
                <span className="text-lg leading-none">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{label}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Email */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Enviar a</h2>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="email@tuempresa.com"
            required
            className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 transition-all"
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              // @ts-expect-error CSS custom property
              '--tw-ring-color': '#e20613',
            }}
          />
          <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
            Puedes separar múltiples emails con coma. El reporte llegará en formato HTML listo para imprimir como PDF.
          </p>
        </div>

        {/* Preview link */}
        <div className="flex items-center gap-3">
          <a
            href={`/api/reports?period=${period}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: 'var(--surface2)',
              color: 'var(--muted)',
              border: '1px solid var(--border)',
              textDecoration: 'none',
            }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Previsualizar reporte
          </a>

          <button
            type="submit"
            disabled={loading || !email}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: '#e20613' }}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enviando…
              </>
            ) : (
              <>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Enviar reporte
              </>
            )}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div
            className="px-4 py-3 rounded-xl text-sm"
            style={{
              background: result.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${result.ok ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
              color:  result.ok ? '#4ade80' : '#f87171',
            }}
          >
            {result.ok ? '✅ ' : '❌ '}{result.message}
          </div>
        )}
      </form>

      {/* Info sobre automatización */}
      <div className="card p-5 mt-6" style={{ borderColor: 'rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.04)' }}>
        <div className="flex items-start gap-3">
          <span className="text-lg">⚡</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#fbbf24' }}>Envío automático</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
              Para programar envíos automáticos (cada lunes o primer día del mes), agrega{' '}
              <code className="px-1 py-0.5 rounded text-xs" style={{ background: 'var(--surface3)' }}>POST /api/reports</code>{' '}
              a tu cron job en Vercel con la frecuencia deseada.
              El cron diario actual en <code className="px-1 py-0.5 rounded text-xs" style={{ background: 'var(--surface3)' }}>/api/cron</code>{' '}
              puede invocar este endpoint automáticamente los lunes.
            </p>
            <Link
              href="/alertas"
              className="inline-flex items-center gap-1 mt-2 text-xs font-semibold"
              style={{ color: '#fbbf24', textDecoration: 'none' }}
            >
              Ver configuración de alertas →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
