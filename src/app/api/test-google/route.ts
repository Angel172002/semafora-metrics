import { NextResponse } from 'next/server';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_BASE  = 'https://googleads.googleapis.com/v19';

/**
 * GET /api/test-google
 * Diagnostic endpoint — tests Google Ads API connectivity step by step.
 * Returns JSON with each step result so you can see exactly where it fails.
 */
export async function GET() {
  const steps: Record<string, unknown> = {};

  // ─── Step 1: Check env vars ───────────────────────────────────────────────
  const clientId       = process.env.GOOGLE_CLIENT_ID;
  const clientSecret   = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken   = process.env.GOOGLE_REFRESH_TOKEN;
  const developerToken = process.env.GOOGLE_DEVELOPER_TOKEN;
  const customerId     = (process.env.GOOGLE_CUSTOMER_ID || '').replace(/-/g, '');
  const loginId        = process.env.GOOGLE_LOGIN_CUSTOMER_ID || '';

  steps['1_env_vars'] = {
    clientId:       clientId ? `✓ set (${clientId.slice(0, 8)}…)` : '✗ MISSING',
    clientSecret:   clientSecret ? '✓ set' : '✗ MISSING',
    refreshToken:   refreshToken ? `✓ set (${refreshToken.slice(0, 12)}…)` : '✗ MISSING',
    developerToken: developerToken ? `✓ set (${developerToken})` : '✗ MISSING',
    customerId:     customerId || '✗ MISSING',
    loginId:        loginId || '(not set)',
  };

  if (!clientId || !clientSecret || !refreshToken || !developerToken || !customerId) {
    return NextResponse.json({ steps, error: 'Missing required env vars — check step 1' }, { status: 400 });
  }

  // ─── Step 2: Get OAuth access token ─────────────────────────────────────
  let accessToken = '';
  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type:    'refresh_token',
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || tokenJson.error) {
      steps['2_oauth_token'] = { error: tokenJson.error_description || tokenJson.error || `HTTP ${tokenRes.status}` };
      return NextResponse.json({ steps, error: 'OAuth token refresh failed — check step 2' }, { status: 400 });
    }
    accessToken = tokenJson.access_token;
    steps['2_oauth_token'] = { ok: true, expires_in: tokenJson.expires_in };
  } catch (e) {
    steps['2_oauth_token'] = { error: String(e) };
    return NextResponse.json({ steps, error: 'OAuth token request threw — check step 2' }, { status: 500 });
  }

  // ─── Step 3: List accessible customers ──────────────────────────────────
  try {
    const headers: Record<string, string> = {
      Authorization:    `Bearer ${accessToken}`,
      'developer-token': developerToken,
    };
    const res = await fetch(`${API_BASE}/customers:listAccessibleCustomers`, { headers });
    const json = await res.json();
    steps['3_list_customers'] = {
      status: res.status,
      ok: res.ok,
      body: json,
    };
  } catch (e) {
    steps['3_list_customers'] = { error: String(e) };
  }

  // ─── Step 4: Simple GAQL query ───────────────────────────────────────────
  try {
    const headers: Record<string, string> = {
      Authorization:    `Bearer ${accessToken}`,
      'developer-token': developerToken,
      'Content-Type':   'application/json',
    };
    if (loginId && loginId !== customerId) {
      headers['login-customer-id'] = loginId;
    }

    const url = `${API_BASE}/customers/${customerId}/googleAds:search`;
    const query = `SELECT campaign.id, campaign.name, campaign.status FROM campaign LIMIT 5`;
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query }),
    });
    const text = await res.text();
    let parsed: unknown = text;
    try { parsed = JSON.parse(text); } catch { /* keep as text */ }
    steps['4_gaql_query'] = {
      status: res.status,
      ok: res.ok,
      customerId,
      loginId: loginId || '(none)',
      body: parsed,
    };
  } catch (e) {
    steps['4_gaql_query'] = { error: String(e) };
  }

  const allOk = (steps['3_list_customers'] as { ok?: boolean })?.ok &&
                (steps['4_gaql_query'] as { ok?: boolean })?.ok;

  return NextResponse.json({
    steps,
    summary: allOk
      ? '✅ Google Ads API is working — run POST /api/sync {"platforms":["google"],"days":30}'
      : '❌ Google Ads API has issues — check individual steps above',
  }, { status: 200 });
}
