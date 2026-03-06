import { NextResponse } from 'next/server';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text.substring(0, 500) }; }
}

export async function GET() {
  const results: Record<string, unknown> = {};

  // Step 1: Get access token
  let accessToken = '';
  try {
    const r = await fetch(TOKEN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
        grant_type:    'refresh_token',
      }),
    });
    const j = await r.json() as { access_token?: string; scope?: string; error?: string };
    accessToken = j.access_token || '';
    results['step1_oauth'] = { ok: !!accessToken, scope: j.scope, error: j.error };
  } catch (e) { results['step1_oauth'] = { exception: String(e) }; }

  if (!accessToken) return NextResponse.json(results);

  // Step 2: Check which Google account owns this token (tokeninfo — full body)
  try {
    const r = await fetch(
      `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`,
    );
    const body = await safeJson(r);
    results['step2_tokeninfo_full'] = { status: r.status, body };
  } catch (e) { results['step2_tokeninfo_full'] = { exception: String(e) }; }

  // Step 2b: Try v3 tokeninfo (might return sub/email)
  try {
    const r = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`,
    );
    const body = await safeJson(r);
    results['step2b_tokeninfo_v3'] = { status: r.status, body };
  } catch (e) { results['step2b_tokeninfo_v3'] = { exception: String(e) }; }

  const dev = process.env.GOOGLE_DEVELOPER_TOKEN!;
  const mcc = process.env.GOOGLE_LOGIN_CUSTOMER_ID || '';
  const cid = process.env.GOOGLE_CUSTOMER_ID || '';
  const base = { Authorization: `Bearer ${accessToken}`, 'developer-token': dev };

  // Step 3: listAccessibleCustomers v19 — the KEY test
  try {
    const r = await fetch('https://googleads.googleapis.com/v19/customers:listAccessibleCustomers', {
      headers: base,
    });
    results['step3_list_v19'] = { status: r.status, body: await safeJson(r) };
  } catch (e) { results['step3_list_v19'] = { exception: String(e) }; }

  // Step 4: GAQL on CLIENT with login-customer-id
  if (cid && mcc) {
    try {
      const r = await fetch(`https://googleads.googleapis.com/v19/customers/${cid}/googleAds:search`, {
        method:  'POST',
        headers: { ...base, 'Content-Type': 'application/json', 'login-customer-id': mcc },
        body:    JSON.stringify({ query: 'SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1' }),
      });
      results['step4_gaql_client'] = { status: r.status, body: await safeJson(r) };
    } catch (e) { results['step4_gaql_client'] = { exception: String(e) }; }
  }

  // Step 5: GAQL on MCC
  if (mcc) {
    try {
      const r = await fetch(`https://googleads.googleapis.com/v19/customers/${mcc}/googleAds:search`, {
        method:  'POST',
        headers: { ...base, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query: 'SELECT customer.id, customer.descriptive_name, customer.manager FROM customer LIMIT 1' }),
      });
      results['step5_gaql_mcc'] = { status: r.status, body: await safeJson(r) };
    } catch (e) { results['step5_gaql_mcc'] = { exception: String(e) }; }
  }

  // Step 6: Try with WRONG dev token on purpose — should get 403 if oauth is good
  try {
    const r = await fetch('https://googleads.googleapis.com/v19/customers:listAccessibleCustomers', {
      headers: { Authorization: `Bearer ${accessToken}`, 'developer-token': 'INTENTIONALLY_WRONG_TOKEN' },
    });
    results['step6_wrong_devtoken'] = { status: r.status, body: await safeJson(r) };
  } catch (e) { results['step6_wrong_devtoken'] = { exception: String(e) }; }

  // Step 7: Try Customer Service REST endpoint (alternative path)
  if (cid) {
    try {
      const r = await fetch(`https://googleads.googleapis.com/v19/customers/${cid}`, {
        headers: { ...base, 'login-customer-id': mcc },
      });
      results['step7_get_customer'] = { status: r.status, body: await safeJson(r) };
    } catch (e) { results['step7_get_customer'] = { exception: String(e) }; }
  }

  results['_config'] = {
    customer_id:           cid,
    login_customer_id:     mcc,
    dev_token_length:      dev?.length,
    dev_token_preview:     dev ? `${dev.substring(0, 4)}...${dev.slice(-4)}` : 'MISSING',
    refresh_token_preview: process.env.GOOGLE_REFRESH_TOKEN
      ? `${process.env.GOOGLE_REFRESH_TOKEN.substring(0, 8)}...`
      : 'MISSING',
  };

  return NextResponse.json(results);
}
