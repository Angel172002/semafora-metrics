import { NextRequest, NextResponse } from 'next/server';
import { fetchAllMetaAccounts, isMetaConfigured } from '@/lib/integrations/meta';
import { fetchAllGoogleAccounts, isGoogleConfigured } from '@/lib/integrations/google';
import { fetchTikTokMetrics, isTikTokConfigured } from '@/lib/integrations/tiktok';
import { bulkInsert, insertRow, clearRowsWhere } from '@/lib/nocodb';
import type { DailyMetric, AdSetMetric, AdMetric, SyncResponse, Platform } from '@/types';

const NOCODB_PROJECT    = process.env.NOCODB_PROJECT_ID     || 'p0txioylznnyf39';
const TABLE_CAMPAIGNS   = process.env.NOCODB_TABLE_METRICS  || 'mgp8sapw27x0zqv';
const TABLE_ADSETS      = process.env.NOCODB_TABLE_ADSETS   || '';
const TABLE_ADS         = process.env.NOCODB_TABLE_ADS      || '';
const TABLE_SYNC_LOG    = process.env.NOCODB_TABLE_SYNC_LOG || 'ma1q0gfm8y5vuvy';

// ─── Row mappers ──────────────────────────────────────────────────────────────

function toCampaignRow(m: DailyMetric) {
  return {
    'ID Campana':           m.campaign_id,
    'Nombre Campana':       m.campaign_name,
    'Plataforma':           m.platform,
    'Fecha':                m.date,
    'Impresiones':          m.impressions,
    'Clics':                m.clicks,
    'Conversiones':         m.results,           // backward compat field
    'Resultados':           m.results,
    'Tipo Resultado':       m.result_type,
    'Me Gusta':             m.likes,
    'Compartidos':          m.shares,
    'Comentarios':          m.comments,
    'Reproducciones Video': m.video_plays,
    'Gastado':              m.spent,
    'Alcance':              m.reach,
    'Frecuencia':           m.frequency,
    'CPM':                  m.cpm,
    'CPC':                  m.cpc,
    'Costo Por Resultado':  m.cost_per_result,
  };
}

function toAdSetRow(m: AdSetMetric) {
  return {
    'ID Conjunto':          m.adset_id,
    'Nombre Conjunto':      m.adset_name,
    'Red':                  m.network,
    'Plataforma':           m.platform,
    'Fecha':                m.date,
    'ID Campana':           m.campaign_id,
    'Nombre Campana':       m.campaign_name,
    'Impresiones':          m.impressions,
    'Clics':                m.clicks,
    'Resultados':           m.results,
    'Tipo Resultado':       m.result_type,
    'Gastado':              m.spent,
    'Alcance':              m.reach,
    'Frecuencia':           m.frequency,
    'CPM':                  m.cpm,
    'CPC':                  m.cpc,
    'Costo Por Resultado':  m.cost_per_result,
    'Me Gusta':             m.likes,
    'Comentarios':          m.comments,
    'Compartidos':          m.shares,
    'Reproducciones Video': m.video_plays,
  };
}

function toAdRow(m: AdMetric) {
  return {
    'ID Anuncio':           m.ad_id,
    'Nombre Anuncio':       m.ad_name,
    'ID Conjunto':          m.adset_id,
    'Nombre Conjunto':      m.adset_name,
    'Red':                  m.network,
    'Plataforma':           m.platform,
    'Fecha':                m.date,
    'ID Campana':           m.campaign_id,
    'Nombre Campana':       m.campaign_name,
    'Impresiones':          m.impressions,
    'Clics':                m.clicks,
    'Resultados':           m.results,
    'Tipo Resultado':       m.result_type,
    'Gastado':              m.spent,
    'Alcance':              m.reach,
    'Frecuencia':           m.frequency,
    'CPM':                  m.cpm,
    'CPC':                  m.cpc,
    'Costo Por Resultado':  m.cost_per_result,
    'Me Gusta':             m.likes,
    'Comentarios':          m.comments,
    'Compartidos':          m.shares,
    'Reproducciones Video': m.video_plays,
  };
}

// ─── Sync log ─────────────────────────────────────────────────────────────────
async function logSync(
  platform: Platform | 'all',
  status: 'exitoso' | 'error',
  records: number,
  errorMsg?: string
) {
  try {
    await insertRow(NOCODB_PROJECT, TABLE_SYNC_LOG, {
      fecha_sync:              new Date().toISOString(),
      plataforma:              platform,
      estado:                  status,
      registros_sincronizados: records,
      mensaje_error:           errorMsg || '',
    });
  } catch (e) {
    console.warn('[sync] No se pudo escribir sync log:', e);
  }
}

// ─── Date range ───────────────────────────────────────────────────────────────
function getDateRange(body: {
  days?: number;
  since?: string;
  until?: string;
}): { since: string; until: string } {
  const until = body.until || new Date().toISOString().split('T')[0];
  if (body.since) return { since: body.since, until };
  const days = body.days || 7;
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  return { since: sinceDate.toISOString().split('T')[0], until };
}

// ─── POST /api/sync ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const platforms: (Platform | 'all')[] = body.platforms || ['meta', 'google', 'tiktok'];
  const dateRange = getDateRange(body);
  const clearFirst: boolean = body.clearFirst === true;

  console.log(`[sync] ══ Starting sync: ${dateRange.since} → ${dateRange.until} ══`);
  console.log(`[sync] Platforms: ${platforms.join(', ')} | clearFirst: ${clearFirst}`);

  let totalRecords = 0;
  const syncedPlatforms: string[] = [];
  const errors: string[] = [];

  for (const platform of platforms) {
    try {
      if (platform === 'meta' && isMetaConfigured()) {
        // Always clear Meta rows before inserting — prevents data duplication on re-syncs
        console.log('[sync] Clearing existing Meta data...');
        await clearRowsWhere(NOCODB_PROJECT, TABLE_CAMPAIGNS, 'Plataforma', 'meta').catch(console.warn);
        if (TABLE_ADSETS) await clearRowsWhere(NOCODB_PROJECT, TABLE_ADSETS, 'Plataforma', 'meta').catch(console.warn);
        if (TABLE_ADS)    await clearRowsWhere(NOCODB_PROJECT, TABLE_ADS,    'Plataforma', 'meta').catch(console.warn);

        // Fetch all 3 levels
        const { campaigns, adSets, ads } = await fetchAllMetaAccounts(dateRange);

        // Save campaigns
        if (campaigns.length > 0) {
          console.log(`[sync] Saving ${campaigns.length} campaign rows...`);
          await bulkInsert(NOCODB_PROJECT, TABLE_CAMPAIGNS, campaigns.map(toCampaignRow));
          totalRecords += campaigns.length;
        }

        // Save ad sets
        if (adSets.length > 0 && TABLE_ADSETS) {
          console.log(`[sync] Saving ${adSets.length} ad set rows...`);
          await bulkInsert(NOCODB_PROJECT, TABLE_ADSETS, adSets.map(toAdSetRow));
          totalRecords += adSets.length;
        } else if (!TABLE_ADSETS) {
          console.warn('[sync] NOCODB_TABLE_ADSETS not set — run /api/setup first');
        }

        // Save ads
        if (ads.length > 0 && TABLE_ADS) {
          console.log(`[sync] Saving ${ads.length} ad rows...`);
          await bulkInsert(NOCODB_PROJECT, TABLE_ADS, ads.map(toAdRow));
          totalRecords += ads.length;
        } else if (!TABLE_ADS) {
          console.warn('[sync] NOCODB_TABLE_ADS not set — run /api/setup first');
        }

        await logSync('meta', 'exitoso', totalRecords);
        syncedPlatforms.push('meta');

        console.log(
          `[sync] ✓ Meta: campaigns=${campaigns.length}, adSets=${adSets.length}, ads=${ads.length}`
        );

      } else if (platform === 'google' && isGoogleConfigured()) {
        // Always clear Google rows before inserting
        console.log('[sync] Clearing existing Google data...');
        await clearRowsWhere(NOCODB_PROJECT, TABLE_CAMPAIGNS, 'Plataforma', 'google').catch(console.warn);
        if (TABLE_ADSETS) await clearRowsWhere(NOCODB_PROJECT, TABLE_ADSETS, 'Plataforma', 'google').catch(console.warn);
        if (TABLE_ADS)    await clearRowsWhere(NOCODB_PROJECT, TABLE_ADS,    'Plataforma', 'google').catch(console.warn);

        const { campaigns: gCampaigns, adGroups, ads: gAds } = await fetchAllGoogleAccounts(dateRange);

        // Save campaigns
        if (gCampaigns.length > 0) {
          console.log(`[sync] Saving ${gCampaigns.length} Google campaign rows...`);
          await bulkInsert(NOCODB_PROJECT, TABLE_CAMPAIGNS, gCampaigns.map(toCampaignRow));
          totalRecords += gCampaigns.length;
        }

        // Save ad groups (= ad sets)
        if (adGroups.length > 0 && TABLE_ADSETS) {
          console.log(`[sync] Saving ${adGroups.length} Google ad group rows...`);
          await bulkInsert(NOCODB_PROJECT, TABLE_ADSETS, adGroups.map(toAdSetRow));
          totalRecords += adGroups.length;
        }

        // Save ads
        if (gAds.length > 0 && TABLE_ADS) {
          console.log(`[sync] Saving ${gAds.length} Google ad rows...`);
          await bulkInsert(NOCODB_PROJECT, TABLE_ADS, gAds.map(toAdRow));
          totalRecords += gAds.length;
        }

        await logSync('google', 'exitoso', gCampaigns.length + adGroups.length + gAds.length);
        syncedPlatforms.push('google');
        console.log(
          `[sync] ✓ Google: campaigns=${gCampaigns.length}, adGroups=${adGroups.length}, ads=${gAds.length}`
        );

      } else if (platform === 'tiktok' && isTikTokConfigured()) {
        // Always clear TikTok rows before inserting
        console.log('[sync] Clearing existing TikTok data...');
        await clearRowsWhere(NOCODB_PROJECT, TABLE_CAMPAIGNS, 'Plataforma', 'tiktok').catch(console.warn);
        if (TABLE_ADSETS) await clearRowsWhere(NOCODB_PROJECT, TABLE_ADSETS, 'Plataforma', 'tiktok').catch(console.warn);
        if (TABLE_ADS)    await clearRowsWhere(NOCODB_PROJECT, TABLE_ADS,    'Plataforma', 'tiktok').catch(console.warn);

        const metrics = await fetchTikTokMetrics(
          process.env.TIKTOK_ACCESS_TOKEN!,
          process.env.TIKTOK_ADVERTISER_ID!,
          dateRange
        );
        if (metrics.length > 0) {
          await bulkInsert(
            NOCODB_PROJECT,
            TABLE_CAMPAIGNS,
            metrics.map(toCampaignRow)
          );
          totalRecords += metrics.length;
        }
        await logSync('tiktok', 'exitoso', metrics.length);
        syncedPlatforms.push('tiktok');

      } else {
        console.log(`[sync] Skipping ${platform} — not configured`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[sync] Error in ${platform}:`, msg);
      errors.push(`${platform}: ${msg}`);
      await logSync(platform as Platform, 'error', 0, msg);
    }
  }

  const response: SyncResponse = {
    success:   errors.length === 0,
    synced:    totalRecords,
    platforms: syncedPlatforms,
    error:     errors.length > 0 ? errors.join('; ') : undefined,
  };

  return NextResponse.json(response, {
    status: errors.length > 0 && syncedPlatforms.length === 0 ? 500 : 200,
  });
}
