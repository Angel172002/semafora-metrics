/**
 * TikTok Marketing API integration
 * Docs: https://business-api.tiktok.com/portal/docs?id=1740302848100353
 *
 * Required env vars:
 *   TIKTOK_ACCESS_TOKEN
 *   TIKTOK_ADVERTISER_ID
 */

import type { DailyMetric } from '@/types';

const API_BASE = 'https://business-api.tiktok.com/open_api/v1.3';

interface TikTokDimensions {
  stat_time_day: string;
  campaign_id: string;
  campaign_name: string;
}

interface TikTokMetrics {
  click: string;
  conversion: string;
  spend: string;
  impressions: string;
  reach: string;
  likes: string;
  shares: string;
  comments: string;
  video_play_actions: string;
  video_views_p100: string;
}

interface TikTokRow {
  dimensions: TikTokDimensions;
  metrics: TikTokMetrics;
}

interface TikTokResponse {
  code: number;
  message: string;
  data: {
    list: TikTokRow[];
    page_info: { page: number; page_size: number; total_number: number };
  };
}

export async function fetchTikTokMetrics(
  accessToken: string,
  advertiserId: string,
  dateRange: { since: string; until: string }
): Promise<DailyMetric[]> {
  const params = new URLSearchParams({
    advertiser_id: advertiserId,
    report_type: 'BASIC',
    dimensions: JSON.stringify(['campaign_id', 'stat_time_day']),
    metrics: JSON.stringify([
      'impressions',
      'click',
      'conversion',
      'spend',
      'reach',
      'likes',
      'shares',
      'comments',
      'video_play_actions',
      'video_views_p100',
    ]),
    data_level: 'AUCTION_CAMPAIGN',
    start_date: dateRange.since,
    end_date: dateRange.until,
    page_size: '1000',
  });

  const res = await fetch(`${API_BASE}/report/integrated/get/?${params}`, {
    headers: {
      'Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) throw new Error(`TikTok API HTTP error: ${res.status}`);

  const json: TikTokResponse = await res.json();
  if (json.code !== 0) throw new Error(`TikTok API error: ${json.message}`);

  return (json.data?.list || []).map((row) => {
    const conversions = parseInt(row.metrics.conversion) || 0;
    const spent = parseFloat(row.metrics.spend) || 0;
    const clicks = parseInt(row.metrics.click) || 0;
    const impressions = parseInt(row.metrics.impressions) || 0;
    return {
      campaign_id: row.dimensions.campaign_id || '0',
      campaign_name: row.dimensions.campaign_name || `Campaign ${row.dimensions.campaign_id}`,
      platform: 'tiktok' as const,
      date: row.dimensions.stat_time_day.split(' ')[0],
      impressions,
      clicks,
      results: conversions,
      conversions,
      result_type: 'conversion',
      likes: parseInt(row.metrics.likes) || 0,
      shares: parseInt(row.metrics.shares) || 0,
      comments: parseInt(row.metrics.comments) || 0,
      video_plays: parseInt(row.metrics.video_play_actions) || parseInt(row.metrics.video_views_p100) || 0,
      spent,
      reach: parseInt(row.metrics.reach) || 0,
      frequency: 0,
      cpm: impressions > 0 ? parseFloat((spent / impressions * 1000).toFixed(2)) : 0,
      cpc: clicks > 0 ? parseFloat((spent / clicks).toFixed(2)) : 0,
      cost_per_result: conversions > 0 ? parseFloat((spent / conversions).toFixed(2)) : 0,
    };
  });
}

export function isTikTokConfigured(): boolean {
  return !!(process.env.TIKTOK_ACCESS_TOKEN && process.env.TIKTOK_ADVERTISER_ID);
}
