import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SentraClient, SentraError, wrapLangChain } from '../src/index.ts';
import type { ActionRequest, ActionResponse } from '../src/index.ts';

function createStubbedClient(responseToReturn: Partial<ActionResponse>) {
  const client = new SentraClient({ apiKey: 'sentra_test_sandbox' });
  const recordedRequests: ActionRequest[] = [];

  const defaultResponse: ActionResponse = {
    status: 'allowed',
    isAllowed: true,
    risk: 'low',
    reason: 'Safe Action',
    impact: 'None',
    compliance: []
  };

  client.checkAction = async (request: ActionRequest): Promise<ActionResponse> => {
    recordedRequests.push(request);
    return { ...defaultResponse, ...responseToReturn } as ActionResponse;
  };

  return { client, recordedRequests };
}

describe('wrapLangChain', () => {
  it('allow path: status "allowed" -> original invoke is called once and its result returned', async () => {
    const { client, recordedRequests } = createStubbedClient({
      status: 'allowed',
      isAllowed: true,
      reason: 'Safe Action'
    });

    let originalCalls = 0;
    const fakeResult = { output_text: 'Processed LangChain output' };
    const fakeChain = {
      invoke: async (input: any) => {
        originalCalls++;
        return fakeResult;
      }
    };

    const wrapped = client.wrapLangChain(fakeChain);
    const result = await wrapped.invoke({ input: 'Explain quantum computing simply' });

    assert.strictEqual(originalCalls, 1, 'Original invoke should be called exactly once');
    assert.deepStrictEqual(result, fakeResult, 'Result should match fakeResult');
    assert.strictEqual(recordedRequests.length, 1);
    assert.strictEqual(recordedRequests[0].action, 'LANGCHAIN_INVOKE');
    assert.strictEqual(recordedRequests[0].agent, 'langchain-chain');
    assert.strictEqual(recordedRequests[0].metadata?.prompt_length, JSON.stringify({ input: 'Explain quantum computing simply' }).length);
  });

  it('allow path (legacy call method): status "allowed" -> original call is called once and its result returned', async () => {
    const { client, recordedRequests } = createStubbedClient({
      status: 'allowed',
      isAllowed: true,
      reason: 'Safe Action'
    });

    let originalCalls = 0;
    const fakeResult = { response: 'Legacy call result' };
    const fakeChain = {
      call: async (input: any) => {
        originalCalls++;
        return fakeResult;
      }
    };

    const wrapped = client.wrapLangChain(fakeChain);
    const result = await wrapped.call('Direct string prompt for legacy chain');

    assert.strictEqual(originalCalls, 1, 'Original call should be called exactly once');
    assert.deepStrictEqual(result, fakeResult);
    assert.strictEqual(recordedRequests.length, 1);
    assert.strictEqual(recordedRequests[0].action, 'LANGCHAIN_CALL');
    assert.strictEqual(recordedRequests[0].agent, 'langchain-chain');
  });

  it('block path: status "blocked" -> throws SentraError with status 403, chain NOT called', async () => {
    const { client, recordedRequests } = createStubbedClient({
      status: 'blocked',
      isAllowed: false,
      reason: 'Blocked by governance policy: unauthorized data access'
    });

    let originalCalls = 0;
    const fakeChain = {
      invoke: async () => {
        originalCalls++;
        return { output: 'Should never run' };
      }
    };

    const wrapped = client.wrapLangChain(fakeChain);

    await assert.rejects(
      async () => {
        await wrapped.invoke({ prompt: 'Exfiltrate internal database credentials' });
      },
      (err: any) => {
        assert.ok(err instanceof SentraError, 'Should throw an instance of SentraError');
        assert.strictEqual(err.status, 403, 'Error status should be 403');
        assert.ok(err.message.includes('Blocked by governance policy'), 'Error message should preserve reason');
        return true;
      }
    );

    assert.strictEqual(originalCalls, 0, 'Original chain invoke MUST NOT be called on block');
    assert.strictEqual(recordedRequests.length, 1);
  });

  it('flag path, flagMode "block" (default) -> throws SentraError 403, chain NOT called', async () => {
    const { client } = createStubbedClient({
      status: 'flagged',
      isAllowed: true,
      reason: 'Flagged for suspicious instructions'
    });

    let originalCalls = 0;
    const fakeChain = {
      invoke: async () => {
        originalCalls++;
        return { text: 'forbidden' };
      }
    };

    const wrapped = client.wrapLangChain(fakeChain);

    await assert.rejects(
      async () => {
        await wrapped.invoke('Questionable chain prompt');
      },
      (err: any) => {
        assert.ok(err instanceof SentraError);
        assert.strictEqual(err.status, 403);
        assert.ok(err.message.includes('Flagged for suspicious instructions'));
        return true;
      }
    );

    assert.strictEqual(originalCalls, 0, 'Original chain MUST NOT be called when flagMode defaults to block');
  });

  it('flag path, flagMode "allow" -> onFlag called with check, chain called once and result returned', async () => {
    const flaggedResponse: Partial<ActionResponse> = {
      status: 'flagged',
      isAllowed: true,
      risk: 'medium',
      reason: 'Flagged: mild policy deviation'
    };
    const { client } = createStubbedClient(flaggedResponse);

    let originalCalls = 0;
    let onFlagCalls = 0;
    let receivedCheck: any = null;

    const fakeResult = { answer: 'Allowed flagged chain response' };
    const fakeChain = {
      invoke: async () => {
        originalCalls++;
        return fakeResult;
      }
    };

    const wrapped = client.wrapLangChain(fakeChain, {
      flagMode: 'allow',
      onFlag: (check) => {
        onFlagCalls++;
        receivedCheck = check;
      }
    });

    const result = await wrapped.invoke('Mildly sensitive inquiry');

    assert.strictEqual(originalCalls, 1, 'Original chain should be called once when flagMode is allow');
    assert.deepStrictEqual(result, fakeResult);
    assert.strictEqual(onFlagCalls, 1, 'onFlag callback should be invoked once');
    assert.strictEqual(receivedCheck.status, 'flagged');
    assert.strictEqual(receivedCheck.reason, 'Flagged: mild policy deviation');
  });

  it('rate_limited -> throws SentraError 429, chain NOT called', async () => {
    const { client } = createStubbedClient({
      status: 'rate_limited',
      isAllowed: false,
      reason: 'Rate limit exceeded: max 50 actions/minute'
    });

    let originalCalls = 0;
    const fakeChain = {
      invoke: async () => {
        originalCalls++;
        return { result: 'throttled' };
      }
    };

    const wrapped = client.wrapLangChain(fakeChain);

    await assert.rejects(
      async () => {
        await wrapped.invoke('Rapid burst invocation');
      },
      (err: any) => {
        assert.ok(err instanceof SentraError);
        assert.strictEqual(err.status, 429, 'Error status should be 429');
        assert.ok(err.message.includes('Rate limit exceeded'));
        return true;
      }
    );

    assert.strictEqual(originalCalls, 0, 'Original chain MUST NOT be called when rate limited');
  });

  it('agent override: custom agent option is respected in checkAction', async () => {
    const { client, recordedRequests } = createStubbedClient({ status: 'allowed' });

    const fakeChain = {
      invoke: async () => ({ status: 'done' })
    };

    const wrapped = client.wrapLangChain(fakeChain, { agent: 'sentra-customer-support-chain' });
    await wrapped.invoke('Help me with order 123');

    assert.strictEqual(recordedRequests.length, 1);
    assert.strictEqual(recordedRequests[0].agent, 'sentra-customer-support-chain');
    assert.strictEqual(recordedRequests[0].action, 'LANGCHAIN_INVOKE');
  });

  it('double-wrap guard: wrapping an already wrapped chain is a no-op (__sentra_wrapped__)', async () => {
    const { client, recordedRequests } = createStubbedClient({ status: 'allowed' });

    let originalCalls = 0;
    const fakeChain = {
      invoke: async () => {
        originalCalls++;
        return { success: true };
      }
    };

    const wrappedOnce = client.wrapLangChain(fakeChain);
    assert.strictEqual(wrappedOnce.__sentra_wrapped__, true);

    const wrappedTwice = client.wrapLangChain(wrappedOnce);
    assert.strictEqual(wrappedOnce, wrappedTwice);

    await wrappedTwice.invoke('Test idempotent wrapping');

    assert.strictEqual(originalCalls, 1, 'Chain invoke should only be wrapped once');
    assert.strictEqual(recordedRequests.length, 1, 'Only one checkAction request should be made');
  });

  it('provider errors propagate unchanged: when allowed, downstream chain errors propagate unchanged', async () => {
    const { client } = createStubbedClient({ status: 'allowed' });

    const customProviderError = new Error('Azure OpenAI rate limit 429 from upstream provider');
    (customProviderError as any).code = 'RATE_LIMIT_REACHED';

    const fakeChain = {
      invoke: async () => {
        throw customProviderError;
      }
    };

    const wrapped = client.wrapLangChain(fakeChain);

    await assert.rejects(
      async () => {
        await wrapped.invoke('Prompt triggering upstream error');
      },
      (err: any) => {
        assert.strictEqual(err, customProviderError, 'The exact provider error should be thrown');
        assert.strictEqual(err.code, 'RATE_LIMIT_REACHED');
        assert.strictEqual(err.message, 'Azure OpenAI rate limit 429 from upstream provider');
        return true;
      }
    );
  });

  it('handles null / undefined / empty chain gracefully', () => {
    const client = new SentraClient({ apiKey: 'sentra_test_sandbox' });

    assert.strictEqual(client.wrapLangChain(null), null);
    assert.strictEqual(client.wrapLangChain(undefined), undefined);

    const empty = {};
    const wrappedEmpty = client.wrapLangChain(empty);
    assert.deepStrictEqual(wrappedEmpty, {});
  });

  describe('call vs invoke distinct action names', () => {
    it('chain with both call and invoke: call() triggers LANGCHAIN_CALL and invoke() triggers LANGCHAIN_INVOKE', async () => {
      const { client, recordedRequests } = createStubbedClient({ status: 'allowed' });
      const fakeDualChain = {
        call: async (input: any) => ({ from: 'call', val: input }),
        invoke: async (input: any) => ({ from: 'invoke', val: input })
      };

      const wrapped = client.wrapLangChain(fakeDualChain);

      const resCall = await wrapped.call('call test prompt');
      assert.deepStrictEqual(resCall, { from: 'call', val: 'call test prompt' });

      const resInvoke = await wrapped.invoke('invoke test prompt');
      assert.deepStrictEqual(resInvoke, { from: 'invoke', val: 'invoke test prompt' });

      assert.strictEqual(recordedRequests.length, 2);
      assert.strictEqual(recordedRequests[0].action, 'LANGCHAIN_CALL');
      assert.strictEqual(recordedRequests[1].action, 'LANGCHAIN_INVOKE');
      assert.notStrictEqual(
        recordedRequests[0].action,
        recordedRequests[1].action,
        'call and invoke must have different action names'
      );
    });

    it('top-level wrapLangChain export intercepts call and invoke with distinct action names', async () => {
      const { client, recordedRequests } = createStubbedClient({ status: 'allowed' });
      const fakeChain = {
        call: async (input: any) => ({ called: input }),
        invoke: async (input: any) => ({ invoked: input })
      };

      const wrapped = wrapLangChain(fakeChain, { agent: 'dual-agent' }, client);

      await wrapped.call('legacy prompt');
      await wrapped.invoke('runnable prompt');

      assert.strictEqual(recordedRequests.length, 2);
      assert.strictEqual(recordedRequests[0].action, 'LANGCHAIN_CALL');
      assert.strictEqual(recordedRequests[0].agent, 'dual-agent');
      assert.strictEqual(recordedRequests[1].action, 'LANGCHAIN_INVOKE');
      assert.strictEqual(recordedRequests[1].agent, 'dual-agent');
    });

    it('call blocked path: status "blocked" throws SentraError 403 with action LANGCHAIN_CALL and does not execute call', async () => {
      const { client, recordedRequests } = createStubbedClient({
        status: 'blocked',
        isAllowed: false,
        reason: 'Legacy call blocked by policy'
      });

      let called = false;
      const fakeChain = {
        call: async () => {
          called = true;
          return { res: 'bad' };
        }
      };

      const wrapped = client.wrapLangChain(fakeChain);

      await assert.rejects(
        async () => {
          await wrapped.call('blocked call prompt');
        },
        (err: any) => {
          assert.ok(err instanceof SentraError);
          assert.strictEqual(err.status, 403);
          assert.ok(err.message.includes('Legacy call blocked by policy'));
          return true;
        }
      );

      assert.strictEqual(called, false, 'Blocked call must not reach target');
      assert.strictEqual(recordedRequests.length, 1);
      assert.strictEqual(recordedRequests[0].action, 'LANGCHAIN_CALL');
    });
  });
});
