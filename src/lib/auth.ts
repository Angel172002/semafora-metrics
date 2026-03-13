/**
 * auth.ts — User authentication and password utilities
 *
 * Password storage: SHA-256(PEPPER + salt + password)
 * Simple and dep-free. Upgrade to bcrypt/argon2 for production if needed.
 *
 * Required env vars:
 *   NOCODB_TABLE_USERS  — NocoDB table ID for the users table (optional)
 *   PASSWORD_PEPPER     — Random secret pepper for password hashing
 */
import { createHash, timingSafeEqual, randomBytes } from 'node:crypto';
import { listAllRows } from './nocodb';
import type { SessionPayload } from './session';

const PEPPER      = process.env.PASSWORD_PEPPER ?? 'dev-pepper-change-in-production';
const MASTER_PROJ = process.env.NOCODB_PROJECT_ID ?? '';
const USERS_TABLE = process.env.NOCODB_TABLE_USERS ?? '';

// ─── Password hashing ─────────────────────────────────────────────────────────

export function hashPassword(
  password: string,
  salt = randomBytes(16).toString('hex')
): { hash: string; salt: string } {
  const hash = createHash('sha256')
    .update(PEPPER + salt + password)
    .digest('hex');
  return { hash, salt };
}

export function verifyPassword(
  password: string,
  storedHash: string,
  salt: string
): boolean {
  const { hash } = hashPassword(password, salt);
  const bufA = Buffer.from(hash,       'hex');
  const bufB = Buffer.from(storedHash, 'hex');
  if (bufA.length !== bufB.length) return false;
  try {
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// ─── NocoDB user row ──────────────────────────────────────────────────────────

interface UserRow {
  Id:             number;
  Email:          string;
  Nombre:         string;
  Password_Hash:  string;
  Password_Salt:  string;
  Rol:            'admin' | 'analista' | 'comercial';
  Activo:         boolean;
  Tenant_Id:      number;
  Tenant_Nombre:  string;
  Noco_Project_Id: string;
}

// ─── Resolve user from DB ─────────────────────────────────────────────────────

async function resolveFromDB(
  email: string,
  password: string
): Promise<Omit<SessionPayload, 'iat' | 'exp'> | null> {
  if (!USERS_TABLE || !MASTER_PROJ) return null;

  try {
    const rows = await listAllRows<UserRow>(MASTER_PROJ, USERS_TABLE, {
      where:  `(Email,eq,${email})~and(Activo,eq,true)`,
      limit:  '1',
    });

    if (!rows.length) return null;
    const user = rows[0];

    if (!verifyPassword(password, user.Password_Hash, user.Password_Salt)) return null;

    return {
      sub:           user.Id,
      email:         user.Email,
      nombre:        user.Nombre,
      role:          user.Rol,
      tenant_id:     user.Tenant_Id,
      tenant_nombre: user.Tenant_Nombre,
      project_id:    user.Noco_Project_Id || MASTER_PROJ,
    };
  } catch (e) {
    console.warn('[auth] DB user resolution failed:', e);
    return null;
  }
}

// ─── Fallback: env-var single-user ────────────────────────────────────────────

function resolveFromEnv(
  username: string,
  password: string
): Omit<SessionPayload, 'iat' | 'exp'> | null {
  const validUser = process.env.DASHBOARD_USER;
  const validPass = process.env.DASHBOARD_PASSWORD;
  if (!validUser || !validPass) return null;
  if (username !== validUser || password !== validPass) return null;

  return {
    sub:           0,
    email:         validUser,
    nombre:        'Administrador',
    role:          'admin',
    tenant_id:     0,
    tenant_nombre: 'Default',
    project_id:    MASTER_PROJ,
  };
}

// ─── Public: authenticate ─────────────────────────────────────────────────────

/**
 * Authenticates a user by email/password.
 * Tries NocoDB users table first, falls back to env vars.
 * Returns session payload on success, null on failure.
 */
export async function authenticate(
  emailOrUsername: string,
  password: string
): Promise<Omit<SessionPayload, 'iat' | 'exp'> | null> {
  // 1. Try DB (email-based, case-insensitive)
  const dbUser = await resolveFromDB(emailOrUsername.toLowerCase().trim(), password);
  if (dbUser) return dbUser;

  // 2. Fallback to env vars (username match)
  return resolveFromEnv(emailOrUsername, password);
}
