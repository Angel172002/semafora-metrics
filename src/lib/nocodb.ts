/**
 * NocoDB REST API client
 * Docs: https://docs.nocodb.com/developer-resources/rest-apis/
 */

const NOCODB_URL = process.env.NOCODB_URL || 'http://localhost:8080';
const NOCODB_API_KEY = process.env.NOCODB_API_KEY || '';

interface NocoDBListResponse<T> {
  list: T[];
  pageInfo: {
    totalRows: number;
    page: number;
    pageSize: number;
    isFirstPage: boolean;
    isLastPage: boolean;
  };
}

// ─── Generic data-API fetch helper ────────────────────────────────────────────
async function nocoFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${NOCODB_URL}/api/v1/db/data/noco/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'xc-token': NOCODB_API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`NocoDB data ${res.status}: ${err}`);
  }

  return res.json() as Promise<T>;
}

// ─── Generic meta-API fetch helper ────────────────────────────────────────────
async function nocoMetaFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${NOCODB_URL}/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'xc-token': NOCODB_API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`NocoDB meta ${res.status}: ${err.slice(0, 400)}`);
  }

  return res.json() as Promise<T>;
}

// ─── Table CRUD ───────────────────────────────────────────────────────────────

/** List rows from a table. Follows a single page (up to limit). */
export async function listRows<T>(
  projectId: string,
  tableId: string,
  params: Record<string, string> = {}
): Promise<T[]> {
  const qs = new URLSearchParams(params).toString();
  const path = `${projectId}/${tableId}${qs ? `?${qs}` : ''}`;
  const res = await nocoFetch<NocoDBListResponse<T>>(path);
  return res.list;
}

/** List ALL rows from a table (handles NocoDB pagination internally). */
export async function listAllRows<T>(
  projectId: string,
  tableId: string,
  extraParams: Record<string, string> = {}
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const params = { ...extraParams, limit: String(limit), offset: String(offset) };
    const qs = new URLSearchParams(params).toString();
    const res = await nocoFetch<NocoDBListResponse<T>>(`${projectId}/${tableId}?${qs}`);
    all.push(...res.list);
    if (res.list.length < limit || res.pageInfo.isLastPage) break;
    offset += limit;
  }

  return all;
}

/** Insert a single row */
export async function insertRow<T>(
  projectId: string,
  tableId: string,
  data: Partial<T>
): Promise<T> {
  return nocoFetch<T>(`${projectId}/${tableId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Bulk insert rows — inserts individually in batches of 10 in parallel */
export async function bulkInsert<T>(
  projectId: string,
  tableId: string,
  rows: Partial<T>[]
): Promise<{ inserted: number }> {
  const BATCH = 10;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await Promise.all(
      batch.map((row) =>
        nocoFetch<T>(`${projectId}/${tableId}`, {
          method: 'POST',
          body: JSON.stringify(row),
        })
      )
    );
    inserted += batch.length;
    if (i % 100 === 0 && i > 0) {
      console.log(`[nocodb] bulkInsert progress: ${inserted}/${rows.length}`);
    }
  }

  return { inserted };
}

/** Update a row by ID */
export async function updateRow<T>(
  projectId: string,
  tableId: string,
  rowId: number,
  data: Partial<T>
): Promise<T> {
  return nocoFetch<T>(`${projectId}/${tableId}/${rowId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** Delete all rows from a table */
export async function clearTable(
  projectId: string,
  tableId: string
): Promise<number> {
  let deleted = 0;
  let hasMore = true;

  while (hasMore) {
    const rows = await listRows<{ Id: number }>(projectId, tableId, {
      limit: '100',
      fields: 'Id',
    });

    if (!rows.length) {
      hasMore = false;
      break;
    }

    await Promise.all(
      rows.map((row) =>
        nocoFetch<unknown>(`${projectId}/${tableId}/${row.Id}`, {
          method: 'DELETE',
        }).catch(() => null)
      )
    );

    deleted += rows.length;
    if (rows.length < 100) hasMore = false;
  }

  console.log(`[nocodb] clearTable ${tableId}: deleted ${deleted} rows`);
  return deleted;
}

/** Delete rows from a table where a specific field equals a value (platform-scoped clear) */
export async function clearRowsWhere(
  projectId: string,
  tableId: string,
  field: string,
  value: string
): Promise<number> {
  let deleted = 0;
  let hasMore = true;

  while (hasMore) {
    const rows = await listRows<{ Id: number }>(projectId, tableId, {
      limit: '100',
      fields: 'Id',
      where: `(${field},eq,${value})`,
    });

    if (!rows.length) {
      hasMore = false;
      break;
    }

    await Promise.all(
      rows.map((row) =>
        nocoFetch<unknown>(`${projectId}/${tableId}/${row.Id}`, {
          method: 'DELETE',
        }).catch(() => null)
      )
    );

    deleted += rows.length;
    if (rows.length < 100) hasMore = false;
  }

  console.log(`[nocodb] clearRowsWhere ${tableId} (${field}=${value}): deleted ${deleted} rows`);
  return deleted;
}

// ─── Meta API: create table ───────────────────────────────────────────────────

/** Create a new NocoDB table and return its ID */
export async function createTable(
  projectId: string,
  title: string,
  columns: { column_name: string; uidt: string; title?: string }[]
): Promise<string> {
  // NocoDB v1 meta API endpoint
  const result = await nocoMetaFetch<{ id: string; title: string }>(
    `api/v1/db/meta/projects/${projectId}/tables`,
    {
      method: 'POST',
      body: JSON.stringify({ title, columns }),
    }
  );
  return result.id;
}

/** Add a single column to an existing table (ignores "already exists" errors) */
export async function addColumn(
  tableId: string,
  column_name: string,
  uidt: string
): Promise<void> {
  try {
    await nocoMetaFetch<unknown>(
      `api/v1/db/meta/tables/${tableId}/columns`,
      {
        method: 'POST',
        body: JSON.stringify({ column_name, title: column_name, uidt }),
      }
    );
  } catch (e) {
    const msg = String(e);
    // Ignore "already exists" or validation errors for duplicate columns
    if (
      !msg.includes('already') &&
      !msg.includes('duplicate') &&
      !msg.includes('422')
    ) {
      throw e;
    }
    console.log(`[nocodb] addColumn '${column_name}' already exists — skipping`);
  }
}

// ─── Health check ─────────────────────────────────────────────────────────────
export async function checkNocoDBConnection(): Promise<boolean> {
  try {
    const res = await fetch(`${NOCODB_URL}/api/v1/health`, {
      headers: { 'xc-token': NOCODB_API_KEY },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default {
  listRows,
  listAllRows,
  insertRow,
  bulkInsert,
  updateRow,
  clearTable,
  clearRowsWhere,
  createTable,
  addColumn,
  checkNocoDBConnection,
};
