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
