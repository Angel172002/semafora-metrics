/**
 * POST /api/setup
 * Creates NocoDB tables for ad sets, ads, and CRM (stages, users, leads, activities).
 * Run this ONCE before first sync. Safe to run multiple times.
 */

import { NextResponse } from 'next/server';
import { createTable, addColumn, insertRow } from '@/lib/nocodb';
import { AUDIT_LOG_COLUMNS } from '@/lib/audit';
import fs from 'fs';
import path from 'path';

const NOCODB_URL     = process.env.NOCODB_URL     || 'http://localhost:8080';
const NOCODB_API_KEY = process.env.NOCODB_API_KEY || '';

/** Crea un índice en una tabla de NocoDB. Ignora si ya existe. */
async function createIndex(tableId: string, column: string): Promise<void> {
  try {
    const res = await fetch(`${NOCODB_URL}/api/v1/db/meta/tables/${tableId}/indexes`, {
      method: 'POST',
      headers: { 'xc-token': NOCODB_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `idx_${column.replace(/\s/g, '_').toLowerCase()}`, columns: [{ column }] }),
    });
    if (!res.ok) {
      const err = await res.text();
      // Ignorar si ya existe
      if (!err.includes('already') && !err.includes('duplicate')) {
        console.warn(`[setup] Index ${column} en ${tableId}: ${err.slice(0, 100)}`);
      }
    }
  } catch (e) {
    console.warn(`[setup] No se pudo crear índice ${column}:`, e);
  }
}

const NOCODB_PROJECT = process.env.NOCODB_PROJECT_ID || '';
const CAMPAIGN_TABLE_ID = process.env.NOCODB_TABLE_METRICS || '';

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

// ─── CRM: Users table (asesores) ──────────────────────────────────────────────
const CRM_USERS_COLUMNS = [
  { column_name: 'Nombre', uidt: 'SingleLineText' },
  { column_name: 'Email',  uidt: 'Email' },
  { column_name: 'Rol',    uidt: 'SingleLineText' },
  { column_name: 'Activo', uidt: 'Checkbox' },
];

// ─── Tenants table ────────────────────────────────────────────────────────────
const TENANTS_COLUMNS = [
  { column_name: 'Nombre',        uidt: 'SingleLineText' },
  { column_name: 'Industria',     uidt: 'SingleLineText' },
  { column_name: 'Plan',          uidt: 'SingleLineText' },   // trial | starter | agencia | enterprise
  { column_name: 'Status',        uidt: 'SingleLineText' },   // active | suspended | canceled
  { column_name: 'Created_At',    uidt: 'DateTime' },
  { column_name: 'Trial_Ends_At', uidt: 'DateTime' },
];

// ─── Tenant_Config table (key-value store per tenant) ─────────────────────────
const TENANT_CONFIG_COLUMNS = [
  { column_name: 'Tenant_Id',   uidt: 'Number' },
  { column_name: 'Key',         uidt: 'SingleLineText' },
  { column_name: 'Value',       uidt: 'LongText' },
  { column_name: 'Created_At',  uidt: 'DateTime' },
  { column_name: 'Updated_At',  uidt: 'DateTime' },
];

// ─── Subscriptions table ──────────────────────────────────────────────────────
const SUBSCRIPTIONS_COLUMNS = [
  { column_name: 'Tenant_Id',              uidt: 'Number' },
  { column_name: 'Stripe_Customer_Id',     uidt: 'SingleLineText' },
  { column_name: 'Stripe_Subscription_Id', uidt: 'SingleLineText' },
  { column_name: 'Plan',                   uidt: 'SingleLineText' },   // starter | agencia | enterprise
  { column_name: 'Status',                 uidt: 'SingleLineText' },   // active | trialing | past_due | canceled
  { column_name: 'Current_Period_End',     uidt: 'DateTime' },
  { column_name: 'Cancel_At_Period_End',   uidt: 'Checkbox' },
  { column_name: 'Trial_End',              uidt: 'DateTime' },
];

// ─── Auth: Users table (login credentials) ────────────────────────────────────
const AUTH_USERS_COLUMNS = [
  { column_name: 'Email',           uidt: 'Email' },
  { column_name: 'Nombre',          uidt: 'SingleLineText' },
  { column_name: 'Password_Hash',   uidt: 'SingleLineText' },
  { column_name: 'Password_Salt',   uidt: 'SingleLineText' },
  { column_name: 'Rol',             uidt: 'SingleLineText' },   // admin | analista | comercial
  { column_name: 'Activo',          uidt: 'Checkbox' },
  { column_name: 'Tenant_Id',       uidt: 'Number' },
  { column_name: 'Tenant_Nombre',   uidt: 'SingleLineText' },
  { column_name: 'Noco_Project_Id', uidt: 'SingleLineText' },
  { column_name: 'Fecha_Creacion',  uidt: 'DateTime' },
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
  if (!NOCODB_PROJECT) {
    return NextResponse.json(
      { success: false, error: 'NOCODB_PROJECT_ID no configurado en las variables de entorno.' },
      { status: 503 }
    );
  }

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

  // 7a. Create Tenants table (multi-tenant self-service)
  const existingTenantsId = process.env.NOCODB_TABLE_TENANTS;
  if (existingTenantsId) {
    console.log(`[setup] Tenants table already exists: ${existingTenantsId}`);
    results.NOCODB_TABLE_TENANTS = existingTenantsId;
  } else {
    try {
      console.log('[setup] Creating Tenants table...');
      const id = await createTable(NOCODB_PROJECT, 'Tenants', TENANTS_COLUMNS);
      results.NOCODB_TABLE_TENANTS = id;
      console.log(`[setup] ✓ Tenants: ${id}`);
    } catch (e) {
      const msg = String(e);
      errors.push(`Tenants table: ${msg.slice(0, 200)}`);
      console.error('[setup] Error creating Tenants table:', msg);
    }
  }

  // 7c. Create Tenant_Config table (key-value config per tenant)
  const existingConfigId = process.env.NOCODB_TABLE_CONFIG;
  if (existingConfigId) {
    console.log(`[setup] Tenant_Config table already exists: ${existingConfigId}`);
    results.NOCODB_TABLE_CONFIG = existingConfigId;
  } else {
    try {
      console.log('[setup] Creating Tenant_Config table...');
      const id = await createTable(NOCODB_PROJECT, 'Tenant_Config', TENANT_CONFIG_COLUMNS);
      results.NOCODB_TABLE_CONFIG = id;
      console.log(`[setup] ✓ Tenant_Config: ${id}`);
    } catch (e) {
      const msg = String(e);
      errors.push(`Tenant_Config table: ${msg.slice(0, 200)}`);
      console.error('[setup] Error creating Tenant_Config table:', msg);
    }
  }

  // 7b. Create Subscriptions table (Stripe billing state)
  const existingSubsId = process.env.NOCODB_TABLE_SUBSCRIPTIONS;
  if (existingSubsId) {
    console.log(`[setup] Subscriptions table already exists: ${existingSubsId}`);
    results.NOCODB_TABLE_SUBSCRIPTIONS = existingSubsId;
  } else {
    try {
      console.log('[setup] Creating Subscriptions table...');
      const id = await createTable(NOCODB_PROJECT, 'Subscriptions', SUBSCRIPTIONS_COLUMNS);
      results.NOCODB_TABLE_SUBSCRIPTIONS = id;
      console.log(`[setup] ✓ Subscriptions: ${id}`);
    } catch (e) {
      const msg = String(e);
      errors.push(`Subscriptions table: ${msg.slice(0, 200)}`);
      console.error('[setup] Error creating Subscriptions table:', msg);
    }
  }

  // 8. Create Auth Users table (login credentials for multi-tenant auth)
  const existingAuthUsersId = process.env.NOCODB_TABLE_USERS;
  if (existingAuthUsersId) {
    console.log(`[setup] Auth Users table already exists: ${existingAuthUsersId}`);
    results.NOCODB_TABLE_USERS = existingAuthUsersId;
  } else {
    try {
      console.log('[setup] Creating Auth Usuarios table...');
      const id = await createTable(NOCODB_PROJECT, 'Auth Usuarios', AUTH_USERS_COLUMNS);
      results.NOCODB_TABLE_USERS = id;
      console.log(`[setup] ✓ Auth Usuarios: ${id}`);
      console.log('[setup] ℹ️  Crea el primer admin con POST /api/auth/register después de añadir NOCODB_TABLE_USERS al .env.local');
    } catch (e) {
      const msg = String(e);
      errors.push(`Auth Users table: ${msg.slice(0, 200)}`);
      console.error('[setup] Error creating Auth Users table:', msg);
    }
  }

  // 9a. Create Audit_Log table
  const existingAuditId = process.env.NOCODB_TABLE_AUDIT_LOG;
  if (existingAuditId) {
    console.log(`[setup] Audit_Log table already exists: ${existingAuditId}`);
    results.NOCODB_TABLE_AUDIT_LOG = existingAuditId;
  } else {
    try {
      console.log('[setup] Creating Audit_Log table...');
      const id = await createTable(NOCODB_PROJECT, 'Audit_Log', AUDIT_LOG_COLUMNS);
      results.NOCODB_TABLE_AUDIT_LOG = id;
      console.log(`[setup] ✓ Audit_Log: ${id}`);
    } catch (e) {
      const msg = String(e);
      errors.push(`Audit_Log table: ${msg.slice(0, 200)}`);
      console.error('[setup] Error creating Audit_Log table:', msg);
    }
  }

  // 9. Create CRM Activities table
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

  // 9b. Create Alerts_Config table
  const existingAlertsId = process.env.NOCODB_TABLE_ALERTS_CONFIG;
  if (existingAlertsId) {
    console.log(`[setup] Alerts_Config table already exists: ${existingAlertsId}`);
    results.NOCODB_TABLE_ALERTS_CONFIG = existingAlertsId;
  } else {
    try {
      console.log('[setup] Creating Alerts_Config table...');
      const id = await createTable(NOCODB_PROJECT, 'Alerts_Config', [
        { column_name: 'Tenant_Id',  uidt: 'Number' },
        { column_name: 'Type',       uidt: 'SingleLineText' },
        { column_name: 'Enabled',    uidt: 'Checkbox' },
        { column_name: 'Threshold',  uidt: 'Number' },
        { column_name: 'Channel',    uidt: 'SingleLineText' },
        { column_name: 'Label',      uidt: 'SingleLineText' },
      ]);
      results.NOCODB_TABLE_ALERTS_CONFIG = id;
      console.log(`[setup] ✓ Alerts_Config: ${id}`);
    } catch (e) {
      const msg = String(e);
      errors.push(`Alerts_Config table: ${msg.slice(0, 200)}`);
      console.error('[setup] Error creating Alerts_Config table:', msg);
    }
  }

  // 9. Persist new IDs to .env.local
  const toSave = Object.fromEntries(
    Object.entries(results).filter(([, v]) => v && !v.startsWith('existing'))
  );
  if (Object.keys(toSave).length > 0) {
    updateEnvLocal(toSave);
  }

  // 10. Create indices for frequently-queried columns
  console.log('[setup] Creating indices for performance...');
  const campaignTableId  = process.env.NOCODB_TABLE_METRICS || CAMPAIGN_TABLE_ID;
  const adsetTableId     = results.NOCODB_TABLE_ADSETS  || process.env.NOCODB_TABLE_ADSETS  || '';
  const adsTableId       = results.NOCODB_TABLE_ADS     || process.env.NOCODB_TABLE_ADS     || '';
  const leadsTableId     = results.NOCODB_TABLE_CRM_LEADS || process.env.NOCODB_TABLE_CRM_LEADS || '';

  // Tablas de métricas: consultas frecuentes por Plataforma + Fecha
  for (const tableId of [campaignTableId, adsetTableId, adsTableId].filter(Boolean)) {
    await createIndex(tableId, 'Plataforma');
    await createIndex(tableId, 'Fecha');
  }

  // Tabla de leads: consultas por campaña + fecha de importación (deduplicación en sync)
  if (leadsTableId) {
    await createIndex(leadsTableId, 'ID_Campana');
    await createIndex(leadsTableId, 'Dia_Import');
    await createIndex(leadsTableId, 'Estado');
  }

  console.log('[setup] ✓ Índices creados');

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
    message: 'Usa POST /api/setup para inicializar las tablas de NocoDB (ADS + CRM).',
  });
}
