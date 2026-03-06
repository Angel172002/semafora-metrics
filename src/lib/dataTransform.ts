/**
 * Transforms raw NocoDB/API data into dashboard-ready aggregated data.
 * Handles filtering by date range, aggregation by campaign/adset/ad,
 * and network (facebook vs instagram) breakdown.
 */

import type {
  DailyMetric,
  AdSetMetric,
  AdMetric,
  DashboardData,
  DailyChartPoint,
  CampaignChartItem,
  PlatformBudget,
  CampaignTableRow,
  AdSetTableRow,
  AdTableRow,
  NetworkBreakdownItem,
  KpiSummary,
  DateRange,
  CampaignStatus,
} from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────
const PLATFORM_COLORS: Record<string, string> = {
  meta:      '#1877F2',
  google:    '#4285F4',
  tiktok:    '#FF0050',
  instagram: '#E1306C',
  linkedin:  '#0A66C2',
};

const PLATFORM_LABELS: Record<string, string> = {
  meta:      'Meta Ads',
  google:    'Google Ads',
  tiktok:    'TikTok Ads',
  instagram: 'Instagram Ads',
  linkedin:  'LinkedIn Ads',
};

const NETWORK_LABELS: Record<string, string> = {
  // Meta networks
  facebook:         'Facebook',
  instagram:        'Instagram',
  audience_network: 'Audience Network',
  messenger:        'Messenger',
  // Google networks (stored as lowercase keys by google.ts)
  google_search:    'Google Búsqueda',
  google_display:   'Google Display',
  google_video:     'YouTube',
  google:           'Google',
  // Generic
  all:              'Total',
};

const NETWORK_COLORS: Record<string, string> = {
  // Meta networks
  facebook:         '#1877F2',
  instagram:        '#E1306C',
  audience_network: '#F0A500',
  messenger:        '#00B2FF',
  // Google networks
  google_search:    '#4285F4',
  google_display:   '#34A853',
  google_video:     '#FF0000',
  google:           '#4285F4',
  // Generic
  all:              '#6b7280',
};

// ─── Date helpers ─────────────────────────────────────────────────────────────
function formatDay(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

function getDaysBack(range: DateRange): number {
  return range === '7d' ? 7 : range === '30d' ? 30 : 90;
}

function filterByRange<T extends { date: string }>(items: T[], range: DateRange): T[] {
  if (range === 'all') return items;
  const days = getDaysBack(range);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return items.filter((m) => m.date >= cutoffStr);
}

function getPreviousPeriod<T extends { date: string }>(items: T[], range: DateRange): T[] {
  if (range === 'all') return [];
  const days = getDaysBack(range);
  const now = new Date();
  const endPrev = new Date(now);
  endPrev.setDate(now.getDate() - days);
  const startPrev = new Date(endPrev);
  startPrev.setDate(endPrev.getDate() - days);
  const endStr   = endPrev.toISOString().split('T')[0];
  const startStr = startPrev.toISOString().split('T')[0];
  return items.filter((m) => m.date >= startStr && m.date < endStr);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sumF(items: any[], field: string): number {
  return items.reduce((acc: number, m) => acc + ((m[field] as number) || 0), 0);
}

function pctChange(cur: number, prev: number): number {
  if (prev === 0) return 0;
  return parseFloat(((cur - prev) / prev * 100).toFixed(1));
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────
function buildKpis(current: DailyMetric[], previous: DailyMetric[]): KpiSummary {
  const cur = {
    impressions: sumF(current, 'impressions'),
    results:     sumF(current, 'results'),
    spent:       sumF(current, 'spent'),
    clicks:      sumF(current, 'clicks'),
    reach:       sumF(current, 'reach'),
    likes:       sumF(current, 'likes'),
  };
  const prev = {
    impressions: sumF(previous, 'impressions'),
    results:     sumF(previous, 'results'),
    spent:       sumF(previous, 'spent'),
    clicks:      sumF(previous, 'clicks'),
    reach:       sumF(previous, 'reach'),
    likes:       sumF(previous, 'likes'),
  };

  return {
    total_impressions: cur.impressions,
    total_results:     cur.results,
    total_spent:       parseFloat(cur.spent.toFixed(2)),
    total_clicks:      cur.clicks,
    total_reach:       cur.reach,
    total_likes:       cur.likes,
    total_conversions: cur.results,      // backward-compat
    impressions_change: pctChange(cur.impressions, prev.impressions),
    results_change:     pctChange(cur.results, prev.results),
    spent_change:       pctChange(cur.spent, prev.spent),
    clicks_change:      pctChange(cur.clicks, prev.clicks),
    reach_change:       pctChange(cur.reach, prev.reach),
    likes_change:       pctChange(cur.likes, prev.likes),
    conversions_change: pctChange(cur.results, prev.results), // backward-compat
  };
}

// ─── Daily chart ──────────────────────────────────────────────────────────────
function buildDailyChart(metrics: DailyMetric[]): DailyChartPoint[] {
  const grouped: Record<string, DailyChartPoint> = {};

  for (const m of metrics) {
    if (!grouped[m.date]) {
      grouped[m.date] = {
        date: formatDay(m.date),
        clicks: 0, results: 0, conversions: 0,
        spent: 0, likes: 0, impressions: 0, reach: 0,
      };
    }
    grouped[m.date].clicks      += m.clicks;
    grouped[m.date].results     += m.results;
    grouped[m.date].conversions += m.results;
    grouped[m.date].spent       += m.spent;
    grouped[m.date].likes       += m.likes;
    grouped[m.date].impressions += m.impressions;
    grouped[m.date].reach       += m.reach;
  }

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({ ...v, spent: parseFloat(v.spent.toFixed(2)) }));
}

// ─── Campaign chart ───────────────────────────────────────────────────────────
function buildCampaignChart(metrics: DailyMetric[]): CampaignChartItem[] {
  const grouped: Record<string, CampaignChartItem> = {};

  for (const m of metrics) {
    const key = `${m.campaign_name}__${m.platform}`;
    const label = m.campaign_name.length > 22
      ? m.campaign_name.substring(0, 20) + '…'
      : m.campaign_name;

    if (!grouped[key]) {
      grouped[key] = {
        name: label, clicks: 0, results: 0, conversions: 0,
        likes: 0, spent: 0, impressions: 0,
      };
    }
    grouped[key].clicks      += m.clicks;
    grouped[key].results     += m.results;
    grouped[key].conversions += m.results;
    grouped[key].likes       += m.likes;
    grouped[key].spent       += m.spent;
    grouped[key].impressions += m.impressions;
  }

  return Object.values(grouped)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 8);
}

// ─── Platform budget ──────────────────────────────────────────────────────────
function buildPlatformBudget(metrics: DailyMetric[]): PlatformBudget[] {
  const byPlatform: Record<string, number> = {};
  let total = 0;

  for (const m of metrics) {
    byPlatform[m.platform] = (byPlatform[m.platform] || 0) + m.spent;
    total += m.spent;
  }

  return Object.entries(byPlatform)
    .sort(([, a], [, b]) => b - a)
    .map(([platform, spent]) => ({
      platform,
      label:      PLATFORM_LABELS[platform] || platform,
      spent:      parseFloat(spent.toFixed(2)),
      percentage: total > 0 ? parseFloat((spent / total * 100).toFixed(1)) : 0,
      color:      PLATFORM_COLORS[platform] || '#6b7280',
    }));
}

// ─── Campaigns table ──────────────────────────────────────────────────────────
function buildCampaignsTable(metrics: DailyMetric[]): CampaignTableRow[] {
  const grouped: Record<string, CampaignTableRow> = {};

  for (const m of metrics) {
    const key = `${m.campaign_name}__${m.platform}`;
    if (!grouped[key]) {
      grouped[key] = {
        id: m.campaign_id,
        name: m.campaign_name,
        platform: m.platform,
        status: 'active' as CampaignStatus,
        impressions: 0, clicks: 0,
        results: 0, result_type: m.result_type || '',
        ctr: 0, cpm: 0, cpc: 0, cost_per_result: 0,
        spent: 0, reach: 0, frequency: 0,
      };
    }
    const row = grouped[key];
    row.impressions += m.impressions;
    row.clicks      += m.clicks;
    row.results     += m.results;
    row.spent       += m.spent;
    row.reach       += m.reach;
    // Weighted averages (approximate)
    if (m.result_type && !row.result_type) row.result_type = m.result_type;
  }

  return Object.values(grouped).map((row) => ({
    ...row,
    ctr:             row.impressions > 0 ? parseFloat((row.clicks / row.impressions * 100).toFixed(2)) : 0,
    cpm:             row.impressions > 0 ? parseFloat((row.spent / row.impressions * 1000).toFixed(2)) : 0,
    cpc:             row.clicks > 0 ? parseFloat((row.spent / row.clicks).toFixed(2)) : 0,
    cost_per_result: row.results > 0 ? parseFloat((row.spent / row.results).toFixed(2)) : 0,
    spent:           parseFloat(row.spent.toFixed(2)),
  }));
}

// ─── Network label helper ──────────────────────────────────────────────────────
function combineNetworkLabel(networks: Set<string>): string {
  const nets = Array.from(networks).filter((n) => n && n !== 'all');
  const hasFB = nets.includes('facebook');
  const hasIG = nets.includes('instagram');
  const hasMSG = nets.includes('messenger');
  const hasAN  = nets.includes('audience_network');
  if (hasFB && hasIG && (hasMSG || hasAN)) return 'Multi-red';
  if (hasFB && hasIG) return 'FB + IG';
  if (hasFB && hasMSG) return 'FB + MSG';
  if (hasFB) return 'Facebook';
  if (hasIG) return 'Instagram';
  if (hasMSG) return 'Messenger';
  if (hasAN)  return 'Audience Net.';
  return nets[0] ? (NETWORK_LABELS[nets[0]] || nets[0]) : 'Meta';
}

// ─── Ad Sets table ────────────────────────────────────────────────────────────
function buildAdSetsTable(adSets: AdSetMetric[]): AdSetTableRow[] {
  // Group by adset_id only — merge all networks (FB + IG) into one row
  const grouped: Record<string, AdSetTableRow> = {};
  const networkSets: Record<string, Set<string>> = {};

  for (const m of adSets) {
    const key = m.adset_id;
    if (!networkSets[key]) networkSets[key] = new Set();
    networkSets[key].add(m.network);

    if (!grouped[key]) {
      grouped[key] = {
        id: m.adset_id,
        adset_name: m.adset_name,
        campaign_name: m.campaign_name,
        network: m.network,          // will be overwritten below
        impressions: 0, clicks: 0,
        results: 0, result_type: m.result_type || '',
        ctr: 0, cpm: 0, cpc: 0, cost_per_result: 0,
        spent: 0, reach: 0, frequency: 0,
      };
    }
    const row = grouped[key];
    row.impressions += m.impressions;
    row.clicks      += m.clicks;
    row.results     += m.results;
    row.spent       += m.spent;
    row.reach       += m.reach;
    if (m.result_type && !row.result_type) row.result_type = m.result_type;
  }

  return Object.values(grouped).map((row) => ({
    ...row,
    network:         combineNetworkLabel(networkSets[row.id] || new Set()),
    ctr:             row.impressions > 0 ? parseFloat((row.clicks / row.impressions * 100).toFixed(2)) : 0,
    cpm:             row.impressions > 0 ? parseFloat((row.spent / row.impressions * 1000).toFixed(2)) : 0,
    cpc:             row.clicks > 0 ? parseFloat((row.spent / row.clicks).toFixed(2)) : 0,
    cost_per_result: row.results > 0 ? parseFloat((row.spent / row.results).toFixed(2)) : 0,
    frequency:       0,
    spent:           parseFloat(row.spent.toFixed(2)),
  }));
}

// ─── Ads table ────────────────────────────────────────────────────────────────
function buildAdsTable(ads: AdMetric[]): AdTableRow[] {
  // Group by ad_id only — merge all networks into one row
  const grouped: Record<string, AdTableRow> = {};
  const networkSets: Record<string, Set<string>> = {};

  for (const m of ads) {
    const key = m.ad_id;
    if (!networkSets[key]) networkSets[key] = new Set();
    networkSets[key].add(m.network);

    if (!grouped[key]) {
      grouped[key] = {
        id: m.ad_id,
        ad_name: m.ad_name,
        adset_name: m.adset_name,
        campaign_name: m.campaign_name,
        network: m.network,          // will be overwritten below
        impressions: 0, clicks: 0,
        results: 0, result_type: m.result_type || '',
        ctr: 0, cpm: 0, cpc: 0, cost_per_result: 0,
        spent: 0, reach: 0,
      };
    }
    const row = grouped[key];
    row.impressions += m.impressions;
    row.clicks      += m.clicks;
    row.results     += m.results;
    row.spent       += m.spent;
    row.reach       += m.reach;
    if (m.result_type && !row.result_type) row.result_type = m.result_type;
  }

  return Object.values(grouped).map((row) => ({
    ...row,
    network:         combineNetworkLabel(networkSets[row.id] || new Set()),
    ctr:             row.impressions > 0 ? parseFloat((row.clicks / row.impressions * 100).toFixed(2)) : 0,
    cpm:             row.impressions > 0 ? parseFloat((row.spent / row.impressions * 1000).toFixed(2)) : 0,
    cpc:             row.clicks > 0 ? parseFloat((row.spent / row.clicks).toFixed(2)) : 0,
    cost_per_result: row.results > 0 ? parseFloat((row.spent / row.results).toFixed(2)) : 0,
    spent:           parseFloat(row.spent.toFixed(2)),
  }));
}

// ─── Network breakdown (from ad set data) ─────────────────────────────────────
function buildNetworkBreakdown(adSets: AdSetMetric[]): NetworkBreakdownItem[] {
  const grouped: Record<string, { impressions: number; clicks: number; results: number; spent: number }> = {};

  for (const m of adSets) {
    const net = m.network || 'all';
    if (!grouped[net]) {
      grouped[net] = { impressions: 0, clicks: 0, results: 0, spent: 0 };
    }
    grouped[net].impressions += m.impressions;
    grouped[net].clicks      += m.clicks;
    grouped[net].results     += m.results;
    grouped[net].spent       += m.spent;
  }

  const totalSpent = Object.values(grouped).reduce((s, v) => s + v.spent, 0);

  return Object.entries(grouped)
    .filter(([net]) => net !== 'all')
    .sort(([, a], [, b]) => b.spent - a.spent)
    .map(([network, v]) => ({
      network,
      label:       NETWORK_LABELS[network] || network,
      impressions: v.impressions,
      clicks:      v.clicks,
      results:     v.results,
      spent:       parseFloat(v.spent.toFixed(2)),
      percentage:  totalSpent > 0 ? parseFloat((v.spent / totalSpent * 100).toFixed(1)) : 0,
      color:       NETWORK_COLORS[network] || '#6b7280',
    }));
}

// ─── Main transform ───────────────────────────────────────────────────────────
export function transformToDashboard(
  allCampaigns: DailyMetric[],
  allAdSets: AdSetMetric[],
  allAds: AdMetric[],
  range: DateRange,
  lastSync: string | null
): DashboardData {
  const current  = filterByRange(allCampaigns, range);
  const previous = getPreviousPeriod(allCampaigns, range);
  const curAdSets = filterByRange(allAdSets, range);
  const curAds    = filterByRange(allAds, range);

  return {
    kpis:             buildKpis(current, previous),
    dailyChart:       buildDailyChart(current),
    campaignChart:    buildCampaignChart(current),
    platformBudget:   buildPlatformBudget(current),
    campaignsTable:   buildCampaignsTable(current),
    adSetsTable:      buildAdSetsTable(curAdSets),
    adsTable:         buildAdsTable(curAds),
    networkBreakdown: buildNetworkBreakdown(curAdSets),
    lastSync,
    isMockData: false,
  };
}
