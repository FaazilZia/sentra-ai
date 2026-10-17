import { encrypt, decrypt } from './encryption';
import logger from './logger';

const ENCRYPTED_REGEX = /^[0-9a-fA-F]{24}:[0-9a-fA-F]{32}:[0-9a-fA-F]+$/;

/**
 * Encrypts credentials (object or string) into AES-256-GCM ciphertext.
 * Safe against double-encryption if input is already formatted.
 */
export function encryptCredentials(data: Record<string, any> | string): string {
  if (typeof data === 'string') {
    if (ENCRYPTED_REGEX.test(data.trim())) {
      return data.trim(); // already encrypted
    }
    return encrypt(data);
  }
  const serialized = JSON.stringify(data);
  return encrypt(serialized);
}

/**
 * Decrypts AES-256-GCM ciphertext into credentials.
 * Gracefully handles legacy unencrypted JSON strings if encountered during migration.
 */
export function decryptCredentials<T = Record<string, any>>(cipher: string): T {
  if (!cipher || typeof cipher !== 'string') {
    throw new Error('Invalid credentials ciphertext');
  }

  const trimmed = cipher.trim();
  if (ENCRYPTED_REGEX.test(trimmed)) {
    const decrypted = decrypt(trimmed);
    try {
      return JSON.parse(decrypted) as T;
    } catch {
      return decrypted as unknown as T;
    }
  }

  // Fallback for legacy unencrypted string (migration safety)
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return trimmed as unknown as T;
  }
}

/**
 * Strips sensitive credentials from a connector record before API responses.
 */
export function sanitizeConnector<T extends Record<string, any>>(connector: T): Omit<T, 'credentials'> {
  if (!connector) return connector;
  const copy = { ...connector };
  delete copy.credentials;
  if (copy.config && typeof copy.config === 'object') {
    const configCopy = { ...copy.config };
    delete configCopy.credentials;
    delete configCopy.password;
    delete configCopy.secretAccessKey;
    delete configCopy.private_key;
    (copy as any).config = configCopy;
  }
  return copy;
}
