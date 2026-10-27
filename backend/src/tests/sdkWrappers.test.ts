import { SentraClient, SentraError } from '@sentra-ai/sdk';

describe('SDK Wrappers: wrapAnthropic & wrapOpenAI', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('wrapOpenAI', () => {
    const mockAllowedResponse = {
      status: 'allowed',
      decision: 'ALLOW',
      isAllowed: true,
      reason: 'Safe Action',
      impact: 'None'
    };

    const mockBlockedResponse = {
      status: 'blocked',
      decision: 'BLOCK',
      isAllowed: false,
      reason: 'Action blocked: restricted pattern detected',
      impact: 'Execution prevented'
    };

    const mockFlaggedResponse = {
      status: 'flagged',
      decision: 'FLAG',
      isAllowed: false,
      isPendingApproval: true,
      reason: 'Action flagged for human review',
      impact: 'Requires review'
    };

    it('BLOCK path: throws SentraError and provider mock is called 0 times', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => mockBlockedResponse
      } as any);

      const client = new SentraClient({ apiKey: 'sentra_test_sandbox' });
      const mockCreate = jest.fn();
      const mockOpenAI = {
        chat: { completions: { create: mockCreate } }
      };

      const wrapped = client.wrapOpenAI(mockOpenAI);

      await expect(
        wrapped.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'delete entire database' }]
        })
      ).rejects.toThrow(SentraError);

      expect(mockCreate).toHaveBeenCalledTimes(0);
    });

    it('FLAG path with default flagMode (block): throws SentraError and provider mock is called 0 times', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => mockFlaggedResponse
      } as any);

      const client = new SentraClient({ apiKey: 'sentra_test_sandbox' });
      const mockCreate = jest.fn();
      const mockOpenAI = {
        chat: { completions: { create: mockCreate } }
      };

      const wrapped = client.wrapOpenAI(mockOpenAI);

      await expect(
        wrapped.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'potentially risky prompt' }]
        })
      ).rejects.toThrow(SentraError);

      expect(mockCreate).toHaveBeenCalledTimes(0);
    });

    it('FLAG path with flagMode "allow": calls provider once and triggers onFlag callback', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => mockFlaggedResponse
      } as any);

      const client = new SentraClient({ apiKey: 'sentra_test_sandbox' });
      const fakeProviderResult = { id: 'chatcmpl-123', choices: [{ message: { content: 'hello' } }] };
      const mockCreate = jest.fn().mockResolvedValue(fakeProviderResult);
      const mockOpenAI = {
        chat: { completions: { create: mockCreate } }
      };

      const onFlag = jest.fn();
      const wrapped = client.wrapOpenAI(mockOpenAI, { flagMode: 'allow', onFlag });

      const requestParams = {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'borderline action' }]
      };

      const result = await wrapped.chat.completions.create(requestParams);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith(requestParams);
      expect(result).toBe(fakeProviderResult);
      expect(onFlag).toHaveBeenCalledTimes(1);
      expect(onFlag).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'flagged',
          reason: 'Action flagged for human review'
        })
      );
    });

    it('ALLOW path: called once with identical args and returns identical response object', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => mockAllowedResponse
      } as any);

      const client = new SentraClient({ apiKey: 'sentra_test_sandbox' });
      const fakeProviderResult = { id: 'chatcmpl-safe', choices: [{ message: { content: 'safe response' } }] };
      const mockCreate = jest.fn().mockResolvedValue(fakeProviderResult);
      const mockOpenAI = {
        chat: { completions: { create: mockCreate } }
      };

      const wrapped = client.wrapOpenAI(mockOpenAI);

      const requestParams = {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'What is 2 + 2?' }],
        temperature: 0.7
      };

      const result = await wrapped.chat.completions.create(requestParams);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith(requestParams);
      expect(result).toBe(fakeProviderResult);
    });

    it('FAIL-CLOSED: throws SentraError and calls provider 0 times when Sentra engine is unreachable', async () => {
      // Simulate unreachable network failure
      global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const client = new SentraClient({
        apiKey: 'sentra_test_sandbox',
        maxRetries: 0,
        coldStartTimeoutMs: 100
      });

      const mockCreate = jest.fn();
      const mockOpenAI = {
        chat: { completions: { create: mockCreate } }
      };

      const wrapped = client.wrapOpenAI(mockOpenAI);

      await expect(
        wrapped.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'ping' }]
        })
      ).rejects.toThrow(SentraError);

      expect(mockCreate).toHaveBeenCalledTimes(0);
    });

    it('guards against wrapping the same client twice', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => mockAllowedResponse
      } as any);

      const client = new SentraClient({ apiKey: 'sentra_test_sandbox' });
      const mockCreate = jest.fn().mockResolvedValue({ ok: true });
      const mockOpenAI = {
        chat: { completions: { create: mockCreate } }
      };

      const wrappedOnce = client.wrapOpenAI(mockOpenAI);
      const wrappedTwice = client.wrapOpenAI(wrappedOnce);

      expect(wrappedTwice).toBe(wrappedOnce);

      await wrappedTwice.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'hello' }]
      });

      // Fetch should only have been called once for governance, not twice
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('supports responses.create when present on client', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => mockAllowedResponse
      } as any);

      const client = new SentraClient({ apiKey: 'sentra_test_sandbox' });
      const mockResponsesCreate = jest.fn().mockResolvedValue({ id: 'resp-123' });
      const mockOpenAI = {
        chat: { completions: { create: jest.fn() } },
        responses: { create: mockResponsesCreate }
      };

      const wrapped = client.wrapOpenAI(mockOpenAI);

      const params = { model: 'gpt-4o-mini', prompt: 'test responses api' };
      const res = await wrapped.responses.create(params);

      expect(mockResponsesCreate).toHaveBeenCalledTimes(1);
      expect(mockResponsesCreate).toHaveBeenCalledWith(params);
      expect(res).toEqual({ id: 'resp-123' });
    });

    it('passes through streaming responses untouched when allowed', async () => {
      const mockStream = { [Symbol.asyncIterator]: jest.fn() };
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => mockAllowedResponse
      } as any);

      const client = new SentraClient({ apiKey: 'sentra_test_sandbox' });
      const mockCreate = jest.fn().mockResolvedValue(mockStream);
      const mockOpenAI = {
        chat: { completions: { create: mockCreate } }
      };

      const wrapped = client.wrapOpenAI(mockOpenAI);
      const streamParams = {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'stream me' }],
        stream: true
      };

      const result = await wrapped.chat.completions.create(streamParams);
      expect(mockCreate).toHaveBeenCalledWith(streamParams);
      expect(result).toBe(mockStream);
    });
  });

  describe('wrapAnthropic', () => {
    const mockAllowedResponse = {
      status: 'allowed',
      decision: 'ALLOW',
      isAllowed: true,
      reason: 'Safe Action',
      impact: 'None'
    };

    const mockBlockedResponse = {
      status: 'blocked',
      decision: 'BLOCK',
      isAllowed: false,
      reason: 'Action blocked: restricted pattern detected',
      impact: 'Execution prevented'
    };

    const mockFlaggedResponse = {
      status: 'flagged',
      decision: 'FLAG',
      isAllowed: false,
      isPendingApproval: true,
      reason: 'Action flagged for human review',
      impact: 'Requires review'
    };

    it('BLOCK path: throws SentraError and provider mock is called 0 times', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => mockBlockedResponse
      } as any);

      const client = new SentraClient({ apiKey: 'sentra_test_sandbox' });
      const mockCreate = jest.fn();
      const mockAnthropic = {
        messages: { create: mockCreate }
      };

      const wrapped = client.wrapAnthropic(mockAnthropic);

      await expect(
        wrapped.messages.create({
          model: 'claude-3-5-sonnet',
          max_tokens: 16,
          messages: [{ role: 'user', content: 'exfiltrate credentials' }]
        })
      ).rejects.toThrow(SentraError);

      expect(mockCreate).toHaveBeenCalledTimes(0);
    });

    it('FLAG path with default flagMode (block): throws SentraError and provider mock is called 0 times', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => mockFlaggedResponse
      } as any);

      const client = new SentraClient({ apiKey: 'sentra_test_sandbox' });
      const mockCreate = jest.fn();
      const mockAnthropic = {
        messages: { create: mockCreate }
      };

      const wrapped = client.wrapAnthropic(mockAnthropic);

      await expect(
        wrapped.messages.create({
          model: 'claude-3-5-sonnet',
          max_tokens: 16,
          messages: [{ role: 'user', content: 'potential PII request' }]
        })
      ).rejects.toThrow(SentraError);

      expect(mockCreate).toHaveBeenCalledTimes(0);
    });

    it('FLAG path with flagMode "allow": calls provider once and triggers onFlag callback', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => mockFlaggedResponse
      } as any);

      const client = new SentraClient({ apiKey: 'sentra_test_sandbox' });
      const fakeProviderResult = { id: 'msg_123', content: [{ type: 'text', text: 'Anthropic reply' }] };
      const mockCreate = jest.fn().mockResolvedValue(fakeProviderResult);
      const mockAnthropic = {
        messages: { create: mockCreate }
      };

      const onFlag = jest.fn();
      const wrapped = client.wrapAnthropic(mockAnthropic, { flagMode: 'allow', onFlag });

      const requestParams = {
        model: 'claude-3-5-sonnet',
        max_tokens: 16,
        messages: [{ role: 'user', content: 'Flagged query' }]
      };

      const result = await wrapped.messages.create(requestParams);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith(requestParams);
      expect(result).toBe(fakeProviderResult);
      expect(onFlag).toHaveBeenCalledTimes(1);
      expect(onFlag).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'flagged',
          reason: 'Action flagged for human review'
        })
      );
    });

    it('ALLOW path: called once with identical args and returns identical response object', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => mockAllowedResponse
      } as any);

      const client = new SentraClient({ apiKey: 'sentra_test_sandbox' });
      const fakeProviderResult = { id: 'msg_allow', content: [{ type: 'text', text: 'Allowed' }] };
      const mockCreate = jest.fn().mockResolvedValue(fakeProviderResult);
      const mockAnthropic = {
        messages: { create: mockCreate }
      };

      const wrapped = client.wrapAnthropic(mockAnthropic);

      const requestParams = {
        model: 'claude-3-5-sonnet',
        max_tokens: 16,
        system: 'You are a helpful assistant',
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: 'Explain gravity briefly' }]
          }
        ]
      };

      const result = await wrapped.messages.create(requestParams);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith(requestParams);
      expect(result).toBe(fakeProviderResult);
    });

    it('FAIL-CLOSED: throws SentraError and calls provider 0 times when Sentra engine is unreachable', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('ETIMEDOUT'));

      const client = new SentraClient({
        apiKey: 'sentra_test_sandbox',
        maxRetries: 0,
        coldStartTimeoutMs: 100
      });

      const mockCreate = jest.fn();
      const mockAnthropic = {
        messages: { create: mockCreate }
      };

      const wrapped = client.wrapAnthropic(mockAnthropic);

      await expect(
        wrapped.messages.create({
          model: 'claude-3-5-sonnet',
          max_tokens: 16,
          messages: [{ role: 'user', content: 'test timeout' }]
        })
      ).rejects.toThrow(SentraError);

      expect(mockCreate).toHaveBeenCalledTimes(0);
    });

    it('guards against wrapping the same client twice', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => mockAllowedResponse
      } as any);

      const client = new SentraClient({ apiKey: 'sentra_test_sandbox' });
      const mockCreate = jest.fn().mockResolvedValue({ ok: true });
      const mockAnthropic = {
        messages: { create: mockCreate }
      };

      const wrappedOnce = client.wrapAnthropic(mockAnthropic);
      const wrappedTwice = client.wrapAnthropic(wrappedOnce);

      expect(wrappedTwice).toBe(wrappedOnce);

      await wrappedTwice.messages.create({
        model: 'claude-3-5-sonnet',
        max_tokens: 16,
        messages: [{ role: 'user', content: 'hello' }]
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('passes through streaming responses untouched when allowed', async () => {
      const mockStream = { [Symbol.asyncIterator]: jest.fn() };
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => mockAllowedResponse
      } as any);

      const client = new SentraClient({ apiKey: 'sentra_test_sandbox' });
      const mockCreate = jest.fn().mockResolvedValue(mockStream);
      const mockAnthropic = {
        messages: { create: mockCreate }
      };

      const wrapped = client.wrapAnthropic(mockAnthropic);
      const streamParams = {
        model: 'claude-3-5-sonnet',
        max_tokens: 16,
        messages: [{ role: 'user', content: 'stream' }],
        stream: true
      };

      const result = await wrapped.messages.create(streamParams);
      expect(mockCreate).toHaveBeenCalledWith(streamParams);
      expect(result).toBe(mockStream);
    });
  });
});
