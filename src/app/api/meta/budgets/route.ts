import { NextResponse } from 'next/server';

/**
 * GET /api/meta/budgets
 * Fetches campaign-level budget info directly from Meta Marketing API.
 * Returns daily_budget or lifetime_budget per campaign (in COP).
 * Meta returns budgets in the account's minimum currency unit (centavos for COP).
 * We divide by 100 to get the amount in full pesos.
 */

const API_VERSION  = process.env.META_API_VERSION || 'v21.0';
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || '';
const AD_ACCOUNTS  = (process.env.META_AD_ACCOUNT_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);

export interface CampaignBudget {
  campaign_id: string;
  campaign_name: string;
  account_id: string;
  status: string;
  budget: number;           // in COP (full pesos)
  budget_type: 'daily' | 'lifetime' | 'none';
}

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  daily_budget?: string;
  lifetime_budget?: string;
  budget_remaining?: string;
}

interface MetaPagedResponse {
  data: MetaCampaign[];
  paging?: { next?: string };
  error?: { message: string; code: number };
}

async function fetchAllPages(url: string): Promise<MetaCampaign[]> {
  const all: MetaCampaign[] = [];
  let nextUrl: string | null = url;
  let page = 0;

  while (nextUrl && page < 30) {
    page++;
    const fetchUrl = nextUrl.includes('access_token') ? nextUrl : `${nextUrl}&access_token=${ACCESS_TOKEN}`;
    const res  = await fetch(fetchUrl);
    const json: MetaPagedResponse = await res.json();
    if (json.error) throw new Error(`Meta API ${json.error.code}: ${json.error.message}`);
    if (json.data?.length) all.push(...json.data);
    nextUrl = json.paging?.next || null;
    if (nextUrl) await new Promise((r) => setTimeout(r, 200));
  }
  return all;
}

export async function GET() {
  if (!ACCESS_TOKEN) {
    return NextResponse.json({ success: false, error: 'META_ACCESS_TOKEN not configured', data: [] }, { status: 503 });
  }
  if (!AD_ACCOUNTS.length) {
    return NextResponse.json({ success: false, error: 'META_AD_ACCOUNT_IDS not configured', data: [] }, { status: 503 });
  }

  try {
    const results: CampaignBudget[] = [];

    for (const accountId of AD_ACCOUNTS) {
      const fields = 'id,name,status,effective_status,daily_budget,lifetime_budget,budget_remaining';
      const url = `https://graph.facebook.com/${API_VERSION}/${accountId}/campaigns?fields=${fields}&limit=500&access_token=${ACCESS_TOKEN}`;
      const campaigns = await fetchAllPages(url);

      for (const c of campaigns) {
        const daily    = c.daily_budget    ? parseInt(c.daily_budget)    : 0;
        const lifetime = c.lifetime_budget ? parseInt(c.lifetime_budget) : 0;

        results.push({
          campaign_id:   c.id,
          campaign_name: c.name,
          account_id:    accountId,
          status:        c.effective_status || c.status,
          // Meta returns budgets in minimum currency unit (centavos); divide by 100 → COP pesos
          budget:        daily > 0 ? Math.round(daily / 100) : lifetime > 0 ? Math.round(lifetime / 100) : 0,
          budget_type:   daily > 0 ? 'daily' : lifetime > 0 ? 'lifetime' : 'none',
        });
      }
    }

    return NextResponse.json({ success: true, data: results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg, data: [] }, { status: 500 });
  }
}
