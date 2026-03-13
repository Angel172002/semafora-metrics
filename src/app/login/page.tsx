'use client';

import { useState, FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const router       = useRouter();
  const searchParams = useSearchParams();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password }),
      });
      if (res.ok) {
        const from = searchParams.get('from') || '/';
        router.push(from);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Usuario o contraseña incorrectos');
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'var(--font-poppins), system-ui, sans-serif',
      position: 'relative',
    }}>

      {/* Fondo decorativo con gradientes de marca */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '-15%', left: '-10%',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(226,6,19,0.07) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', right: '-10%',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,151,58,0.05) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', top: '40%', right: '20%',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,221,0,0.03) 0%, transparent 65%)',
        }} />
      </div>

      {/* Card de login */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: '400px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: '40px 36px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>

        {/* Logo Semafora */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          {/* Icono semáforo */}
          <div style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '14px 18px',
            gap: '7px',
            marginBottom: '18px',
          }}>
            <span style={{
              width: 13, height: 13, borderRadius: '50%',
              background: '#e20613', display: 'block',
              boxShadow: '0 0 12px rgba(226,6,19,0.7)',
            }} />
            <span style={{
              width: 13, height: 13, borderRadius: '50%',
              background: '#ffdd00', display: 'block',
              boxShadow: '0 0 8px rgba(255,221,0,0.4)', opacity: 0.55,
            }} />
            <span style={{
              width: 13, height: 13, borderRadius: '50%',
              background: '#00973a', display: 'block',
              boxShadow: '0 0 8px rgba(0,151,58,0.4)', opacity: 0.55,
            }} />
          </div>

          <h1 style={{
            fontFamily: 'var(--font-bebas)',
            fontSize: '34px',
            letterSpacing: '0.14em',
            color: 'var(--text)',
            margin: 0,
            lineHeight: 1,
          }}>
            SEMAFORA
          </h1>
          <p style={{
            fontSize: '11px',
            color: 'var(--muted)',
            marginTop: '7px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            Métricas · CRM · Campañas ADS
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Usuario */}
          <div>
            <label style={{
              display: 'block', fontSize: '11px', fontWeight: 600,
              color: 'var(--muted)', marginBottom: '7px', letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              placeholder="Ingresa tu usuario"
              required
              autoComplete="username"
              autoFocus
            />
          </div>

          {/* Contraseña */}
          <div>
            <label style={{
              display: 'block', fontSize: '11px', fontWeight: 600,
              color: 'var(--muted)', marginBottom: '7px', letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{ paddingRight: '42px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '11px', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--muted)', padding: '4px', lineHeight: 1,
                }}
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? (
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(226,6,19,0.08)',
              border: '1px solid rgba(226,6,19,0.25)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '13px',
              color: '#f87171',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '10px',
              border: 'none',
              background: loading ? 'var(--surface3)' : '#e20613',
              color: loading ? 'var(--muted)' : '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.04em',
              transition: 'all 0.15s ease',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '8px',
              marginTop: '4px',
            }}
          >
            {loading ? (
              <>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  style={{ animation: 'spin 1s linear infinite' }}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Verificando…
              </>
            ) : (
              'Iniciar sesión'
            )}
          </button>
        </form>

        {/* Registro */}
        <p style={{
          textAlign: 'center', fontSize: '13px',
          color: 'var(--muted)', marginTop: '22px',
        }}>
          ¿No tienes cuenta?{' '}
          <Link href="/register" style={{ color: '#e20613', textDecoration: 'none', fontWeight: 600 }}>
            Regístrate gratis
          </Link>
        </p>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '12px', marginTop: '16px',
        }}>
          <Link href="/landing" style={{ fontSize: '11px', color: 'var(--muted2)', textDecoration: 'none' }}>
            Ver planes
          </Link>
          <span style={{ color: 'var(--border)', fontSize: '11px' }}>·</span>
          <p style={{ fontSize: '11px', color: 'var(--muted2)', margin: 0 }}>
            © 2026 Semafora
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
