import { SentraClient, SentraError } from '@sentra-ai/sdk';

describe('SDK v1.0.6 Hardening & Lifecycle Tests', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('Requirement 1: Explicit Sandbox Enforcement', () => {
    it('throws when no API key is provided', () => {
      expect(() => new SentraClient({} as any)).toThrow(
        "No API key. Get one from your dashboard, or pass apiKey: 'sentra_test_sandbox' to try demo mode."
      );
    });

    it('throws when apiKey is empty string and sandbox is not set', () => {
      expect(() => new SentraClient({ apiKey: '   ' })).toThrow(
        "No API key. Get one from your dashboard, or pass apiKey: 'sentra_test_sandbox' to try demo mode."
      );
    });

    it('activates sandbox mode only when explicitly requested via apiKey or sandbox: true', () => {
      const sandboxKeyClient = new SentraClient({ apiKey: 'sentra_test_sandbox' });
      expect(sandboxKeyClient.isSandbox).toBe(true);

      const explicitSandboxClient = new SentraClient({ sandbox: true });
      expect(explicitSandboxClient.isSandbox).toBe(true);

      const prodClient = new SentraClient({ apiKey: 'live_org_key_12345' });
      expect(prodClient.isSandbox).toBe(false);
    });
  });

  describe('Requirement 2: Cold Start Delayed Response & Retry Handling', () => {
    it('retries on cold-start (503/timeout) and succeeds with waking up message', async () => {
      let attempts = 0;
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      global.fetch = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts === 1) {
          return {
            status: 503,
            ok: false,
            json: async () => ({ message: 'Service Unavailable' })
          } as any;
        }
        return {
          status: 200,
          ok: true,
          json: async () => ({
            status: 'allowed',
            decision: 'ALLOW',
            reason: 'Safe Action',
            impact: 'None'
          })
        } as any;
      });

      const client = new SentraClient({
        apiKey: 'sentra_test_sandbox',
        timeout: 5000,
      });

      const res = await client.checkAction({
        agent: 'test-agent',
        action: 'ping'
      });

      expect(attempts).toBe(2);
      expect(res.status).toBe('allowed');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Backend is waking up (Render cold start')
      );

      warnSpy.mockRestore();
    });

    it('handles simulated delayed cold-start responses gracefully', async () => {
      global.fetch = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          status: 200,
          ok: true,
          json: async () => ({
            status: 'allowed',
            decision: 'ALLOW',
            reason: 'Safe Action after cold sleep',
            impact: 'None'
          })
        } as any;
      });

      const client = new SentraClient({
        apiKey: 'sentra_test_sandbox',
        timeout: 10000,
      });

      const res = await client.checkAction({
        agent: 'slow-boot-agent',
        action: 'status_check'
      });

      expect(res.status).toBe('allowed');
      expect(res.reason).toBe('Safe Action after cold sleep');
    });
  });

  describe('Requirement 3: 429 Rate Limit Formatting', () => {
    it('returns rate_limited status with clean reason and no security block indicators', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      global.fetch = jest.fn().mockResolvedValue({
        status: 429,
        ok: false,
        json: async () => ({
          success: false,
          message: 'Too many demo requests from this IP.'
        })
      } as any);

      const client = new SentraClient({
        apiKey: 'sentra_test_sandbox',
      });

      const res = await client.checkAction({
        agent: 'test-agent',
        action: 'test_action'
      });

      expect(res.status).toBe('rate_limited');
      expect(res.risk).toBe('low');
      expect(res.reason).toBe('Demo limit reached. Wait a few minutes or use your own API key');
      expect(res.compliance).toEqual(['Rate Limiting Quota']);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Demo limit reached. Wait a few minutes or use your own API key')
      );

      warnSpy.mockRestore();
    });
  });
});
