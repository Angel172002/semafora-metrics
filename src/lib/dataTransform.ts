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
  EngagementTableRow,
  FollowerTableRow,
  FunnelStep,
  HeatmapDay,
  PeriodComparisonItem,
} from '@/types';
import { LEAD_RESULT_TYPES, VIDEO_RESULT_TYPES, FOLLOWER_RESULT_TYPES } from '@/lib/constants';

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

// ─── Deduplication ────────────────────────────────────────────────────────────
/**
 * Remove duplicate rows for the same campaign+platform+date.
 * Key includes platform to avoid collisions between platforms.
 * Keeps the row with highest Id (most recently inserted).
 */
function deduplicateCampaigns(metrics: DailyMetric[]): DailyMetric[] {
  const best = new Map<string, DailyMetric>();
  for (const m of metrics) {
    const key = `${m.platform}__${m.campaign_id}__${m.date}`;
    const prev = best.get(key);
    if (!prev || (m.id ?? 0) > (prev.id ?? 0)) best.set(key, m);
  }
  return Array.from(best.values());
}

function deduplicateAdSets(items: AdSetMetric[]): AdSetMetric[] {
  const best = new Map<string, AdSetMetric>();
  for (const m of items) {
    const key = `${m.platform}__${m.adset_id}__${m.date}__${m.network}`;
    const prev = best.get(key);
    if (!prev || (m.id ?? 0) > (prev.id ?? 0)) best.set(key, m);
  }
  return Array.from(best.values());
}

function deduplicateAds(items: AdMetric[]): AdMetric[] {
  const best = new Map<string, AdMetric>();
  for (const m of items) {
    const key = `${m.platform}__${m.ad_id}__${m.date}__${m.network}`;
    const prev = best.get(key);
    if (!prev || (m.id ?? 0) > (prev.id ?? 0)) best.set(key, m);
  }
  return Array.from(best.values());
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function formatDay(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

function getDaysBack(range: DateRange): number {
  if (range === '7d')  return 7;
  if (range === '30d') return 30;
  if (range === '90d') return 90;
  return 0; // 'all' — no limit (filterByRange and getPreviousPeriod handle 'all' separately)
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
function sumByResultType(items: DailyMetric[], types: Set<string>): number {
  return items
    .filter((m) => types.has(m.result_type))
    .reduce((acc, m) => acc + m.results, 0);
}

function buildKpis(current: DailyMetric[], previous: DailyMetric[]): KpiSummary {
  const cur = {
    impressions:  sumF(current, 'impressions'),
    results:      sumF(current, 'results'),
    spent:        sumF(current, 'spent'),
    clicks:       sumF(current, 'clicks'),
    reach:        sumF(current, 'reach'),
    likes:        sumF(current, 'likes'),
    leads:        sumByResultType(current,  LEAD_RESULT_TYPES),
    video_views:  sumByResultType(current,  VIDEO_RESULT_TYPES),
    followers:    sumByResultType(current,  FOLLOWER_RESULT_TYPES),
  };
  const prev = {
    impressions:  sumF(previous, 'impressions'),
    results:      sumF(previous, 'results'),
    spent:        sumF(previous, 'spent'),
    clicks:       sumF(previous, 'clicks'),
    reach:        sumF(previous, 'reach'),
    likes:        sumF(previous, 'likes'),
    leads:        sumByResultType(previous, LEAD_RESULT_TYPES),
    video_views:  sumByResultType(previous, VIDEO_RESULT_TYPES),
    followers:    sumByResultType(previous, FOLLOWER_RESULT_TYPES),
  };

  return {
    total_impressions:    cur.impressions,
    total_results:        cur.results,
    total_spent:          parseFloat(cur.spent.toFixed(2)),
    total_clicks:         cur.clicks,
    total_reach:          cur.reach,
    total_likes:          cur.likes,
    total_conversions:    cur.results,   // backward-compat
    total_leads:          cur.leads,
    total_video_views:    cur.video_views,
    total_followers:      cur.followers,
    total_costo_por_lead: cur.leads > 0 ? parseFloat((cur.spent / cur.leads).toFixed(2)) : 0,
    impressions_change:   pctChange(cur.impressions, prev.impressions),
    results_change:       pctChange(cur.results, prev.results),
    spent_change:         pctChange(cur.spent, prev.spent),
    clicks_change:        pctChange(cur.clicks, prev.clicks),
    reach_change:         pctChange(cur.reach, prev.reach),
    likes_change:         pctChange(cur.likes, prev.likes),
    conversions_change:   pctChange(cur.results, prev.results), // backward-compat
    leads_change:         pctChange(cur.leads, prev.leads),
    video_views_change:   pctChange(cur.video_views, prev.video_views),
    followers_change:     pctChange(cur.followers, prev.followers),
  };
}

// ─── Daily chart ──────────────────────────────────────────────────────────────
function buildDailyChart(metrics: DailyMetric[]): DailyChartPoint[] {
  const grouped: Record<string, DailyChartPoint & { leadResults: number }> = {};

  for (const m of metrics) {
    if (!grouped[m.date]) {
      grouped[m.date] = {
        date: formatDay(m.date),
        clicks: 0, results: 0, conversions: 0,
        spent: 0, likes: 0, impressions: 0, reach: 0, cpl: 0,
        leadResults: 0,
      };
    }
    grouped[m.date].clicks      += m.clicks;
    grouped[m.date].results     += m.results;
    grouped[m.date].conversions += m.results;
    grouped[m.date].spent       += m.spent;
    grouped[m.date].likes       += m.likes;
    grouped[m.date].impressions += m.impressions;
    grouped[m.date].reach       += m.reach;
    if (LEAD_RESULT_TYPES.has(m.result_type)) {
      grouped[m.date].leadResults += m.results;
    }
  }

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => {
      const { leadResults, ...rest } = v;
      return {
        ...rest,
        spent: parseFloat(v.spent.toFixed(2)),
        cpl: leadResults > 0 ? Math.round(v.spent / leadResults) : 0,
      };
    });
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
    // Group by campaign_id (not name) so same-named campaigns from different accounts stay separate
    const key = `${m.campaign_id}__${m.platform}`;
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

// ─── Engagement table (all campaigns, sorted by total engagement) ─────────────
function buildEngagementTable(metrics: DailyMetric[]): EngagementTableRow[] {
  const grouped = new Map<string, EngagementTableRow>();

  for (const m of metrics) {
    if (!grouped.has(m.campaign_id)) {
      grouped.set(m.campaign_id, {
        id: m.campaign_id,
        name: m.campaign_name,
        platform: m.platform,
        result_type: m.result_type,
        likes: 0, comments: 0, shares: 0, video_views: 0,
        reach: 0, impressions: 0, spent: 0,
      });
    }
    const row = grouped.get(m.campaign_id)!;
    row.likes       += m.likes;
    row.comments    += m.comments;
    row.shares      += m.shares;
    row.video_views += m.video_plays;
    row.reach       += m.reach;
    row.impressions += m.impressions;
    row.spent       += m.spent;
  }

  return Array.from(grouped.values())
    .map((r) => ({ ...r, spent: parseFloat(r.spent.toFixed(2)) }))
    // Only show campaigns that actually have engagement data
    .filter((r) => r.likes + r.comments + r.shares + r.video_views > 0)
    .sort((a, b) =>
      (b.likes + b.comments + b.video_views) - (a.likes + a.comments + a.video_views) ||
      b.spent - a.spent
    );
}

// ─── Follower table (only follower-type campaigns) ─────────────────────────────
function buildFollowerTable(metrics: DailyMetric[]): FollowerTableRow[] {
  const grouped = new Map<string, FollowerTableRow>();

  for (const m of metrics) {
    // Use result count when result_type is a follower type (dedicated follower campaign)
    // Otherwise fall back to the `likes` field which captures page_like/follow/post_reaction
    const isFollowerResult = FOLLOWER_RESULT_TYPES.has(m.result_type);
    const followerCount = isFollowerResult ? m.results : (m.likes ?? 0);

    // Skip rows with no follower activity at all
    if (followerCount === 0) continue;

    if (!grouped.has(m.campaign_id)) {
      grouped.set(m.campaign_id, {
        id: m.campaign_id,
        name: m.campaign_name,
        platform: m.platform,
        result_type: isFollowerResult ? m.result_type : 'like',
        followers_gained: 0, reach: 0, impressions: 0,
        spent: 0, cost_per_follower: 0,
      });
    }
    const row = grouped.get(m.campaign_id)!;
    row.followers_gained += followerCount;
    row.reach            += m.reach;
    row.impressions      += m.impressions;
    // Only attribute spend to follower campaigns with dedicated follower objective
    // For mixed campaigns just track the count (spend is already in lead campaigns)
    if (isFollowerResult) row.spent += m.spent;
  }

  return Array.from(grouped.values())
    .map((r) => ({
      ...r,
      spent:             parseFloat(r.spent.toFixed(2)),
      cost_per_follower: r.followers_gained > 0 && r.spent > 0
        ? parseFloat((r.spent / r.followers_gained).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.followers_gained - a.followers_gained);
}

// ─── Funnel data ──────────────────────────────────────────────────────────────
function buildFunnelData(current: DailyMetric[]): FunnelStep[] {
  const impressions = sumF(current, 'impressions');
  const reach       = sumF(current, 'reach');
  const clicks      = sumF(current, 'clicks');
  const results     = sumF(current, 'results');

  const steps = [
    { label: 'Impresiones', value: impressions, color: '#6366f1' },
    { label: 'Alcance',     value: reach,       color: '#3b82f6' },
    { label: 'Clics',       value: clicks,      color: '#14b8a6' },
    { label: 'Resultados',  value: results,     color: '#4ade80' },
  ];

  return steps.map((s, i) => ({
    ...s,
    pct:     impressions > 0 ? parseFloat((s.value / impressions * 100).toFixed(1)) : 0,
    dropOff: i === 0 ? 0 : steps[i - 1].value > 0
      ? parseFloat(((1 - s.value / steps[i - 1].value) * 100).toFixed(1))
      : 0,
  }));
}

// ─── Weekly heatmap ────────────────────────────────────────────────────────────
function buildWeeklyHeatmap(current: DailyMetric[]): HeatmapDay[] {
  const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const grouped: Record<number, { spent: number; results: number; clicks: number }> = {};

  for (const m of current) {
    const d = new Date(m.date + 'T00:00:00').getDay();
    if (!grouped[d]) grouped[d] = { spent: 0, results: 0, clicks: 0 };
    grouped[d].spent   += m.spent;
    grouped[d].results += m.results;
    grouped[d].clicks  += m.clicks;
  }

  const maxSpent   = Math.max(...Object.values(grouped).map((v) => v.spent),   1);
  const maxResults = Math.max(...Object.values(grouped).map((v) => v.results), 1);

  // Week order: Mon → Sun
  return [1, 2, 3, 4, 5, 6, 0].map((dayIndex) => ({
    day:              DAYS[dayIndex],
    dayIndex,
    spent:            grouped[dayIndex]?.spent   ?? 0,
    results:          grouped[dayIndex]?.results ?? 0,
    clicks:           grouped[dayIndex]?.clicks  ?? 0,
    spentIntensity:   grouped[dayIndex] ? grouped[dayIndex].spent   / maxSpent   : 0,
    resultsIntensity: grouped[dayIndex] ? grouped[dayIndex].results / maxResults : 0,
  }));
}

// ─── Period comparison ─────────────────────────────────────────────────────────
function buildPeriodComparison(current: DailyMetric[], previous: DailyMetric[]): PeriodComparisonItem[] {
  const c = {
    spent:       sumF(current,  'spent'),
    clicks:      sumF(current,  'clicks'),
    impressions: sumF(current,  'impressions'),
    results:     sumF(current,  'results'),
    reach:       sumF(current,  'reach'),
  };
  const p = {
    spent:       sumF(previous, 'spent'),
    clicks:      sumF(previous, 'clicks'),
    impressions: sumF(previous, 'impressions'),
    results:     sumF(previous, 'results'),
    reach:       sumF(previous, 'reach'),
  };

  return [
    { label: 'Invertido',    current: c.spent,       previous: p.spent,       isMonetary: true  },
    { label: 'Resultados',   current: c.results,      previous: p.results,     isMonetary: false },
    { label: 'Clics',        current: c.clicks,       previous: p.clicks,      isMonetary: false },
    { label: 'Impresiones',  current: c.impressions,  previous: p.impressions, isMonetary: false },
    { label: 'Alcance',      current: c.reach,        previous: p.reach,       isMonetary: false },
  ].map((item) => ({ ...item, change: pctChange(item.current, item.previous) }));
}

// ─── Main transform ───────────────────────────────────────────────────────────
export function transformToDashboard(
  allCampaigns: DailyMetric[],
  allAdSets: AdSetMetric[],
  allAds: AdMetric[],
  range: DateRange,
  lastSync: string | null
): DashboardData {
  // Deduplicate first (safety net against duplicate rows from incremental syncs)
  const dedupedCampaigns = deduplicateCampaigns(allCampaigns);
  const dedupedAdSets    = deduplicateAdSets(allAdSets);
  const dedupedAds       = deduplicateAds(allAds);

  const current  = filterByRange(dedupedCampaigns, range);
  const previous = getPreviousPeriod(dedupedCampaigns, range);
  const curAdSets = filterByRange(dedupedAdSets, range);
  const curAds    = filterByRange(dedupedAds, range);

  return {
    kpis:             buildKpis(current, previous),
    dailyChart:       buildDailyChart(current),
    campaignChart:    buildCampaignChart(current),
    platformBudget:   buildPlatformBudget(current),
    campaignsTable:   buildCampaignsTable(current),
    adSetsTable:      buildAdSetsTable(curAdSets),
    adsTable:         buildAdsTable(curAds),
    networkBreakdown: buildNetworkBreakdown(curAdSets),
    engagementTable:  buildEngagementTable(current),
    followerTable:    buildFollowerTable(current),
    funnelData:       buildFunnelData(current),
    weeklyHeatmap:    buildWeeklyHeatmap(current),
    periodComparison: buildPeriodComparison(current, previous),
    dailyMetrics:     current,
    lastSync,
    isMockData: false,
  };
}
