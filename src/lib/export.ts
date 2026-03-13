import { formatCOPFull, formatCOP } from '@/lib/format';
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

export function exportPDF(data: DashboardData | null): void {
  if (!data) return;

  const date  = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  const kpis  = data.kpis;
  const camps = data.campaignsTable.slice(0, 10);

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Semafora Metrics — Reporte ${date}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', sans-serif; background: #fff; color: #111; padding: 32px; font-size: 12px; }
  h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; color: #1e1e2e; }
  .subtitle { color: #6b7280; font-size: 13px; margin-bottom: 28px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
    color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 4px; margin-bottom: 12px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .kpi { background: #f8f8fc; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; }
  .kpi-label { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
  .kpi-value { font-size: 20px; font-weight: 700; color: #111; }
  .kpi-change { font-size: 11px; margin-top: 2px; }
  .up { color: #16a34a; } .down { color: #dc2626; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-weight: 600; color: #374151; }
  td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; color: #374151; }
  tr:last-child td { border-bottom: none; }
  .funnel { display: flex; flex-direction: column; gap: 8px; }
  .funnel-step { border-radius: 8px; padding: 10px 16px; display: flex; justify-content: space-between; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 700; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;
    font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <h1>Semafora Metrics</h1>
  <p class="subtitle">Reporte generado el ${date}${data.lastSync ? ` · Última sincronización: ${new Date(data.lastSync).toLocaleString('es-CO')}` : ''}</p>

  <div class="section">
    <p class="section-title">KPIs del Período</p>
    <div class="kpi-grid">
      ${[
        { label: 'Leads / WhatsApp', value: kpis.total_leads.toLocaleString('es-CO'), change: kpis.leads_change },
        { label: 'Invertido',        value: formatCOP(kpis.total_spent, true),        change: kpis.spent_change },
        { label: 'Costo por Lead',   value: formatCOP(kpis.total_costo_por_lead, true), change: -kpis.leads_change },
        { label: 'Impresiones',      value: (kpis.total_impressions >= 1000 ? `${(kpis.total_impressions/1000).toFixed(0)}K` : kpis.total_impressions.toLocaleString('es-CO')), change: kpis.impressions_change },
      ].map((k) => `
        <div class="kpi">
          <div class="kpi-label">${k.label}</div>
          <div class="kpi-value">${k.value}</div>
          <div class="kpi-change ${k.change >= 0 ? 'up' : 'down'}">${k.change >= 0 ? '▲' : '▼'} ${Math.abs(k.change)}% vs período anterior</div>
        </div>
      `).join('')}
    </div>
  </div>

  <div class="section">
    <p class="section-title">Funnel de Conversión</p>
    <div class="funnel">
      ${data.funnelData.map((s, i) => `
        <div class="funnel-step" style="background:${s.color}18; border:1px solid ${s.color}40; width:${Math.max(100 - i * 18, 40)}%; margin: 0 auto;">
          <span style="font-weight:700; color:${s.color}">${s.label}</span>
          <span style="font-weight:700">${s.value >= 1000000 ? `${(s.value/1000000).toFixed(1)}M` : s.value >= 1000 ? `${(s.value/1000).toFixed(0)}K` : s.value.toLocaleString('es-CO')} <span class="badge" style="background:${s.color}22; color:${s.color}">${s.pct}%</span></span>
        </div>
      `).join('')}
    </div>
  </div>

  <div class="section">
    <p class="section-title">Top Campañas</p>
    <table>
      <thead>
        <tr>
          <th>Campaña</th><th>Plataforma</th><th>Resultados</th>
          <th>CPR</th><th>Clics</th><th>Invertido</th>
        </tr>
      </thead>
      <tbody>
        ${camps.map((c) => `
          <tr>
            <td>${c.name}</td>
            <td>${c.platform}</td>
            <td>${c.results}</td>
            <td>${formatCOP(c.cost_per_result, true)}</td>
            <td>${c.clicks.toLocaleString('es-CO')}</td>
            <td>${formatCOP(c.spent, true)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <span>Semafora Metrics · Dashboard de Publicidad Digital</span>
    <span>© ${new Date().getFullYear()}</span>
  </div>

  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
