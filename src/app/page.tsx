'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import KpiCard from '@/components/KpiCard';
import DailyPerformanceChart from '@/components/DailyPerformanceChart';
import BudgetChart from '@/components/BudgetChart';
import CampaignComparisonChart from '@/components/CampaignComparisonChart';
import BudgetDistributionChart from '@/components/BudgetDistributionChart';
import CampaignsTable from '@/components/CampaignsTable';
import AdSetsTable from '@/components/AdSetsTable';
import AdsTable from '@/components/AdsTable';
import NetworkBreakdownChart from '@/components/NetworkBreakdownChart';
import SettingsModal from '@/components/SettingsModal';
import { useMetrics } from '@/hooks/useMetrics';
import { useTheme } from '@/hooks/useTheme';
import type { DateRange } from '@/types';
import { formatCOP } from '@/lib/format';
import { LeadIcon, BudgetIcon, ImpressionsIcon, VideoIcon, FollowerIcon, CostIcon, ReachIcon } from '@/components/icons/DashboardIcons';
import { exportCSV } from '@/lib/export';

function formatKpiValue(key: string, val: number): string {
  if (key === 'spent') return formatCOP(val, true);
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toLocaleString('es-CO');
}

// ─── Tab types ────────────────────────────────────────────────────────────────
type DashTab = 'campanas' | 'conjuntos' | 'anuncios';

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [range, setRange] = useState<DateRange>('7d');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DashTab>('campanas');
  const { data, loading, syncing, triggerSync } = useMetrics(range);
  const { isDark, toggle } = useTheme();

  const tabs: { key: DashTab; label: string; count?: number }[] = [
    { key: 'campanas',  label: 'Campañas',             count: data?.campaignsTable.length },
    { key: 'conjuntos', label: 'Conjuntos de Anuncios', count: data?.adSetsTable.length },
    { key: 'anuncios',  label: 'Anuncios',              count: data?.adsTable.length },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <Header
        range={range}
        onRangeChange={setRange}
        onExport={() => exportCSV(data)}
        onSync={triggerSync}
        onSettings={() => setSettingsOpen(true)}
        isSyncing={syncing}
        lastSync={data?.lastSync ?? null}
        isMockData={data?.isMockData ?? true}
        isDark={isDark}
        onToggleTheme={toggle}
      />

      <main className="flex-1 p-4 md:p-6 flex flex-col gap-5 max-w-screen-2xl mx-auto w-full">

        {/* ── KPI Row — Conversiones (SOLO WA/leads) ── */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2 px-0.5">
            Conversiones reales
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              title="Leads / WhatsApp"
              value={formatKpiValue('results', data?.kpis.total_leads ?? 0)}
              change={data?.kpis.leads_change ?? 0}
              icon={<LeadIcon />}
              iconBg="rgba(34,197,94,0.12)"
              loading={loading}
            />
            <KpiCard
              title="Invertido (COP)"
              value={formatKpiValue('spent', data?.kpis.total_spent ?? 0)}
              change={data?.kpis.spent_change ?? 0}
              icon={<BudgetIcon />}
              iconBg="rgba(168,85,247,0.12)"
              loading={loading}
            />
            <KpiCard
              title="Costo por Lead"
              value={formatKpiValue('spent', data?.kpis.total_costo_por_lead ?? 0)}
              change={-(data?.kpis.leads_change ?? 0)}
              icon={<CostIcon />}
              iconBg="rgba(6,182,212,0.12)"
              loading={loading}
            />
            <KpiCard
              title="Alcance"
              value={formatKpiValue('reach', data?.kpis.total_reach ?? 0)}
              change={data?.kpis.reach_change ?? 0}
              icon={<ReachIcon />}
              iconBg="rgba(139,92,246,0.12)"
              loading={loading}
            />
          </div>
        </div>

        {/* ── KPI Row — Otras métricas ── */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2 px-0.5">
            Otras métricas de campaña
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              title="Vistas de Video"
              value={formatKpiValue('results', data?.kpis.total_video_views ?? 0)}
              change={data?.kpis.video_views_change ?? 0}
              icon={<VideoIcon />}
              iconBg="rgba(245,158,11,0.12)"
              loading={loading}
            />
            <KpiCard
              title="Seguidores / Me gusta"
              value={formatKpiValue('results', data?.kpis.total_followers ?? 0)}
              change={data?.kpis.followers_change ?? 0}
              icon={<FollowerIcon />}
              iconBg="rgba(236,72,153,0.12)"
              loading={loading}
            />
            <KpiCard
              title="Impresiones"
              value={formatKpiValue('imp', data?.kpis.total_impressions ?? 0)}
              change={data?.kpis.impressions_change ?? 0}
              icon={<ImpressionsIcon />}
              iconBg="rgba(59,130,246,0.12)"
              loading={loading}
            />
            <KpiCard
              title="Clics"
              value={formatKpiValue('clicks', data?.kpis.total_clicks ?? 0)}
              change={data?.kpis.clicks_change ?? 0}
              icon={<ImpressionsIcon />}
              iconBg="rgba(59,130,246,0.08)"
              loading={loading}
            />
          </div>
        </div>

        {/* ── Charts row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <DailyPerformanceChart data={data?.dailyChart ?? []} loading={loading} />
          <BudgetChart data={data?.dailyChart ?? []} loading={loading} />
        </div>

        {/* ── Campaign chart + Network Breakdown ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <CampaignComparisonChart data={data?.campaignChart ?? []} loading={loading} />
          <NetworkBreakdownChart data={data?.networkBreakdown ?? []} loading={loading} />
        </div>

        {/* ── Budget distribution ── */}
        <BudgetDistributionChart data={data?.platformBudget ?? []} loading={loading} />

        {/* ── 3-Level Tabs ── */}
        <div className="card overflow-hidden">
          {/* Tab header */}
          <div
            className="flex border-b overflow-x-auto"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors"
                style={{
                  color: activeTab === tab.key ? 'var(--text)' : 'var(--muted)',
                  borderBottom: activeTab === tab.key ? '2px solid #1877F2' : '2px solid transparent',
                  background: 'transparent',
                  cursor: 'pointer',
                  outline: 'none',
                  border: 'none',
                  paddingBottom: activeTab === tab.key ? 'calc(0.875rem - 2px)' : '0.875rem',
                }}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                    style={{
                      background: activeTab === tab.key ? 'rgba(24,119,242,0.15)' : 'var(--surface2)',
                      color: activeTab === tab.key ? '#1877F2' : 'var(--muted)',
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab panels — all mounted, just hidden for perf */}
          <div style={{ display: activeTab === 'campanas' ? 'block' : 'none' }}>
            <CampaignsTable data={data?.campaignsTable ?? []} loading={loading} />
          </div>
          <div style={{ display: activeTab === 'conjuntos' ? 'block' : 'none' }}>
            <AdSetsTable data={data?.adSetsTable ?? []} loading={loading} />
          </div>
          <div style={{ display: activeTab === 'anuncios' ? 'block' : 'none' }}>
            <AdsTable data={data?.adsTable ?? []} loading={loading} />
          </div>
        </div>

      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
