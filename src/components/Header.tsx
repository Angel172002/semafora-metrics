'use client';

import { usePathname } from 'next/navigation';
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
  if (!iso) return 'Nunca sincronizado';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1)  return 'Sincronizado ahora';
  if (diff < 60) return `Hace ${diff} min`;
  const h = Math.floor(diff / 60);
  if (h < 24)    return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)}d`;
}

const PAGE_TITLES: Record<string, { label: string; sub: string }> = {
  '/':            { label: 'Dashboard',   sub: 'Métricas de campañas publicitarias' },
  '/crm':         { label: 'CRM',         sub: 'Gestión de clientes y pipeline de ventas' },
  '/engagement':  { label: 'Engagement',  sub: 'Interacciones y contenido orgánico' },
  '/seguidores':  { label: 'Seguidores',  sub: 'Crecimiento de audiencia' },
};

export default function Header({
  range, onRangeChange, onExport, onSync, onSettings,
  isSyncing, lastSync, isMockData, isDark, onToggleTheme,
}: Props) {
  const pathname = usePathname();
  const page = PAGE_TITLES[pathname] ?? { label: 'Semafora', sub: '' };
  const syncReady = !isSyncing && lastSync !== null;

  return (
    <>
      {/* Demo banner */}
      {isMockData && (
        <div className="demo-banner">
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Modo demo — mostrando datos de ejemplo.{' '}
            <button
              onClick={onSettings}
              className="underline font-semibold hover:opacity-80 transition-opacity"
            >
              Configurar credenciales reales →
            </button>
          </span>
        </div>
      )}

      {/* Top bar */}
      <header
        className="flex items-center justify-between gap-4 px-5 py-3 border-b sticky top-0 z-30"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {/* Left: page title (desktop) + mobile brand */}
        <div className="flex items-center gap-4 min-w-0">
          {/* Mobile brand logo */}
          <div className="md:hidden flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #e20613 0%, #ffdd00 50%, #00973a 100%)' }}
            >
              <span style={{ color: '#fff', fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-bebas)' }}>S</span>
            </div>
            <span style={{ fontFamily: 'var(--font-bebas)', fontSize: 14, letterSpacing: '0.10em', color: 'var(--text)' }}>
              SEMAFORA
            </span>
          </div>

          {/* Desktop: page title */}
          <div className="hidden md:block">
            <h2 className="text-base font-bold leading-tight" style={{ color: 'var(--text)' }}>
              {page.label}
            </h2>
            {page.sub && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                {page.sub}
              </p>
            )}
          </div>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-2 flex-wrap justify-end">

          {/* Sync status indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            {isSyncing ? (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" className="animate-spin">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>Sincronizando…</span>
              </>
            ) : (
              <>
                <span className={syncReady ? 'live-dot' : 'semaforo-dot red'} />
                <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>
                  {formatLastSync(lastSync)}
                </span>
              </>
            )}
          </div>

          {/* Date range */}
          <select
            className="select-control"
            style={{ fontSize: 12 }}
            value={range}
            onChange={(e) => onRangeChange(e.target.value as DateRange)}
          >
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
            <option value="all">Todo el historial</option>
          </select>

          {/* Sync */}
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="btn btn-secondary btn-icon"
            title="Sincronizar datos"
          >
            <svg
              width="14" height="14" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
              className={isSyncing ? 'animate-spin' : ''}
            >
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Export */}
          <button
            onClick={onExport}
            className="btn hidden sm:inline-flex"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)', fontSize: 12 }}
            title="Exportar CSV"
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar
          </button>

          {/* Settings */}
          <button
            onClick={onSettings}
            className="btn btn-ghost btn-icon"
            title="Configuración"
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            className="btn btn-ghost btn-icon"
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
          >
            {isDark ? (
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </header>
    </>
  );
}
