/**
 * crypto.ts — AES-256-GCM encryption for sensitive stored values
 *
 * Used to encrypt/decrypt API keys and tokens stored in NocoDB.
 *
 * Required env var:
 *   ENCRYPTION_KEY — 32-byte hex string (generate: openssl rand -hex 32)
 *
 * Format: base64url( iv[12] || authTag[16] || ciphertext )
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH  = 12;  // 96-bit IV for GCM
const TAG_LENGTH = 16;  // 128-bit auth tag

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY ?? '';
  if (raw.length === 64) {
    // 32-byte hex string
    return Buffer.from(raw, 'hex');
  }
  if (raw.length >= 32) {
    // Derive 32 bytes from any string (dev fallback)
    return createHash('sha256').update(raw).digest();
  }
  // Hardcoded dev key — NEVER use in production
  console.warn('[crypto] ENCRYPTION_KEY not set — using insecure dev key. Set this in production!');
  return createHash('sha256').update('dev-encryption-key-change-in-prod').digest();
}

// ─── Encrypt ──────────────────────────────────────────────────────────────────

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv  = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Pack: iv || tag || ciphertext
  const packed = Buffer.concat([iv, tag, encrypted]);
  return packed.toString('base64url');
}

// ─── Decrypt ──────────────────────────────────────────────────────────────────

export function decrypt(ciphertext: string): string {
  const key    = getKey();
  const packed = Buffer.from(ciphertext, 'base64url');

  if (packed.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Invalid ciphertext: too short');
  }

  const iv         = packed.subarray(0, IV_LENGTH);
  const tag        = packed.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const data       = packed.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher   = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

// ─── Safe decrypt ─────────────────────────────────────────────────────────────

/** Decrypt without throwing — returns null on failure */
export function safeDecrypt(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return null;
  try { return decrypt(ciphertext); }
  catch { return null; }
}

// ─── Mask for display ─────────────────────────────────────────────────────────

/** Returns "sk_li...3abc" style masked value for display */
export function maskSecret(value: string, visibleChars = 4): string {
  if (value.length <= visibleChars * 2) return '•'.repeat(8);
  return `${value.slice(0, visibleChars)}${'•'.repeat(8)}${value.slice(-visibleChars)}`;
}
