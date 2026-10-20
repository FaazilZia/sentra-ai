import dns from 'node:dns/promises';
import net from 'node:net';
import logger from './logger';

export const PRIVATE_IPV4_RANGES: Array<{ start: number; end: number }> = [
  // 0.0.0.0/8 (Current network / default route: 0.0.0.0 - 0.255.255.255)
  { start: 0x00000000, end: 0x00ffffff },
  // 10.0.0.0/8 (RFC 1918 private: 10.0.0.0 - 10.255.255.255)
  { start: 0x0a000000, end: 0x0affffff },
  // 100.64.0.0/10 (Shared address space / Carrier-Grade NAT: 100.64.0.0 - 100.127.255.255)
  { start: 0x64400000, end: 0x647fffff },
  // 127.0.0.0/8 (Loopback: 127.0.0.0 - 127.255.255.255)
  { start: 0x7f000000, end: 0x7fffffff },
  // 169.254.0.0/16 (Link-local & cloud metadata: 169.254.0.0 - 169.254.255.255)
  { start: 0xa9fe0000, end: 0xa9feffff },
  // 172.16.0.0/12 (RFC 1918 private: 172.16.0.0 - 172.31.255.255)
  { start: 0xac100000, end: 0xac1fffff },
  // 192.168.0.0/16 (RFC 1918 private: 192.168.0.0 - 192.168.255.255)
  { start: 0xc0a80000, end: 0xc0a8ffff },
  // 198.18.0.0/15 (Benchmark testing: 198.18.0.0 - 198.19.255.255)
  { start: 0xc6120000, end: 0xc613ffff },
  // 224.0.0.0/4 (Multicast: 224.0.0.0 - 239.255.255.255)
  { start: 0xe0000000, end: 0xefffffff },
  // 240.0.0.0/4 (Reserved / Future use: 240.0.0.0 - 255.255.255.255)
  { start: 0xf0000000, end: 0xffffffff },
];

function parseIpPart(part: string): number | null {
  if (!part) return null;
  let val: number;
  if (/^0x[\da-f]+$/i.test(part)) {
    val = Number.parseInt(part, 16);
  } else if (/^0[0-7]+$/.test(part)) {
    val = Number.parseInt(part, 8);
  } else if (/^\d+$/.test(part)) {
    val = Number.parseInt(part, 10);
  } else {
    return null;
  }
  return Number.isNaN(val) || val < 0 ? null : val;
}

function assembleParts(values: number[]): number | null {
  if (values.length === 1 && values[0] <= 0xffffffff) {
    return values[0];
  }
  if (values.length === 2 && values[0] <= 0xff && values[1] <= 0xffffff) {
    return ((values[0] << 24) >>> 0) + values[1];
  }
  if (values.length === 3 && values[0] <= 0xff && values[1] <= 0xff && values[2] <= 0xffff) {
    return ((values[0] << 24) >>> 0) + (values[1] << 16) + values[2];
  }
  if (values.length === 4 && values.every(v => v <= 0xff)) {
    return ((values[0] << 24) >>> 0) + (values[1] << 16) + (values[2] << 8) + values[3];
  }
  return null;
}

/**
 * Parses IPv4 representation across decimal (2130706433), hex (0x7f000001),
 * octal (017700000001), dotted forms (0177.0.0.1, 0x7f.0.0.1), and short forms (127.1, 10.1).
 * Returns canonical uint32 and dotted quad string, or null if not a valid IPv4 representation.
 */
export function parseIPv4Representation(input: string): { intVal: number; dotted: string } | null {
  if (!input || typeof input !== 'string' || input.includes(':')) return null;

  const parts = input.trim().split('.');
  if (parts.length > 4 || parts.length === 0) return null;

  const values: number[] = [];
  for (const part of parts) {
    const val = parseIpPart(part);
    if (val === null) return null;
    values.push(val);
  }

  const intVal = assembleParts(values);
  if (intVal === null) return null;

  const normalizedInt = intVal >>> 0;
  const dotted = `${(normalizedInt >>> 24) & 255}.${(normalizedInt >>> 16) & 255}.${(normalizedInt >>> 8) & 255}.${normalizedInt & 255}`;
  return { intVal: normalizedInt, dotted };
}

/**
 * Checks whether an IPv4 address (in standard or unusual form) is in a private,
 * loopback, link-local, carrier-grade NAT, or restricted range.
 */
export function isPrivateIPv4(ip: string): boolean {
  const parsed = parseIPv4Representation(ip);
  if (!parsed) {
    return true; // Malformed IPv4 is treated as unsafe
  }

  const intVal = parsed.intVal;
  return PRIVATE_IPV4_RANGES.some(r => intVal >= r.start && intVal <= r.end);
}

/**
 * Checks whether an IPv6 address is in a private, loopback, link-local, ULA,
 * multicast, or IPv4-mapped restricted range.
 */
export function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase().trim().replace(/^\[|\]$/g, '');

  // Loopback (::1) and Unspecified (::)
  if (normalized === '::1' || normalized === '::') return true;

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1, ::ffff:169.254.169.254, ::ffff:7f00:1)
  if (normalized.startsWith('::ffff:')) {
    const v4Part = normalized.slice(7);
    const parsedV4 = parseIPv4Representation(v4Part);
    if (parsedV4) {
      return isPrivateIPv4(parsedV4.dotted);
    }
    // Hex format like ::ffff:7f00:0001
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

  // Documentation prefix (2001:db8::/32)
  if (normalized.startsWith('2001:db8:') || normalized === '2001:db8::') return true;

  return false;
}

/**
 * Generic IP check across v4, unusual v4 forms, and v6.
 */
export function isPrivateIp(ip: string): boolean {
  const cleaned = ip.trim().replace(/^\[|\]$/g, '');
  if (net.isIPv6(cleaned)) return isPrivateIPv6(cleaned);
  const parsedV4 = parseIPv4Representation(cleaned);
  if (parsedV4) return isPrivateIPv4(parsedV4.dotted);
  if (net.isIPv4(cleaned)) return isPrivateIPv4(cleaned);
  return true; // If not recognized as valid IP, treat as unsafe
}

export interface SSRFValidationOptions {
  allowPrivate?: boolean;
}

/**
 * Validates whether a target host (IP or hostname) is safe from SSRF.
 * Detects unusual IP representations (decimal, hex, octal, short forms),
 * resolves DNS to check all underlying IPv4 and IPv6 addresses,
 * and returns the validated primary resolved IP for connection pinning.
 */
export async function validateTargetHost(
  host: string,
  options?: SSRFValidationOptions
): Promise<{ safe: boolean; error?: string; resolvedIps?: string[]; primaryIp?: string }> {
  const allowPrivate = options?.allowPrivate ?? (process.env.ALLOW_PRIVATE_NETWORK_TARGETS === 'true');

  if (!host || typeof host !== 'string') {
    return { safe: false, error: 'Target host is required and must be a valid string.' };
  }

  const cleanedHost = host.trim().replace(/^\[|\]$/g, '');

  if (allowPrivate) {
    return { safe: true, resolvedIps: [cleanedHost], primaryIp: cleanedHost };
  }

  // 1. Check for unusual IP representation (decimal, hex, octal, short-form e.g. 2130706433, 0x7f000001, 017700000001, 127.1)
  const parsedV4 = parseIPv4Representation(cleanedHost);
  if (parsedV4) {
    if (isPrivateIPv4(parsedV4.dotted)) {
      return {
        safe: false,
        error: `SSRF validation failed: Target IP "${cleanedHost}" (${parsedV4.dotted}) is a private or internal network address. Connection rejected for security.`,
        resolvedIps: [parsedV4.dotted],
      };
    }
    return { safe: true, resolvedIps: [parsedV4.dotted], primaryIp: parsedV4.dotted };
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

  // 3. Direct IPv6 check
  if (net.isIPv6(cleanedHost)) {
    if (isPrivateIPv6(cleanedHost)) {
      return {
        safe: false,
        error: `SSRF validation failed: Target IPv6 "${cleanedHost}" is a private or restricted network address. Connection rejected for security.`,
        resolvedIps: [cleanedHost],
      };
    }
    return { safe: true, resolvedIps: [cleanedHost], primaryIp: cleanedHost };
  }

  // 4. DNS resolution: check all resolved addresses and pin to resolved IP
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

    return { safe: true, resolvedIps, primaryIp: lookupResults[0].address };
  } catch (err: any) {
    return {
      safe: false,
      error: `SSRF validation failed: DNS lookup error for "${cleanedHost}": ${err?.message || 'Resolution failed'}`,
    };
  }
}

/**
 * Asserts that a target host is safe, throwing an Error if it fails SSRF validation.
 * Returns the resolved primary safe IP address so the caller can connect directly
 * to the resolved IP to prevent DNS rebinding attacks.
 */
export async function assertSafeTarget(host: string, options?: SSRFValidationOptions): Promise<string> {
  const result = await validateTargetHost(host, options);
  if (!result.safe || !result.primaryIp) {
    throw new Error(result.error || `SSRF validation failed: Target "${host}" is forbidden.`);
  }
  return result.primaryIp;
}

/**
 * Hardened HTTP client that blocks SSRF and prevents redirect loops/redirections to internal targets.
 */
export async function safeFetch(
  url: string,
  options: RequestInit & { maxRedirects?: number } = {}
): Promise<Response> {
  const maxRedirects = options.maxRedirects ?? 5;
  let currentUrl = url;
  let redirectCount = 0;

  while (true) {
    const parsed = new URL(currentUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`SSRF validation failed: Protocol "${parsed.protocol}" is not allowed.`);
    }

    // SSRF Check: validate destination hostname before opening socket
    await assertSafeTarget(parsed.hostname);

    const response = await fetch(currentUrl, {
      ...options,
      redirect: 'manual',
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        return response;
      }

      redirectCount++;
      if (redirectCount > maxRedirects) {
        throw new Error(`SSRF validation failed: Exceeded maximum redirect limit of ${maxRedirects}.`);
      }

      const nextUrl = new URL(location, currentUrl).toString();
      const nextParsed = new URL(nextUrl);

      // Validate redirect destination hostname
      await assertSafeTarget(nextParsed.hostname);

      currentUrl = nextUrl;
      continue;
    }

    return response;
  }
}
