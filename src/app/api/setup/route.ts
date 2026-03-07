/**
 * POST /api/setup
 * Creates NocoDB tables for ad sets, ads, and CRM (stages, users, leads, activities).
 * Run this ONCE before first sync. Safe to run multiple times.
 */

import { NextResponse } from 'next/server';
import { createTable, addColumn, insertRow } from '@/lib/nocodb';
import fs from 'fs';
import path from 'path';

const NOCODB_PROJECT = process.env.NOCODB_PROJECT_ID || 'p0txioylznnyf39';
const CAMPAIGN_TABLE_ID = process.env.NOCODB_TABLE_METRICS || 'mgp8sapw27x0zqv';

// ─── Shared metric columns (appear in all 3 tables) ───────────────────────────
const METRIC_COLUMNS = [
  { column_name: 'Plataforma', uidt: 'SingleLineText' },
  { column_name: 'Fecha', uidt: 'Date' },
  { column_name: 'ID Campana', uidt: 'SingleLineText' },
  { column_name: 'Nombre Campana', uidt: 'SingleLineText' },
  { column_name: 'Impresiones', uidt: 'Number' },
  { column_name: 'Clics', uidt: 'Number' },
  { column_name: 'Resultados', uidt: 'Number' },
  { column_name: 'Tipo Resultado', uidt: 'SingleLineText' },
  { column_name: 'Gastado', uidt: 'Number' },
  { column_name: 'Alcance', uidt: 'Number' },
  { column_name: 'Frecuencia', uidt: 'Number' },
  { column_name: 'CPM', uidt: 'Number' },
  { column_name: 'CPC', uidt: 'Number' },
  { column_name: 'Costo Por Resultado', uidt: 'Number' },
  { column_name: 'Me Gusta', uidt: 'Number' },
  { column_name: 'Comentarios', uidt: 'Number' },
  { column_name: 'Compartidos', uidt: 'Number' },
  { column_name: 'Reproducciones Video', uidt: 'Number' },
];

// ─── Ad Set table columns ─────────────────────────────────────────────────────
const ADSET_TABLE_COLUMNS = [
  { column_name: 'ID Conjunto', uidt: 'SingleLineText' },
  { column_name: 'Nombre Conjunto', uidt: 'SingleLineText' },
  { column_name: 'Red', uidt: 'SingleLineText' },
  ...METRIC_COLUMNS,
];

// ─── Ad table columns ─────────────────────────────────────────────────────────
const AD_TABLE_COLUMNS = [
  { column_name: 'ID Anuncio', uidt: 'SingleLineText' },
  { column_name: 'Nombre Anuncio', uidt: 'SingleLineText' },
  { column_name: 'ID Conjunto', uidt: 'SingleLineText' },
  { column_name: 'Nombre Conjunto', uidt: 'SingleLineText' },
  { column_name: 'Red', uidt: 'SingleLineText' },
  ...METRIC_COLUMNS,
];

// ─── New columns to add to existing campaign table ────────────────────────────
const NEW_CAMPAIGN_COLUMNS = [
  { column_name: 'Resultados', uidt: 'Number' },
  { column_name: 'Tipo Resultado', uidt: 'SingleLineText' },
  { column_name: 'Frecuencia', uidt: 'Number' },
  { column_name: 'CPM', uidt: 'Number' },
  { column_name: 'CPC', uidt: 'Number' },
  { column_name: 'Costo Por Resultado', uidt: 'Number' },
  { column_name: 'Reproducciones Video', uidt: 'Number' },
];

// ─── CRM: Stages table ────────────────────────────────────────────────────────
const CRM_STAGES_COLUMNS = [
  { column_name: 'Nombre',     uidt: 'SingleLineText' },
  { column_name: 'Orden',      uidt: 'Number' },
  { column_name: 'Color',      uidt: 'SingleLineText' },
  { column_name: 'Es_Ganado',  uidt: 'Checkbox' },
  { column_name: 'Es_Perdido', uidt: 'Checkbox' },
  { column_name: 'Activo',     uidt: 'Checkbox' },
];

const CRM_STAGES_SEED = [
  { Nombre: 'Nuevo Lead',  Orden: 1, Color: '#3b82f6', Es_Ganado: false, Es_Perdido: false, Activo: true },
  { Nombre: 'Contactado',  Orden: 2, Color: '#8b5cf6', Es_Ganado: false, Es_Perdido: false, Activo: true },
  { Nombre: 'Calificado',  Orden: 3, Color: '#f59e0b', Es_Ganado: false, Es_Perdido: false, Activo: true },
  { Nombre: 'Propuesta',   Orden: 4, Color: '#ec4899', Es_Ganado: false, Es_Perdido: false, Activo: true },
  { Nombre: 'Negociación', Orden: 5, Color: '#06b6d4', Es_Ganado: false, Es_Perdido: false, Activo: true },
  { Nombre: 'Ganado',      Orden: 6, Color: '#10b981', Es_Ganado: true,  Es_Perdido: false, Activo: true },
  { Nombre: 'Perdido',     Orden: 7, Color: '#ef4444', Es_Ganado: false, Es_Perdido: true,  Activo: true },
];

// ─── CRM: Users table ─────────────────────────────────────────────────────────
const CRM_USERS_COLUMNS = [
  { column_name: 'Nombre', uidt: 'SingleLineText' },
  { column_name: 'Email',  uidt: 'Email' },
  { column_name: 'Rol',    uidt: 'SingleLineText' },
  { column_name: 'Activo', uidt: 'Checkbox' },
];

// ─── CRM: Leads table ─────────────────────────────────────────────────────────
const CRM_LEADS_COLUMNS = [
  { column_name: 'Nombre',               uidt: 'SingleLineText' },
  { column_name: 'Telefono',             uidt: 'PhoneNumber' },
  { column_name: 'Email',                uidt: 'Email' },
  { column_name: 'Empresa',              uidt: 'SingleLineText' },
  { column_name: 'Origen',               uidt: 'SingleLineText' },
  { column_name: 'ID_Campana',           uidt: 'SingleLineText' },
  { column_name: 'Nombre_Campana',       uidt: 'SingleLineText' },
  { column_name: 'Plataforma_Origen',    uidt: 'SingleLineText' },
  { column_name: 'Valor_Estimado',       uidt: 'Number' },
  { column_name: 'Stage_Id',             uidt: 'Number' },
  { column_name: 'Stage_Nombre',         uidt: 'SingleLineText' },
  { column_name: 'Stage_Color',          uidt: 'SingleLineText' },
  { column_name: 'Usuario_Id',           uidt: 'Number' },
  { column_name: 'Usuario_Nombre',       uidt: 'SingleLineText' },
  { column_name: 'Fecha_Creacion',       uidt: 'DateTime' },
  { column_name: 'Fecha_Ultimo_Contacto', uidt: 'DateTime' },
  { column_name: 'Proxima_Accion_Fecha', uidt: 'Date' },
  { column_name: 'Estado',               uidt: 'SingleLineText' },
  { column_name: 'Motivo_Perdida',       uidt: 'LongText' },
  { column_name: 'Notas',                uidt: 'LongText' },
  { column_name: 'Fecha_Cierre',         uidt: 'DateTime' },
];

// ─── CRM: Activities table ────────────────────────────────────────────────────
const CRM_ACTIVITIES_COLUMNS = [
  { column_name: 'Lead_Id',              uidt: 'Number' },
  { column_name: 'Lead_Nombre',          uidt: 'SingleLineText' },
  { column_name: 'Usuario_Id',           uidt: 'Number' },
  { column_name: 'Usuario_Nombre',       uidt: 'SingleLineText' },
  { column_name: 'Tipo',                 uidt: 'SingleLineText' },
  { column_name: 'Resultado',            uidt: 'SingleLineText' },
  { column_name: 'Nota',                 uidt: 'LongText' },
  { column_name: 'Fecha',               uidt: 'DateTime' },
  { column_name: 'Proxima_Accion_Fecha', uidt: 'Date' },
  { column_name: 'Proxima_Accion_Nota',  uidt: 'SingleLineText' },
];

// ─── Update .env.local with new table IDs ────────────────────────────────────
function updateEnvLocal(updates: Record<string, string>): void {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

    for (const [key, value] of Object.entries(updates)) {
      if (content.match(new RegExp(`^${key}=`, 'm'))) {
        content = content.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${value}`);
      } else {
        content += `\n${key}=${value}`;
      }
    }

    fs.writeFileSync(envPath, content.trimEnd() + '\n', 'utf-8');
    console.log('[setup] Updated .env.local:', Object.keys(updates).join(', '));
  } catch (e) {
    console.warn('[setup] Could not write .env.local:', e);
  }
}

// ─── POST /api/setup ──────────────────────────────────────────────────────────
export async function POST() {
  const results: Record<string, string> = {};
  const warnings: string[] = [];
  const errors: string[] = [];

  // 1. Add new columns to existing campaign table
  console.log('[setup] Adding columns to campaign table...');
  for (const col of NEW_CAMPAIGN_COLUMNS) {
    try {
      await addColumn(CAMPAIGN_TABLE_ID, col.column_name, col.uidt);
      console.log(`[setup] ✓ Column ${col.column_name}`);
    } catch (e) {
      const msg = String(e);
      warnings.push(`Campaign column ${col.column_name}: ${msg.slice(0, 100)}`);
      console.warn(`[setup] Column ${col.column_name}:`, msg.slice(0, 100));
    }
  }

  // 2. Create Ad Set table
  const existingAdsetId = process.env.NOCODB_TABLE_ADSETS;
  if (existingAdsetId) {
    console.log(`[setup] Ad Set table already exists: ${existingAdsetId}`);
    results.NOCODB_TABLE_ADSETS = existingAdsetId;
  } else {
    try {
      console.log('[setup] Creating Metricas Conjuntos table...');
      const id = await createTable(NOCODB_PROJECT, 'Metricas Conjuntos', ADSET_TABLE_COLUMNS);
      results.NOCODB_TABLE_ADSETS = id;
      console.log(`[setup] ✓ Metricas Conjuntos: ${id}`);
    } catch (e) {
      const msg = String(e);
      errors.push(`Ad Set table: ${msg.slice(0, 200)}`);
      console.error('[setup] Error creating Ad Set table:', msg);
    }
  }

  // 3. Create Ads table
  const existingAdsId = process.env.NOCODB_TABLE_ADS;
  if (existingAdsId) {
    console.log(`[setup] Ads table already exists: ${existingAdsId}`);
    results.NOCODB_TABLE_ADS = existingAdsId;
  } else {
    try {
      console.log('[setup] Creating Metricas Anuncios table...');
      const id = await createTable(NOCODB_PROJECT, 'Metricas Anuncios', AD_TABLE_COLUMNS);
      results.NOCODB_TABLE_ADS = id;
      console.log(`[setup] ✓ Metricas Anuncios: ${id}`);
    } catch (e) {
      const msg = String(e);
      errors.push(`Ads table: ${msg.slice(0, 200)}`);
      console.error('[setup] Error creating Ads table:', msg);
    }
  }

  // 4. Create CRM Stages table
  const existingStagesId = process.env.NOCODB_TABLE_CRM_STAGES;
  if (existingStagesId) {
    console.log(`[setup] CRM Stages table already exists: ${existingStagesId}`);
    results.NOCODB_TABLE_CRM_STAGES = existingStagesId;
  } else {
    try {
      console.log('[setup] Creating CRM Etapas table...');
      const id = await createTable(NOCODB_PROJECT, 'CRM Etapas', CRM_STAGES_COLUMNS);
      results.NOCODB_TABLE_CRM_STAGES = id;
      console.log(`[setup] ✓ CRM Etapas: ${id}`);
      // Seed default stages
      for (const stage of CRM_STAGES_SEED) {
        await insertRow(NOCODB_PROJECT, id, stage).catch(console.warn);
      }
      console.log('[setup] ✓ 7 etapas del pipeline insertadas');
    } catch (e) {
      const msg = String(e);
      errors.push(`CRM Stages table: ${msg.slice(0, 200)}`);
      console.error('[setup] Error creating CRM Stages table:', msg);
    }
  }

  // 5. Create CRM Users table
  const existingUsersId = process.env.NOCODB_TABLE_CRM_USERS;
  if (existingUsersId) {
    console.log(`[setup] CRM Users table already exists: ${existingUsersId}`);
    results.NOCODB_TABLE_CRM_USERS = existingUsersId;
  } else {
    try {
      console.log('[setup] Creating CRM Usuarios table...');
      const id = await createTable(NOCODB_PROJECT, 'CRM Usuarios', CRM_USERS_COLUMNS);
      results.NOCODB_TABLE_CRM_USERS = id;
      console.log(`[setup] ✓ CRM Usuarios: ${id}`);
      // Seed default admin user
      await insertRow(NOCODB_PROJECT, id, {
        Nombre: 'Administrador', Email: 'admin@semafora.com', Rol: 'admin', Activo: true,
      }).catch(console.warn);
      console.log('[setup] ✓ Usuario admin insertado');
    } catch (e) {
      const msg = String(e);
      errors.push(`CRM Users table: ${msg.slice(0, 200)}`);
      console.error('[setup] Error creating CRM Users table:', msg);
    }
  }

  // 6. Create CRM Leads table
  const existingLeadsId = process.env.NOCODB_TABLE_CRM_LEADS;
  if (existingLeadsId) {
    console.log(`[setup] CRM Leads table already exists: ${existingLeadsId}`);
    results.NOCODB_TABLE_CRM_LEADS = existingLeadsId;
  } else {
    try {
      console.log('[setup] Creating CRM Leads table...');
      const id = await createTable(NOCODB_PROJECT, 'CRM Leads', CRM_LEADS_COLUMNS);
      results.NOCODB_TABLE_CRM_LEADS = id;
      console.log(`[setup] ✓ CRM Leads: ${id}`);
    } catch (e) {
      const msg = String(e);
      errors.push(`CRM Leads table: ${msg.slice(0, 200)}`);
      console.error('[setup] Error creating CRM Leads table:', msg);
    }
  }

  // 7. Create CRM Activities table
  const existingActivitiesId = process.env.NOCODB_TABLE_CRM_ACTIVITIES;
  if (existingActivitiesId) {
    console.log(`[setup] CRM Activities table already exists: ${existingActivitiesId}`);
    results.NOCODB_TABLE_CRM_ACTIVITIES = existingActivitiesId;
  } else {
    try {
      console.log('[setup] Creating CRM Actividades table...');
      const id = await createTable(NOCODB_PROJECT, 'CRM Actividades', CRM_ACTIVITIES_COLUMNS);
      results.NOCODB_TABLE_CRM_ACTIVITIES = id;
      console.log(`[setup] ✓ CRM Actividades: ${id}`);
    } catch (e) {
      const msg = String(e);
      errors.push(`CRM Activities table: ${msg.slice(0, 200)}`);
      console.error('[setup] Error creating CRM Activities table:', msg);
    }
  }

  // 8. Persist new IDs to .env.local
  const toSave = Object.fromEntries(
    Object.entries(results).filter(([, v]) => v && !v.startsWith('existing'))
  );
  if (Object.keys(toSave).length > 0) {
    updateEnvLocal(toSave);
  }

  return NextResponse.json({
    success: errors.length === 0,
    tableIds: results,
    warnings,
    errors,
    message:
      errors.length === 0
        ? '✅ Setup completado. Tablas ADS + CRM listas en NocoDB.'
        : `⚠️ Completado con errores. Revisa los errores y reintenta.`,
    nextStep: 'POST /api/sync {"platforms":["meta"],"days":90}',
  });
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST /api/setup to initialize NocoDB tables (ADS + CRM)',
    configured: {
      NOCODB_TABLE_ADSETS:          process.env.NOCODB_TABLE_ADSETS          || 'NOT SET',
      NOCODB_TABLE_ADS:             process.env.NOCODB_TABLE_ADS             || 'NOT SET',
      NOCODB_TABLE_CRM_STAGES:      process.env.NOCODB_TABLE_CRM_STAGES      || 'NOT SET',
      NOCODB_TABLE_CRM_USERS:       process.env.NOCODB_TABLE_CRM_USERS       || 'NOT SET',
      NOCODB_TABLE_CRM_LEADS:       process.env.NOCODB_TABLE_CRM_LEADS       || 'NOT SET',
      NOCODB_TABLE_CRM_ACTIVITIES:  process.env.NOCODB_TABLE_CRM_ACTIVITIES  || 'NOT SET',
    },
  });
}
