import dns from 'dns/promises';
import net from 'net';
import logger from './logger';

/**
 * Checks whether an IPv4 address is in a private, loopback, link-local, or restricted range.
 */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(p => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some(p => Number.isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IPv4 is treated as unsafe
  }

  const [b0, b1] = parts;

  // 0.0.0.0/8 (Current network)
  if (b0 === 0) return true;

  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;

  // 10.0.0.0/8 (RFC 1918 private)
  if (b0 === 10) return true;

  // 172.16.0.0/12 (RFC 1918 private: 172.16.0.0 - 172.31.255.255)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

  // 192.168.0.0/16 (RFC 1918 private)
  if (b0 === 192 && b1 === 168) return true;

  // 169.254.0.0/16 (RFC 3927 link-local, includes AWS/GCP metadata service 169.254.169.254)
  if (b0 === 169 && b1 === 254) return true;

  // 100.64.0.0/10 (Carrier Grade NAT)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

  // 198.18.0.0/15 (Benchmark testing)
  if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;

  // 224.0.0.0/4 (Multicast: 224.0.0.0 - 239.255.255.255)
  if (b0 >= 224 && b0 <= 239) return true;

  // 240.0.0.0/4 (Reserved / Future use: 240.0.0.0 - 255.255.255.255)
  if (b0 >= 240) return true;

  return false;
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
