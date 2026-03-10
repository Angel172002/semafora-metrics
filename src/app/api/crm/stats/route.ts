import { NextResponse } from 'next/server';
import { listAllRows } from '@/lib/nocodb';
import type { CrmLead, CrmStats } from '@/types';

const PROJECT = process.env.NOCODB_PROJECT_ID      || '';
const TABLE   = process.env.NOCODB_TABLE_CRM_LEADS || '';

export async function GET() {
  if (!TABLE) {
    return NextResponse.json({ success: false, data: null, error: 'CRM Leads table not configured.' }, { status: 503 });
  }

  try {
    const leads = await listAllRows<CrmLead>(PROJECT, TABLE);
    const now   = new Date();

    // Date helpers
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const abiertos  = leads.filter((l) => l.Estado === 'abierto');
    const ganados   = leads.filter((l) => l.Estado === 'ganado');
    const perdidos  = leads.filter((l) => l.Estado === 'perdido');

    const leadsEstaSemana = leads.filter((l) => {
      const d = l.Fecha_Creacion ? new Date(l.Fecha_Creacion) : null;
      return d && d >= startOfWeek;
    }).length;

    const revenueMes = ganados
      .filter((l) => {
        const d = l.Fecha_Cierre ? new Date(l.Fecha_Cierre) : null;
        return d && d >= startOfMonth;
      })
      .reduce((s, l) => s + (Number(l.Valor_Estimado) || 0), 0);

    const pipelineTotal = abiertos.reduce((s, l) => s + (Number(l.Valor_Estimado) || 0), 0);

    const totalCierres = ganados.length + perdidos.length;
    const tasaCierre   = totalCierres > 0 ? Math.round((ganados.length / totalCierres) * 100) : 0;

    const ticketPromedio = ganados.length > 0
      ? Math.round(ganados.reduce((s, l) => s + (Number(l.Valor_Estimado) || 0), 0) / ganados.length)
      : 0;

    const leadsSinActividad = abiertos.filter((l) => {
      const last = l.Fecha_Ultimo_Contacto
        ? new Date(l.Fecha_Ultimo_Contacto)
        : l.Fecha_Creacion
        ? new Date(l.Fecha_Creacion)
        : now;
      return (now.getTime() - last.getTime()) / 3600000 > 48;
    }).length;

    // Average sales cycle (creation → close for won leads)
    const ciclos = ganados
      .filter((l) => l.Fecha_Creacion && l.Fecha_Cierre)
      .map((l) => {
        const ms = new Date(l.Fecha_Cierre).getTime() - new Date(l.Fecha_Creacion).getTime();
        return Math.max(0, Math.floor(ms / 86400000));
      });
    const cicloPromedio = ciclos.length > 0
      ? Math.round(ciclos.reduce((a, b) => a + b, 0) / ciclos.length)
      : 0;

    const stats: CrmStats = {
      leads_total:          leads.length,
      leads_abiertos:       abiertos.length,
      leads_ganados:        ganados.length,
      leads_perdidos:       perdidos.length,
      leads_esta_semana:    leadsEstaSemana,
      pipeline_total:       pipelineTotal,
      revenue_ganado_mes:   revenueMes,
      tasa_cierre:          tasaCierre,
      ticket_promedio:      ticketPromedio,
      leads_sin_actividad:  leadsSinActividad,
      ciclo_promedio_dias:  cicloPromedio,
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, data: null, error: msg }, { status: 500 });
  }
}
