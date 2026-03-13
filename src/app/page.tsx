'use client';

import { useState, useEffect, useMemo } from 'react';
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
import ConversionFunnelChart from '@/components/ConversionFunnelChart';
import WeeklyHeatmap from '@/components/WeeklyHeatmap';
import PeriodComparisonChart from '@/components/PeriodComparisonChart';
import AiInsightsPanel from '@/components/AiInsightsPanel';
import { useMetrics } from '@/hooks/useMetrics';
import { useTheme } from '@/hooks/useTheme';
import type { DateRange, CampaignTableRow } from '@/types';
import type { CampaignBudget } from '@/app/api/meta/budgets/route';
import { formatCOP } from '@/lib/format';
import { LeadIcon, BudgetIcon, ImpressionsIcon, VideoIcon, FollowerIcon, CostIcon, ReachIcon } from '@/components/icons/DashboardIcons';
import { exportCSV, exportPDF } from '@/lib/export';

function formatKpiValue(key: string, val: number): string {
  if (key === 'spent') return formatCOP(val, true);
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000)     return `${(val / 1_000).toFixed(1)}K`;
  return val.toLocaleString('es-CO');
}

type DashTab = 'campanas' | 'conjuntos' | 'anuncios';

export default function DashboardPage() {
  const [range, setRange]         = useState<DateRange>('7d');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DashTab>('campanas');
  const [budgetMap, setBudgetMap] = useState<Map<string, CampaignBudget>>(new Map());
  const { data, loading, syncing, triggerSync } = useMetrics(range);
  const { isDark, toggle } = useTheme();

  // Fetch Meta campaign budgets once on mount
  useEffect(() => {
    fetch('/api/meta/budgets')
      .then((r) => r.json())
      .then((res: { success: boolean; data: CampaignBudget[] }) => {
        if (res.success && res.data?.length) {
          setBudgetMap(new Map(res.data.map((b) => [b.campaign_id, b])));
        }
      })
      .catch(() => { /* budgets are optional — ignore errors */ });
  }, []);

  // Merge budgets into campaigns table
  const campaignsWithBudget = useMemo((): CampaignTableRow[] => {
    if (!data?.campaignsTable) return [];
    if (!budgetMap.size) return data.campaignsTable;
    return data.campaignsTable.map((row) => {
      const b = budgetMap.get(row.id);
      return b ? { ...row, budget: b.budget, budget_type: b.budget_type } : row;
    });
  }, [data?.campaignsTable, budgetMap]);

  const tabs: { key: DashTab; label: string; count?: number }[] = [
    { key: 'campanas',  label: 'Campañas',              count: data?.campaignsTable.length },
    { key: 'conjuntos', label: 'Conjuntos de Anuncios', count: data?.adSetsTable.length },
    { key: 'anuncios',  label: 'Anuncios',              count: data?.adsTable.length },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <Header
        range={range}
        onRangeChange={setRange}
        onExport={() => exportCSV(data)}
        onExportPDF={() => exportPDF(data)}
        onSync={triggerSync}
        onSettings={() => setSettingsOpen(true)}
        isSyncing={syncing}
        lastSync={data?.lastSync ?? null}
        isMockData={data?.isMockData ?? true}
        isDark={isDark}
        onToggleTheme={toggle}
      />

      <main className="flex-1 p-4 md:p-6 flex flex-col gap-6 max-w-screen-2xl mx-auto w-full">

        {/* ══ SECCIÓN 1: KPIs de conversión ══ */}
        <section className="flex flex-col gap-3">
          <p className="section-title">Conversiones reales</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              title="Leads / WhatsApp"
              value={formatKpiValue('results', data?.kpis.total_leads ?? 0)}
              change={data?.kpis.leads_change ?? 0}
              icon={<LeadIcon />}
              iconBg="rgba(34,197,94,0.14)"
              iconColor="#4ade80"
              loading={loading}
            />
            <KpiCard
              title="Invertido"
              value={formatKpiValue('spent', data?.kpis.total_spent ?? 0)}
              change={data?.kpis.spent_change ?? 0}
              icon={<BudgetIcon />}
              iconBg="rgba(168,85,247,0.14)"
              iconColor="#c084fc"
              loading={loading}
            />
            <KpiCard
              title="Costo por Lead"
              value={formatKpiValue('spent', data?.kpis.total_costo_por_lead ?? 0)}
              change={-(data?.kpis.leads_change ?? 0)}
              icon={<CostIcon />}
              iconBg="rgba(20,184,166,0.14)"
              iconColor="#2dd4bf"
              subtitle="Menor es mejor"
              loading={loading}
            />
            <KpiCard
              title="Alcance Total"
              value={formatKpiValue('reach', data?.kpis.total_reach ?? 0)}
              change={data?.kpis.reach_change ?? 0}
              icon={<ReachIcon />}
              iconBg="rgba(99,102,241,0.14)"
              iconColor="#a5b4fc"
              loading={loading}
            />
          </div>
        </section>

        {/* ══ SECCIÓN 2: Otras métricas ══ */}
        <section className="flex flex-col gap-3">
          <p className="section-title">Métricas de alcance e interacción</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              title="Vistas de Video"
              value={formatKpiValue('results', data?.kpis.total_video_views ?? 0)}
              change={data?.kpis.video_views_change ?? 0}
              icon={<VideoIcon />}
              iconBg="rgba(245,158,11,0.14)"
              iconColor="#fbbf24"
              loading={loading}
            />
            <KpiCard
              title="Seguidores / Me gusta"
              value={formatKpiValue('results', data?.kpis.total_followers ?? 0)}
              change={data?.kpis.followers_change ?? 0}
              icon={<FollowerIcon />}
              iconBg="rgba(236,72,153,0.14)"
              iconColor="#f472b6"
              loading={loading}
            />
            <KpiCard
              title="Impresiones"
              value={formatKpiValue('imp', data?.kpis.total_impressions ?? 0)}
              change={data?.kpis.impressions_change ?? 0}
              icon={<ImpressionsIcon />}
              iconBg="rgba(59,130,246,0.14)"
              iconColor="#60a5fa"
              loading={loading}
            />
            <KpiCard
              title="Clics Totales"
              value={formatKpiValue('clicks', data?.kpis.total_clicks ?? 0)}
              change={data?.kpis.clicks_change ?? 0}
              icon={<ImpressionsIcon />}
              iconBg="rgba(59,130,246,0.09)"
              iconColor="#93c5fd"
              loading={loading}
            />
          </div>
        </section>

        {/* ══ SECCIÓN 3: Gráficas de rendimiento ══ */}
        <section className="flex flex-col gap-3">
          <p className="section-title">Rendimiento temporal</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DailyPerformanceChart data={data?.dailyChart ?? []} loading={loading} />
            <BudgetChart data={data?.dailyChart ?? []} loading={loading} />
          </div>
        </section>

        {/* ══ SECCIÓN 4: Comparativas y breakdown ══ */}
        <section className="flex flex-col gap-3">
          <p className="section-title">Comparativa por campaña y canal</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CampaignComparisonChart data={data?.campaignChart ?? []} loading={loading} />
            <NetworkBreakdownChart data={data?.networkBreakdown ?? []} loading={loading} />
          </div>
        </section>

        {/* ══ SECCIÓN 5: Distribución presupuesto ══ */}
        <BudgetDistributionChart data={data?.platformBudget ?? []} loading={loading} />

        {/* ══ SECCIÓN 6: Análisis avanzado (Sprint 3) ══ */}
        <section className="flex flex-col gap-3">
          <p className="section-title">Análisis avanzado</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ConversionFunnelChart data={data?.funnelData ?? []} loading={loading} />
            <PeriodComparisonChart data={data?.periodComparison ?? []} loading={loading} range={range} />
          </div>
          <WeeklyHeatmap data={data?.weeklyHeatmap ?? []} loading={loading} />
        </section>

        {/* ══ SECCIÓN 7: AI Insights ══ */}
        <section className="flex flex-col gap-3">
          <p className="section-title">Inteligencia Artificial</p>
          <AiInsightsPanel
            campaigns={data?.dailyMetrics ?? []}
            range={range}
            crmStats={null}
          />
        </section>

        {/* ══ SECCIÓN 8: Tablas detalladas ══ */}
        <section className="flex flex-col gap-3">
          <p className="section-title">Análisis detallado</p>
          <div className="card overflow-hidden">
            {/* Tab bar */}
            <div className="tab-bar">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className="tab-count"
                      style={{
                        background: activeTab === tab.key ? 'rgba(99,102,241,0.18)' : 'var(--surface2)',
                        color: activeTab === tab.key ? 'var(--accent)' : 'var(--muted)',
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ display: activeTab === 'campanas'  ? 'block' : 'none' }}>
              <CampaignsTable data={campaignsWithBudget} loading={loading} />
            </div>
            <div style={{ display: activeTab === 'conjuntos' ? 'block' : 'none' }}>
              <AdSetsTable data={data?.adSetsTable ?? []} loading={loading} />
            </div>
            <div style={{ display: activeTab === 'anuncios'  ? 'block' : 'none' }}>
              <AdsTable data={data?.adsTable ?? []} loading={loading} />
            </div>
          </div>
        </section>

      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
