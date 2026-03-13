/**
 * cache.ts — TTL-based cache layer
 *
 * In development / single-instance: in-memory Map (zero config)
 * In production (Vercel): uses Upstash Redis if configured, falls back to in-memory.
 *
 * Optional env vars (Upstash):
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * Usage:
 *   const data = await cacheGet<DashboardData>('metrics:tenant1:30d');
 *   if (!data) {
 *     const fresh = await fetchExpensiveData();
 *     await cacheSet('metrics:tenant1:30d', fresh, 300); // 5 min TTL
 *     return fresh;
 *   }
 *   return data;
 */

// ─── In-memory fallback ───────────────────────────────────────────────────────

interface MemEntry<T> {
  value:   T;
  expiresAt: number; // unix ms
}

const memStore = new Map<string, MemEntry<unknown>>();

// Cleanup expired entries every 2 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of memStore) {
      if (v.expiresAt < now) memStore.delete(k);
    }
  }, 2 * 60 * 1000);
}

function memGet<T>(key: string): T | null {
  const entry = memStore.get(key) as MemEntry<T> | undefined;
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) { memStore.delete(key); return null; }
  return entry.value;
}

function memSet<T>(key: string, value: T, ttlSeconds: number): void {
  memStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function memDel(key: string): void {
  memStore.delete(key);
}

function memDelPattern(pattern: string): void {
  const prefix = pattern.replace('*', '');
  for (const k of memStore.keys()) {
    if (k.startsWith(prefix)) memStore.delete(k);
  }
}

// ─── Upstash Redis ────────────────────────────────────────────────────────────

function isUpstashConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function upstashGet<T>(key: string): Promise<T | null> {
  const url   = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  try {
    const res  = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal:  AbortSignal.timeout(2000),
    });
    const json = await res.json() as { result: string | null };
    if (!json.result) return null;
    return JSON.parse(json.result) as T;
  } catch {
    return null;
  }
}

async function upstashSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const url   = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  try {
    await fetch(`${url}/set/${encodeURIComponent(key)}`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ value: JSON.stringify(value), ex: ttlSeconds }),
      signal:  AbortSignal.timeout(2000),
    });
  } catch { /* fire-and-forget */ }
}

async function upstashDel(key: string): Promise<void> {
  const url   = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  try {
    await fetch(`${url}/del/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(2000),
    });
  } catch { /* ignore */ }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (isUpstashConfigured()) return upstashGet<T>(key);
  return memGet<T>(key);
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds = 300
): Promise<void> {
  if (isUpstashConfigured()) {
    await upstashSet(key, value, ttlSeconds);
    return;
  }
  memSet(key, value, ttlSeconds);
}

export async function cacheDel(key: string): Promise<void> {
  if (isUpstashConfigured()) { await upstashDel(key); return; }
  memDel(key);
}

/** Invalidate all keys matching a prefix pattern (e.g. 'metrics:tenant:1:*') */
export function cacheInvalidatePrefix(prefix: string): void {
  // In-memory: synchronous prefix deletion
  memDelPattern(prefix + '*');
  // Upstash: would need SCAN (not trivial) — skip for now, rely on TTL
}

// ─── Cache key builders ────────────────────────────────────────────────────────

export const CacheKeys = {
  metrics:    (tenantId: number, range: string) => `metrics:t${tenantId}:${range}`,
  crmStats:   (tenantId: number)                => `crm_stats:t${tenantId}`,
  stages:     (tenantId: number)                => `crm_stages:t${tenantId}`,
  users:      (tenantId: number)                => `crm_users:t${tenantId}`,
  billing:    (tenantId: number)                => `billing:t${tenantId}`,
};

// TTLs in seconds
export const CacheTTL = {
  METRICS:   5  * 60,  // 5 min  — dashboard data
  CRM_STATS: 2  * 60,  // 2 min  — CRM pipeline stats
  STAGES:    10 * 60,  // 10 min — stages rarely change
  USERS:     10 * 60,  // 10 min — users rarely change
  BILLING:   5  * 60,  // 5 min  — subscription status
};
