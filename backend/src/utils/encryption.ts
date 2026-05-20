import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_HEX = process.env.ENCRYPTION_KEY || '';

function getKey(): Buffer {
  if (KEY_HEX.length === 64) return Buffer.from(KEY_HEX, 'hex');
  // Fallback: derive key from JWT_SECRET (not ideal for prod — set ENCRYPTION_KEY in env)
  const secret = process.env.JWT_SECRET || 'sentra-fallback-secret-32-chars!!';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Output format: hex(iv):hex(authTag):hex(ciphertext)
 */
export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a string encrypted by `encrypt()`.
 */
export function decrypt(encoded: string): string {
  const [ivHex, authTagHex, encryptedHex] = encoded.split(':');
  if (!ivHex || !authTagHex || !encryptedHex) throw new Error('Invalid encrypted format');
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
