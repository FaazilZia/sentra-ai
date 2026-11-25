/**
 * Shared CORS origin helpers and development localhost validation.
 */

export const DEFAULT_ALLOWED_ORIGINS = [
  'https://sentra-ai-tau.vercel.app',
  'https://sentra-ai.vercel.app',
  'https://sentraatech.info',
  'https://www.sentraatech.info',
];

/**
 * Resolves allowed CORS origins from environment (CORS_ALLOWED_ORIGINS or FRONTEND_URL)
 * or falls back to DEFAULT_ALLOWED_ORIGINS.
 */
export function getAllowedOrigins(): string[] {
  const configured = process.env.CORS_ALLOWED_ORIGINS || process.env.FRONTEND_URL;
  if (configured) {
    return configured.split(',').map(o => o.trim()).filter(Boolean);
  }
  return DEFAULT_ALLOWED_ORIGINS;
}

/**
 * Shared CORS origin helper for development localhost checks.
 *
 * Enforces strict URL parsing:
 * - Allows only http: or https: protocols
 * - Allows only hostname 'localhost' or '127.0.0.1'
 * - Active ONLY when NODE_ENV is not 'production'
 * - Safely returns false for any unparseable or malicious lookalike origins.
 */
export function isDevLocalOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  try {
    const parsed = new URL(origin);
    const isHttpOrHttps = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    const isLocalHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    return isHttpOrHttps && isLocalHost;
  } catch {
    return false;
  }
}

/**
 * Checks whether an origin is allowed by CORS policy.
 */
export function isOriginAllowed(origin?: string): boolean {
  if (!origin) {
    return true;
  }
  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin) || isDevLocalOrigin(origin);
}
