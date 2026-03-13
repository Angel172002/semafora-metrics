/**
 * audit.ts — Structured audit log
 *
 * Records who did what, when, and to which resource.
 * Stored in NocoDB table "Audit_Log".
 *
 * Required env var (after running /api/setup):
 *   NOCODB_TABLE_AUDIT_LOG
 *
 * Fire-and-forget: never throws, never blocks the main request.
 *
 * Usage:
 *   import { audit } from '@/lib/audit';
 *
 *   audit({
 *     tenantId:   session.tenant_id,
 *     userId:     session.sub,
 *     userEmail:  session.email,
 *     action:     'lead.update',
 *     resource:   'crm_lead',
 *     resourceId: String(leadId),
 *     ip:         getClientIp(req),
 *     after:      { Stage_Id: newStageId, Estado: 'ganado' },
 *   });
 */
import { insertRow } from './nocodb';

const MASTER_PROJ  = process.env.NOCODB_PROJECT_ID     ?? '';
const AUDIT_TABLE  = process.env.NOCODB_TABLE_AUDIT_LOG ?? '';

export type AuditAction =
  // Auth
  | 'auth.login' | 'auth.logout' | 'auth.register'
  // CRM
  | 'lead.create' | 'lead.update' | 'lead.delete' | 'lead.stage_change'
  | 'activity.create'
  // Metrics
  | 'sync.start' | 'sync.complete' | 'sync.error'
  // Billing
  | 'billing.checkout' | 'billing.portal' | 'billing.plan_change' | 'billing.cancel'
  // Admin
  | 'setup.run' | 'user.create' | 'user.update' | 'user.deactivate';

export interface AuditEntry {
  tenantId:   number;
  userId:     number;
  userEmail:  string;
  action:     AuditAction;
  resource?:  string;
  resourceId?: string;
  ip?:        string;
  before?:    Record<string, unknown>;
  after?:     Record<string, unknown>;
  metadata?:  Record<string, unknown>;
}

function nowForNoco(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * Write an audit log entry. Fire-and-forget — never throws.
 */
export function audit(entry: AuditEntry): void {
  if (!AUDIT_TABLE || !MASTER_PROJ) return;

  insertRow(MASTER_PROJ, AUDIT_TABLE, {
    Tenant_Id:   entry.tenantId,
    User_Id:     entry.userId,
    User_Email:  entry.userEmail,
    Action:      entry.action,
    Resource:    entry.resource    ?? '',
    Resource_Id: entry.resourceId  ?? '',
    IP:          entry.ip          ?? '',
    Before:      entry.before      ? JSON.stringify(entry.before)   : '',
    After:       entry.after       ? JSON.stringify(entry.after)    : '',
    Metadata:    entry.metadata    ? JSON.stringify(entry.metadata) : '',
    Timestamp:   nowForNoco(),
  }).catch((e) => {
    console.warn('[audit] Failed to write log:', e);
  });
}

// ─── Columns for /api/setup ───────────────────────────────────────────────────

export const AUDIT_LOG_COLUMNS = [
  { column_name: 'Tenant_Id',   uidt: 'Number' },
  { column_name: 'User_Id',     uidt: 'Number' },
  { column_name: 'User_Email',  uidt: 'Email' },
  { column_name: 'Action',      uidt: 'SingleLineText' },
  { column_name: 'Resource',    uidt: 'SingleLineText' },
  { column_name: 'Resource_Id', uidt: 'SingleLineText' },
  { column_name: 'IP',          uidt: 'SingleLineText' },
  { column_name: 'Before',      uidt: 'LongText' },
  { column_name: 'After',       uidt: 'LongText' },
  { column_name: 'Metadata',    uidt: 'LongText' },
  { column_name: 'Timestamp',   uidt: 'DateTime' },
];
