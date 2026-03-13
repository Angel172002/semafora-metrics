'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const NAV_SECTIONS = [
  {
    label: 'Métricas',
    items: [
      {
        href: '/',
        label: 'Dashboard',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
        ),
      },
      {
        href: '/engagement',
        label: 'Engagement',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        ),
      },
      {
        href: '/seguidores',
        label: 'Seguidores',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Gestión',
    items: [
      {
        href: '/crm',
        label: 'CRM',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
        badge: 'CRM',
      },
    ],
  },
  {
    label: 'Automatización',
    items: [
      {
        href: '/alertas',
        label: 'Alertas',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        ),
      },
      {
        href: '/reportes',
        label: 'Reportes',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Cuenta',
    items: [
      {
        href: '/billing',
        label: 'Plan & Billing',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
        ),
      },
    ],
  },
];

// Mobile bottom nav — flat list
const ALL_NAV = NAV_SECTIONS.flatMap((s) => s.items);

async function handleLogout(router: ReturnType<typeof useRouter>) {
  await fetch('/api/auth/logout', { method: 'POST' });
  router.push('/login');
}

export default function Navigation() {
  const pathname = usePathname();
  const router   = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  if (pathname === '/login') return null;

  function isActive(href: string) {
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  }

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside
        className={`hidden md:flex flex-col h-screen sticky top-0 border-r z-40 transition-all duration-300 ${
          collapsed ? 'w-[58px]' : 'w-[220px]'
        }`}
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {/* Brand */}
        <div
          className="flex items-center gap-3 border-b"
          style={{
            borderColor: 'var(--border)',
            padding: collapsed ? '18px 0' : '18px 14px',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          {/* Logo mark */}
          <div
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #e20613 0%, #ffdd00 50%, #00973a 100%)' }}
          >
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-bebas)', letterSpacing: 1 }}>S</span>
          </div>

          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p style={{ fontFamily: 'var(--font-bebas)', fontSize: 15, letterSpacing: '0.10em', color: 'var(--text)', lineHeight: 1 }}>
                SEMAFORA
              </p>
              <p style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--muted2)', textTransform: 'uppercase', marginTop: 2 }}>
                Metrics & CRM
              </p>
            </div>
          )}

          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md transition-colors"
              style={{ color: 'var(--muted2)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              title="Colapsar"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}

          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              style={{ position: 'absolute', top: 20, right: -12, width: 22, height: 22, borderRadius: '50%', background: 'var(--surface3)', border: '1px solid var(--border2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}
              title="Expandir"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto py-3" style={{ padding: collapsed ? '12px 8px' : '12px 10px' }}>
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-1">
              {!collapsed && (
                <p className="nav-section-label">{section.label}</p>
              )}
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item ${active ? 'active' : ''}`}
                    style={collapsed ? { justifyContent: 'center', padding: '10px 0' } : {}}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom: platform status + logout */}
        {!collapsed && (
          <div className="px-3 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
            {/* Platform status */}
            <div className="mb-3 px-1">
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 6 }}>
                Plataformas
              </p>
              <div className="flex flex-col gap-1.5">
                {[
                  { label: 'Meta Ads',    color: '#1877F2', active: true },
                  { label: 'Google Ads',  color: '#4285F4', active: true },
                  { label: 'TikTok Ads', color: '#FF0050', active: false },
                ].map((p) => (
                  <div key={p.label} className="flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: p.active ? p.color : 'var(--border2)', boxShadow: p.active ? `0 0 5px ${p.color}80` : 'none' }}
                    />
                    <span style={{ fontSize: 11, color: p.active ? 'var(--text-soft)' : 'var(--muted2)' }}>{p.label}</span>
                    {!p.active && (
                      <span style={{ fontSize: 9, color: 'var(--muted2)', marginLeft: 'auto' }}>Pendiente</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Logout */}
        <div style={{ padding: collapsed ? '10px 8px' : '10px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => handleLogout(router)}
            className="w-full flex items-center gap-2.5 rounded-lg transition-all"
            style={{
              padding: collapsed ? '10px 0' : '9px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--muted)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 10,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)';
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
            title={collapsed ? 'Cerrar sesión' : undefined}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!collapsed && <span>Cerrar sesión</span>}
          </button>

          {!collapsed && (
            <p style={{ fontSize: 9, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.10em', padding: '6px 12px 0', textAlign: 'center' }}>
              v2.0 · Semafora
            </p>
          )}
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {ALL_NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors"
              style={{ color: active ? 'var(--accent)' : 'var(--muted)' }}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
