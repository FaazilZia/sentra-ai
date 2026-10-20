import {
  isPrivateIPv4,
  isPrivateIPv6,
  isPrivateIp,
  validateTargetHost,
  assertSafeTarget,
} from '../../utils/ssrfProtection';
import dns from 'dns/promises';

jest.mock('dns/promises');

describe('SSRF Protection Utility', () => {
  const originalEnv = process.env.ALLOW_PRIVATE_NETWORK_TARGETS;

  afterEach(() => {
    process.env.ALLOW_PRIVATE_NETWORK_TARGETS = originalEnv;
    jest.clearAllMocks();
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

    it('detects 172.16.0.0/12 private range', () => {
      expect(isPrivateIPv4('172.16.0.1')).toBe(true);
      expect(isPrivateIPv4('172.24.10.5')).toBe(true);
      expect(isPrivateIPv4('172.31.255.255')).toBe(true);
      // Non-private 172.x
      expect(isPrivateIPv4('172.15.255.255')).toBe(false);
      expect(isPrivateIPv4('172.32.0.1')).toBe(false);
    });

    it('detects 192.168.0.0/16 private range', () => {
      expect(isPrivateIPv4('192.168.0.1')).toBe(true);
      expect(isPrivateIPv4('192.168.1.100')).toBe(true);
      expect(isPrivateIPv4('192.168.255.255')).toBe(true);
      // Non-private 192.x
      expect(isPrivateIPv4('192.169.1.1')).toBe(false);
    });

    it('detects 169.254.0.0/16 link-local and cloud metadata IPs', () => {
      expect(isPrivateIPv4('169.254.169.254')).toBe(true); // AWS / GCP / Azure metadata
      expect(isPrivateIPv4('169.254.1.1')).toBe(true);
    });

    it('detects 0.0.0.0/8 and broadcast/multicast', () => {
      expect(isPrivateIPv4('0.0.0.0')).toBe(true);
      expect(isPrivateIPv4('224.0.0.1')).toBe(true);
      expect(isPrivateIPv4('240.0.0.1')).toBe(true);
    });

    it('allows valid public IPv4 addresses', () => {
      expect(isPrivateIPv4('8.8.8.8')).toBe(false);
      expect(isPrivateIPv4('1.1.1.1')).toBe(false);
      expect(isPrivateIPv4('93.184.216.34')).toBe(false);
      expect(isPrivateIPv4('54.239.28.85')).toBe(false);
    });
  });

  describe('isPrivateIPv6', () => {
    it('detects loopback and unspecified addresses', () => {
      expect(isPrivateIPv6('::1')).toBe(true);
      expect(isPrivateIPv6('::')).toBe(true);
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

    it('rejects cloud metadata IP address directly', async () => {
      const result = await validateTargetHost('169.254.169.254');
      expect(result.safe).toBe(false);
      expect(result.error).toContain('private or internal network address');
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

    it('allows public domain that resolves to public IP', async () => {
      (dns.lookup as jest.Mock).mockResolvedValueOnce([
        { address: '93.184.216.34', family: 4 },
      ]);

      const result = await validateTargetHost('example.com');
      expect(result.safe).toBe(true);
      expect(result.resolvedIps).toEqual(['93.184.216.34']);
    });

    it('allows private targets if ALLOW_PRIVATE_NETWORK_TARGETS=true', async () => {
      process.env.ALLOW_PRIVATE_NETWORK_TARGETS = 'true';

      const result = await validateTargetHost('localhost');
      expect(result.safe).toBe(true);
      expect(dns.lookup).not.toHaveBeenCalled();
    });

    it('allows private targets if allowPrivate option is passed', async () => {
      const result = await validateTargetHost('127.0.0.1', { allowPrivate: true });
      expect(result.safe).toBe(true);
    });
  });

  describe('assertSafeTarget', () => {
    it('throws an error when target is unsafe', async () => {
      await expect(assertSafeTarget('10.0.0.5')).rejects.toThrow('SSRF validation failed');
    });

    it('resolves without error when target is safe', async () => {
      (dns.lookup as jest.Mock).mockResolvedValueOnce([
        { address: '8.8.8.8', family: 4 },
      ]);
      await expect(assertSafeTarget('dns.google')).resolves.not.toThrow();
    });
  });
});
