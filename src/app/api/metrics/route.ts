import { NextRequest, NextResponse } from 'next/server';
import { getMockDashboardData } from '@/lib/mockData';
import { transformToDashboard } from '@/lib/dataTransform';
import { listAllRows, checkNocoDBConnection } from '@/lib/nocodb';
import type {
  DailyMetric,
  AdSetMetric,
  AdMetric,
  DateRange,
  MetricsResponse,
  Platform,
} from '@/types';

const NOCODB_PROJECT  = process.env.NOCODB_PROJECT_ID     || 'p0txioylznnyf39';
const TABLE_CAMPAIGNS = process.env.NOCODB_TABLE_METRICS  || 'mgp8sapw27x0zqv';
const TABLE_ADSETS    = process.env.NOCODB_TABLE_ADSETS   || '';
const TABLE_ADS       = process.env.NOCODB_TABLE_ADS      || '';
const TABLE_SYNC_LOG  = process.env.NOCODB_TABLE_SYNC_LOG || 'ma1q0gfm8y5vuvy';

// ─── NocoDB row interfaces ─────────────────────────────────────────────────────
interface NocoCampaignRow {
  Id: number;
  'ID Campana': string | number;
  'Nombre Campana': string;
  'Plataforma': Platform;
  'Fecha': string;
  'Impresiones': number;
  'Clics': number;
  'Conversiones': number;
  'Resultados': number;
  'Tipo Resultado': string;
  'Me Gusta': number;
  'Compartidos': number;
  'Comentarios': number;
  'Reproducciones Video': number;
  'Gastado': number;
  'Alcance': number;
  'Frecuencia': number;
  'CPM': number;
  'CPC': number;
  'Costo Por Resultado': number;
}

interface NocoAdSetRow {
  Id: number;
  'ID Conjunto': string;
  'Nombre Conjunto': string;
  'Red': string;
  'Plataforma': string;
  'Fecha': string;
  'ID Campana': string;
  'Nombre Campana': string;
  'Impresiones': number;
  'Clics': number;
  'Resultados': number;
  'Tipo Resultado': string;
  'Gastado': number;
  'Alcance': number;
  'Frecuencia': number;
  'CPM': number;
  'CPC': number;
  'Costo Por Resultado': number;
  'Me Gusta': number;
  'Comentarios': number;
  'Compartidos': number;
  'Reproducciones Video': number;
}

interface NocoAdRow extends NocoAdSetRow {
  'ID Anuncio': string;
  'Nombre Anuncio': string;
}

interface NocoSyncRow {
  'Fecha Sync': string;
  'Estado': string;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────
function mapCampaign(row: NocoCampaignRow): DailyMetric {
  const results = row['Resultados'] || row['Conversiones'] || 0;
  return {
    id:               row.Id,
    campaign_id:      String(row['ID Campana'] || ''),
    campaign_name:    row['Nombre Campana'] || '',
    platform:         row['Plataforma'] || 'meta',
    date:             row['Fecha'] || '',
    impressions:      row['Impresiones'] || 0,
    clicks:           row['Clics'] || 0,
    results,
    conversions:      results,
    result_type:      row['Tipo Resultado'] || '',
    likes:            row['Me Gusta'] || 0,
    shares:           row['Compartidos'] || 0,
    comments:         row['Comentarios'] || 0,
    video_plays:      row['Reproducciones Video'] || 0,
    spent:            row['Gastado'] || 0,
    reach:            row['Alcance'] || 0,
    frequency:        row['Frecuencia'] || 0,
    cpm:              row['CPM'] || 0,
    cpc:              row['CPC'] || 0,
    cost_per_result:  row['Costo Por Resultado'] || 0,
  };
}

function mapAdSet(row: NocoAdSetRow): AdSetMetric {
  return {
    id:               row.Id,
    adset_id:         row['ID Conjunto'] || '',
    adset_name:       row['Nombre Conjunto'] || '',
    campaign_id:      String(row['ID Campana'] || ''),
    campaign_name:    row['Nombre Campana'] || '',
    platform:         'meta',
    network:          row['Red'] || 'all',
    date:             row['Fecha'] || '',
    impressions:      row['Impresiones'] || 0,
    clicks:           row['Clics'] || 0,
    results:          row['Resultados'] || 0,
    result_type:      row['Tipo Resultado'] || '',
    spent:            row['Gastado'] || 0,
    reach:            row['Alcance'] || 0,
    frequency:        row['Frecuencia'] || 0,
    cpm:              row['CPM'] || 0,
    cpc:              row['CPC'] || 0,
    cost_per_result:  row['Costo Por Resultado'] || 0,
    likes:            row['Me Gusta'] || 0,
    comments:         row['Comentarios'] || 0,
    shares:           row['Compartidos'] || 0,
    video_plays:      row['Reproducciones Video'] || 0,
  };
}

function mapAd(row: NocoAdRow): AdMetric {
  return {
    id:               row.Id,
    ad_id:            row['ID Anuncio'] || '',
    ad_name:          row['Nombre Anuncio'] || '',
    adset_id:         row['ID Conjunto'] || '',
    adset_name:       row['Nombre Conjunto'] || '',
    campaign_id:      String(row['ID Campana'] || ''),
    campaign_name:    row['Nombre Campana'] || '',
    platform:         'meta',
    network:          row['Red'] || 'all',
    date:             row['Fecha'] || '',
    impressions:      row['Impresiones'] || 0,
    clicks:           row['Clics'] || 0,
    results:          row['Resultados'] || 0,
    result_type:      row['Tipo Resultado'] || '',
    spent:            row['Gastado'] || 0,
    reach:            row['Alcance'] || 0,
    frequency:        row['Frecuencia'] || 0,
    cpm:              row['CPM'] || 0,
    cpc:              row['CPC'] || 0,
    cost_per_result:  row['Costo Por Resultado'] || 0,
    likes:            row['Me Gusta'] || 0,
    comments:         row['Comentarios'] || 0,
    shares:           row['Compartidos'] || 0,
    video_plays:      row['Reproducciones Video'] || 0,
  };
}

// ─── GET /api/metrics ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const range = (searchParams.get('range') || '7d') as DateRange;
  const useMock = process.env.USE_MOCK_DATA === 'true';
  const mockRange = range === 'all' ? '90d' : range;

  try {
    // ── Mock mode ──────────────────────────────────────────────────────────
    if (useMock) {
      const data = getMockDashboardData(mockRange);
      return NextResponse.json<MetricsResponse>({ success: true, data });
    }

    // ── Check NocoDB connection ─────────────────────────────────────────────
    const isConnected = await checkNocoDBConnection();
    if (!isConnected) {
      console.warn('[metrics] NocoDB unreachable — using mock data');
      const data = getMockDashboardData(mockRange);
      return NextResponse.json<MetricsResponse>({ success: true, data });
    }

    // ── Fetch all 3 levels in parallel ─────────────────────────────────────
    const [rawCampaigns, rawAdSets, rawAds] = await Promise.all([
      listAllRows<NocoCampaignRow>(NOCODB_PROJECT, TABLE_CAMPAIGNS, { sort: 'Fecha' }),
      TABLE_ADSETS
        ? listAllRows<NocoAdSetRow>(NOCODB_PROJECT, TABLE_ADSETS, { sort: 'Fecha' })
        : Promise.resolve([] as NocoAdSetRow[]),
      TABLE_ADS
        ? listAllRows<NocoAdRow>(NOCODB_PROJECT, TABLE_ADS, { sort: 'Fecha' })
        : Promise.resolve([] as NocoAdRow[]),
    ]);

    const campaigns = rawCampaigns.map(mapCampaign);
    const adSets    = rawAdSets.map(mapAdSet);
    const ads       = rawAds.map(mapAd);

    console.log(
      `[metrics] Loaded: campaigns=${campaigns.length}, adSets=${adSets.length}, ads=${ads.length}`
    );

    // ── Last sync ───────────────────────────────────────────────────────────
    let lastSync: string | null = null;
    try {
      const logs = await listAllRows<NocoSyncRow>(
        NOCODB_PROJECT,
        TABLE_SYNC_LOG,
        { limit: '5', sort: '-Id' }
      );
      const exitosos = logs.filter((l) => l['Estado'] === 'exitoso');
      lastSync = exitosos[0]?.['Fecha Sync'] || null;
    } catch { /* sync log may be empty */ }

    const data = transformToDashboard(campaigns, adSets, ads, range, lastSync);
    return NextResponse.json<MetricsResponse>({ success: true, data });

  } catch (error) {
    console.error('[/api/metrics] Error:', error);
    const data = getMockDashboardData(mockRange);
    return NextResponse.json<MetricsResponse>({ success: true, data });
  }
}
