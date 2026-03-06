'use client';

import type { DateRange } from '@/types';

interface Props {
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
  onExport: () => void;
  onSync: () => void;
  onSettings: () => void;
  isSyncing: boolean;
  lastSync: string | null;
  isMockData: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
}

function formatLastSync(iso: string | null): string {
  if (!iso) return 'Nunca';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'Hace menos de 1 min';
  if (diff < 60) return `Hace ${diff} min`;
  const h = Math.floor(diff / 60);
  return `Hace ${h}h`;
}

export default function Header({
  range, onRangeChange, onExport, onSync, onSettings,
  isSyncing, lastSync, isMockData, isDark, onToggleTheme,
}: Props) {
  return (
    <>
      {/* Demo banner */}
      {isMockData && (
        <div className="demo-banner">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Modo demo — datos de ejemplo.{' '}
            <button
              onClick={onSettings}
              className="underline font-medium hover:opacity-80 transition-opacity"
            >
              Configurar credenciales reales →
            </button>
          </span>
        </div>
      )}

      {/* Top bar */}
      <header className="px-6 py-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        {/* Logo + title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#e20613' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ffdd00' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#00973a' }} />
          </div>
          <div>
            <h1
              className="text-xl leading-none"
              style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.06em', color: 'var(--text)' }}
            >
              SEMAFORA METRICS
            </h1>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Dashboard de Campañas ADS
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Last sync */}
          {lastSync && (
            <span className="text-xs hidden sm:block" style={{ color: 'var(--muted2)' }}>
              Sync: {formatLastSync(lastSync)}
            </span>
          )}

          {/* Date range */}
          <select
            className="select-control text-xs"
            value={range}
            onChange={(e) => onRangeChange(e.target.value as DateRange)}
          >
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
            <option value="all">Todo el historial</option>
          </select>

          {/* Sync button */}
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="btn btn-secondary gap-1.5"
            title="Sincronizar datos"
          >
            <svg
              width="13" height="13" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2}
              className={isSyncing ? 'animate-spin' : ''}
            >
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">{isSyncing ? 'Sincronizando…' : 'Sync'}</span>
          </button>

          {/* Export */}
          <button onClick={onExport} className="btn gap-1.5" style={{ background: '#1877F2', color: '#fff' }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline">Exportar Reporte</span>
          </button>

          {/* Settings */}
          <button
            onClick={onSettings}
            className="w-8 h-8 flex items-center justify-center rounded-lg btn-secondary"
            title="Configuración"
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-lg btn-secondary"
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
          >
            {isDark ? (
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </header>
    </>
  );
}
