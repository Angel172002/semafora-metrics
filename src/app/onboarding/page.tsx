'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ─── Step definitions ─────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Bienvenida',   icon: '🎉' },
  { id: 2, label: 'Meta Ads',     icon: '📘' },
  { id: 3, label: 'Google Ads',   icon: '🔵' },
  { id: 4, label: 'Tu equipo',    icon: '👥' },
  { id: 5, label: '¡Listo!',      icon: '🚀' },
];

interface SetupState {
  empresa:       string;
  industria:     string;
  metaToken:     string;
  metaAccountId: string;
  googleToken:   string;
  teammates:     string;  // comma-separated emails
}

const INDUSTRIAS = [
  'Inmobiliaria',
  'Educación',
  'Salud / Medicina estética',
  'Financiero / Créditos',
  'Retail / E-commerce',
  'Automotriz',
  'Turismo / Hotelería',
  'Tecnología / SaaS',
  'Agencia de marketing',
  'Otro',
];

export default function OnboardingPage() {
  const router  = useRouter();
  const [step,   setStep]   = useState(1);
  const [saving, setSaving] = useState(false);
  const [state,  setState]  = useState<SetupState>({
    empresa: '', industria: '', metaToken: '', metaAccountId: '', googleToken: '', teammates: '',
  });

  function update(field: keyof SetupState, value: string) {
    setState((prev) => ({ ...prev, [field]: value }));
  }

  function next() { if (step < STEPS.length) setStep((s) => s + 1); }
  function back() { if (step > 1)           setStep((s) => s - 1); }

  async function finish() {
    setSaving(true);
    // Optionally save env vars / settings (fire-and-forget)
    // For now, just go to dashboard
    setTimeout(() => router.push('/'), 1000);
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: '#09090b' }}>

      {/* Logo */}
      <div className="mb-8 flex items-center gap-2">
        <span className="text-2xl font-black tracking-tight text-white"
          style={{ fontFamily: 'var(--font-bebas, sans-serif)', letterSpacing: '0.04em' }}>
          SEMÁFORA
        </span>
        <span className="text-xs font-semibold text-zinc-500 tracking-widest">METRICS</span>
      </div>

      <div className="w-full max-w-xl">
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                step > s.id
                  ? 'bg-green-500 text-white'
                  : step === s.id
                  ? 'text-white'
                  : 'text-zinc-600'
              }`}
                style={step === s.id ? { background: '#e20613' } :
                       step > s.id  ? {} :
                       { background: '#18181b', border: '1px solid rgba(255,255,255,0.08)' }}>
                {step > s.id ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : s.id}
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-px mx-2 transition-all"
                  style={{ background: step > s.id ? '#22c55e' : 'rgba(255,255,255,0.08)' }} />
              )}
            </div>
          ))}
        </div>

        {/* Step card */}
        <div className="rounded-2xl p-8"
          style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.07)' }}>

          {/* Step 1 — Bienvenida */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <span className="text-4xl block mb-3">🎉</span>
                <h2 className="text-2xl font-bold text-white">¡Bienvenido a Semáfora!</h2>
                <p className="text-sm text-zinc-400 mt-2">
                  En 2 minutos tu dashboard estará listo. Empecemos con lo básico.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Nombre de tu empresa o agencia
                  </label>
                  <input
                    type="text"
                    value={state.empresa}
                    onChange={(e) => update('empresa', e.target.value)}
                    placeholder="Ej: Agencia Digital Bogotá"
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none"
                    style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.09)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Industria principal</label>
                  <select
                    value={state.industria}
                    onChange={(e) => update('industria', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none"
                    style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.09)' }}
                  >
                    <option value="">Selecciona una industria...</option>
                    {INDUSTRIAS.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Meta Ads */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <span className="text-4xl block mb-3">📘</span>
                <h2 className="text-2xl font-bold text-white">Conectar Meta Ads</h2>
                <p className="text-sm text-zinc-400 mt-2">
                  Conecta tu cuenta de Meta para empezar a sincronizar campañas y leads automáticamente.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Meta Access Token{' '}
                    <span className="text-zinc-600">(de Business Manager → Sistema → Tokens)</span>
                  </label>
                  <input
                    type="password"
                    value={state.metaToken}
                    onChange={(e) => update('metaToken', e.target.value)}
                    placeholder="EAABz..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none font-mono"
                    style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.09)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    ID de cuenta publicitaria{' '}
                    <span className="text-zinc-600">(act_XXXXXXXXXX)</span>
                  </label>
                  <input
                    type="text"
                    value={state.metaAccountId}
                    onChange={(e) => update('metaAccountId', e.target.value)}
                    placeholder="act_1234567890"
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none font-mono"
                    style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.09)' }}
                  />
                </div>
                <div className="rounded-xl p-4 text-xs text-zinc-500 space-y-1.5"
                  style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-zinc-300 font-medium mb-2">¿Cómo obtener las credenciales?</p>
                  <p>1. Ve a <span className="text-blue-400">business.facebook.com</span></p>
                  <p>2. Configuración del negocio → Usuarios del sistema</p>
                  <p>3. Genera un token con permisos: <code className="bg-black/30 px-1 rounded">ads_read</code>, <code className="bg-black/30 px-1 rounded">leads_retrieval</code></p>
                  <p>4. El ID de cuenta está en Administrador de Anuncios (act_XXXXXXX)</p>
                </div>
              </div>
              <p className="text-xs text-zinc-600 text-center">
                Las credenciales se guardan encriptadas en tu configuración.
              </p>
            </div>
          )}

          {/* Step 3 — Google Ads */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <span className="text-4xl block mb-3">🔵</span>
                <h2 className="text-2xl font-bold text-white">Conectar Google Ads</h2>
                <p className="text-sm text-zinc-400 mt-2">
                  Opcional. Puedes conectarlo ahora o más adelante desde Configuración.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Google Ads Refresh Token
                  </label>
                  <input
                    type="password"
                    value={state.googleToken}
                    onChange={(e) => update('googleToken', e.target.value)}
                    placeholder="1//0g..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none font-mono"
                    style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.09)' }}
                  />
                </div>
                <div className="rounded-xl p-4 text-xs text-zinc-500"
                  style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-zinc-300 font-medium mb-2">¿Cómo conectar Google?</p>
                  <p>Necesitas: Developer Token, Client ID, Client Secret y un Refresh Token.</p>
                  <p className="mt-1">Guía completa en: <span className="text-blue-400">developers.google.com/google-ads/api/docs/get-started</span></p>
                </div>
              </div>
              <button
                onClick={next}
                className="w-full py-2 rounded-xl text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
                style={{ background: 'transparent' }}>
                Saltar por ahora — conectar más tarde →
              </button>
            </div>
          )}

          {/* Step 4 — Invitar equipo */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <span className="text-4xl block mb-3">👥</span>
                <h2 className="text-2xl font-bold text-white">Invitar a tu equipo</h2>
                <p className="text-sm text-zinc-400 mt-2">
                  Opcional. Agrega los emails de tus asesores o analistas (separados por comas).
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Emails del equipo
                </label>
                <textarea
                  value={state.teammates}
                  onChange={(e) => update('teammates', e.target.value)}
                  placeholder="oscar@agencia.com, sofia@agencia.com, angel@agencia.com"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none resize-none"
                  style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.09)' }}
                />
                <p className="text-xs text-zinc-600 mt-2">
                  Recibirán una invitación por email para crear su contraseña.
                </p>
              </div>
              <div className="rounded-xl p-4 text-xs text-zinc-500 space-y-1.5"
                style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-zinc-300 font-medium">Roles disponibles</p>
                <p><span className="text-white">Admin:</span> acceso total, sincronización, configuración</p>
                <p><span className="text-white">Analista:</span> solo métricas, sin CRM</p>
                <p><span className="text-white">Comercial:</span> solo CRM, sin métricas de campaña</p>
              </div>
            </div>
          )}

          {/* Step 5 — ¡Listo! */}
          {step === 5 && (
            <div className="text-center space-y-6">
              <div>
                <span className="text-5xl block mb-4">🚀</span>
                <h2 className="text-2xl font-bold text-white">¡Todo listo, {state.empresa || 'equipo'}!</h2>
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                  Tu cuenta está configurada. La primera sincronización se hará automáticamente en los próximos minutos.
                </p>
              </div>

              {/* Checklist */}
              <div className="text-left space-y-3">
                {[
                  { label: 'Cuenta creada', done: true },
                  { label: 'Meta Ads ' + (state.metaToken ? 'conectado' : 'por conectar'), done: !!state.metaToken },
                  { label: 'Google Ads ' + (state.googleToken ? 'conectado' : 'por conectar'), done: !!state.googleToken },
                  { label: 'Equipo ' + (state.teammates ? 'invitado' : 'por invitar'), done: !!state.teammates },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      item.done ? 'bg-green-500' : 'bg-zinc-700'
                    }`}>
                      {item.done ? (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-zinc-500" />
                      )}
                    </div>
                    <span className={`text-sm ${item.done ? 'text-white' : 'text-zinc-500'}`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-zinc-600">
                Puedes completar la configuración de integraciones en cualquier momento desde{' '}
                <Link href="/" className="text-zinc-400 underline">Configuración</Link>.
              </p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className={`flex mt-8 gap-3 ${step === 1 ? 'justify-end' : 'justify-between'}`}>
            {step > 1 && step < STEPS.length && (
              <button
                onClick={back}
                className="px-5 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-white transition-colors"
                style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.07)' }}>
                ← Atrás
              </button>
            )}

            {step < STEPS.length ? (
              <button
                onClick={next}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 ml-auto"
                style={{ background: '#e20613' }}>
                {step === 4 ? 'Continuar →' : 'Siguiente →'}
              </button>
            ) : (
              <button
                onClick={finish}
                disabled={saving}
                className="px-8 py-2.5 rounded-xl text-sm font-bold text-white transition-all
                           hover:opacity-90 disabled:opacity-50 flex items-center gap-2 mx-auto"
                style={{ background: '#00973a', boxShadow: '0 0 20px rgba(0,151,58,0.3)' }}>
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Preparando dashboard…
                  </>
                ) : (
                  '🚀 Ir al Dashboard'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Step labels */}
        <div className="flex justify-between mt-3 px-1">
          {STEPS.map((s) => (
            <div key={s.id} className="text-center" style={{ width: '20%' }}>
              <p className={`text-[10px] ${step === s.id ? 'text-white font-medium' : 'text-zinc-600'}`}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
