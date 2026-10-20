import dns from 'node:dns/promises';
import net from 'node:net';
import logger from './logger';

const PRIVATE_IPV4_RANGES: Array<{ start: number; end: number }> = [
  // 0.0.0.0/8 (Current network: 0.0.0.0 - 0.255.255.255)
  { start: 0x00000000, end: 0x00ffffff },
  // 10.0.0.0/8 (RFC 1918 private: 10.0.0.0 - 10.255.255.255)
  { start: 0x0a000000, end: 0x0affffff },
  // 100.64.0.0/10 (Carrier Grade NAT: 100.64.0.0 - 100.127.255.255)
  { start: 0x64400000, end: 0x647fffff },
  // 127.0.0.0/8 (Loopback: 127.0.0.0 - 127.255.255.255)
  { start: 0x7f000000, end: 0x7fffffff },
  // 169.254.0.0/16 (Link-local: 169.254.0.0 - 169.254.255.255)
  { start: 0xa9fe0000, end: 0xa9feffff },
  // 172.16.0.0/12 (RFC 1918 private: 172.16.0.0 - 172.31.255.255)
  { start: 0xac100000, end: 0xac1fffff },
  // 192.168.0.0/16 (RFC 1918 private: 192.168.0.0 - 192.168.255.255)
  { start: 0xc0a80000, end: 0xc0a8ffff },
  // 198.18.0.0/15 (Benchmark testing: 198.18.0.0 - 198.19.255.255)
  { start: 0xc6120000, end: 0xc613ffff },
  // 224.0.0.0/4 (Multicast: 224.0.0.0 - 239.255.255.255)
  { start: 0xe0000000, end: 0xefffffff },
  // 240.0.0.0/4 (Reserved: 240.0.0.0 - 255.255.255.255)
  { start: 0xf0000000, end: 0xffffffff },
];

/**
 * Checks whether an IPv4 address is in a private, loopback, link-local, or restricted range.
 */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(p => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some(p => Number.isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IPv4 is treated as unsafe
  }

  const intVal = ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  return PRIVATE_IPV4_RANGES.some(r => intVal >= r.start && intVal <= r.end);
}

/**
 * Checks whether an IPv6 address is in a private, loopback, link-local, or restricted range.
 */
export function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase().trim();

  // Loopback (::1) and Unspecified (::)
  if (normalized === '::1' || normalized === '::') return true;

  // IPv4-mapped IPv6 (::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (normalized.startsWith('::ffff:')) {
    const v4Part = normalized.replace('::ffff:', '');
    if (net.isIPv4(v4Part)) {
      return isPrivateIPv4(v4Part);
    }
    // If it's hex format like ::ffff:7f00:0001
    const hexParts = v4Part.split(':');
    if (hexParts.length === 2) {
      const p1 = Number.parseInt(hexParts[0], 16);
      const p2 = Number.parseInt(hexParts[1], 16);
      if (!Number.isNaN(p1) && !Number.isNaN(p2)) {
        const ipStr = `${(p1 >> 8) & 255}.${p1 & 255}.${(p2 >> 8) & 255}.${p2 & 255}`;
        return isPrivateIPv4(ipStr);
      }
    }
    return true;
  }

  // Link-local addresses (fe80::/10 -> fe8*, fe9*, fea*, feb*)
  if (/^fe[89ab]/i.test(normalized)) return true;

  // Unique local addresses (fc00::/7 -> fc*, fd*)
  if (/^f[cd]/i.test(normalized)) return true;

  // Multicast (ff00::/8)
  if (normalized.startsWith('ff')) return true;

  return false;
}

/**
 * Generic IP check across v4 and v6.
 */
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  if (net.isIPv6(ip)) return isPrivateIPv6(ip);
  return true; // If not recognized as valid IP, treat as unsafe
}

export interface SSRFValidationOptions {
  allowPrivate?: boolean;
}

/**
 * Validates whether a target host (IP or hostname) is safe from SSRF.
 * Resolves DNS to check all underlying IPv4 and IPv6 addresses.
 */
export async function validateTargetHost(
  host: string,
  options?: SSRFValidationOptions
): Promise<{ safe: boolean; error?: string; resolvedIps?: string[] }> {
  const allowPrivate = options?.allowPrivate ?? (process.env.ALLOW_PRIVATE_NETWORK_TARGETS === 'true');

  if (!host || typeof host !== 'string') {
    return { safe: false, error: 'Target host is required and must be a valid string.' };
  }

  const cleanedHost = host.trim().replace(/^\[|\]$/g, ''); // Strip IPv6 bracket notation if present

  // 1. If bypass flag is active, permit immediately (useful for local dev/testing)
  if (allowPrivate) {
    return { safe: true, resolvedIps: [cleanedHost] };
  }

  // 2. Immediate check for obvious localhost/internal hostnames
  const lower = cleanedHost.toLowerCase();
  if (
    lower === 'localhost' ||
    lower.endsWith('.localhost') ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower.endsWith('.lan') ||
    lower === 'metadata.google.internal' ||
    lower === 'instance-data'
  ) {
    return {
      safe: false,
      error: `SSRF validation failed: Target "${cleanedHost}" is an internal/loopback hostname. Connection rejected for security.`,
    };
  }

  // 3. Direct IP check (if host is already an IP address)
  if (net.isIP(cleanedHost)) {
    if (isPrivateIp(cleanedHost)) {
      return {
        safe: false,
        error: `SSRF validation failed: Target IP "${cleanedHost}" is a private or internal network address. Connection rejected for security.`,
        resolvedIps: [cleanedHost],
      };
    }
    return { safe: true, resolvedIps: [cleanedHost] };
  }

  // 4. DNS resolution to check all resolved IPv4 and IPv6 addresses
  try {
    const lookupResults = await dns.lookup(cleanedHost, { all: true });
    if (!lookupResults || lookupResults.length === 0) {
      return {
        safe: false,
        error: `SSRF validation failed: Unable to resolve hostname "${cleanedHost}".`,
      };
    }

    const resolvedIps = lookupResults.map(r => r.address);
    for (const res of lookupResults) {
      if (isPrivateIp(res.address)) {
        logger.warn(`SSRF Blocked: Host "${cleanedHost}" resolved to private IP "${res.address}".`);
        return {
          safe: false,
          error: `SSRF validation failed: Target "${cleanedHost}" resolves to private address "${res.address}". Connection rejected for security.`,
          resolvedIps,
        };
      }
    }

    return { safe: true, resolvedIps };
  } catch (err: any) {
    return {
      safe: false,
      error: `SSRF validation failed: DNS lookup error for "${cleanedHost}": ${err?.message || 'Resolution failed'}`,
    };
  }
}

/**
 * Asserts that a target host is safe, throwing an Error if it fails SSRF validation.
 */
export async function assertSafeTarget(host: string, options?: SSRFValidationOptions): Promise<void> {
  const result = await validateTargetHost(host, options);
  if (!result.safe) {
    throw new Error(result.error || `SSRF validation failed: Target "${host}" is forbidden.`);
  }
}
