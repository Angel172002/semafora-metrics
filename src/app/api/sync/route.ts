import { NextRequest, NextResponse } from 'next/server';
import { fetchAllMetaAccounts, isMetaConfigured } from '@/lib/integrations/meta';
import { fetchAllGoogleAccounts, isGoogleConfigured } from '@/lib/integrations/google';
import { fetchTikTokMetrics, isTikTokConfigured } from '@/lib/integrations/tiktok';
import { bulkInsert, insertRow, listAllRows, clearRowsWhere } from '@/lib/nocodb';
import type { DailyMetric, AdSetMetric, AdMetric, SyncResponse, Platform } from '@/types';

const NOCODB_PROJECT    = process.env.NOCODB_PROJECT_ID        || 'p0txioylznnyf39';
const TABLE_CAMPAIGNS   = process.env.NOCODB_TABLE_METRICS     || 'mgp8sapw27x0zqv';
const TABLE_ADSETS      = process.env.NOCODB_TABLE_ADSETS      || '';
const TABLE_ADS         = process.env.NOCODB_TABLE_ADS         || '';
const TABLE_SYNC_LOG    = process.env.NOCODB_TABLE_SYNC_LOG    || 'ma1q0gfm8y5vuvy';
const TABLE_CRM_LEADS   = process.env.NOCODB_TABLE_CRM_LEADS   || '';
const TABLE_CRM_STAGES  = process.env.NOCODB_TABLE_CRM_STAGES  || '';

// ─── Lead result types that should create CRM entries ─────────────────────────
const LEAD_RESULT_TYPES = new Set([
  'onsite_conversion.messaging_conversation_started_7d',
  'onsite_conversion.messaging_conversation_started_30d',
  'onsite_conversion.messaging_conversation_started',
  'onsite_conversion.lead_grouped',
  'lead',
  'complete_registration',
  'onsite_conversion.subscribe',
]);

// ─── Auto-import Meta leads → CRM ────────────────────────────────────────────
/**
 * For each campaign that had lead-type results on the MOST RECENT day in the
 * synced data, compare against existing CRM entries and create the difference.
 * This is idempotent: running multiple times the same day won't duplicate leads.
 */
async function importMetaLeadsToCRM(campaigns: DailyMetric[]): Promise<number> {
  if (!TABLE_CRM_LEADS) return 0;

  // Only lead-type results with at least 1 result
  const leadMetrics = campaigns.filter(
    (m) => LEAD_RESULT_TYPES.has(m.result_type) && m.results > 0
  );
  if (leadMetrics.length === 0) return 0;

  // Work only on the most recent date (avoid re-importing full history on every sync)
  const maxDate = leadMetrics.reduce((max, m) => (m.date > max ? m.date : max), '');
  const dayMetrics = leadMetrics.filter((m) => m.date === maxDate);

  // Get first CRM stage to place new leads into
  let firstStage = { Id: 1, Nombre: 'Nuevo Lead', Color: '#3b82f6' };
  if (TABLE_CRM_STAGES) {
    try {
      const stages = await listAllRows<{ Id: number; Nombre: string; Color: string; Orden: number }>(
        NOCODB_PROJECT, TABLE_CRM_STAGES, { sort: 'Orden', limit: '1' }
      );
      if (stages.length > 0) firstStage = stages[0];
    } catch { /* keep default */ }
  }

  let created = 0;
  const dayStart = `${maxDate}T00:00:00`;
  const dayEnd   = `${maxDate}T23:59:59`;

  for (const metric of dayMetrics) {
    try {
      // How many CRM leads already exist for this campaign on this date?
      const existing = await listAllRows<{ Id: number }>(NOCODB_PROJECT, TABLE_CRM_LEADS, {
        fields: 'Id',
        where:  `(ID_Campana,eq,${metric.campaign_id})~and(Plataforma_Origen,eq,Meta)~and(Fecha_Creacion,gte,${dayStart})~and(Fecha_Creacion,lte,${dayEnd})`,
      });

      const toCreate = Math.max(0, metric.results - existing.length);
      if (toCreate === 0) continue;

      const now = new Date().toISOString();
      const cpl = metric.results > 0 ? Math.round(metric.spent / metric.results) : 0;
      const note = [
        `Importado automáticamente desde Meta Ads el ${maxDate}.`,
        cpl > 0 ? `Costo por lead: $${cpl.toLocaleString('es-CO')} COP.` : '',
        `Campaña: ${metric.campaign_name}.`,
        `Actualiza nombre y teléfono cuando contactes al lead en WhatsApp.`,
      ].filter(Boolean).join(' ');

      for (let i = 0; i < toCreate; i++) {
        await insertRow(NOCODB_PROJECT, TABLE_CRM_LEADS, {
          Nombre:                `Lead WA · ${metric.campaign_name}`,
          Telefono:              '',
          Email:                 '',
          Empresa:               '',
          Origen:                'Meta Ads',
          ID_Campana:            metric.campaign_id,
          Nombre_Campana:        metric.campaign_name,
          Plataforma_Origen:     'Meta',
          Valor_Estimado:        0,
          Stage_Id:              firstStage.Id,
          Stage_Nombre:          firstStage.Nombre,
          Stage_Color:           firstStage.Color,
          Usuario_Id:            1,
          Usuario_Nombre:        'Sin asignar',
          Fecha_Creacion:        now,
          Fecha_Ultimo_Contacto: now,
          Proxima_Accion_Fecha:  '',
          Estado:                'abierto',
          Motivo_Perdida:        '',
          Notas:                 note,
          Fecha_Cierre:          '',
        });
        created++;
      }

      console.log(`[sync] CRM: ${toCreate} lead(s) created for campaign "${metric.campaign_name}" (${maxDate})`);
    } catch (e) {
      console.warn(`[sync] CRM import failed for campaign ${metric.campaign_id}:`, e);
    }
  }

  return created;
}

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

        // Auto-import lead-type results into CRM (idempotent)
        const crmCreated = await importMetaLeadsToCRM(campaigns).catch((e) => {
          console.warn('[sync] CRM import error:', e);
          return 0;
        });

        await logSync('meta', 'exitoso', totalRecords);
        syncedPlatforms.push('meta');

        console.log(
          `[sync] ✓ Meta: campaigns=${campaigns.length}, adSets=${adSets.length}, ads=${ads.length}${crmCreated > 0 ? `, CRM leads created=${crmCreated}` : ''}`
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
