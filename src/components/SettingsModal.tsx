'use client';

import { useState, useEffect, useRef } from 'react';
import type { AppSettings } from '@/types';

// ─── Historical sync helpers ──────────────────────────────────────────────────
function getMonthChunks(since: string, until: string): Array<{ since: string; until: string }> {
  const chunks: Array<{ since: string; until: string }> = [];
  const start = new Date(since + 'T00:00:00');
  const end   = new Date(until + 'T00:00:00');

  let cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    const firstDay = cur.toISOString().split('T')[0];
    const lastDay  = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).toISOString().split('T')[0];
    chunks.push({ since: firstDay, until: lastDay < until ? lastDay : until });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  return chunks;
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// Default: when Meta campaigns started
const HIST_DEFAULT_SINCE = '2025-08-01';

const DEFAULT_SETTINGS: AppSettings = {
  nocodbUrl: 'http://localhost:8080',
  nocodbApiKey: '',
  metaAccessToken: '',
  metaAdAccountId: '',
  googleRefreshToken: '',
  googleCustomerId: '',
  tiktokAccessToken: '',
  tiktokAdvertiserId: '',
  syncIntervalHours: 6,
  useMockData: true,
};

const STORAGE_KEY = 'semafora_metrics_settings';

interface Props {
  open: boolean;
  onClose: () => void;
}

type HistSyncStatus = 'idle' | 'running' | 'done' | 'error';

export default function SettingsModal({ open, onClose }: Props) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  // Historical sync state
  const [histSince, setHistSince]       = useState(HIST_DEFAULT_SINCE);
  const [histStatus, setHistStatus]     = useState<HistSyncStatus>('idle');
  const [histProgress, setHistProgress] = useState({ done: 0, total: 0, current: '' });
  const [histErrors, setHistErrors]     = useState<string[]>([]);
  const abortRef = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
    } catch {}
  }, []);

  function set(key: keyof AppSettings, value: string | number | boolean) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleHistoricalSync() {
    const chunks = getMonthChunks(histSince, todayStr());
    if (chunks.length === 0) return;

    abortRef.current = false;
    setHistStatus('running');
    setHistErrors([]);
    setHistProgress({ done: 0, total: chunks.length, current: '' });

    const errs: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      if (abortRef.current) break;
      const chunk = chunks[i];
      setHistProgress({ done: i, total: chunks.length, current: `${chunk.since} → ${chunk.until}` });

      try {
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platforms: ['meta'], since: chunk.since, until: chunk.until }),
        });
        const data = await res.json();
        if (!data.success && data.error) {
          errs.push(`${chunk.since}: ${data.error}`);
        }
      } catch (e) {
        errs.push(`${chunk.since}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    setHistErrors(errs);
    setHistProgress((p) => ({ ...p, done: chunks.length, current: '' }));
    setHistStatus(errs.length > 0 ? 'error' : 'done');
  }

  function handleAbort() {
    abortRef.current = true;
    setHistStatus('idle');
  }

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text)', fontFamily: 'var(--font-bebas)', letterSpacing: '0.05em' }}>
              CONFIGURACIÓN
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              Credenciales de APIs y conexión a NocoDB
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: 'var(--surface2)', color: 'var(--muted)' }}
          >
            ✕
          </button>
        </div>

        {/* NocoDB Section */}
        <Section title="NocoDB" icon="🗄️">
          <Field label="URL del servidor" value={settings.nocodbUrl} onChange={(v) => set('nocodbUrl', v)} placeholder="http://localhost:8080" />
          <Field label="API Key" value={settings.nocodbApiKey} onChange={(v) => set('nocodbApiKey', v)} placeholder="tu_api_key" type="password" />
        </Section>

        {/* Meta Section */}
        <Section title="Meta Ads (Facebook / Instagram)" icon="📘">
          <Field label="Access Token" value={settings.metaAccessToken} onChange={(v) => set('metaAccessToken', v)} placeholder="EAAxxxxx..." type="password" />
          <Field label="Ad Account ID" value={settings.metaAdAccountId} onChange={(v) => set('metaAdAccountId', v)} placeholder="act_XXXXXXXXXX" />
        </Section>

        {/* Google Section */}
        <Section title="Google Ads" icon="🔵">
          <Field label="Refresh Token" value={settings.googleRefreshToken} onChange={(v) => set('googleRefreshToken', v)} placeholder="1//xxxxxx..." type="password" />
          <Field label="Customer ID" value={settings.googleCustomerId} onChange={(v) => set('googleCustomerId', v)} placeholder="XXXXXXXXXX" />
        </Section>

        {/* TikTok Section */}
        <Section title="TikTok Ads" icon="🎵">
          <Field label="Access Token" value={settings.tiktokAccessToken} onChange={(v) => set('tiktokAccessToken', v)} placeholder="act.xxxxx..." type="password" />
          <Field label="Advertiser ID" value={settings.tiktokAdvertiserId} onChange={(v) => set('tiktokAdvertiserId', v)} placeholder="XXXXXXXXXXXXXXXXXX" />
        </Section>

        {/* Sync config */}
        <Section title="Sincronización" icon="⏱️">
          <div className="flex items-center justify-between">
            <label className="text-sm" style={{ color: 'var(--muted)' }}>Intervalo automático</label>
            <select
              className="select-control text-xs"
              value={settings.syncIntervalHours}
              onChange={(e) => set('syncIntervalHours', parseInt(e.target.value))}
            >
              {[1, 3, 6, 12, 24].map((h) => (
                <option key={h} value={h}>Cada {h}h</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Usar datos demo</label>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Activo hasta configurar credenciales reales</p>
            </div>
            <button
              onClick={() => set('useMockData', !settings.useMockData)}
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{ background: settings.useMockData ? '#ffdd00' : 'var(--border2)' }}
            >
              <span
                className="absolute top-1 w-4 h-4 rounded-full transition-all"
                style={{
                  left: settings.useMockData ? 'calc(100% - 20px)' : '4px',
                  background: settings.useMockData ? '#09090b' : 'var(--muted)',
                }}
              />
            </button>
          </div>
        </Section>

        {/* Historical sync */}
        <Section title="Historial completo" icon="📅">
          <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
            Trae todo el historial de Meta Ads mes a mes. El sync regular automático corre cada 2 horas
            y cubre los últimos 30 días. Usa esto solo una vez para cargar el historial completo.
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <label className="text-xs whitespace-nowrap" style={{ color: 'var(--muted)' }}>Desde</label>
              <input
                type="date"
                value={histSince}
                max={todayStr()}
                onChange={(e) => { setHistSince(e.target.value); setHistStatus('idle'); }}
                disabled={histStatus === 'running'}
                className="input-field text-xs flex-1"
              />
            </div>

            {histStatus === 'running' && (
              <div className="mt-1">
                <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--muted)' }}>
                  <span>Sincronizando {histProgress.current}</span>
                  <span>{histProgress.done}/{histProgress.total} meses</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border2)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${histProgress.total > 0 ? Math.round((histProgress.done / histProgress.total) * 100) : 0}%`,
                      background: 'var(--primary)',
                    }}
                  />
                </div>
              </div>
            )}

            {histStatus === 'done' && (
              <p className="text-xs font-medium" style={{ color: '#22c55e' }}>
                ✓ Historial sincronizado correctamente ({histProgress.total} meses)
              </p>
            )}

            {histStatus === 'error' && histErrors.length > 0 && (
              <div className="text-xs rounded p-2 mt-1" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                <p className="font-medium mb-1">Errores en {histErrors.length} mes(es):</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {histErrors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                  {histErrors.length > 5 && <li>... y {histErrors.length - 5} más</li>}
                </ul>
              </div>
            )}

            <div className="flex gap-2 mt-1">
              {histStatus !== 'running' ? (
                <button
                  onClick={handleHistoricalSync}
                  disabled={!histSince}
                  className="btn flex-1 text-xs font-semibold"
                  style={{ background: 'var(--platform-meta)', color: '#fff', opacity: !histSince ? 0.5 : 1 }}
                >
                  Sincronizar historial ({getMonthChunks(histSince, todayStr()).length} meses)
                </button>
              ) : (
                <button
                  onClick={handleAbort}
                  className="btn flex-1 text-xs font-semibold"
                  style={{ background: 'var(--border2)', color: 'var(--muted)' }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </Section>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
          <button
            onClick={handleSave}
            className="btn flex-1 font-semibold"
            style={{ background: saved ? '#22c55e' : 'var(--platform-meta)', color: '#fff' }}
          >
            {saved ? '✓ Guardado' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{icon}</span>
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          {title}
        </h3>
      </div>
      <div className="flex flex-col gap-2 pl-6">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs" style={{ color: 'var(--muted)' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field"
        autoComplete="off"
      />
    </div>
  );
}
