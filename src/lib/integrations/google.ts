/**
 * Google Ads API integration (REST v19)
 * Fetches: Campaign level, Ad Group level (= ad sets), Ad level
 * Network breakdown via segments.ad_network_type
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID           — OAuth 2.0 client ID
 *   GOOGLE_CLIENT_SECRET       — OAuth 2.0 client secret
 *   GOOGLE_REFRESH_TOKEN       — Long-lived refresh token
 *   GOOGLE_DEVELOPER_TOKEN     — From Google Ads API Center
 *   GOOGLE_CUSTOMER_ID         — Format: XXXXXXXXXX (no dashes)
 *   GOOGLE_LOGIN_CUSTOMER_ID   — Optional: MCC manager account ID
 *   GOOGLE_CUSTOMER_IDS        — Optional: comma-separated for multi-account
 */

import type { DailyMetric, AdSetMetric, AdMetric, Platform } from '@/types';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_BASE  = 'https://googleads.googleapis.com/v19';

// ─── Network type mapping ──────────────────────────────────────────────────────
// Google API returns an enum for ad_network_type; we map it to lowercase keys
// that are shared across NETWORK_LABELS / NETWORK_COLORS in dataTransform.ts
const NETWORK_KEY: Record<string, string> = {
  SEARCH:                'google_search',
  GOOGLE_SEARCH_NETWORK: 'google_search',
  CONTENT:               'google_display',
  YOUTUBE_WATCH:         'google_video',
  YOUTUBE_SEARCH:        'google_video',
  MIXED:                 'google',
  UNKNOWN:               'google',
  UNSPECIFIED:           'google',
};

// ─── Interfaces ────────────────────────────────────────────────────────────────
interface GoogleTokenResponse {
  access_token: string;
  expires_in:   number;
  token_type:   string;
}

interface GoogleMetrics {
  impressions:  string;
  clicks:       string;
  conversions:  string;
  allConversions: string;
  costMicros:   string;
  videoViews:   string;
}

interface GoogleCampaignRow {
  campaign: { id: string; name: string; status: string };
  metrics:  GoogleMetrics;
  segments: { date: string; adNetworkType: string };
}

interface GoogleAdGroupRow {
  campaign: { id: string; name: string };
  adGroup:  { id: string; name: string; status: string };
  metrics:  Omit<GoogleMetrics, 'videoViews'>;
  segments: { date: string; adNetworkType: string };
}

interface GoogleAdRow {
  campaign:   { id: string; name: string };
  adGroup:    { id: string; name: string };
  adGroupAd:  { ad: { id: string; name: string }; status: string };
  metrics:    Omit<GoogleMetrics, 'videoViews' | 'allConversions'>;
  segments:   { date: string; adNetworkType: string };
}

interface GoogleAdsSearchResponse {
  results?:      unknown[];
  nextPageToken?: string;
}

// ─── Auth: get OAuth2 access token ────────────────────────────────────────────
async function getAccessToken(): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type:    'refresh_token',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google OAuth error ${res.status}: ${err}`);
  }

  const json: GoogleTokenResponse = await res.json();
  return json.access_token;
}

// ─── Execute GAQL with auto-pagination ────────────────────────────────────────
async function gaqlQuery<T>(
  customerId:  string,
  accessToken: string,
  query:       string,
): Promise<T[]> {
  const url     = `${API_BASE}/customers/${customerId}/googleAds:search`;
  const devToken = process.env.GOOGLE_DEVELOPER_TOKEN!;
  const loginId  = process.env.GOOGLE_LOGIN_CUSTOMER_ID || '';

  const headers: Record<string, string> = {
    Authorization:    `Bearer ${accessToken}`,
    'developer-token': devToken,
    'Content-Type':   'application/json',
  };
  // When using a manager (MCC) account to access child accounts
  if (loginId && loginId !== customerId) {
    headers['login-customer-id'] = loginId;
  }

  const results: T[] = [];
  let pageToken: string | undefined;

  do {
    const body: Record<string, string> = { query };
    if (pageToken) body.pageToken = pageToken;

    const res = await fetch(url, {
      method:  'POST',
      headers,
      body:    JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Ads GAQL error ${res.status}: ${err}`);
    }

    const json: GoogleAdsSearchResponse = await res.json();
    results.push(...((json.results as T[]) || []));
    pageToken = json.nextPageToken;
  } while (pageToken);

  return results;
}

// ─── Campaign level ────────────────────────────────────────────────────────────
async function fetchCampaignMetrics(
  customerId:  string,
  accessToken: string,
  dateRange:   { since: string; until: string },
): Promise<DailyMetric[]> {
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.all_conversions,
      metrics.cost_micros,
      metrics.video_views,
      segments.date,
      segments.ad_network_type
    FROM campaign
    WHERE segments.date BETWEEN '${dateRange.since}' AND '${dateRange.until}'
      AND campaign.status != 'REMOVED'
      AND metrics.impressions > 0
    ORDER BY segments.date ASC
    LIMIT 10000
  `;

  const rows = await gaqlQuery<GoogleCampaignRow>(customerId, accessToken, query);

  return rows.map((row) => {
    const conversions = parseFloat(row.metrics.conversions) || 0;
    const spent       = (parseInt(row.metrics.costMicros)   || 0) / 1_000_000;
    const clicks      = parseInt(row.metrics.clicks)         || 0;
    const impressions = parseInt(row.metrics.impressions)    || 0;
    const videoViews  = parseInt(row.metrics.videoViews)     || 0;
    const networkKey  = NETWORK_KEY[row.segments.adNetworkType] || 'google';
    const cpm = impressions > 0 ? parseFloat((spent / impressions * 1000).toFixed(2)) : 0;
    const cpc = clicks      > 0 ? parseFloat((spent / clicks).toFixed(2))              : 0;

    return {
      campaign_id:     row.campaign.id,
      campaign_name:   row.campaign.name,
      platform:        'google' as Platform,
      date:            row.segments.date,
      impressions,
      clicks,
      results:         conversions,
      conversions,
      result_type:     networkKey,           // used as result_type key for badge
      likes:           0,
      shares:          0,
      comments:        0,
      video_plays:     videoViews,
      spent,
      reach:           impressions,          // Google Search has no unique-reach — use impressions
      frequency:       1,
      cpm,
      cpc,
      cost_per_result: conversions > 0 ? parseFloat((spent / conversions).toFixed(2)) : 0,
    };
  });
}

// ─── Ad Group level (= ad sets) ───────────────────────────────────────────────
async function fetchAdGroupMetrics(
  customerId:  string,
  accessToken: string,
  dateRange:   { since: string; until: string },
): Promise<AdSetMetric[]> {
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      ad_group.id,
      ad_group.name,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.cost_micros,
      segments.date,
      segments.ad_network_type
    FROM ad_group
    WHERE segments.date BETWEEN '${dateRange.since}' AND '${dateRange.until}'
      AND ad_group.status != 'REMOVED'
      AND metrics.impressions > 0
    ORDER BY segments.date ASC
    LIMIT 10000
  `;

  const rows = await gaqlQuery<GoogleAdGroupRow>(customerId, accessToken, query);

  return rows.map((row) => {
    const conversions = parseFloat(row.metrics.conversions) || 0;
    const spent       = (parseInt(row.metrics.costMicros)   || 0) / 1_000_000;
    const clicks      = parseInt(row.metrics.clicks)         || 0;
    const impressions = parseInt(row.metrics.impressions)    || 0;
    const networkKey  = NETWORK_KEY[row.segments.adNetworkType] || 'google';
    const cpm = impressions > 0 ? parseFloat((spent / impressions * 1000).toFixed(2)) : 0;
    const cpc = clicks      > 0 ? parseFloat((spent / clicks).toFixed(2))              : 0;

    return {
      adset_id:        row.adGroup.id,
      adset_name:      row.adGroup.name,
      campaign_id:     row.campaign.id,
      campaign_name:   row.campaign.name,
      platform:        'google' as Platform,
      network:         networkKey,
      date:            row.segments.date,
      impressions,
      clicks,
      results:         conversions,
      result_type:     networkKey,
      spent,
      reach:           impressions,
      frequency:       1,
      cpm,
      cpc,
      cost_per_result: conversions > 0 ? parseFloat((spent / conversions).toFixed(2)) : 0,
      likes:           0,
      comments:        0,
      shares:          0,
      video_plays:     0,
    };
  });
}

// ─── Ad level ─────────────────────────────────────────────────────────────────
async function fetchAdLevelMetrics(
  customerId:  string,
  accessToken: string,
  dateRange:   { since: string; until: string },
): Promise<AdMetric[]> {
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      ad_group.id,
      ad_group.name,
      ad_group_ad.ad.id,
      ad_group_ad.ad.name,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.cost_micros,
      segments.date,
      segments.ad_network_type
    FROM ad_group_ad
    WHERE segments.date BETWEEN '${dateRange.since}' AND '${dateRange.until}'
      AND ad_group_ad.status != 'REMOVED'
      AND metrics.impressions > 0
    ORDER BY segments.date ASC
    LIMIT 10000
  `;

  const rows = await gaqlQuery<GoogleAdRow>(customerId, accessToken, query);

  return rows.map((row) => {
    const conversions = parseFloat(row.metrics.conversions) || 0;
    const spent       = (parseInt(row.metrics.costMicros)   || 0) / 1_000_000;
    const clicks      = parseInt(row.metrics.clicks)         || 0;
    const impressions = parseInt(row.metrics.impressions)    || 0;
    const networkKey  = NETWORK_KEY[row.segments.adNetworkType] || 'google';
    const cpm = impressions > 0 ? parseFloat((spent / impressions * 1000).toFixed(2)) : 0;
    const cpc = clicks      > 0 ? parseFloat((spent / clicks).toFixed(2))              : 0;
    // Google ads often have no "name" — fall back to ID
    const adName = row.adGroupAd.ad.name || `Anuncio ${row.adGroupAd.ad.id}`;

    return {
      ad_id:           row.adGroupAd.ad.id,
      ad_name:         adName,
      adset_id:        row.adGroup.id,
      adset_name:      row.adGroup.name,
      campaign_id:     row.campaign.id,
      campaign_name:   row.campaign.name,
      platform:        'google' as Platform,
      network:         networkKey,
      date:            row.segments.date,
      impressions,
      clicks,
      results:         conversions,
      result_type:     networkKey,
      spent,
      reach:           impressions,
      frequency:       1,
      cpm,
      cpc,
      cost_per_result: conversions > 0 ? parseFloat((spent / conversions).toFixed(2)) : 0,
      likes:           0,
      comments:        0,
      shares:          0,
      video_plays:     0,
    };
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────
export interface GoogleAllData {
  campaigns: DailyMetric[];
  adGroups:  AdSetMetric[];   // stored in TABLE_ADSETS
  ads:       AdMetric[];      // stored in TABLE_ADS
}

export async function fetchAllGoogleAccounts(
  dateRange: { since: string; until: string },
): Promise<GoogleAllData> {
  const accessToken = await getAccessToken();

  // Support multiple customer IDs (MCC scenario)
  const rawIds = process.env.GOOGLE_CUSTOMER_IDS || process.env.GOOGLE_CUSTOMER_ID || '';
  const customerIds = rawIds
    .split(',')
    .map((id) => id.trim().replace(/-/g, ''))
    .filter(Boolean);

  if (customerIds.length === 0) {
    throw new Error('No GOOGLE_CUSTOMER_ID configured');
  }

  const allCampaigns: DailyMetric[] = [];
  const allAdGroups:  AdSetMetric[] = [];
  const allAds:       AdMetric[]    = [];

  for (const customerId of customerIds) {
    console.log(`[google] Fetching customer ${customerId}...`);

    const [campaigns, adGroups, ads] = await Promise.all([
      fetchCampaignMetrics(customerId, accessToken, dateRange),
      fetchAdGroupMetrics(customerId, accessToken, dateRange),
      fetchAdLevelMetrics(customerId, accessToken, dateRange),
    ]);

    allCampaigns.push(...campaigns);
    allAdGroups.push(...adGroups);
    allAds.push(...ads);

    console.log(
      `[google] ✓ Customer ${customerId}: campaigns=${campaigns.length}, adGroups=${adGroups.length}, ads=${ads.length}`,
    );
  }

  return { campaigns: allCampaigns, adGroups: allAdGroups, ads: allAds };
}

// Backward-compat for any code that still calls fetchGoogleMetrics
export async function fetchGoogleMetrics(
  dateRange: { since: string; until: string },
): Promise<DailyMetric[]> {
  const { campaigns } = await fetchAllGoogleAccounts(dateRange);
  return campaigns;
}

export function isGoogleConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN &&
    process.env.GOOGLE_DEVELOPER_TOKEN &&
    (process.env.GOOGLE_CUSTOMER_ID || process.env.GOOGLE_CUSTOMER_IDS)
  );
}
