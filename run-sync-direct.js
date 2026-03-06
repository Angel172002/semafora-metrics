/**
 * run-sync-direct.js — Sync Meta → NocoDB sin necesitar el servidor Next.js
 * Ejecutar: node run-sync-direct.js
 */
// Load .env.local manually (dotenv not installed)
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const val = trimmed.slice(eq + 1).trim();
  if (!process.env[key]) process.env[key] = val;
}

const NOCODB_URL     = process.env.NOCODB_URL;
const NOCODB_API_KEY = process.env.NOCODB_API_KEY;
const NOCODB_PROJECT = process.env.NOCODB_PROJECT_ID || 'p0txioylznnyf39';
const TABLE_CAMPAIGNS = process.env.NOCODB_TABLE_METRICS || 'mgp8sapw27x0zqv';
const TABLE_ADSETS   = process.env.NOCODB_TABLE_ADSETS  || '';
const TABLE_ADS      = process.env.NOCODB_TABLE_ADS     || '';

const META_TOKEN     = process.env.META_ACCESS_TOKEN;
const META_ACCOUNTS  = (process.env.META_AD_ACCOUNT_IDS || process.env.META_AD_ACCOUNT_ID || '').split(',').map(s => s.trim()).filter(Boolean);
const API_VERSION    = process.env.META_API_VERSION || 'v19.0';

// Days to sync (last 90 days)
const DAYS = 90;
const until = new Date().toISOString().split('T')[0];
const sinceDate = new Date();
sinceDate.setDate(sinceDate.getDate() - DAYS);
const since = sinceDate.toISOString().split('T')[0];

console.log(`\n=== Sync Meta → NocoDB ===`);
console.log(`Rango: ${since} → ${until}`);
console.log(`Cuentas: ${META_ACCOUNTS.join(', ')}`);
console.log(`NocoDB: ${NOCODB_URL}`);
console.log('');

// ─── NocoDB helpers ──────────────────────────────────────────────────────────

async function nocoFetch(path, options = {}) {
  const url = `${NOCODB_URL}/api/v1/db/data/noco/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'xc-token': NOCODB_API_KEY,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NocoDB ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function clearRowsWhere(tableId, field, value) {
  let deleted = 0;
  let hasMore = true;
  while (hasMore) {
    const qs = new URLSearchParams({ limit: '100', fields: 'Id', where: `(${field},eq,${value})` });
    const res = await nocoFetch(`${NOCODB_PROJECT}/${tableId}?${qs}`);
    const rows = res.list || [];
    if (!rows.length) { hasMore = false; break; }
    await Promise.all(rows.map(row =>
      nocoFetch(`${NOCODB_PROJECT}/${tableId}/${row.Id}`, { method: 'DELETE' }).catch(() => null)
    ));
    deleted += rows.length;
    if (rows.length < 100) hasMore = false;
  }
  console.log(`  [nocodb] Eliminados ${deleted} rows (${field}=${value}) de ${tableId}`);
  return deleted;
}

async function bulkInsert(tableId, rows) {
  const BATCH = 10;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await Promise.all(batch.map(row =>
      nocoFetch(`${NOCODB_PROJECT}/${tableId}`, { method: 'POST', body: JSON.stringify(row) })
    ));
    inserted += batch.length;
    if (inserted % 50 === 0 || inserted === rows.length) {
      process.stdout.write(`\r  [nocodb] Insertando... ${inserted}/${rows.length}`);
    }
  }
  console.log('');
  return inserted;
}

// ─── Meta API helpers ────────────────────────────────────────────────────────

const PRIMARY_RESULT_TYPES = [
  'onsite_conversion.messaging_conversation_started_7d',
  'onsite_conversion.messaging_conversation_started_30d',
  'onsite_conversion.lead_grouped',
  'lead',
  'complete_registration',
  'like',
  'follow',
  'onsite_conversion.subscribe',
  'video_view',
  'video_thruplay_watched_actions',
  'video_p100_watched_actions',
  'video_play_actions',
  'post_engagement',
  'link_click',
  'omni_landing_page_view',
  'landing_page_view',
  'reach',
];

function getAction(actions, ...types) {
  if (!actions) return 0;
  let total = 0;
  for (const type of types) {
    const found = actions.find(a => a.action_type === type);
    if (found) total += parseInt(found.value) || 0;
  }
  return total;
}

function getPrimaryResult(actions, videoActions) {
  const all = [...(actions || []), ...(videoActions || [])];
  if (!all.length) return { count: 0, type: '' };
  for (const type of PRIMARY_RESULT_TYPES) {
    const found = all.find(a => a.action_type === type);
    if (found && parseInt(found.value) > 0) return { count: parseInt(found.value), type };
  }
  return { count: 0, type: '' };
}

function getVideoPlays(row) {
  return getAction(row.video_thruplay_watched_actions, 'video_thruplay_watched_actions') ||
         getAction(row.actions, 'video_thruplay_watched_actions');
}

async function fetchAllPages(url) {
  const all = [];
  let nextUrl = url;
  let page = 0;
  while (nextUrl && page < 60) {
    page++;
    const fetchUrl = nextUrl.includes('access_token') ? nextUrl : `${nextUrl}&access_token=${META_TOKEN}`;
    const res = await fetch(fetchUrl);
    if (!res.ok) { const t = await res.text(); throw new Error(`Meta API ${res.status}: ${t.slice(0, 300)}`); }
    const json = await res.json();
    if (json.error) throw new Error(`Meta error ${json.error.code}: ${json.error.message}`);
    if (json.data?.length) {
      all.push(...json.data);
      process.stdout.write(`\r    Página ${page}: ${all.length} filas totales`);
    }
    nextUrl = json.paging?.next || null;
    if (nextUrl) await new Promise(r => setTimeout(r, 300));
  }
  console.log('');
  return all;
}

async function fetchCampaigns(accountId) {
  const p = new URLSearchParams({
    access_token: META_TOKEN, level: 'campaign',
    fields: 'campaign_id,campaign_name,impressions,clicks,spend,reach,frequency,cpm,cpc,actions,video_thruplay_watched_actions',
    time_range: JSON.stringify({ since, until }), time_increment: '1', limit: '500',
  });
  console.log(`  Campañas para ${accountId}...`);
  return fetchAllPages(`https://graph.facebook.com/${API_VERSION}/${accountId}/insights?${p}`);
}

async function fetchAdSets(accountId) {
  const p = new URLSearchParams({
    access_token: META_TOKEN, level: 'adset',
    fields: 'adset_id,adset_name,campaign_id,campaign_name,impressions,clicks,spend,reach,frequency,cpm,cpc,actions,video_thruplay_watched_actions',
    breakdowns: 'publisher_platform',
    time_range: JSON.stringify({ since, until }), time_increment: '1', limit: '500',
  });
  console.log(`  Conjuntos para ${accountId}...`);
  return fetchAllPages(`https://graph.facebook.com/${API_VERSION}/${accountId}/insights?${p}`);
}

async function fetchAds(accountId) {
  const p = new URLSearchParams({
    access_token: META_TOKEN, level: 'ad',
    fields: 'ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,impressions,clicks,spend,reach,frequency,cpm,cpc,actions,video_thruplay_watched_actions',
    breakdowns: 'publisher_platform',
    time_range: JSON.stringify({ since, until }), time_increment: '1', limit: '500',
  });
  console.log(`  Anuncios para ${accountId}...`);
  return fetchAllPages(`https://graph.facebook.com/${API_VERSION}/${accountId}/insights?${p}`);
}

function mapCampaignRow(row) {
  const { count: results, type: result_type } = getPrimaryResult(row.actions, row.video_thruplay_watched_actions);
  const spent = parseFloat(row.spend) || 0;
  return {
    'ID Campana':           row.campaign_id,
    'Nombre Campana':       row.campaign_name,
    'Plataforma':           'meta',
    'Fecha':                row.date_start,
    'Impresiones':          parseInt(row.impressions) || 0,
    'Clics':                parseInt(row.clicks) || 0,
    'Conversiones':         results,
    'Resultados':           results,
    'Tipo Resultado':       result_type,
    'Me Gusta':             getAction(row.actions, 'post_reaction', 'like'),
    'Compartidos':          getAction(row.actions, 'post'),
    'Comentarios':          getAction(row.actions, 'comment'),
    'Reproducciones Video': getVideoPlays(row),
    'Gastado':              spent,
    'Alcance':              parseInt(row.reach) || 0,
    'Frecuencia':           parseFloat(row.frequency || '0') || 0,
    'CPM':                  parseFloat(row.cpm || '0') || 0,
    'CPC':                  parseFloat(row.cpc || '0') || 0,
    'Costo Por Resultado':  results > 0 ? parseFloat((spent / results).toFixed(2)) : 0,
  };
}

function mapAdSetRow(row) {
  const { count: results, type: result_type } = getPrimaryResult(row.actions, row.video_thruplay_watched_actions);
  const spent = parseFloat(row.spend) || 0;
  return {
    'ID Conjunto':          row.adset_id,
    'Nombre Conjunto':      row.adset_name,
    'Red':                  row.publisher_platform || 'all',
    'Plataforma':           'meta',
    'Fecha':                row.date_start,
    'ID Campana':           row.campaign_id,
    'Nombre Campana':       row.campaign_name,
    'Impresiones':          parseInt(row.impressions) || 0,
    'Clics':                parseInt(row.clicks) || 0,
    'Resultados':           results,
    'Tipo Resultado':       result_type,
    'Gastado':              spent,
    'Alcance':              parseInt(row.reach) || 0,
    'Frecuencia':           parseFloat(row.frequency || '0') || 0,
    'CPM':                  parseFloat(row.cpm || '0') || 0,
    'CPC':                  parseFloat(row.cpc || '0') || 0,
    'Costo Por Resultado':  results > 0 ? parseFloat((spent / results).toFixed(2)) : 0,
    'Me Gusta':             getAction(row.actions, 'post_reaction', 'like'),
    'Comentarios':          getAction(row.actions, 'comment'),
    'Compartidos':          getAction(row.actions, 'post'),
    'Reproducciones Video': getVideoPlays(row),
  };
}

function mapAdRow(row) {
  const { count: results, type: result_type } = getPrimaryResult(row.actions, row.video_thruplay_watched_actions);
  const spent = parseFloat(row.spend) || 0;
  return {
    'ID Anuncio':           row.ad_id,
    'Nombre Anuncio':       row.ad_name,
    'ID Conjunto':          row.adset_id,
    'Nombre Conjunto':      row.adset_name,
    'Red':                  row.publisher_platform || 'all',
    'Plataforma':           'meta',
    'Fecha':                row.date_start,
    'ID Campana':           row.campaign_id,
    'Nombre Campana':       row.campaign_name,
    'Impresiones':          parseInt(row.impressions) || 0,
    'Clics':                parseInt(row.clicks) || 0,
    'Resultados':           results,
    'Tipo Resultado':       result_type,
    'Gastado':              spent,
    'Alcance':              parseInt(row.reach) || 0,
    'Frecuencia':           parseFloat(row.frequency || '0') || 0,
    'CPM':                  parseFloat(row.cpm || '0') || 0,
    'CPC':                  parseFloat(row.cpc || '0') || 0,
    'Costo Por Resultado':  results > 0 ? parseFloat((spent / results).toFixed(2)) : 0,
    'Me Gusta':             getAction(row.actions, 'post_reaction', 'like'),
    'Comentarios':          getAction(row.actions, 'comment'),
    'Compartidos':          getAction(row.actions, 'post'),
    'Reproducciones Video': getVideoPlays(row),
  };
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Limpiar datos Meta existentes en NocoDB
  console.log('── Paso 1: Limpiando datos Meta en NocoDB ──');
  await clearRowsWhere(TABLE_CAMPAIGNS, 'Plataforma', 'meta');
  if (TABLE_ADSETS) await clearRowsWhere(TABLE_ADSETS, 'Plataforma', 'meta');
  if (TABLE_ADS)    await clearRowsWhere(TABLE_ADS,    'Plataforma', 'meta');

  let totalCampaigns = 0, totalAdSets = 0, totalAds = 0;

  // 2. Fetch y guardar por cada cuenta
  for (const accountId of META_ACCOUNTS) {
    console.log(`\n── Cuenta: ${accountId} ──`);

    const [campaigns, adSets, ads] = await Promise.all([
      fetchCampaigns(accountId).catch(e => { console.error('  Error campaigns:', e.message); return []; }),
      fetchAdSets(accountId).catch(e => { console.error('  Error adsets:', e.message); return []; }),
      fetchAds(accountId).catch(e => { console.error('  Error ads:', e.message); return []; }),
    ]);

    console.log(`  → ${campaigns.length} campañas, ${adSets.length} conjuntos, ${ads.length} anuncios`);

    // Guardar campañas
    if (campaigns.length > 0) {
      console.log(`  Guardando ${campaigns.length} campañas...`);
      await bulkInsert(TABLE_CAMPAIGNS, campaigns.map(mapCampaignRow));
      totalCampaigns += campaigns.length;
    }

    // Guardar conjuntos
    if (adSets.length > 0 && TABLE_ADSETS) {
      console.log(`  Guardando ${adSets.length} conjuntos...`);
      await bulkInsert(TABLE_ADSETS, adSets.map(mapAdSetRow));
      totalAdSets += adSets.length;
    }

    // Guardar anuncios
    if (ads.length > 0 && TABLE_ADS) {
      console.log(`  Guardando ${ads.length} anuncios...`);
      await bulkInsert(TABLE_ADS, ads.map(mapAdRow));
      totalAds += ads.length;
    }
  }

  console.log(`\n✅ Sync completado:`);
  console.log(`   Campañas:  ${totalCampaigns}`);
  console.log(`   Conjuntos: ${totalAdSets}`);
  console.log(`   Anuncios:  ${totalAds}`);
  console.log(`   Total:     ${totalCampaigns + totalAdSets + totalAds} registros\n`);
}

main().catch(err => {
  console.error('\n❌ Error fatal:', err.message);
  process.exit(1);
});
