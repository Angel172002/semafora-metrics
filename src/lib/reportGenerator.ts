/**
 * reportGenerator.ts — Genera reportes ejecutivos en HTML/PDF
 *
 * Construye el HTML del reporte semanal/mensual. El PDF se genera en el
 * cliente o servidor con la API de Print del navegador (window.print) o con
 * puppeteer/wkhtmltopdf en el servidor.
 *
 * Para envío por email usamos el HTML directamente como cuerpo (email HTML).
 * El destinatario puede imprimir/guardar como PDF desde su cliente de correo.
 */

import type { DashboardData, CrmLead } from '@/types';

export type ReportPeriod = 'semanal' | 'mensual';

export interface ReportConfig {
  tenantNombre:  string;
  period:        ReportPeriod;
  dateFrom:      string;   // YYYY-MM-DD
  dateTo:        string;   // YYYY-MM-DD
  includeSections: {
    kpis:        boolean;
    campaigns:   boolean;
    crm:         boolean;
    topCampaigns: boolean;
  };
}

export interface ReportData {
  config:    ReportConfig;
  dashboard: DashboardData;
  leads:     CrmLead[];
}

// ─── Helpers de formato ────────────────────────────────────────────────────────

function fmtCOP(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toLocaleString('es-CO')}`;
}

function fmtNum(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString('es-CO');
}

function trend(v: number): string {
  if (v > 0) return `<span style="color:#10b981">▲ ${v.toFixed(1)}%</span>`;
  if (v < 0) return `<span style="color:#ef4444">▼ ${Math.abs(v).toFixed(1)}%</span>`;
  return `<span style="color:#71717a">— 0%</span>`;
}

function cprColor(cpr: number): string {
  if (cpr <= 15000) return '#10b981';
  if (cpr <= 30000) return '#fbbf24';
  return '#ef4444';
}

// ─── Secciones del reporte ─────────────────────────────────────────────────────

function sectionKpis(data: DashboardData): string {
  const k = data.kpis;
  return `
  <section style="margin-bottom:32px">
    <h2 style="font-size:16px;font-weight:700;color:#e20613;margin:0 0 16px;padding-bottom:8px;border-bottom:2px solid #e20613">
      📊 Resumen de Métricas
    </h2>
    <table style="width:100%;border-collapse:collapse">
      <tr>
        ${kpiCell('Inversión', fmtCOP(k.total_spent), trend(k.spent_change), '#3b82f6')}
        ${kpiCell('Resultados', fmtNum(k.total_results), trend(k.results_change), '#10b981')}
        ${kpiCell('Leads', fmtNum(k.total_leads), trend(k.leads_change), '#f59e0b')}
        ${kpiCell('CPL', fmtCOP(k.total_costo_por_lead), '', '#8b5cf6')}
      </tr>
      <tr>
        ${kpiCell('Impresiones', fmtNum(k.total_impressions), trend(k.impressions_change), '#06b6d4')}
        ${kpiCell('Clics', fmtNum(k.total_clicks), trend(k.clicks_change), '#ec4899')}
        ${kpiCell('Alcance', fmtNum(k.total_reach), trend(k.reach_change), '#14b8a6')}
        ${kpiCell('CTR', k.total_clicks && k.total_impressions ? `${((k.total_clicks / k.total_impressions) * 100).toFixed(2)}%` : '—', '', '#a78bfa')}
      </tr>
    </table>
  </section>`;
}

function kpiCell(label: string, value: string, trendHtml: string, color: string): string {
  return `
  <td style="width:25%;padding:12px;background:#f8f8f8;border-radius:8px;text-align:center;vertical-align:top">
    <div style="font-size:11px;color:#71717a;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">${label}</div>
    <div style="font-size:22px;font-weight:700;color:${color};line-height:1.2">${value}</div>
    ${trendHtml ? `<div style="font-size:11px;margin-top:4px">${trendHtml}</div>` : ''}
  </td>`;
}

function sectionTopCampaigns(data: DashboardData): string {
  const top = data.campaignsTable.slice(0, 5);
  if (!top.length) return '';

  const rows = top.map(c => `
    <tr style="border-bottom:1px solid #e5e7eb">
      <td style="padding:8px 10px;font-size:13px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.name}</td>
      <td style="padding:8px 10px;text-align:center;font-size:12px">
        <span style="background:${c.platform === 'meta' ? '#e8f0fe' : c.platform === 'google' ? '#fef9e7' : '#ffeef2'};
          color:${c.platform === 'meta' ? '#1877F2' : c.platform === 'google' ? '#4285F4' : '#FF0050'};
          padding:2px 8px;border-radius:12px;font-weight:600;font-size:11px">
          ${c.platform.toUpperCase()}
        </span>
      </td>
      <td style="padding:8px 10px;text-align:right;font-size:13px">${fmtCOP(c.spent)}</td>
      <td style="padding:8px 10px;text-align:right;font-size:13px">${fmtNum(c.results)}</td>
      <td style="padding:8px 10px;text-align:right;font-size:13px;font-weight:600;color:${cprColor(c.cost_per_result)}">
        ${c.cost_per_result > 0 ? fmtCOP(c.cost_per_result) : '—'}
      </td>
    </tr>`).join('');

  return `
  <section style="margin-bottom:32px">
    <h2 style="font-size:16px;font-weight:700;color:#e20613;margin:0 0 16px;padding-bottom:8px;border-bottom:2px solid #e20613">
      🏆 Top 5 Campañas
    </h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#f3f4f6">
          <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Campaña</th>
          <th style="padding:8px 10px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase">Red</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase">Inversión</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase">Resultados</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase">CPR</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-size:10px;color:#9ca3af;margin-top:8px">
      🟢 CPR &lt;$15K · 🟡 $15K–$30K · 🔴 &gt;$30K
    </p>
  </section>`;
}

function sectionCrm(leads: CrmLead[]): string {
  const total   = leads.length;
  const ganados = leads.filter(l => l.Estado === 'ganado').length;
  const perdidos = leads.filter(l => l.Estado === 'perdido').length;
  const abiertos = leads.filter(l => l.Estado === 'abierto').length;
  const revenue  = leads.filter(l => l.Estado === 'ganado').reduce((s, l) => s + (l.Precio_Plan ?? 0), 0);
  const tasaCierre = total > 0 ? ((ganados / total) * 100).toFixed(1) : '0';

  return `
  <section style="margin-bottom:32px">
    <h2 style="font-size:16px;font-weight:700;color:#e20613;margin:0 0 16px;padding-bottom:8px;border-bottom:2px solid #e20613">
      👥 CRM — Resumen del Pipeline
    </h2>
    <table style="width:100%;border-collapse:collapse">
      <tr>
        ${kpiCell('Total Leads', fmtNum(total), '', '#3b82f6')}
        ${kpiCell('Ganados', fmtNum(ganados), '', '#10b981')}
        ${kpiCell('Perdidos', fmtNum(perdidos), '', '#ef4444')}
        ${kpiCell('En pipeline', fmtNum(abiertos), '', '#f59e0b')}
      </tr>
      <tr>
        ${kpiCell('Tasa de cierre', `${tasaCierre}%`, '', '#8b5cf6')}
        ${kpiCell('Revenue cerrado', fmtCOP(revenue), '', '#10b981')}
        ${kpiCell('', '', '', 'transparent')}
        ${kpiCell('', '', '', 'transparent')}
      </tr>
    </table>
  </section>`;
}

// ─── Plantilla HTML completa ───────────────────────────────────────────────────

export function buildReportHtml(reportData: ReportData): string {
  const { config, dashboard, leads } = reportData;
  const { tenantNombre, period, dateFrom, dateTo, includeSections } = config;

  const fmtRange = `${new Date(dateFrom).toLocaleDateString('es-CO', { day:'2-digit', month:'short' })} – ${new Date(dateTo).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })}`;

  const sections = [
    includeSections.kpis && sectionKpis(dashboard),
    includeSections.topCampaigns && sectionTopCampaigns(dashboard),
    includeSections.crm && sectionCrm(leads),
  ].filter(Boolean).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Reporte ${period} — ${tenantNombre}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #111; margin: 0; padding: 0; background: #fff; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    table td { vertical-align: top; }
  </style>
</head>
<body>
  <div style="max-width:800px;margin:0 auto;padding:32px 24px">

    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #e20613">
      <div>
        <div style="font-size:26px;font-weight:900;letter-spacing:0.1em;color:#e20613">SEMÁFORA</div>
        <div style="font-size:11px;color:#71717a;letter-spacing:0.12em;text-transform:uppercase">METRICS</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:18px;font-weight:700;color:#111">${tenantNombre}</div>
        <div style="font-size:13px;color:#71717a;margin-top:2px">Reporte ${period} · ${fmtRange}</div>
      </div>
    </div>

    <!-- Sections -->
    ${sections}

    <!-- Footer -->
    <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#9ca3af">
      Reporte generado automáticamente por Semáfora Metrics · ${new Date().toLocaleString('es-CO')}
    </div>
  </div>
</body>
</html>`;
}
