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
import { formatCOP, formatCOPFull } from '@/lib/format';

// ─── CSV Export ───────────────────────────────────────────────────────────────
function exportCSV(data: ReturnType<typeof useMetrics>['data']) {
  if (!data) return;

  const rows = [
    ['SEMAFORA METRICS — Reporte Completo'],
    ['Exportado:', new Date().toLocaleString('es-CO')],
    [],
    ['=== KPIs GENERALES ==='],
    ['Métrica', 'Valor', 'Cambio vs período anterior'],
    ['Resultados (Conversaciones WA)', data.kpis.total_results, `${data.kpis.results_change}%`],
    ['Invertido (COP)', formatCOPFull(data.kpis.total_spent), `${data.kpis.spent_change}%`],
    ['Impresiones', data.kpis.total_impressions, `${data.kpis.impressions_change}%`],
    ['Clics', data.kpis.total_clicks, `${data.kpis.clicks_change}%`],
    ['Alcance', data.kpis.total_reach, `${data.kpis.reach_change}%`],
    [],
    ['=== CAMPAÑAS ==='],
    ['Campaña','Plataforma','Estado','Impresiones','Clics','Resultados','Tipo','CTR','CPR','CPM','Alcance','Invertido (COP)'],
    ...data.campaignsTable.map((c) => [
      c.name, c.platform, c.status, c.impressions, c.clicks,
      c.results, c.result_type, `${c.ctr}%`,
      formatCOPFull(c.cost_per_result), formatCOPFull(c.cpm),
      c.reach, formatCOPFull(c.spent),
    ]),
    [],
    ['=== CONJUNTOS DE ANUNCIOS ==='],
    ['Conjunto','Campaña','Red','Impresiones','Clics','Resultados','CTR','CPR','Invertido (COP)'],
    ...data.adSetsTable.map((s) => [
      s.adset_name, s.campaign_name, s.network,
      s.impressions, s.clicks, s.results, `${s.ctr}%`,
      formatCOPFull(s.cost_per_result), formatCOPFull(s.spent),
    ]),
    [],
    ['=== ANUNCIOS ==='],
    ['Anuncio','Conjunto','Red','Impresiones','Clics','Resultados','CTR','CPR','Invertido (COP)'],
    ...data.adsTable.map((a) => [
      a.ad_name, a.adset_name, a.network,
      a.impressions, a.clicks, a.results, `${a.ctr}%`,
      formatCOPFull(a.cost_per_result), formatCOPFull(a.spent),
    ]),
    [],
    ['=== DISTRIBUCIÓN POR RED ==='],
    ['Red','Impresiones','Clics','Resultados','Invertido (COP)','%'],
    ...data.networkBreakdown.map((n) => [
      n.label, n.impressions, n.clicks, n.results, formatCOPFull(n.spent), `${n.percentage}%`,
    ]),
  ];

  const csv = rows.map((r) => r.map((cell) => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `semafora-metrics-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const LeadIcon = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const BudgetIcon = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#a855f7" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ImpressionsIcon = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#3b82f6" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const VideoIcon = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const FollowerIcon = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#ec4899" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const CostIcon = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#06b6d4" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const ReachIcon = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#8b5cf6" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

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
