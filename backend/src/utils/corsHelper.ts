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
