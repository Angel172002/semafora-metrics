import type {
  DashboardData,
  DailyChartPoint,
  CampaignChartItem,
  PlatformBudget,
  CampaignTableRow,
  AdSetTableRow,
  AdTableRow,
  NetworkBreakdownItem,
  KpiSummary,
  EngagementTableRow,
  FollowerTableRow,
} from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function rnd(min: number, max: number, decimals = 0): number {
  const val = Math.random() * (max - min) + min;
  return decimals > 0 ? parseFloat(val.toFixed(decimals)) : Math.round(val);
}

function formatDay(date: Date): string {
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

// ─── Daily chart ──────────────────────────────────────────────────────────────
function generateDailyData(days: number): DailyChartPoint[] {
  const points: DailyChartPoint[] = [];
  const now = new Date();

  let clicks = rnd(800, 1200);
  let results = rnd(80, 140);
  let spent = rnd(300000, 500000);
  let likes = rnd(1200, 1800);
  let impressions = rnd(18000, 24000);
  let reach = rnd(12000, 18000);

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);

    clicks      = Math.max(400, clicks + rnd(-80, 120));
    results     = Math.max(30, results + rnd(-15, 22));
    spent       = Math.max(100000, spent + rnd(-40000, 60000));
    likes       = Math.max(600, likes + rnd(-120, 180));
    impressions = Math.max(10000, impressions + rnd(-1500, 2200));
    reach       = Math.max(7000, reach + rnd(-1000, 1500));

    const r = Math.round(results);
    const s = Math.round(spent);
    points.push({
      date:        formatDay(date),
      clicks:      Math.round(clicks),
      results:     r,
      conversions: r,
      spent:       s,
      likes:       Math.round(likes),
      impressions: Math.round(impressions),
      reach:       Math.round(reach),
      cpl:         r > 0 ? Math.round(s / r) : 0,
    });
  }
  return points;
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────
function generateKpis(current: DailyChartPoint[], previous: DailyChartPoint[]): KpiSummary {
  const sum = (arr: DailyChartPoint[], key: keyof DailyChartPoint) =>
    arr.reduce((acc, d) => acc + (d[key] as number), 0);
  const pct = (cur: number, prev: number) =>
    prev > 0 ? parseFloat(((cur - prev) / prev * 100).toFixed(1)) : 0;

  const curR  = sum(current, 'results');  const curSp = sum(current, 'spent');
  const curCl = sum(current, 'clicks');   const curIm = sum(current, 'impressions');
  const curRe = sum(current, 'reach');    const curLk = sum(current, 'likes');
  const prevR  = sum(previous, 'results'); const prevSp = sum(previous, 'spent');
  const prevCl = sum(previous, 'clicks');  const prevIm = sum(previous, 'impressions');
  const prevRe = sum(previous, 'reach');   const prevLk = sum(previous, 'likes');

  // Mock: ~70% of results are WA leads, ~25% video, ~5% followers
  const curLeads   = Math.round(curR * 0.70);
  const curVideo   = Math.round(curR * 0.25);
  const curFollow  = curR - curLeads - curVideo;
  const prevLeads  = Math.round(prevR * 0.70);
  const prevVideo  = Math.round(prevR * 0.25);
  const prevFollow = prevR - prevLeads - prevVideo;

  return {
    total_impressions: curIm,  total_results: curR,
    total_spent: curSp,        total_clicks: curCl,
    total_reach: curRe,        total_likes: curLk,
    total_conversions: curR,
    total_leads:          curLeads,
    total_video_views:    curVideo,
    total_followers:      curFollow,
    total_costo_por_lead: curLeads > 0 ? parseFloat((curSp / curLeads).toFixed(2)) : 0,
    impressions_change: pct(curIm, prevIm), results_change: pct(curR, prevR),
    spent_change: pct(curSp, prevSp),       clicks_change: pct(curCl, prevCl),
    reach_change: pct(curRe, prevRe),       likes_change: pct(curLk, prevLk),
    conversions_change: pct(curR, prevR),
    leads_change:       pct(curLeads, prevLeads),
    video_views_change: pct(curVideo, prevVideo),
    followers_change:   pct(curFollow, prevFollow),
  };
}

// ─── Campaign chart ───────────────────────────────────────────────────────────
function generateCampaignChart(): CampaignChartItem[] {
  const names = [
    'LI — Whatsapp Colombia', 'LI — Leads Formulario',
    'Retargeting Deudas', 'Brand Awareness', 'Consulta Gratis',
  ];
  return names.map((name) => ({
    name: name.length > 20 ? name.substring(0, 18) + '…' : name,
    clicks: rnd(2500, 9000), results: rnd(300, 2200), conversions: rnd(300, 2200),
    likes: rnd(500, 4000), spent: rnd(80000, 400000), impressions: rnd(20000, 120000),
  }));
}

// ─── Platform budget ──────────────────────────────────────────────────────────
function generatePlatformBudget(totalSpent: number): PlatformBudget[] {
  return [
    { platform: 'meta', label: 'Meta Ads', color: '#1877F2', spent: Math.round(totalSpent * 0.75), percentage: 75 },
    { platform: 'google', label: 'Google Ads', color: '#4285F4', spent: Math.round(totalSpent * 0.25), percentage: 25 },
  ];
}

// ─── Campaigns table ──────────────────────────────────────────────────────────
const TABLE_CAMPAIGNS: CampaignTableRow[] = [
  { id: '120200000001', name: 'LI — Whatsapp Colombia', platform: 'meta', status: 'active',
    impressions: 45200, clicks: 2100, results: 312,
    result_type: 'onsite_conversion.messaging_conversation_started_7d',
    ctr: 4.65, cpm: 7800, cpc: 1680, cost_per_result: 11300, spent: 3530000, reach: 32400, frequency: 1.4 },
  { id: '120200000002', name: 'LI — Leads Formulario', platform: 'meta', status: 'active',
    impressions: 28600, clicks: 980, results: 145,
    result_type: 'onsite_conversion.lead_grouped',
    ctr: 3.43, cpm: 9200, cpc: 2690, cost_per_result: 18200, spent: 2640000, reach: 21000, frequency: 1.36 },
];

// ─── Ad Sets table ────────────────────────────────────────────────────────────
const TABLE_ADSETS: AdSetTableRow[] = [
  { id: 'as_001__facebook', adset_name: 'Público Deudas — Facebook', campaign_name: 'LI — Whatsapp Colombia',
    network: 'facebook', impressions: 28000, clicks: 1400, results: 215,
    result_type: 'onsite_conversion.messaging_conversation_started_7d',
    ctr: 5.0, cpm: 7200, cpc: 1440, cost_per_result: 9400, spent: 2020000, reach: 21000, frequency: 1.33 },
  { id: 'as_001__instagram', adset_name: 'Público Deudas — Instagram', campaign_name: 'LI — Whatsapp Colombia',
    network: 'instagram', impressions: 17200, clicks: 700, results: 97,
    result_type: 'onsite_conversion.messaging_conversation_started_7d',
    ctr: 4.07, cpm: 8900, cpc: 2186, cost_per_result: 15800, spent: 1510000, reach: 11400, frequency: 1.51 },
];

// ─── Ads table ────────────────────────────────────────────────────────────────
const TABLE_ADS: AdTableRow[] = [
  { id: 'ad_001__facebook', ad_name: 'Video — Deuda bancaria — FB', adset_name: 'Público Deudas — Facebook',
    campaign_name: 'LI — Whatsapp Colombia', network: 'facebook',
    impressions: 15400, clicks: 820, results: 128,
    result_type: 'onsite_conversion.messaging_conversation_started_7d',
    ctr: 5.32, cpm: 6800, cpc: 1280, cost_per_result: 8200, spent: 1050000, reach: 12200 },
  { id: 'ad_001__instagram', ad_name: 'Video — Deuda bancaria — IG', adset_name: 'Público Deudas — Instagram',
    campaign_name: 'LI — Whatsapp Colombia', network: 'instagram',
    impressions: 11200, clicks: 480, results: 64,
    result_type: 'onsite_conversion.messaging_conversation_started_7d',
    ctr: 4.29, cpm: 9100, cpc: 2120, cost_per_result: 15900, spent: 1020000, reach: 8600 },
];

// ─── Engagement table ─────────────────────────────────────────────────────────
const TABLE_ENGAGEMENT: EngagementTableRow[] = [
  { id: 'c_001', name: 'LI — Whatsapp Colombia', platform: 'meta',
    result_type: 'onsite_conversion.messaging_conversation_started_7d',
    likes: 1840, comments: 312, shares: 156, video_views: 24800,
    reach: 38600, impressions: 48200, spent: 3200000 },
  { id: 'c_002', name: 'Video — Concientización Deudas', platform: 'meta',
    result_type: 'video_view',
    likes: 4120, comments: 890, shares: 540, video_views: 82400,
    reach: 94000, impressions: 118000, spent: 1850000 },
  { id: 'c_003', name: 'Interacción — Post Asesoría', platform: 'meta',
    result_type: 'post_engagement',
    likes: 2760, comments: 480, shares: 230, video_views: 12100,
    reach: 41000, impressions: 52000, spent: 720000 },
  { id: 'c_004', name: 'Google Search — Deudas', platform: 'google',
    result_type: 'google_search',
    likes: 0, comments: 0, shares: 0, video_views: 0,
    reach: 0, impressions: 28400, spent: 980000 },
];

// ─── Follower table ───────────────────────────────────────────────────────────
const TABLE_FOLLOWERS: FollowerTableRow[] = [
  { id: 'c_005', name: 'Seguidores — Página Semafora', platform: 'meta',
    result_type: 'like',
    followers_gained: 842, reach: 62000, impressions: 78000,
    spent: 640000, cost_per_follower: 760 },
  { id: 'c_006', name: 'Seguidores — Instagram Semafora', platform: 'meta',
    result_type: 'follow',
    followers_gained: 1240, reach: 84000, impressions: 101000,
    spent: 920000, cost_per_follower: 742 },
];

// ─── Network breakdown ────────────────────────────────────────────────────────
const NETWORK_BREAKDOWN: NetworkBreakdownItem[] = [
  { network: 'facebook', label: 'Facebook', impressions: 69000, clicks: 3200, results: 530,
    spent: 3200000, percentage: 64, color: '#1877F2' },
  { network: 'instagram', label: 'Instagram', impressions: 38000, clicks: 1500, results: 220,
    spent: 1800000, percentage: 36, color: '#E1306C' },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export function getMockDashboardData(range: '7d' | '30d' | '90d'): DashboardData {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const currentData  = generateDailyData(days);
  const previousData = generateDailyData(days).map((d) => ({
    ...d,
    clicks: Math.round(d.clicks * 0.88), results: Math.round(d.results * 0.92),
    spent: Math.round(d.spent * 1.03), likes: Math.round(d.likes * 0.87),
  }));

  return {
    kpis:             generateKpis(currentData, previousData),
    dailyChart:       currentData,
    campaignChart:    generateCampaignChart(),
    platformBudget:   generatePlatformBudget(generateKpis(currentData, previousData).total_spent),
    campaignsTable:   TABLE_CAMPAIGNS,
    adSetsTable:      TABLE_ADSETS,
    adsTable:         TABLE_ADS,
    networkBreakdown: NETWORK_BREAKDOWN,
    engagementTable:  TABLE_ENGAGEMENT,
    followerTable:    TABLE_FOLLOWERS,
    lastSync:         new Date(Date.now() - 1000 * 60 * 23).toISOString(),
    isMockData:       true,
  };
}
