// ─── Platform types ───────────────────────────────────────────────────────────
export type Platform = 'meta' | 'google' | 'tiktok' | 'instagram' | 'linkedin';
export type CampaignStatus = 'active' | 'paused' | 'ended';
export type DateRange = '7d' | '30d' | '90d' | 'all';

// ─── Core data models ─────────────────────────────────────────────────────────
export interface Campaign {
  id: number;
  name: string;
  platform: Platform;
  status: CampaignStatus;
  budget_total: number;
  external_id?: string;
  created_at: string;
}

/** Campaign-level daily metric */
export interface DailyMetric {
  id?: number;
  campaign_id: string;           // stored as string to avoid JS int overflow
  campaign_name: string;
  platform: Platform;
  date: string;                  // ISO: YYYY-MM-DD
  impressions: number;
  clicks: number;
  results: number;               // primary result (messaging_conversation_started_7d)
  conversions: number;           // backward-compat alias = results
  result_type: string;           // action type string
  likes: number;
  shares: number;
  comments: number;
  video_plays: number;
  spent: number;
  reach: number;
  frequency: number;
  cpm: number;
  cpc: number;
  cost_per_result: number;
}

/** Ad Set-level metric with publisher_platform breakdown (Meta) or ad_network_type (Google) */
export interface AdSetMetric {
  id?: number;
  adset_id: string;
  adset_name: string;
  campaign_id: string;
  campaign_name: string;
  platform: Platform;
  network: string;               // facebook | instagram | google_search | google_display | youtube …
  date: string;
  impressions: number;
  clicks: number;
  results: number;
  result_type: string;
  spent: number;
  reach: number;
  frequency: number;
  cpm: number;
  cpc: number;
  cost_per_result: number;
  likes: number;
  comments: number;
  shares: number;
  video_plays: number;
}

/** Ad-level metric with publisher_platform breakdown (Meta) or ad_network_type (Google) */
export interface AdMetric {
  id?: number;
  ad_id: string;
  ad_name: string;
  adset_id: string;
  adset_name: string;
  campaign_id: string;
  campaign_name: string;
  platform: Platform;
  network: string;
  date: string;
  impressions: number;
  clicks: number;
  results: number;
  result_type: string;
  spent: number;
  reach: number;
  frequency: number;
  cpm: number;
  cpc: number;
  cost_per_result: number;
  likes: number;
  comments: number;
  shares: number;
  video_plays: number;
}

export interface SyncLog {
  id?: number;
  synced_at: string;
  platform: Platform | 'all';
  status: 'success' | 'error';
  records_synced: number;
  error_message?: string;
}

// ─── Dashboard aggregated data ─────────────────────────────────────────────────
export interface KpiSummary {
  total_impressions: number;
  total_results: number;          // messaging conversations
  total_spent: number;
  total_clicks: number;
  total_reach: number;
  total_likes: number;
  total_conversions: number;      // backward-compat = total_results
  impressions_change: number;
  results_change: number;
  spent_change: number;
  clicks_change: number;
  reach_change: number;
  likes_change: number;
  conversions_change: number;     // backward-compat = results_change
}

export interface DailyChartPoint {
  date: string;
  clicks: number;
  results: number;
  conversions: number;            // backward-compat = results
  spent: number;
  likes: number;
  impressions: number;
  reach: number;
}

export interface CampaignChartItem {
  name: string;
  clicks: number;
  results: number;
  conversions: number;            // backward-compat
  likes: number;
  spent: number;
  impressions: number;
}

export interface PlatformBudget {
  platform: string;
  label: string;
  spent: number;
  percentage: number;
  color: string;
}

export interface CampaignTableRow {
  id: string;
  name: string;
  platform: Platform;
  status: CampaignStatus;
  impressions: number;
  clicks: number;
  results: number;
  result_type: string;
  ctr: number;
  cpm: number;
  cpc: number;
  cost_per_result: number;
  spent: number;
  reach: number;
  frequency: number;
}

export interface AdSetTableRow {
  id: string;
  adset_name: string;
  campaign_name: string;
  network: string;
  impressions: number;
  clicks: number;
  results: number;
  result_type: string;
  ctr: number;
  cpm: number;
  cpc: number;
  cost_per_result: number;
  spent: number;
  reach: number;
  frequency: number;
}

export interface AdTableRow {
  id: string;
  ad_name: string;
  adset_name: string;
  campaign_name: string;
  network: string;
  impressions: number;
  clicks: number;
  results: number;
  result_type: string;
  ctr: number;
  cpm: number;
  cpc: number;
  cost_per_result: number;
  spent: number;
  reach: number;
}

export interface NetworkBreakdownItem {
  network: string;
  label: string;
  impressions: number;
  clicks: number;
  results: number;
  spent: number;
  percentage: number;
  color: string;
}

export interface DashboardData {
  kpis: KpiSummary;
  dailyChart: DailyChartPoint[];
  campaignChart: CampaignChartItem[];
  platformBudget: PlatformBudget[];
  campaignsTable: CampaignTableRow[];
  adSetsTable: AdSetTableRow[];
  adsTable: AdTableRow[];
  networkBreakdown: NetworkBreakdownItem[];
  lastSync: string | null;
  isMockData: boolean;
}

// ─── API responses ─────────────────────────────────────────────────────────────
export interface MetricsResponse {
  success: boolean;
  data: DashboardData;
  error?: string;
}

export interface SyncResponse {
  success: boolean;
  synced: number;
  platforms: string[];
  error?: string;
}

// ─── Settings (stored in localStorage) ───────────────────────────────────────
export interface AppSettings {
  nocodbUrl: string;
  nocodbApiKey: string;
  metaAccessToken: string;
  metaAdAccountId: string;
  googleRefreshToken: string;
  googleCustomerId: string;
  tiktokAccessToken: string;
  tiktokAdvertiserId: string;
  syncIntervalHours: number;
  useMockData: boolean;
}
