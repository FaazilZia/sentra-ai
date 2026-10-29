import {
  isPrivateIPv4,
  isPrivateIPv6,
  isPrivateIp,
  validateTargetHost,
  assertSafeTarget,
  parseIPv4Representation,
  safeFetch,
} from '../../utils/ssrfProtection';
import dns from 'dns/promises';

jest.mock('dns/promises');

describe('SSRF Protection Utility', () => {
  const originalEnv = process.env.ALLOW_PRIVATE_NETWORK_TARGETS;

  afterEach(() => {
    process.env.ALLOW_PRIVATE_NETWORK_TARGETS = originalEnv;
    jest.clearAllMocks();
  });

  describe('parseIPv4Representation', () => {
    it('parses decimal IP format (2130706433 -> 127.0.0.1)', () => {
      const parsed = parseIPv4Representation('2130706433');
      expect(parsed?.dotted).toBe('127.0.0.1');
      expect(parsed?.intVal).toBe(2130706433);
    });

    it('parses hex IP format (0x7f000001 -> 127.0.0.1)', () => {
      const parsed = parseIPv4Representation('0x7f000001');
      expect(parsed?.dotted).toBe('127.0.0.1');
    });

    it('parses octal IP format (017700000001 -> 127.0.0.1)', () => {
      const parsed = parseIPv4Representation('017700000001');
      expect(parsed?.dotted).toBe('127.0.0.1');
    });

    it('parses short-form IP addresses (127.1 -> 127.0.0.1, 10.1 -> 10.0.0.1)', () => {
      expect(parseIPv4Representation('127.1')?.dotted).toBe('127.0.0.1');
      expect(parseIPv4Representation('10.1')?.dotted).toBe('10.0.0.1');
      expect(parseIPv4Representation('127.0.1')?.dotted).toBe('127.0.0.1');
    });

    it('parses 0 and 0.0.0.0', () => {
      expect(parseIPv4Representation('0')?.dotted).toBe('0.0.0.0');
      expect(parseIPv4Representation('0.0.0.0')?.dotted).toBe('0.0.0.0');
    });

    it('returns null for non-string, null, undefined, or colon-containing inputs', () => {
      expect(parseIPv4Representation(null as any)).toBeNull();
      expect(parseIPv4Representation(undefined as any)).toBeNull();
      expect(parseIPv4Representation('' as any)).toBeNull();
      expect(parseIPv4Representation('127.0.0.1:8080')).toBeNull();
      expect(parseIPv4Representation('::1')).toBeNull();
    });

    it('returns null for inputs with more than 4 parts or invalid parts', () => {
      expect(parseIPv4Representation('1.2.3.4.5')).toBeNull();
      expect(parseIPv4Representation('1.2.3.foo')).toBeNull();
      expect(parseIPv4Representation('1.2..4')).toBeNull(); // Empty part between dots
      expect(parseIPv4Representation('...')).toBeNull();
    });

    it('handles assembleParts boundaries and overflows across 1, 2, 3, and 4 parts', () => {
      // 1 part boundary: > 0xffffffff returns null
      expect(parseIPv4Representation('4294967295')?.dotted).toBe('255.255.255.255');
      expect(parseIPv4Representation('4294967296')).toBeNull();

      // 2 parts: values[0] > 0xff or values[1] > 0xffffff returns null
      expect(parseIPv4Representation('127.65535')?.dotted).toBe('127.0.255.255');
      expect(parseIPv4Representation('256.1')).toBeNull();
      expect(parseIPv4Representation('10.16777216')).toBeNull();

      // 3 parts: values[0] > 0xff, values[1] > 0xff, or values[2] > 0xffff returns null
      expect(parseIPv4Representation('10.0.65535')?.dotted).toBe('10.0.255.255');
      expect(parseIPv4Representation('256.0.1')).toBeNull();
      expect(parseIPv4Representation('10.256.1')).toBeNull();
      expect(parseIPv4Representation('10.0.65536')).toBeNull();

      // 4 parts: any value > 255 returns null
      expect(parseIPv4Representation('192.168.1.256')).toBeNull();
      expect(parseIPv4Representation('256.168.1.1')).toBeNull();
      expect(parseIPv4Representation('192.256.1.1')).toBeNull();
      expect(parseIPv4Representation('192.168.256.1')).toBeNull();
    });
  });

  describe('isPrivateIPv4', () => {
    it('detects loopback addresses (127.0.0.0/8)', () => {
      expect(isPrivateIPv4('127.0.0.1')).toBe(true);
      expect(isPrivateIPv4('127.255.255.254')).toBe(true);
      expect(isPrivateIPv4('127.1.2.3')).toBe(true);
    });

    it('detects 10.0.0.0/8 private range', () => {
      expect(isPrivateIPv4('10.0.0.1')).toBe(true);
      expect(isPrivateIPv4('10.254.1.1')).toBe(true);
      expect(isPrivateIPv4('10.255.255.255')).toBe(true);
    });

    it('detects 100.64.0.0/10 Carrier-Grade NAT range', () => {
      expect(isPrivateIPv4('100.64.0.1')).toBe(true);
      expect(isPrivateIPv4('100.127.255.254')).toBe(true);
      expect(isPrivateIPv4('100.63.255.255')).toBe(false);
      expect(isPrivateIPv4('100.128.0.1')).toBe(false);
    });

    it('detects 172.16.0.0/12 private range', () => {
      expect(isPrivateIPv4('172.16.0.1')).toBe(true);
      expect(isPrivateIPv4('172.24.10.5')).toBe(true);
      expect(isPrivateIPv4('172.31.255.255')).toBe(true);
      expect(isPrivateIPv4('172.15.255.255')).toBe(false);
      expect(isPrivateIPv4('172.32.0.1')).toBe(false);
    });

    it('detects 192.168.0.0/16 private range', () => {
      expect(isPrivateIPv4('192.168.0.1')).toBe(true);
      expect(isPrivateIPv4('192.168.1.100')).toBe(true);
      expect(isPrivateIPv4('192.168.255.255')).toBe(true);
      expect(isPrivateIPv4('192.169.1.1')).toBe(false);
    });

    it('detects 169.254.0.0/16 link-local and cloud metadata IPs', () => {
      expect(isPrivateIPv4('169.254.169.254')).toBe(true);
      expect(isPrivateIPv4('169.254.1.1')).toBe(true);
    });

    it('detects 0.0.0.0 and broadcast/multicast/reserved', () => {
      expect(isPrivateIPv4('0.0.0.0')).toBe(true);
      expect(isPrivateIPv4('0')).toBe(true);
      expect(isPrivateIPv4('224.0.0.1')).toBe(true);
      expect(isPrivateIPv4('240.0.0.1')).toBe(true);
    });

    it('blocks unusual IP forms: decimal, hex, octal, and short forms', () => {
      expect(isPrivateIPv4('2130706433')).toBe(true); // 127.0.0.1 decimal
      expect(isPrivateIPv4('0x7f000001')).toBe(true); // 127.0.0.1 hex
      expect(isPrivateIPv4('017700000001')).toBe(true); // 127.0.0.1 octal
      expect(isPrivateIPv4('0177.0.0.1')).toBe(true); // 127.0.0.1 dotted octal
      expect(isPrivateIPv4('0x7f.0.0.1')).toBe(true); // 127.0.0.1 dotted hex
      expect(isPrivateIPv4('127.1')).toBe(true); // 127.0.0.1 short form
      expect(isPrivateIPv4('10.1')).toBe(true); // 10.0.0.1 short form
    });

    it('allows valid public IPv4 addresses', () => {
      expect(isPrivateIPv4('8.8.8.8')).toBe(false);
      expect(isPrivateIPv4('1.1.1.1')).toBe(false);
      expect(isPrivateIPv4('93.184.216.34')).toBe(false);
      expect(isPrivateIPv4('54.239.28.85')).toBe(false);
    });

    it('returns true for malformed or unparseable IPv4 inputs (fail-safe)', () => {
      expect(isPrivateIPv4('not-an-ip')).toBe(true);
      expect(isPrivateIPv4('999.999.999.999')).toBe(true);
      expect(isPrivateIPv4('')).toBe(true);
    });

    it('detects benchmark testing range (198.18.0.0/15)', () => {
      expect(isPrivateIPv4('198.18.0.1')).toBe(true);
      expect(isPrivateIPv4('198.19.255.254')).toBe(true);
      expect(isPrivateIPv4('198.20.0.1')).toBe(false);
    });
  });

  describe('isPrivateIPv6', () => {
    it('detects loopback (::1) and unspecified (::) addresses', () => {
      expect(isPrivateIPv6('::1')).toBe(true);
      expect(isPrivateIPv6('::')).toBe(true);
      expect(isPrivateIPv6('[::1]')).toBe(true);
    });

    it('detects link-local addresses (fe80::/10)', () => {
      expect(isPrivateIPv6('fe80::1')).toBe(true);
      expect(isPrivateIPv6('fe80::dead:beef')).toBe(true);
    });

    it('detects unique local addresses (fc00::/7)', () => {
      expect(isPrivateIPv6('fc00::1')).toBe(true);
      expect(isPrivateIPv6('fd12:3456:789a::1')).toBe(true);
    });

    it('detects IPv4-mapped IPv6 addresses for private IPv4', () => {
      expect(isPrivateIPv6('::ffff:127.0.0.1')).toBe(true);
      expect(isPrivateIPv6('::ffff:169.254.169.254')).toBe(true);
      expect(isPrivateIPv6('::ffff:10.0.0.1')).toBe(true);
      expect(isPrivateIPv6('::ffff:7f00:1')).toBe(true);
    });

    it('allows public IPv6 addresses', () => {
      expect(isPrivateIPv6('2607:f8b0:4005:805::200e')).toBe(false);
      expect(isPrivateIPv6('2001:4860:4860::8888')).toBe(false);
    });

    it('handles IPv4-mapped IPv6 with hex parts (private vs public) and malformed parts', () => {
      expect(isPrivateIPv6('::ffff:7f00:1')).toBe(true); // 127.0.0.1
      expect(isPrivateIPv6('::ffff:0a00:0001')).toBe(true); // 10.0.0.1
      expect(isPrivateIPv6('::ffff:0808:0808')).toBe(false); // 8.8.8.8 public
      expect(isPrivateIPv6('::ffff:nothex:1234')).toBe(true); // NaN hex parts
      expect(isPrivateIPv6('::ffff:1:2:3')).toBe(true); // hexParts length !== 2
    });

    it('detects multicast prefix (ff00::/8) and documentation prefix (2001:db8::/32)', () => {
      expect(isPrivateIPv6('ff02::1')).toBe(true);
      expect(isPrivateIPv6('ff00::')).toBe(true);
      expect(isPrivateIPv6('2001:db8::')).toBe(true);
      expect(isPrivateIPv6('2001:db8:85a3::8a2e:370:7334')).toBe(true);
    });
  });

  describe('isPrivateIp', () => {
    it('returns true for malformed or unrecognized strings', () => {
      expect(isPrivateIp('invalid-ip-string')).toBe(true);
      expect(isPrivateIp('')).toBe(true);
    });

    it('identifies private and public IPv4 addresses', () => {
      expect(isPrivateIp('127.0.0.1')).toBe(true);
      expect(isPrivateIp('10.0.0.1')).toBe(true);
      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('1.1.1.1')).toBe(false);
    });

    it('identifies private and public IPv6 addresses', () => {
      expect(isPrivateIp('::1')).toBe(true);
      expect(isPrivateIp('[::1]')).toBe(true);
      expect(isPrivateIp('fe80::1')).toBe(true);
      expect(isPrivateIp('2001:4860:4860::8888')).toBe(false);
      expect(isPrivateIp('[2001:4860:4860::8888]')).toBe(false);
    });

    it('identifies unusual IPv4 representations', () => {
      expect(isPrivateIp('2130706433')).toBe(true); // 127.0.0.1
      expect(isPrivateIp('134744072')).toBe(false); // 8.8.8.8
    });
  });

  describe('validateTargetHost', () => {
    it('rejects localhost and local domain names immediately without DNS lookup', async () => {
      const hosts = [
        'localhost',
        'sub.localhost',
        'service.local',
        'api.internal',
        'metadata.google.internal',
        'instance-data',
      ];

      for (const h of hosts) {
        const result = await validateTargetHost(h);
        expect(result.safe).toBe(false);
        expect(result.error).toContain('SSRF validation failed');
      }
      expect(dns.lookup).not.toHaveBeenCalled();
    });

    it('rejects direct private IP addresses', async () => {
      const result = await validateTargetHost('192.168.1.1');
      expect(result.safe).toBe(false);
      expect(result.error).toContain('private or internal network address');
      expect(dns.lookup).not.toHaveBeenCalled();
    });

    it('rejects unusual IP representations (decimal, hex, octal, short forms) directly', async () => {
      const unusual = ['2130706433', '0x7f000001', '017700000001', '127.1', '10.1', '0.0.0.0'];
      for (const ip of unusual) {
        const result = await validateTargetHost(ip);
        expect(result.safe).toBe(false);
        expect(result.error).toContain('private or internal network address');
        expect(dns.lookup).not.toHaveBeenCalled();
      }
    });

    it('rejects IPv6 private ranges (::1, fc00::/7, fe80::/10, IPv4-mapped)', async () => {
      const v6Addresses = ['::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1'];
      for (const ip of v6Addresses) {
        const result = await validateTargetHost(ip);
        expect(result.safe).toBe(false);
        expect(result.error).toContain('private or restricted network address');
      }
    });

    it('resolves DNS and rejects host that resolves to private IP', async () => {
      (dns.lookup as jest.Mock).mockResolvedValueOnce([
        { address: '127.0.0.1', family: 4 },
      ]);

      const result = await validateTargetHost('attacker-controlled-domain.com');
      expect(result.safe).toBe(false);
      expect(result.error).toContain('resolves to private address');
      expect(dns.lookup).toHaveBeenCalledWith('attacker-controlled-domain.com', { all: true });
    });

    it('allows normal cloud endpoints (AWS S3 and Google Drive)', async () => {
      (dns.lookup as jest.Mock).mockResolvedValueOnce([
        { address: '52.216.58.104', family: 4 },
      ]);
      const s3Res = await validateTargetHost('s3.us-east-1.amazonaws.com');
      expect(s3Res.safe).toBe(true);
      expect(s3Res.primaryIp).toBe('52.216.58.104');

      (dns.lookup as jest.Mock).mockResolvedValueOnce([
        { address: '142.250.190.42', family: 4 },
      ]);
      const gRes = await validateTargetHost('www.googleapis.com');
      expect(gRes.safe).toBe(true);
      expect(gRes.primaryIp).toBe('142.250.190.42');
    });

    it('allows private targets if ALLOW_PRIVATE_NETWORK_TARGETS=true', async () => {
      process.env.ALLOW_PRIVATE_NETWORK_TARGETS = 'true';

      const result = await validateTargetHost('localhost');
      expect(result.safe).toBe(true);
      expect(dns.lookup).not.toHaveBeenCalled();
    });

    it('rejects invalid inputs (empty string, null, undefined, non-string)', async () => {
      expect((await validateTargetHost('')).safe).toBe(false);
      expect((await validateTargetHost(null as any)).safe).toBe(false);
      expect((await validateTargetHost(undefined as any)).safe).toBe(false);
      expect((await validateTargetHost(12345 as any)).safe).toBe(false);
    });

    it('allows valid direct public IPv4 representations without DNS lookup', async () => {
      const resDotted = await validateTargetHost('8.8.8.8');
      expect(resDotted.safe).toBe(true);
      expect(resDotted.primaryIp).toBe('8.8.8.8');
      expect(dns.lookup).not.toHaveBeenCalled();

      const resDecimal = await validateTargetHost('134744072'); // 8.8.8.8 in uint32
      expect(resDecimal.safe).toBe(true);
      expect(resDecimal.primaryIp).toBe('8.8.8.8');
    });

    it('allows valid direct public IPv6 addresses without DNS lookup', async () => {
      const res = await validateTargetHost('2607:f8b0:4005:805::200e');
      expect(res.safe).toBe(true);
      expect(res.primaryIp).toBe('2607:f8b0:4005:805::200e');
      expect(dns.lookup).not.toHaveBeenCalled();
    });

    it('handles DNS resolution returning empty array', async () => {
      (dns.lookup as jest.Mock).mockResolvedValueOnce([]);
      const res = await validateTargetHost('no-records.example.com');
      expect(res.safe).toBe(false);
      expect(res.error).toContain('Unable to resolve hostname');
    });

    it('handles DNS lookup throwing an error (e.g. ENOTFOUND)', async () => {
      (dns.lookup as jest.Mock).mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND nonexistent.domain'));
      const res = await validateTargetHost('nonexistent.domain');
      expect(res.safe).toBe(false);
      expect(res.error).toContain('DNS lookup error');
    });

    it('handles DNS lookup throwing non-Error object without message', async () => {
      (dns.lookup as jest.Mock).mockRejectedValueOnce({});
      const res = await validateTargetHost('nonexistent-raw.domain');
      expect(res.safe).toBe(false);
      expect(res.error).toContain('Resolution failed');
    });

    it('rejects host if any resolved IP in a multi-homed response is private', async () => {
      (dns.lookup as jest.Mock).mockResolvedValueOnce([
        { address: '93.184.216.34', family: 4 },
        { address: '10.0.0.1', family: 4 },
      ]);
      const res = await validateTargetHost('multi-homed.attacker.com');
      expect(res.safe).toBe(false);
      expect(res.error).toContain('resolves to private address');
    });

    it('allows host when all resolved IPs are public', async () => {
      (dns.lookup as jest.Mock).mockResolvedValueOnce([
        { address: '93.184.216.34', family: 4 },
        { address: '93.184.216.35', family: 4 },
      ]);
      const res = await validateTargetHost('multi-homed.good.com');
      expect(res.safe).toBe(true);
      expect(res.resolvedIps).toEqual(['93.184.216.34', '93.184.216.35']);
      expect(res.primaryIp).toBe('93.184.216.34');
    });
  });

  describe('assertSafeTarget (DNS Rebinding Prevention)', () => {
    it('throws an error when target is unsafe', async () => {
      await expect(assertSafeTarget('10.0.0.5')).rejects.toThrow('SSRF validation failed');
    });

    it('resolves DNS once and returns the verified resolved IP', async () => {
      (dns.lookup as jest.Mock).mockResolvedValueOnce([
        { address: '8.8.8.8', family: 4 },
      ]);
      const resolvedIp = await assertSafeTarget('dns.google');
      expect(resolvedIp).toBe('8.8.8.8');
    });

    it('supports allowPrivate option to allow internal host', async () => {
      const ip = await assertSafeTarget('localhost', { allowPrivate: true });
      expect(ip).toBe('localhost');
    });
  });

  describe('safeFetch (Redirect SSRF Protection)', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('blocks redirect to private IPv4 address (127.0.0.1)', async () => {
      (dns.lookup as jest.Mock).mockResolvedValue([
        { address: '93.184.216.34', family: 4 },
      ]);

      const mockResponse = {
        status: 302,
        headers: new Headers({ location: 'http://127.0.0.1:8080/internal-admin' }),
      };
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      await expect(safeFetch('https://example.com/redirect')).rejects.toThrow(
        'SSRF validation failed'
      );
    });

    it('blocks redirect to AWS metadata endpoint (169.254.169.254)', async () => {
      (dns.lookup as jest.Mock).mockResolvedValue([
        { address: '93.184.216.34', family: 4 },
      ]);

      const mockResponse = {
        status: 301,
        headers: new Headers({ location: 'http://169.254.169.254/latest/meta-data/' }),
      };
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      await expect(safeFetch('https://example.com/steal-creds')).rejects.toThrow(
        'SSRF validation failed'
      );
    });

    it('blocks redirect to IPv6 loopback (::1)', async () => {
      (dns.lookup as jest.Mock).mockResolvedValue([
        { address: '93.184.216.34', family: 4 },
      ]);

      const mockResponse = {
        status: 307,
        headers: new Headers({ location: 'http://[::1]:9000/metrics' }),
      };
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      await expect(safeFetch('https://example.com/v6-redirect')).rejects.toThrow(
        'SSRF validation failed'
      );
    });

    it('rejects non-HTTP protocols (e.g. ftp, file, gopher)', async () => {
      await expect(safeFetch('ftp://example.com/file')).rejects.toThrow('Protocol "ftp:" is not allowed');
      await expect(safeFetch('file:///etc/passwd')).rejects.toThrow('Protocol "file:" is not allowed');
      await expect(safeFetch('gopher://127.0.0.1:70/')).rejects.toThrow('Protocol "gopher:" is not allowed');
    });

    it('returns response when redirect response has no Location header', async () => {
      (dns.lookup as jest.Mock).mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
      const mockResponse = {
        status: 302,
        headers: new Headers(),
      };
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const res = await safeFetch('https://example.com/no-location');
      expect(res.status).toBe(302);
    });

    it('throws when redirects exceed maxRedirects limit', async () => {
      (dns.lookup as jest.Mock).mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
      const mockRedirect = {
        status: 302,
        headers: new Headers({ location: 'https://example.com/loop' }),
      };
      global.fetch = jest.fn().mockResolvedValue(mockRedirect);

      await expect(safeFetch('https://example.com/loop', { maxRedirects: 2 })).rejects.toThrow(
        'Exceeded maximum redirect limit of 2'
      );
      expect(global.fetch).toHaveBeenCalledTimes(3); // Initial + 2 redirects
    });

    it('supports status 303 and 308 redirects to safe targets', async () => {
      (dns.lookup as jest.Mock).mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
      const mock308 = {
        status: 308,
        headers: new Headers({ location: 'https://example.com/final' }),
      };
      const mockFinal = {
        status: 200,
        headers: new Headers(),
      };
      global.fetch = jest.fn()
        .mockResolvedValueOnce(mock308)
        .mockResolvedValueOnce(mockFinal);

      const res = await safeFetch('https://example.com/initial-308');
      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('allows redirect to safe public URL', async () => {
      (dns.lookup as jest.Mock)
        .mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }])
        .mockResolvedValueOnce([{ address: '52.216.58.104', family: 4 }]);

      const mockRedirectRes = {
        status: 302,
        headers: new Headers({ location: 'https://safe-destination.com/data' }),
      };
      const mockFinalRes = {
        status: 200,
        headers: new Headers(),
      };
      global.fetch = jest.fn()
        .mockResolvedValueOnce(mockRedirectRes)
        .mockResolvedValueOnce(mockFinalRes);

      const res = await safeFetch('https://example.com/initial');
      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
