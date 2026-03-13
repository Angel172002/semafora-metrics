'use client';

import Link from 'next/link';

// ─── Feature cards ────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: '🚦',
    title: 'Semáforos CPR',
    desc: 'Verde, amarillo o rojo — sabes al instante qué campañas funcionan y cuáles drenan el presupuesto.',
  },
  {
    icon: '🤖',
    title: 'Auto-import de Leads',
    desc: 'Los leads de WhatsApp de Meta Ads entran solos al CRM. Sin copiar, sin pegar, sin perder ninguno.',
  },
  {
    icon: '📊',
    title: 'Dashboard + CRM en uno',
    desc: 'Métricas de publicidad y gestión de ventas en la misma pantalla. Sin cambiar entre 5 herramientas.',
  },
  {
    icon: '🧠',
    title: 'Insights con IA',
    desc: 'Claude analiza tus campañas y te dice: "Esta campaña tiene CPR 40% más alto que tu promedio — pausala."',
  },
  {
    icon: '🔔',
    title: 'Alertas automáticas',
    desc: 'Recibe WhatsApp cuando el CPR sube, cuando leads llevan 48h sin contacto, o cuando se agota el presupuesto.',
  },
  {
    icon: '📈',
    title: 'Meta + Google + TikTok',
    desc: 'Todas tus plataformas en un solo dashboard. Sincronización automática cada día a las 6 AM.',
  },
];

// ─── Pricing plans ────────────────────────────────────────────────────────────
const PLANS = [
  {
    name:    'Starter',
    price:   '$49',
    period:  '/mes USD',
    color:   '#4ade80',
    popular: false,
    features: [
      '1 cuenta Meta Ads',
      '5 usuarios',
      '500 leads / mes',
      'Dashboard completo',
      'CRM básico',
      'Alertas webhook',
    ],
  },
  {
    name:    'Agencia',
    price:   '$149',
    period:  '/mes USD',
    color:   '#60a5fa',
    popular: true,
    features: [
      '5 cuentas Meta + Google',
      '15 usuarios',
      '2,000 leads / mes',
      'Todo de Starter',
      'Exportes PDF',
      'Alertas WhatsApp',
      'AI Insights (Claude)',
    ],
  },
  {
    name:    'Enterprise',
    price:   '$399',
    period:  '/mes USD',
    color:   '#c084fc',
    popular: false,
    features: [
      'Cuentas ilimitadas',
      'Usuarios ilimitados',
      'Leads ilimitados',
      'Todo de Agencia',
      'White-label',
      'API key propia',
      'Soporte prioritario',
    ],
  },
];

// ─── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    quote: 'Antes tardaba 2 horas armando el reporte de la semana. Ahora lo veo en tiempo real apenas abro el dashboard.',
    name: 'Valentina R.',
    role: 'Directora de Marketing — Inmobiliaria Bogotá',
  },
  {
    quote: 'El auto-import de leads de WhatsApp nos cambió la vida. Nuestros asesores ya no pierden ningún lead.',
    name: 'Carlos M.',
    role: 'CEO — Agencia Digital Medellín',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: '#09090b', color: '#fff' }}>

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xl font-black tracking-tight" style={{ fontFamily: 'var(--font-bebas, sans-serif)', letterSpacing: '0.04em' }}>
            SEMÁFORA
          </span>
          <span className="text-xs font-semibold text-zinc-500 tracking-widest">METRICS</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login"
            className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5">
            Iniciar sesión
          </Link>
          <Link href="/register"
            className="text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
            style={{ background: '#e20613', color: '#fff' }}>
            Prueba gratis
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-20 px-6 text-center overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(226,6,19,0.15) 0%, transparent 70%)',
        }} />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6"
          style={{ background: 'rgba(226,6,19,0.1)', border: '1px solid rgba(226,6,19,0.3)', color: '#f87171' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          Dashboard + CRM para agencias en LATAM
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none mb-6 max-w-4xl mx-auto"
          style={{ fontFamily: 'var(--font-bebas, sans-serif)', letterSpacing: '0.02em' }}>
          EL DASHBOARD QUE<br />
          <span style={{ color: '#e20613' }}>CONVIERTE PUBLICIDAD</span><br />
          EN VENTAS
        </h1>

        <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Conecta Meta, Google y TikTok. Gestiona tus leads con CRM integrado.
          Cierra más clientes con alertas inteligentes y análisis de IA.
          <span className="text-white font-medium"> Todo en una sola plataforma.</span>
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link href="/register"
            className="px-8 py-3.5 rounded-xl text-base font-bold transition-all hover:scale-105"
            style={{ background: '#e20613', color: '#fff', boxShadow: '0 0 30px rgba(226,6,19,0.4)' }}>
            Empieza gratis 14 días →
          </Link>
          <span className="text-sm text-zinc-500">No requiere tarjeta de crédito</span>
        </div>

        {/* Platform logos */}
        <div className="flex items-center justify-center gap-6 mt-14">
          <span className="text-xs text-zinc-600 uppercase tracking-widest">Integra con</span>
          {[
            { label: 'Meta', color: '#1877F2' },
            { label: 'Google', color: '#4285F4' },
            { label: 'TikTok', color: '#FF0050' },
          ].map((p) => (
            <span key={p.label}
              className="text-sm font-bold px-3 py-1 rounded-full"
              style={{ background: `${p.color}18`, color: p.color, border: `1px solid ${p.color}30` }}>
              {p.label} Ads
            </span>
          ))}
        </div>
      </section>

      {/* ── Dashboard preview (mock screenshot) ── */}
      <section className="px-6 pb-20 max-w-6xl mx-auto">
        <div className="rounded-2xl overflow-hidden border"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#111113' }}>
          {/* Fake browser chrome */}
          <div className="flex items-center gap-2 px-4 py-3"
            style={{ background: '#18181b', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }} />
            <span className="w-3 h-3 rounded-full" style={{ background: '#f59e0b' }} />
            <span className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }} />
            <div className="flex-1 mx-4 py-1 px-3 rounded-md text-xs text-zinc-500"
              style={{ background: '#0f0f11' }}>
              semafora-metrics.vercel.app
            </div>
          </div>
          {/* Mock KPIs */}
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Leads / WhatsApp', value: '1,247', change: '+23%', color: '#4ade80' },
              { label: 'Invertido', value: '$8.4M COP', change: '-5%', color: '#c084fc' },
              { label: 'Costo por Lead', value: '$6,740', change: '-12%', color: '#2dd4bf' },
              { label: 'Alcance Total', value: '124K', change: '+31%', color: '#60a5fa' },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl p-4"
                style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs text-zinc-500 mb-2">{kpi.label}</p>
                <p className="text-xl font-bold text-white">{kpi.value}</p>
                <p className="text-xs mt-1 font-medium" style={{ color: kpi.color }}>{kpi.change}</p>
              </div>
            ))}
          </div>
          {/* Mock semáforo table */}
          <div className="px-6 pb-6">
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: '#18181b', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Campaña', 'Plataforma', 'Invertido', 'Resultados', 'CPR', 'Semáforo'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-zinc-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'LEADS WHATSAPP — Bogotá', platform: 'Meta', spent: '$2.1M', results: 312, cpr: '$6,731', semaforo: '#00973a', label: 'verde' },
                    { name: 'INTERESES — Medellín', platform: 'Meta', spent: '$1.8M', results: 187, cpr: '$9,625', semaforo: '#ffdd00', label: 'amarillo' },
                    { name: 'SEARCH — Brand', platform: 'Google', spent: '$1.2M', results: 89, cpr: '$13,483', semaforo: '#e20613', label: 'rojo' },
                  ].map((row) => (
                    <tr key={row.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-2.5 text-white font-medium truncate max-w-[160px]">{row.name}</td>
                      <td className="px-4 py-2.5 text-zinc-400">{row.platform}</td>
                      <td className="px-4 py-2.5 text-zinc-300">{row.spent}</td>
                      <td className="px-4 py-2.5 text-zinc-300">{row.results}</td>
                      <td className="px-4 py-2.5 text-zinc-300">{row.cpr}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ background: `${row.semaforo}20`, color: row.semaforo, border: `1px solid ${row.semaforo}40` }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: row.semaforo }} />
                          {row.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Por qué Semáfora</p>
          <h2 className="text-3xl md:text-4xl font-black"
            style={{ fontFamily: 'var(--font-bebas, sans-serif)', letterSpacing: '0.02em' }}>
            TODO LO QUE NECESITAS, NADA QUE NO
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title}
              className="rounded-2xl p-6 hover:scale-[1.02] transition-transform cursor-default"
              style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.07)' }}>
              <span className="text-3xl mb-4 block">{f.icon}</span>
              <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.name}
              className="rounded-2xl p-7"
              style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-base text-zinc-300 leading-relaxed mb-5">"{t.quote}"</p>
              <div>
                <p className="text-sm font-semibold text-white">{t.name}</p>
                <p className="text-xs text-zinc-500">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Precios</p>
          <h2 className="text-3xl md:text-4xl font-black"
            style={{ fontFamily: 'var(--font-bebas, sans-serif)', letterSpacing: '0.02em' }}>
            SIMPLE. TRANSPARENTE. SIN SORPRESAS.
          </h2>
          <p className="text-sm text-zinc-500 mt-3">14 días gratis en todos los planes. Sin tarjeta de crédito.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan) => (
            <div key={plan.name}
              className="rounded-2xl p-7 flex flex-col relative"
              style={{
                background: plan.popular ? '#111113' : '#0e0e10',
                border: `1px solid ${plan.popular ? plan.color + '50' : 'rgba(255,255,255,0.07)'}`,
                boxShadow: plan.popular ? `0 0 40px ${plan.color}15` : 'none',
              }}>
              {plan.popular && (
                <div className="absolute -top-3 left-0 right-0 flex justify-center">
                  <span className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ background: plan.color, color: '#000' }}>
                    Más popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <p className="text-sm font-semibold text-zinc-400 mb-1">{plan.name}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="text-sm text-zinc-500">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-2.5 flex-1 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                    <svg className="w-4 h-4 shrink-0" style={{ color: plan.color }}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                        d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <Link href="/register"
                className="block text-center py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                style={{
                  background: plan.popular ? plan.color : 'rgba(255,255,255,0.06)',
                  color: plan.popular ? '#000' : '#fff',
                  border: plan.popular ? 'none' : '1px solid rgba(255,255,255,0.1)',
                }}>
                Empezar gratis
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-3xl mx-auto rounded-2xl px-8 py-14 relative overflow-hidden"
          style={{ background: '#111113', border: '1px solid rgba(226,6,19,0.2)' }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 100%, rgba(226,6,19,0.1) 0%, transparent 70%)' }} />
          <h2 className="text-3xl md:text-5xl font-black mb-4 relative"
            style={{ fontFamily: 'var(--font-bebas, sans-serif)' }}>
            ¿LISTO PARA VER TUS CAMPAÑAS EN VERDE?
          </h2>
          <p className="text-zinc-400 mb-8 relative">
            Regístrate en 30 segundos. Sin tarjeta. Sin contrato. Sin trampa.
          </p>
          <Link href="/register"
            className="inline-block px-10 py-4 rounded-xl text-base font-bold transition-all hover:scale-105 relative"
            style={{ background: '#e20613', color: '#fff', boxShadow: '0 0 40px rgba(226,6,19,0.4)' }}>
            Crear cuenta gratis →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t px-6 py-10 text-center"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex flex-col items-center gap-4">
          <span className="text-lg font-black tracking-tight"
            style={{ fontFamily: 'var(--font-bebas, sans-serif)', letterSpacing: '0.04em' }}>
            SEMÁFORA METRICS
          </span>
          <div className="flex gap-6 text-sm text-zinc-500">
            <Link href="/login" className="hover:text-white transition-colors">Iniciar sesión</Link>
            <Link href="/register" className="hover:text-white transition-colors">Registro</Link>
          </div>
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} Semáfora Metrics. Hecho con ❤️ en LATAM.
          </p>
        </div>
      </footer>

    </div>
  );
}
