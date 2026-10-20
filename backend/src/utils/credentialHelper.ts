import { encrypt, decrypt } from './encryption';

const ENCRYPTED_REGEX = /^[0-9a-fA-F]{24}:[0-9a-fA-F]{32}:[0-9a-fA-F]+$/;

/**
 * Normalizes private key strings from any newline format (escaped \n, \r\n, literal, quoted).
 */
export function normalizePrivateKey(key: string): string {
  if (!key || typeof key !== 'string') return '';
  let cleaned = key.trim();
  // Strip surrounding quotes if user pasted a JSON string representation
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  // Replace escaped newlines with actual newline characters
  cleaned = cleaned.replaceAll('\\r\\n', '\n').replaceAll('\\n', '\n');
  // Normalize literal carriage returns
  cleaned = cleaned.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
  return cleaned.trim();
}

/**
 * Parses and normalizes Google service account input (JSON file text or credentials object).
 */
export function parseServiceAccountInput(input: any): {
  client_email?: string;
  private_key?: string;
  driveScope?: string;
  project_id?: string;
} {
  if (!input) return {};

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        return {
          client_email: parsed.client_email || parsed.clientEmail,
          private_key: normalizePrivateKey(parsed.private_key || parsed.privateKey),
          driveScope: parsed.driveScope || parsed.scope,
          project_id: parsed.project_id || parsed.projectId,
        };
      } catch {
        // Fall back to treat as raw private key
      }
    }
    return { private_key: normalizePrivateKey(trimmed) };
  }

  if (typeof input === 'object') {
    return {
      client_email: input.client_email || input.clientEmail,
      private_key: normalizePrivateKey(input.private_key || input.privateKey || ''),
      driveScope: input.driveScope || input.scope,
      project_id: input.project_id || input.projectId,
    };
  }

  return {};
}

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
    delete configCopy.privateKey;
    (copy as any).config = configCopy;
  }
  return copy;
}
