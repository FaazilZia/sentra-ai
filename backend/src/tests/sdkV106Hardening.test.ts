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

  describe('Requirement 3: 429 Rate Limit Formatting & isAllowed Safety', () => {
    it('returns rate_limited status with clean reason, no security block indicators, and isAllowed: false', async () => {
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
      expect(res.isAllowed).toBe(false);
      expect(res.risk).toBe('low');
      expect(res.reason).toBe('Demo limit reached. Wait a few minutes or use your own API key');
      expect(res.compliance).toEqual(['Rate Limiting Quota']);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Demo limit reached. Wait a few minutes or use your own API key')
      );

      warnSpy.mockRestore();
    });

    it('sets isAllowed: true for allowed actions and isAllowed: false for blocked/flagged actions', async () => {
      const client = new SentraClient({ apiKey: 'sentra_test_sandbox' });

      // Allowed action
      global.fetch = jest.fn().mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ status: 'ALLOWED', reason: 'Safe' })
      } as any);

      const allowRes = await client.checkAction({ agent: 'bot', action: 'read' });
      expect(allowRes.status).toBe('allowed');
      expect(allowRes.isAllowed).toBe(true);

      // Blocked action
      global.fetch = jest.fn().mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ status: 'BLOCKED', reason: 'Restricted' })
      } as any);

      const blockRes = await client.checkAction({ agent: 'bot', action: 'drop_database' });
      expect(blockRes.status).toBe('blocked');
      expect(blockRes.isAllowed).toBe(false);

      // Flagged action
      global.fetch = jest.fn().mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ status: 'FLAGGED', isPendingApproval: true, reason: 'Needs review' })
      } as any);

      const flagRes = await client.checkAction({ agent: 'bot', action: 'large_transfer' });
      expect(flagRes.status).toBe('flagged');
      expect(flagRes.isAllowed).toBe(false);
    });

    it('ensures safeAction never executes callback on rate_limited or blocked actions', async () => {
      const client = new SentraClient({ apiKey: 'sentra_test_sandbox' });
      const callback = jest.fn().mockReturnValue('executed');
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock rate limited response
      global.fetch = jest.fn().mockResolvedValueOnce({
        status: 429,
        ok: false
        } as any);

      const result = await client.safeAction(
        { agent: 'agent', action: 'risky_operation' },
        callback
      );

      expect(result.success).toBe(false);
      expect(result.governance.status).toBe('rate_limited');
      expect(result.governance.isAllowed).toBe(false);
      expect(callback).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  describe('Requirement 4: Configurable coldStartTimeoutMs', () => {
    it('stops retrying and fails closed when coldStartTimeoutMs budget is exceeded', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Continuous 503 Gateway cold-start errors
      global.fetch = jest.fn().mockResolvedValue({
        status: 503,
        ok: false
      } as any);

      // Set coldStartTimeoutMs to 50ms (very small budget)
      const client = new SentraClient({
        apiKey: 'sentra_test_sandbox',
        coldStartTimeoutMs: 50,
        timeout: 1000
      });

      const res = await client.checkAction({ agent: 'agent', action: 'ping' });

      expect(res.status).toBe('blocked');
      expect(res.isAllowed).toBe(false);
      expect(res.reason).toContain('Governance engine unreachable');
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Connection Failed: Unable to reach Sentra governance engine')
      );

      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });
});
