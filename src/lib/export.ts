import { formatCOPFull } from '@/lib/format';
import type { DashboardData } from '@/types';

export function exportCSV(data: DashboardData | null): void {
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

  const csv  = rows.map((r) => r.map((cell) => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `semafora-metrics-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
