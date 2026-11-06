import crypto from 'crypto';

/**
 * Field-level encryption for PHI (e.g. clinical notes) using AES-256-GCM.
 * Stored format: enc:v1:<iv>:<authTag>:<ciphertext>   (each part base64)
 *
 * - The key comes from PHI_ENCRYPTION_KEY (32 random bytes, base64). Losing the key makes the data unrecoverable.
 * - `aad` (additional authenticated data) binds a ciphertext to its record, so a ciphertext copied onto another
 *   record fails to decrypt.
 * - Values without the prefix are treated as legacy plaintext and returned unchanged.
 */
const PREFIX = 'enc:v1:';
let warnedNoKey = false;

const getKey = (): Buffer | null => {
  const raw = process.env.PHI_ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('PHI_ENCRYPTION_KEY must be 32 bytes, base64-encoded (generate with: openssl rand -base64 32)');
  }
  return key;
};

/** Call once at startup. In production the server refuses to start without a valid key. */
export const assertPhiKeyConfigured = (): void => {
  const key = getKey();
  if (!key && process.env.NODE_ENV === 'production') {
    throw new Error('PHI_ENCRYPTION_KEY is required in production');
  }
  if (!key && !warnedNoKey) {
    warnedNoKey = true;
    console.warn('[security] PHI_ENCRYPTION_KEY is not set - clinical notes are stored UNENCRYPTED (development only).');
  }
};

export const isEncrypted = (value: unknown): boolean =>
  typeof value === 'string' && value.startsWith(PREFIX);

export const encryptField = (
  plain: string | null | undefined,
  aad?: string
): string | null | undefined => {
  if (plain === null || plain === undefined || plain === '') return plain;
  const key = getKey();
  if (!key) {
    if (process.env.NODE_ENV === 'production') throw new Error('PHI_ENCRYPTION_KEY is required in production');
    return plain;
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  if (aad) cipher.setAAD(Buffer.from(aad, 'utf8'));
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + [iv, tag, encrypted].map((b) => b.toString('base64')).join(':');
};

export const decryptField = (
  stored: string | null | undefined,
  aad?: string
): string | null | undefined => {
  if (stored === null || stored === undefined || !isEncrypted(stored)) return stored;
  const key = getKey();
  if (!key) throw new Error('Encrypted data found but PHI_ENCRYPTION_KEY is not configured');
  const [ivB64, tagB64, dataB64] = stored.slice(PREFIX.length).split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  if (aad) decipher.setAAD(Buffer.from(aad, 'utf8'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
};
