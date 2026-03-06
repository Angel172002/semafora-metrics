'use client';

interface KpiCardProps {
  title: string;
  value: string;
  change: number; // % vs previous period
  icon: React.ReactNode;
  iconBg: string;
  loading?: boolean;
}

export default function KpiCard({ title, value, change, icon, iconBg, loading }: KpiCardProps) {
  if (loading) {
    return (
      <div className="card p-5 flex flex-col gap-3">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-8 w-32" />
        <div className="skeleton h-4 w-28" />
      </div>
    );
  }

  const isPositive = change >= 0;
  const changeColor = isPositive ? '#22c55e' : '#ef4444';
  const changePrefix = isPositive ? '↑' : '↓';

  return (
    <div className="card p-5 flex items-start justify-between gap-4 animate-fade-in">
      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
          {title}
        </p>
        <p
          className="text-[28px] font-bold leading-tight"
          style={{ fontFamily: 'var(--font-space-mono)', color: 'var(--text)' }}
        >
          {value}
        </p>
        <p className="text-xs font-medium" style={{ color: changeColor }}>
          {changePrefix} {Math.abs(change)}% vs mes anterior
        </p>
      </div>
      <div
        className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
    </div>
  );
}
