'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [step,     setStep]     = useState<'form' | 'success'>('form');

  const nombreRef  = useRef<HTMLInputElement>(null);
  const empresaRef = useRef<HTMLInputElement>(null);
  const emailRef   = useRef<HTMLInputElement>(null);
  const passRef    = useRef<HTMLInputElement>(null);
  const pass2Ref   = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const nombre  = nombreRef.current?.value.trim() || '';
    const empresa = empresaRef.current?.value.trim() || '';
    const email   = emailRef.current?.value.trim() || '';
    const pass    = passRef.current?.value || '';
    const pass2   = pass2Ref.current?.value || '';

    if (!nombre || !empresa || !email || !pass) {
      setError('Todos los campos son requeridos.');
      return;
    }
    if (pass.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (pass !== pass2) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ nombre, empresa, email, password: pass }),
      });
      const json = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        setError(json.error || 'Error al crear la cuenta.');
        return;
      }
      setStep('success');
      // Redirect to onboarding after brief success screen
      setTimeout(() => router.push('/onboarding'), 1500);
    } catch {
      setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: '#09090b' }}>

      {/* Logo */}
      <Link href="/landing" className="mb-8 flex items-center gap-2">
        <span className="text-2xl font-black tracking-tight text-white"
          style={{ fontFamily: 'var(--font-bebas, sans-serif)', letterSpacing: '0.04em' }}>
          SEMÁFORA
        </span>
        <span className="text-xs font-semibold text-zinc-500 tracking-widest">METRICS</span>
      </Link>

      {step === 'success' ? (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ background: 'rgba(0,151,58,0.15)', border: '2px solid #00973a' }}>
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-xl font-bold text-white">¡Cuenta creada!</p>
          <p className="text-sm text-zinc-400">Preparando tu onboarding…</p>
        </div>
      ) : (
        <div className="w-full max-w-md">
          <div className="rounded-2xl p-8"
            style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.07)' }}>

            <div className="mb-7 text-center">
              <h1 className="text-2xl font-bold text-white">Crear cuenta gratis</h1>
              <p className="text-sm text-zinc-500 mt-1.5">14 días de prueba. Sin tarjeta de crédito.</p>
            </div>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl text-sm text-red-400"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nombre completo</label>
                <input
                  ref={nombreRef}
                  type="text"
                  placeholder="María García"
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600
                             focus:outline-none focus:ring-1 transition-all"
                  style={{
                    background: '#18181b',
                    border: '1px solid rgba(255,255,255,0.09)',
                    '--tw-ring-color': '#e20613',
                  } as React.CSSProperties}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Empresa / Agencia</label>
                <input
                  ref={empresaRef}
                  type="text"
                  placeholder="Agencia Digital Bogotá S.A.S."
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600
                             focus:outline-none focus:ring-1 transition-all"
                  style={{
                    background: '#18181b',
                    border: '1px solid rgba(255,255,255,0.09)',
                    '--tw-ring-color': '#e20613',
                  } as React.CSSProperties}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email de trabajo</label>
                <input
                  ref={emailRef}
                  type="email"
                  placeholder="maria@tuempresa.com"
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600
                             focus:outline-none focus:ring-1 transition-all"
                  style={{
                    background: '#18181b',
                    border: '1px solid rgba(255,255,255,0.09)',
                    '--tw-ring-color': '#e20613',
                  } as React.CSSProperties}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Contraseña</label>
                  <input
                    ref={passRef}
                    type="password"
                    placeholder="Mín. 8 caracteres"
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600
                               focus:outline-none focus:ring-1 transition-all"
                    style={{
                      background: '#18181b',
                      border: '1px solid rgba(255,255,255,0.09)',
                      '--tw-ring-color': '#e20613',
                    } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Confirmar</label>
                  <input
                    ref={pass2Ref}
                    type="password"
                    placeholder="Repetir contraseña"
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600
                               focus:outline-none focus:ring-1 transition-all"
                    style={{
                      background: '#18181b',
                      border: '1px solid rgba(255,255,255,0.09)',
                      '--tw-ring-color': '#e20613',
                    } as React.CSSProperties}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all
                           hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: '#e20613' }}>
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creando cuenta…
                  </>
                ) : (
                  'Crear cuenta gratis →'
                )}
              </button>

              <p className="text-xs text-zinc-600 text-center">
                Al registrarte aceptas nuestros{' '}
                <span className="text-zinc-400 underline cursor-pointer">Términos de uso</span>
              </p>
            </form>
          </div>

          <p className="text-center text-sm text-zinc-500 mt-5">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-white hover:underline">Iniciar sesión</Link>
          </p>
        </div>
      )}
    </div>
  );
}
