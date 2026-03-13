'use client';

import { useState, useEffect, useCallback } from 'react';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import { DEFAULT_ALERT_CONFIGS, type AlertConfig, type AlertFired } from '@/lib/alerts';
import { useTheme } from '@/hooks/useTheme';

const ALERT_TYPE_META: Record<AlertConfig['type'], { icon: string; description: string; unit: string }> = {
  cpr_spike: {
    icon: '📈',
    description: 'Alerta cuando el costo por resultado sube más del umbral vs la semana anterior.',
    unit: '%',
  },
  leads_inactive: {
    icon: '💤',
    description: 'Alerta cuando hay leads abiertos sin actividad por más horas del umbral.',
    unit: 'horas',
  },
  budget_90pct: {
    icon: '💰',
    description: 'Alerta cuando una campaña supera el porcentaje del presupuesto configurado.',
    unit: '%',
  },
  low_results: {
    icon: '📉',
    description: 'Alerta cuando una campaña con gasto tiene 0 resultados en los últimos días.',
    unit: 'días',
  },
};

const CHANNEL_LABELS: Record<AlertConfig['channel'], string> = {
  webhook:   'Webhook',
  whatsapp:  'WhatsApp',
  both:      'Ambos',
};

export default function AlertasPage() {
  const { isDark, toggle } = useTheme();
  const [configs,  setConfigs]  = useState<AlertConfig[]>(DEFAULT_ALERT_CONFIGS);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [checking, setChecking] = useState(false);
  const [fired,    setFired]    = useState<AlertFired[] | null>(null);
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  // Load configs
  useEffect(() => {
    fetch('/api/alerts')
      .then((r) => r.json())
      .then((res: { success: boolean; data?: AlertConfig[] }) => {
        if (res.success && res.data) setConfigs(res.data);
      })
      .catch(() => { /* use defaults */ })
      .finally(() => setLoading(false));
  }, []);

  // Update a single config field
  const update = useCallback((index: number, field: keyof AlertConfig, value: unknown) => {
    setConfigs((prev) => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  }, []);

  // Save all configs
  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/alerts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(configs),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (json.success) {
        showToast('Configuración guardada');
      } else {
        showToast(json.error || 'Error al guardar', false);
      }
    } catch {
      showToast('Error de conexión', false);
    } finally {
      setSaving(false);
    }
  };

  // Run check now
  const checkNow = async () => {
    setChecking(true);
    setFired(null);
    try {
      const res = await fetch('/api/alerts/check', { method: 'POST' });
      const json = await res.json() as { success: boolean; alerts?: AlertFired[]; fired?: number; error?: string };
      if (json.success) {
        setFired(json.alerts || []);
        showToast(json.fired === 0 ? 'Sin alertas activas' : `${json.fired} alerta(s) enviadas`);
      } else {
        showToast(json.error || 'Error al verificar', false);
      }
    } catch {
      showToast('Error de conexión', false);
    } finally {
      setChecking(false);
    }
  };

  const SEVERITY_COLORS = {
    high:   'text-red-400 bg-red-500/10 border-red-500/20',
    medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    low:    'text-blue-400 bg-blue-500/10 border-blue-500/20',
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      <Navigation />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          range="7d"
          onRangeChange={() => {}}
          onExport={() => {}}
          onExportPDF={() => {}}
          onSync={() => {}}
          onSettings={() => {}}
          isSyncing={false}
          lastSync={null}
          isMockData={false}
          isDark={isDark}
          onToggleTheme={toggle}
        />

        <main className="flex-1 p-4 md:p-6 max-w-3xl w-full mx-auto space-y-6">

          {/* Page header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Sistema de Alertas</h1>
              <p className="text-sm text-zinc-500 mt-0.5">
                Configura qué eventos deben notificarte automáticamente.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={checkNow}
                disabled={checking}
                className="px-3 py-1.5 rounded-lg bg-surface2 hover:bg-surface3 text-sm text-zinc-300
                           transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {checking ? (
                  <>
                    <span className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                    Verificando…
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Verificar ahora
                  </>
                )}
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-accent hover:bg-accent/80 text-white text-sm font-medium
                           transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>

          {/* Alert cards */}
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map((i) => (
                <div key={i} className="h-28 rounded-xl bg-surface animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {configs.map((cfg, i) => {
                const meta = ALERT_TYPE_META[cfg.type];
                return (
                  <div
                    key={cfg.type}
                    className={`rounded-xl border p-5 transition-all ${
                      cfg.enabled
                        ? 'border-accent/30 bg-accent/5'
                        : 'border-surface3 bg-surface'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Toggle */}
                      <button
                        onClick={() => update(i, 'enabled', !cfg.enabled)}
                        className={`mt-0.5 shrink-0 w-10 h-6 rounded-full transition-colors relative ${
                          cfg.enabled ? 'bg-accent' : 'bg-surface3'
                        }`}
                        aria-label={cfg.enabled ? 'Deshabilitar' : 'Habilitar'}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                            cfg.enabled ? 'left-5' : 'left-1'
                          }`}
                        />
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">{meta.icon}</span>
                          <span className="text-sm font-semibold text-white">
                            {cfg.label || cfg.type}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mb-3">{meta.description}</p>

                        <div className="flex flex-wrap gap-3">
                          {/* Threshold */}
                          <label className="flex items-center gap-2">
                            <span className="text-xs text-zinc-400">Umbral</span>
                            <input
                              type="number"
                              min={1}
                              value={cfg.threshold}
                              onChange={(e) => update(i, 'threshold', Number(e.target.value))}
                              disabled={!cfg.enabled}
                              className="w-20 bg-surface2 border border-surface3 rounded-lg px-2 py-1
                                         text-xs text-white focus:outline-none focus:border-accent/50
                                         disabled:opacity-40"
                            />
                            <span className="text-xs text-zinc-500">{meta.unit}</span>
                          </label>

                          {/* Channel */}
                          <label className="flex items-center gap-2">
                            <span className="text-xs text-zinc-400">Canal</span>
                            <select
                              value={cfg.channel}
                              onChange={(e) => update(i, 'channel', e.target.value as AlertConfig['channel'])}
                              disabled={!cfg.enabled}
                              className="bg-surface2 border border-surface3 rounded-lg px-2 py-1
                                         text-xs text-white focus:outline-none focus:border-accent/50
                                         disabled:opacity-40"
                            >
                              {(Object.keys(CHANNEL_LABELS) as AlertConfig['channel'][]).map((ch) => (
                                <option key={ch} value={ch}>{CHANNEL_LABELS[ch]}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Fired alerts preview */}
          {fired !== null && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-white">
                Resultado de verificación ({fired.length} alerta{fired.length !== 1 ? 's' : ''})
              </h2>
              {fired.length === 0 ? (
                <div className="text-sm text-zinc-500 text-center py-4">
                  ✅ No se detectaron alertas activas con la configuración actual.
                </div>
              ) : (
                fired.map((a, i) => (
                  <div
                    key={i}
                    className={`rounded-xl border p-4 ${SEVERITY_COLORS[a.severity]}`}
                  >
                    <p className="text-sm font-semibold">{a.title}</p>
                    <p className="text-xs mt-1 opacity-80">{a.description}</p>
                    {a.value && (
                      <span className="text-xs mt-2 inline-block bg-white/10 px-2 py-0.5 rounded-full">
                        {a.value}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Notification channels info */}
          <div className="rounded-xl border border-surface3 bg-surface p-5 text-xs text-zinc-500 space-y-2">
            <p className="font-medium text-zinc-400">Canales de notificación</p>
            <p>
              <span className="text-zinc-300">Webhook:</span> Se enviará un POST a{' '}
              <code className="bg-surface2 px-1 rounded">NOTIFY_WEBHOOK_URL</code> cuando se dispare una alerta.
            </p>
            <p>
              <span className="text-zinc-300">WhatsApp:</span> Requiere configurar{' '}
              <code className="bg-surface2 px-1 rounded">NOTIFY_WA_PHONE_NUMBER_ID</code>,{' '}
              <code className="bg-surface2 px-1 rounded">NOTIFY_WA_ACCESS_TOKEN</code> y{' '}
              <code className="bg-surface2 px-1 rounded">NOTIFY_WA_TO</code>.
            </p>
            <p>Las alertas se evalúan automáticamente en el cron diario a las 6 AM UTC.</p>
          </div>

        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg
                      ${toast.ok
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
