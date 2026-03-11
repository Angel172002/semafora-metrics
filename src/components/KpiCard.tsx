'use client';

interface KpiCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor?: string;
  subtitle?: string;
  loading?: boolean;
}

export default function KpiCard({ title, value, change, icon, iconBg, iconColor, subtitle, loading }: KpiCardProps) {
  if (loading) {
    return (
      <div className="card kpi-card p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="skeleton w-10 h-10 rounded-xl" />
          <div className="skeleton h-5 w-14 rounded-full" />
        </div>
        <div className="skeleton h-3 w-24 mb-3" />
        <div className="skeleton h-8 w-32 mb-2" />
        <div className="skeleton h-3 w-20" />
      </div>
    );
  }

  const isPositive = change > 0;
  const isNeutral  = change === 0;
  const trendClass = isNeutral ? 'trend-neutral' : isPositive ? 'trend-up' : 'trend-down';
  const cardClass  = isNeutral ? 'neutral' : isPositive ? 'positive' : 'negative';
  const arrow      = isNeutral ? '—' : isPositive ? '↑' : '↓';

  return (
    <div className={`card kpi-card ${cardClass} p-5 flex flex-col gap-3 animate-fade-in`}>
      {/* Top row: icon + trend badge */}
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg, color: iconColor ?? 'inherit' }}
        >
          {icon}
        </div>
        <span className={`trend-badge ${trendClass}`}>
          {arrow} {Math.abs(change)}%
        </span>
      </div>

      {/* Metric */}
      <div className="flex flex-col gap-0.5">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          {title}
        </p>
        <p
          className="text-[26px] font-extrabold leading-tight"
          style={{ fontFamily: 'var(--font-space-mono)', color: 'var(--text)', letterSpacing: '-0.02em' }}
        >
          {value}
        </p>
        <p className="text-[11px]" style={{ color: 'var(--muted2)' }}>
          {subtitle ?? 'vs período anterior'}
        </p>
      </div>
    </div>
  );
}
