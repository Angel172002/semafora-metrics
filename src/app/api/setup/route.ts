/**
 * POST /api/setup
 * Creates NocoDB tables for ad sets and ads, adds missing columns to campaigns table.
 * Run this ONCE before first sync. Safe to run multiple times.
 */

import { NextResponse } from 'next/server';
import { createTable, addColumn } from '@/lib/nocodb';
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

  // 4. Persist new IDs to .env.local
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
        ? '✅ Setup completado. Tablas listas en NocoDB. Ahora ejecuta un sync completo.'
        : `⚠️ Completado con errores. Revisa los errores y reintenta.`,
    nextStep: 'POST /api/sync {"platforms":["meta"],"since":"2025-08-01","clearFirst":true}',
  });
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST /api/setup to initialize NocoDB tables',
    alreadyConfigured: {
      NOCODB_TABLE_ADSETS: process.env.NOCODB_TABLE_ADSETS || 'NOT SET',
      NOCODB_TABLE_ADS: process.env.NOCODB_TABLE_ADS || 'NOT SET',
    },
  });
}
