/**
 * Meta Marketing API integration — 3 data levels
 * Docs: https://developers.facebook.com/docs/marketing-api/insights
 *
 * Fetches: campaigns → ad sets (with publisher_platform) → ads (with publisher_platform)
 * Primary result metric: onsite_conversion.messaging_conversation_started_7d
 *
 * Env vars:
 *   META_ACCESS_TOKEN      — Long-lived access token
 *   META_AD_ACCOUNT_IDS   — Comma-separated: act_111,act_222
 *   META_API_VERSION       — Default: v19.0
 */

import type { DailyMetric, AdSetMetric, AdMetric } from '@/types';

const API_VERSION = process.env.META_API_VERSION || 'v19.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

// Primary result types in priority order — first one with count > 0 wins
// Covers: leads (WhatsApp/form), views, followers, engagement, registrations
const PRIMARY_RESULT_TYPES = [
  // WhatsApp / Messenger leads (highest priority)
  'onsite_conversion.messaging_conversation_started_7d',
  'onsite_conversion.messaging_conversation_started_30d',
  // Form leads
  'onsite_conversion.lead_grouped',
  'lead',
  'complete_registration',
  // Follower campaigns
  'like',                  // Page likes
  'follow',                // Instagram follows
  'onsite_conversion.subscribe',
  // Video view campaigns
  'video_view',
  'video_thruplay_watched_actions',
  'video_p100_watched_actions',
  'video_play_actions',
  // Engagement / traffic
  'post_engagement',
  'link_click',
  'omni_landing_page_view',
  'landing_page_view',
  // Reach / awareness fallback
  'reach',
];

// ─── Meta API row interfaces ───────────────────────────────────────────────────
interface MetaAction {
  action_type: string;
  value: string;
}

interface MetaCampaignRow {
  campaign_id: string;
  campaign_name: string;
  date_start: string;
  impressions: string;
  clicks: string;
  spend: string;
  reach: string;
  frequency?: string;
  cpm?: string;
  cpc?: string;
  actions?: MetaAction[];
  video_thruplay_watched_actions?: MetaAction[];
}

interface MetaAdSetRow {
  adset_id: string;
  adset_name: string;
  campaign_id: string;
  campaign_name: string;
  date_start: string;
  publisher_platform?: string;
  impressions: string;
  clicks: string;
  spend: string;
  reach: string;
  frequency?: string;
  cpm?: string;
  cpc?: string;
  actions?: MetaAction[];
  video_thruplay_watched_actions?: MetaAction[];
}

interface MetaAdRow {
  ad_id: string;
  ad_name: string;
  adset_id: string;
  adset_name: string;
  campaign_id: string;
  campaign_name: string;
  date_start: string;
  publisher_platform?: string;
  impressions: string;
  clicks: string;
  spend: string;
  reach: string;
  frequency?: string;
  cpm?: string;
  cpc?: string;
  actions?: MetaAction[];
  video_thruplay_watched_actions?: MetaAction[];
}

interface MetaPagedResponse<T> {
  data: T[];
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
  };
  error?: { message: string; type: string; code: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getAction(actions: MetaAction[] | undefined, ...types: string[]): number {
  if (!actions) return 0;
  let total = 0;
  for (const type of types) {
    const found = actions.find((a) => a.action_type === type);
    if (found) total += parseInt(found.value) || 0;
  }
  return total;
}

function getPrimaryResult(
  actions: MetaAction[] | undefined,
  videoActions?: MetaAction[]
): { count: number; type: string } {
  // Merge main actions + video_thruplay_watched_actions field into one lookup
  const all = [...(actions || []), ...(videoActions || [])];
  if (!all.length) return { count: 0, type: '' };

  for (const type of PRIMARY_RESULT_TYPES) {
    const found = all.find((a) => a.action_type === type);
    if (found && parseInt(found.value) > 0) {
      return { count: parseInt(found.value), type };
    }
  }
  return { count: 0, type: '' };
}

function getVideoPlays(row: { actions?: MetaAction[]; video_thruplay_watched_actions?: MetaAction[] }): number {
  return (
    getAction(row.video_thruplay_watched_actions, 'video_thruplay_watched_actions') ||
    getAction(row.actions, 'video_thruplay_watched_actions')
  );
}

// ─── Paginated fetch helper ───────────────────────────────────────────────────
async function fetchAllPages<T>(url: string, accessToken: string): Promise<T[]> {
  const all: T[] = [];
  let nextUrl: string | null = url;
  let page = 0;

  while (nextUrl && page < 60) {
    page++;
    const separator = nextUrl.includes('?') ? '&' : '?';
    const fetchUrl = nextUrl.includes('access_token')
      ? nextUrl
      : `${nextUrl}${separator}access_token=${accessToken}`;

    const res = await fetch(fetchUrl);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Meta API HTTP ${res.status}: ${errText.slice(0, 300)}`);
    }

    const json: MetaPagedResponse<T> = await res.json();
    if (json.error) {
      throw new Error(`Meta API error ${json.error.code}: ${json.error.message}`);
    }

    if (json.data?.length) {
      all.push(...json.data);
      console.log(`[meta] page ${page}: ${json.data.length} rows (total: ${all.length})`);
    }

    nextUrl = json.paging?.next || null;
    if (nextUrl) await new Promise((r) => setTimeout(r, 300));
  }

  return all;
}

// ─── CAMPAIGN level ────────────────────────────────────────────────────────────
async function fetchCampaignMetrics(
  accessToken: string,
  adAccountId: string,
  dateRange: { since: string; until: string }
): Promise<DailyMetric[]> {
  const params = new URLSearchParams({
    access_token: accessToken,
    level: 'campaign',
    fields: [
      'campaign_id',
      'campaign_name',
      'impressions',
      'clicks',
      'spend',
      'reach',
      'frequency',
      'cpm',
      'cpc',
      'actions',
      'video_thruplay_watched_actions',
    ].join(','),
    time_range: JSON.stringify(dateRange),
    time_increment: '1',
    limit: '500',
  });

  console.log(`[meta] Fetching CAMPAIGNS for ${adAccountId}: ${dateRange.since} → ${dateRange.until}`);
  const rows = await fetchAllPages<MetaCampaignRow>(
    `${BASE_URL}/${adAccountId}/insights?${params}`,
    accessToken
  );

  return rows.map((row) => {
    const { count: results, type: result_type } = getPrimaryResult(row.actions, row.video_thruplay_watched_actions);
    const spent = parseFloat(row.spend) || 0;
    return {
      campaign_id: row.campaign_id,
      campaign_name: row.campaign_name,
      platform: 'meta' as const,
      date: row.date_start,
      impressions: parseInt(row.impressions) || 0,
      clicks: parseInt(row.clicks) || 0,
      results,
      conversions: results,
      result_type,
      likes: getAction(row.actions, 'post_reaction', 'like'),
      shares: getAction(row.actions, 'post'),
      comments: getAction(row.actions, 'comment'),
      video_plays: getVideoPlays(row),
      spent,
      reach: parseInt(row.reach) || 0,
      frequency: parseFloat(row.frequency || '0') || 0,
      cpm: parseFloat(row.cpm || '0') || 0,
      cpc: parseFloat(row.cpc || '0') || 0,
      cost_per_result: results > 0 ? parseFloat((spent / results).toFixed(2)) : 0,
    };
  });
}

// ─── AD SET level (with publisher_platform breakdown) ─────────────────────────
async function fetchAdSetMetrics(
  accessToken: string,
  adAccountId: string,
  dateRange: { since: string; until: string }
): Promise<AdSetMetric[]> {
  const params = new URLSearchParams({
    access_token: accessToken,
    level: 'adset',
    fields: [
      'adset_id',
      'adset_name',
      'campaign_id',
      'campaign_name',
      'impressions',
      'clicks',
      'spend',
      'reach',
      'frequency',
      'cpm',
      'cpc',
      'actions',
      'video_thruplay_watched_actions',
    ].join(','),
    breakdowns: 'publisher_platform',
    time_range: JSON.stringify(dateRange),
    time_increment: '1',
    limit: '500',
  });

  console.log(`[meta] Fetching AD SETS for ${adAccountId}`);
  const rows = await fetchAllPages<MetaAdSetRow>(
    `${BASE_URL}/${adAccountId}/insights?${params}`,
    accessToken
  );

  return rows.map((row) => {
    const { count: results, type: result_type } = getPrimaryResult(row.actions, row.video_thruplay_watched_actions);
    const spent = parseFloat(row.spend) || 0;
    return {
      adset_id: row.adset_id,
      adset_name: row.adset_name,
      campaign_id: row.campaign_id,
      campaign_name: row.campaign_name,
      platform: 'meta' as const,
      network: row.publisher_platform || 'all',
      date: row.date_start,
      impressions: parseInt(row.impressions) || 0,
      clicks: parseInt(row.clicks) || 0,
      results,
      result_type,
      spent,
      reach: parseInt(row.reach) || 0,
      frequency: parseFloat(row.frequency || '0') || 0,
      cpm: parseFloat(row.cpm || '0') || 0,
      cpc: parseFloat(row.cpc || '0') || 0,
      cost_per_result: results > 0 ? parseFloat((spent / results).toFixed(2)) : 0,
      likes: getAction(row.actions, 'post_reaction', 'like'),
      comments: getAction(row.actions, 'comment'),
      shares: getAction(row.actions, 'post'),
      video_plays: getVideoPlays(row),
    };
  });
}

// ─── AD level (with publisher_platform breakdown) ─────────────────────────────
async function fetchAdLevelMetrics(
  accessToken: string,
  adAccountId: string,
  dateRange: { since: string; until: string }
): Promise<AdMetric[]> {
  const params = new URLSearchParams({
    access_token: accessToken,
    level: 'ad',
    fields: [
      'ad_id',
      'ad_name',
      'adset_id',
      'adset_name',
      'campaign_id',
      'campaign_name',
      'impressions',
      'clicks',
      'spend',
      'reach',
      'frequency',
      'cpm',
      'cpc',
      'actions',
      'video_thruplay_watched_actions',
    ].join(','),
    breakdowns: 'publisher_platform',
    time_range: JSON.stringify(dateRange),
    time_increment: '1',
    limit: '500',
  });

  console.log(`[meta] Fetching ADS for ${adAccountId}`);
  const rows = await fetchAllPages<MetaAdRow>(
    `${BASE_URL}/${adAccountId}/insights?${params}`,
    accessToken
  );

  return rows.map((row) => {
    const { count: results, type: result_type } = getPrimaryResult(row.actions, row.video_thruplay_watched_actions);
    const spent = parseFloat(row.spend) || 0;
    return {
      ad_id: row.ad_id,
      ad_name: row.ad_name,
      adset_id: row.adset_id,
      adset_name: row.adset_name,
      campaign_id: row.campaign_id,
      campaign_name: row.campaign_name,
      platform: 'meta' as const,
      network: row.publisher_platform || 'all',
      date: row.date_start,
      impressions: parseInt(row.impressions) || 0,
      clicks: parseInt(row.clicks) || 0,
      results,
      result_type,
      spent,
      reach: parseInt(row.reach) || 0,
      frequency: parseFloat(row.frequency || '0') || 0,
      cpm: parseFloat(row.cpm || '0') || 0,
      cpc: parseFloat(row.cpc || '0') || 0,
      cost_per_result: results > 0 ? parseFloat((spent / results).toFixed(2)) : 0,
      likes: getAction(row.actions, 'post_reaction', 'like'),
      comments: getAction(row.actions, 'comment'),
      shares: getAction(row.actions, 'post'),
      video_plays: getVideoPlays(row),
    };
  });
}

// ─── All accounts, all levels ─────────────────────────────────────────────────
export interface MetaAllData {
  campaigns: DailyMetric[];
  adSets: AdSetMetric[];
  ads: AdMetric[];
}

export async function fetchAllMetaAccounts(
  dateRange: { since: string; until: string }
): Promise<MetaAllData> {
  const accessToken = process.env.META_ACCESS_TOKEN!;
  const accountsEnv =
    process.env.META_AD_ACCOUNT_IDS || process.env.META_AD_ACCOUNT_ID || '';
  const accounts = accountsEnv
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean);

  if (!accounts.length) throw new Error('No Meta accounts configured');

  const allCampaigns: DailyMetric[] = [];
  const allAdSets: AdSetMetric[] = [];
  const allAds: AdMetric[] = [];

  for (const accountId of accounts) {
    console.log(`[meta] ─── Processing account: ${accountId} ───`);

    // Fetch all 3 levels in parallel
    const [campaigns, adSets, ads] = await Promise.all([
      fetchCampaignMetrics(accessToken, accountId, dateRange).catch((err) => {
        console.error(`[meta] Campaign error ${accountId}:`, err.message);
        return [] as DailyMetric[];
      }),
      fetchAdSetMetrics(accessToken, accountId, dateRange).catch((err) => {
        console.error(`[meta] AdSet error ${accountId}:`, err.message);
        return [] as AdSetMetric[];
      }),
      fetchAdLevelMetrics(accessToken, accountId, dateRange).catch((err) => {
        console.error(`[meta] Ad error ${accountId}:`, err.message);
        return [] as AdMetric[];
      }),
    ]);

    console.log(
      `[meta] ${accountId}: campaigns=${campaigns.length}, adSets=${adSets.length}, ads=${ads.length}`
    );

    allCampaigns.push(...campaigns);
    allAdSets.push(...adSets);
    allAds.push(...ads);
  }

  return { campaigns: allCampaigns, adSets: allAdSets, ads: allAds };
}

export function isMetaConfigured(): boolean {
  return !!(
    process.env.META_ACCESS_TOKEN &&
    (process.env.META_AD_ACCOUNT_IDS || process.env.META_AD_ACCOUNT_ID)
  );
}
