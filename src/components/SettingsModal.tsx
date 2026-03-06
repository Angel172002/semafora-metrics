'use client';

import { useState, useEffect } from 'react';
import type { AppSettings } from '@/types';

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

export default function SettingsModal({ open, onClose }: Props) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

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
