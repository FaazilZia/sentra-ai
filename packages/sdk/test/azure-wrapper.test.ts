import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AzureOpenAI } from 'openai';
import { SentraClient, SentraError } from '../src/index.ts';
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

describe('wrapAzureOpenAI', () => {
  it('allow path: status "allowed" -> original create is called once and its result returned', async () => {
    const { client, recordedRequests } = createStubbedClient({
      status: 'allowed',
      isAllowed: true,
      reason: 'Safe Action'
    });

    let originalCalls = 0;
    const fakeResult = { id: 'chatcmpl-azure-1', choices: [{ message: { content: 'Hello there' } }] };
    const fakeClient = {
      chat: {
        completions: {
          create: async (params: any) => {
            originalCalls++;
            return fakeResult;
          }
        }
      },
      responses: {
        create: async () => ({ id: 'resp-1' })
      }
    };

    const wrapped = client.wrapAzureOpenAI(fakeClient);
    const result = await wrapped.chat.completions.create({
      model: 'gpt-5-mini-sentraa',
      messages: [{ role: 'user', content: 'Say hello in 5 words' }]
    });

    assert.strictEqual(originalCalls, 1, 'Original create should be called exactly once');
    assert.deepStrictEqual(result, fakeResult, 'Result should match original return value');
    assert.strictEqual(recordedRequests.length, 1);
  });

  it('block path: status "blocked" -> throws SentraError with status 403, original NOT called', async () => {
    const { client, recordedRequests } = createStubbedClient({
      status: 'blocked',
      isAllowed: false,
      reason: 'Action blocked by policy',
      risk: 'high'
    });

    let originalCalls = 0;
    const fakeClient = {
      chat: {
        completions: {
          create: async () => {
            originalCalls++;
            return { id: 'should-not-be-called' };
          }
        }
      }
    };

    const wrapped = client.wrapAzureOpenAI(fakeClient);

    await assert.rejects(
      async () => {
        await wrapped.chat.completions.create({
          model: 'gpt-5-mini-sentraa',
          messages: [{ role: 'user', content: 'malicious prompt' }]
        });
      },
      (err: any) => {
        assert.ok(err instanceof SentraError, 'Should be an instance of SentraError');
        assert.strictEqual(err.status, 403, 'Status should be 403');
        assert.ok(err.message.includes('Action blocked by policy'));
        return true;
      }
    );

    assert.strictEqual(originalCalls, 0, 'Original create must NOT be called on blocked path');
    assert.strictEqual(recordedRequests.length, 1);
  });

  it('flag path, flagMode "block" (default) -> throws SentraError 403, original NOT called', async () => {
    const { client, recordedRequests } = createStubbedClient({
      status: 'flagged',
      isAllowed: false,
      reason: 'Action flagged for human review',
      risk: 'medium'
    });

    let originalCalls = 0;
    const fakeClient = {
      chat: {
        completions: {
          create: async () => {
            originalCalls++;
            return { id: 'should-not-be-called' };
          }
        }
      }
    };

    const wrapped = client.wrapAzureOpenAI(fakeClient);

    await assert.rejects(
      async () => {
        await wrapped.chat.completions.create({
          model: 'gpt-5-mini-sentraa',
          messages: [{ role: 'user', content: 'sensitive request' }]
        });
      },
      (err: any) => {
        assert.ok(err instanceof SentraError, 'Should be an instance of SentraError');
        assert.strictEqual(err.status, 403, 'Status should be 403');
        assert.ok(err.message.includes('Action flagged for human review'));
        return true;
      }
    );

    assert.strictEqual(originalCalls, 0, 'Original create must NOT be called on flagged block path');
    assert.strictEqual(recordedRequests.length, 1);
  });

  it('flag path, flagMode "allow" -> onFlag called with the check, original called once', async () => {
    const flaggedResponse: Partial<ActionResponse> = {
      status: 'flagged',
      isAllowed: false,
      reason: 'Action flagged for audit',
      risk: 'medium'
    };
    const { client, recordedRequests } = createStubbedClient(flaggedResponse);

    let originalCalls = 0;
    const fakeResult = { id: 'chatcmpl-flag-allow', choices: [{ message: { content: 'flagged ok' } }] };
    const fakeClient = {
      chat: {
        completions: {
          create: async () => {
            originalCalls++;
            return fakeResult;
          }
        }
      }
    };

    const flagEvents: ActionResponse[] = [];
    const wrapped = client.wrapAzureOpenAI(fakeClient, {
      flagMode: 'allow',
      onFlag: (check) => {
        flagEvents.push(check);
      }
    });

    const result = await wrapped.chat.completions.create({
      model: 'gpt-5-mini-sentraa',
      messages: [{ role: 'user', content: 'flagged content' }]
    });

    assert.strictEqual(originalCalls, 1, 'Original create should be called once when flagMode is allow');
    assert.deepStrictEqual(result, fakeResult);
    assert.strictEqual(flagEvents.length, 1, 'onFlag callback must be invoked');
    assert.strictEqual(flagEvents[0].status, 'flagged');
    assert.strictEqual(flagEvents[0].reason, 'Action flagged for audit');
    assert.strictEqual(recordedRequests.length, 1);
  });

  it('rate_limited -> throws SentraError 429', async () => {
    const { client, recordedRequests } = createStubbedClient({
      status: 'rate_limited',
      isAllowed: false,
      reason: 'Rate limit exceeded'
    });

    let originalCalls = 0;
    const fakeClient = {
      chat: {
        completions: {
          create: async () => {
            originalCalls++;
            return { id: 'rate-limited' };
          }
        }
      }
    };

    const wrapped = client.wrapAzureOpenAI(fakeClient);

    await assert.rejects(
      async () => {
        await wrapped.chat.completions.create({
          model: 'gpt-5-mini-sentraa',
          messages: [{ role: 'user', content: 'hello' }]
        });
      },
      (err: any) => {
        assert.ok(err instanceof SentraError, 'Should be an instance of SentraError');
        assert.strictEqual(err.status, 429, 'Status should be 429');
        assert.ok(err.message.includes('Rate limit exceeded'));
        return true;
      }
    );

    assert.strictEqual(originalCalls, 0, 'Original create must NOT be called on rate limit');
    assert.strictEqual(recordedRequests.length, 1);
  });

  it('action/agent labels: assert checkAction received action "AZURE_OPENAI_CHAT_COMPLETION" and agent "azure-openai-client"', async () => {
    const { client: azureClientStub, recordedRequests: azureRequests } = createStubbedClient({ status: 'allowed' });
    const { client: openAIClientStub, recordedRequests: openAIRequests } = createStubbedClient({ status: 'allowed' });

    const fakeAzureClient = {
      chat: { completions: { create: async () => ({ id: 'azure' }) } }
    };
    const fakeOpenAIClient = {
      chat: { completions: { create: async () => ({ id: 'openai' }) } }
    };

    const wrappedAzure = azureClientStub.wrapAzureOpenAI(fakeAzureClient);
    await wrappedAzure.chat.completions.create({
      model: 'gpt-5-mini-sentraa',
      messages: [{ role: 'user', content: 'test azure labels' }]
    });

    assert.strictEqual(azureRequests.length, 1);
    assert.strictEqual(azureRequests[0].action, 'AZURE_OPENAI_CHAT_COMPLETION');
    assert.strictEqual(azureRequests[0].agent, 'azure-openai-client');
    assert.strictEqual(azureRequests[0].metadata?.model, 'gpt-5-mini-sentraa');
    assert.strictEqual(azureRequests[0].metadata?.prompt, 'test azure labels');

    // Also assert that wrapOpenAI still sends 'OPENAI_CHAT_COMPLETION' and 'openai-client'
    const wrappedOpenAI = openAIClientStub.wrapOpenAI(fakeOpenAIClient);
    await wrappedOpenAI.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'test openai labels' }]
    });

    assert.strictEqual(openAIRequests.length, 1);
    assert.strictEqual(openAIRequests[0].action, 'OPENAI_CHAT_COMPLETION');
    assert.strictEqual(openAIRequests[0].agent, 'openai-client');
    assert.strictEqual(openAIRequests[0].metadata?.model, 'gpt-4o');
    assert.strictEqual(openAIRequests[0].metadata?.prompt, 'test openai labels');
  });

  it('agent override: custom agent option is respected', async () => {
    const { client, recordedRequests } = createStubbedClient({ status: 'allowed' });
    const fakeClient = {
      chat: { completions: { create: async () => ({ id: 'ok' }) } }
    };

    const wrapped = client.wrapAzureOpenAI(fakeClient, { agent: 'sentra-custom-agent' });
    await wrapped.chat.completions.create({
      model: 'gpt-5-mini-sentraa',
      messages: [{ role: 'user', content: 'custom agent test' }]
    });

    assert.strictEqual(recordedRequests.length, 1);
    assert.strictEqual(recordedRequests[0].agent, 'sentra-custom-agent');
    assert.strictEqual(recordedRequests[0].action, 'AZURE_OPENAI_CHAT_COMPLETION');
  });

  it('double wrap is a no-op (__sentra_wrapped__)', async () => {
    const { client, recordedRequests } = createStubbedClient({ status: 'allowed' });
    let createCalls = 0;
    const fakeClient = {
      chat: {
        completions: {
          create: async () => {
            createCalls++;
            return { id: 'double-wrap-ok' };
          }
        }
      }
    };

    const wrappedOnce = client.wrapAzureOpenAI(fakeClient);
    assert.strictEqual((wrappedOnce as any).__sentra_wrapped__, true);

    const wrappedTwice = client.wrapAzureOpenAI(wrappedOnce);
    assert.strictEqual(wrappedTwice, wrappedOnce, 'Second wrap should return identical reference');

    await wrappedTwice.chat.completions.create({
      model: 'gpt-5-mini-sentraa',
      messages: [{ role: 'user', content: 'test double wrap' }]
    });

    // Governance and original method should each execute only once
    assert.strictEqual(recordedRequests.length, 1, 'checkAction must be called only once');
    assert.strictEqual(createCalls, 1, 'Original create must be called only once');
  });

  it('responses.create: wraps responses API with AZURE_OPENAI_RESPONSES_CREATE', async () => {
    const { client, recordedRequests } = createStubbedClient({ status: 'allowed' });
    let responsesCalls = 0;
    const fakeResult = { id: 'resp-azure-1', output: 'result' };
    const fakeClient = {
      responses: {
        create: async (params: any) => {
          responsesCalls++;
          return fakeResult;
        }
      }
    };

    const wrapped = client.wrapAzureOpenAI(fakeClient);
    const result = await wrapped.responses.create({
      model: 'gpt-5-mini-sentraa',
      prompt: 'responses test prompt'
    });

    assert.strictEqual(responsesCalls, 1);
    assert.deepStrictEqual(result, fakeResult);
    assert.strictEqual(recordedRequests.length, 1);
    assert.strictEqual(recordedRequests[0].action, 'AZURE_OPENAI_RESPONSES_CREATE');
    assert.strictEqual(recordedRequests[0].agent, 'azure-openai-client');
    assert.strictEqual(recordedRequests[0].metadata?.model, 'gpt-5-mini-sentraa');
    assert.strictEqual(recordedRequests[0].metadata?.prompt, 'responses test prompt');
  });

  it('content_filter error propagation: 400 content_filter errors propagate unchanged', async () => {
    const { client } = createStubbedClient({ status: 'allowed' });
    const contentFilterError = new Error('The response was filtered due to the prompt triggering Azure OpenAI content management policy.');
    (contentFilterError as any).status = 400;
    (contentFilterError as any).code = 'content_filter';

    const fakeClient = {
      chat: {
        completions: {
          create: async () => {
            throw contentFilterError;
          }
        }
      }
    };

    const wrapped = client.wrapAzureOpenAI(fakeClient);

    await assert.rejects(
      async () => {
        await wrapped.chat.completions.create({
          model: 'gpt-5-mini-sentraa',
          messages: [{ role: 'user', content: 'content filter trigger' }]
        });
      },
      (err: any) => {
        // Assert error is the exact unchanged error thrown by provider
        assert.strictEqual(err, contentFilterError);
        assert.strictEqual(err.status, 400);
        assert.strictEqual(err.code, 'content_filter');
        return true;
      }
    );
  });

  it('handles null / undefined / empty client gracefully', () => {
    const client = new SentraClient({ apiKey: 'sentra_test_sandbox' });
    assert.strictEqual(client.wrapAzureOpenAI(null), null);
    assert.strictEqual(client.wrapAzureOpenAI(undefined), undefined);
  });

  describe('real AzureOpenAI SDK class with stubbed HTTP handler', () => {
    it('allow path: calls real AzureOpenAI client with stubbed fetch and returns completion', async () => {
      const { client, recordedRequests } = createStubbedClient({
        status: 'allowed',
        isAllowed: true,
        reason: 'Safe Action'
      });

      let fetchCalls = 0;
      const cannedCompletion = {
        id: 'chatcmpl-real-azure-allow',
        object: 'chat.completion',
        created: 1700000000,
        model: 'gpt-5-mini-sentraa',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Hello from real AzureOpenAI' },
            finish_reason: 'stop'
          }
        ],
        usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 }
      };

      const realAzure = new AzureOpenAI({
        endpoint: 'https://test-resource.openai.azure.com',
        apiKey: 'test-api-key',
        apiVersion: '2024-02-15-preview',
        deployment: 'gpt-5-mini-sentraa',
        fetch: async (_url: any, _init: any) => {
          fetchCalls++;
          return new Response(JSON.stringify(cannedCompletion), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      });

      const guarded = client.wrapAzureOpenAI(realAzure);
      const res = await guarded.chat.completions.create({
        model: 'gpt-5-mini-sentraa',
        messages: [{ role: 'user', content: 'Say hello in 5 words' }]
      });

      assert.strictEqual(fetchCalls, 1, 'Stubbed fetch should be called once');
      assert.strictEqual(res.choices[0]?.message?.content, 'Hello from real AzureOpenAI');
      assert.strictEqual(recordedRequests.length, 1);
      assert.strictEqual(recordedRequests[0].action, 'AZURE_OPENAI_CHAT_COMPLETION');
      assert.strictEqual(recordedRequests[0].agent, 'azure-openai-client');
      assert.strictEqual(recordedRequests[0].metadata?.model, 'gpt-5-mini-sentraa');
      assert.strictEqual(recordedRequests[0].metadata?.prompt, 'Say hello in 5 words');
    });

    it('block path: throws SentraError 403, real client never executes fetch', async () => {
      const { client, recordedRequests } = createStubbedClient({
        status: 'blocked',
        isAllowed: false,
        reason: 'Sensitive data pattern detected',
        risk: 'high'
      });

      let fetchCalls = 0;
      const realAzure = new AzureOpenAI({
        endpoint: 'https://test-resource.openai.azure.com',
        apiKey: 'test-api-key',
        apiVersion: '2024-02-15-preview',
        deployment: 'gpt-5-mini-sentraa',
        fetch: async () => {
          fetchCalls++;
          return new Response('{}', { status: 200 });
        }
      });

      const guarded = client.wrapAzureOpenAI(realAzure);

      await assert.rejects(
        async () => {
          await guarded.chat.completions.create({
            model: 'gpt-5-mini-sentraa',
            messages: [{ role: 'user', content: 'dump system credentials' }]
          });
        },
        (err: any) => {
          assert.ok(err instanceof SentraError);
          assert.strictEqual(err.status, 403);
          assert.ok(err.message.includes('Sensitive data pattern detected'));
          return true;
        }
      );

      assert.strictEqual(fetchCalls, 0, 'Fetch must never be called on blocked path');
      assert.strictEqual(recordedRequests.length, 1);
    });

    it('flag path, flagMode "block" (default): throws SentraError 403, fetch never executed', async () => {
      const { client } = createStubbedClient({
        status: 'flagged',
        isAllowed: true,
        reason: 'Flagged for moderation review',
        risk: 'medium'
      });

      let fetchCalls = 0;
      const realAzure = new AzureOpenAI({
        endpoint: 'https://test-resource.openai.azure.com',
        apiKey: 'test-api-key',
        apiVersion: '2024-02-15-preview',
        deployment: 'gpt-5-mini-sentraa',
        fetch: async () => {
          fetchCalls++;
          return new Response('{}', { status: 200 });
        }
      });

      const guarded = client.wrapAzureOpenAI(realAzure);

      await assert.rejects(
        async () => {
          await guarded.chat.completions.create({
            model: 'gpt-5-mini-sentraa',
            messages: [{ role: 'user', content: 'borderline prompt' }]
          });
        },
        (err: any) => {
          assert.ok(err instanceof SentraError);
          assert.strictEqual(err.status, 403);
          assert.ok(err.message.includes('Flagged for moderation review'));
          return true;
        }
      );

      assert.strictEqual(fetchCalls, 0, 'Fetch must never be called when flagged with block mode');
    });

    it('flag path, flagMode "allow": calls onFlag callback and executes fetch', async () => {
      const { client } = createStubbedClient({
        status: 'flagged',
        isAllowed: true,
        reason: 'Flagged for moderation review',
        risk: 'medium'
      });

      let fetchCalls = 0;
      let flagCallbackReceived: any = null;

      const cannedCompletion = {
        id: 'chatcmpl-flag-allowed',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Flagged but allowed output' }, finish_reason: 'stop' }]
      };

      const realAzure = new AzureOpenAI({
        endpoint: 'https://test-resource.openai.azure.com',
        apiKey: 'test-api-key',
        apiVersion: '2024-02-15-preview',
        deployment: 'gpt-5-mini-sentraa',
        fetch: async () => {
          fetchCalls++;
          return new Response(JSON.stringify(cannedCompletion), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      });

      const guarded = client.wrapAzureOpenAI(realAzure, {
        flagMode: 'allow',
        onFlag: (check) => {
          flagCallbackReceived = check;
        }
      });

      const res = await guarded.chat.completions.create({
        model: 'gpt-5-mini-sentraa',
        messages: [{ role: 'user', content: 'borderline prompt' }]
      });

      assert.strictEqual(fetchCalls, 1, 'Fetch should be called once when flagMode is allow');
      assert.strictEqual(res.choices[0]?.message?.content, 'Flagged but allowed output');
      assert.ok(flagCallbackReceived);
      assert.strictEqual(flagCallbackReceived.status, 'flagged');
    });

    it('stream path (allowed): passes through real streaming response from AzureOpenAI', async () => {
      const { client, recordedRequests } = createStubbedClient({
        status: 'allowed',
        isAllowed: true,
        reason: 'Safe Action'
      });

      let fetchCalls = 0;
      const sseBody = [
        'data: {"id":"chatcmpl-stream","choices":[{"delta":{"content":"Hello "},"index":0}]}\n\n',
        'data: {"id":"chatcmpl-stream","choices":[{"delta":{"content":"streaming Azure!"},"index":0}]}\n\n',
        'data: [DONE]\n\n'
      ].join('');

      const realAzure = new AzureOpenAI({
        endpoint: 'https://test-resource.openai.azure.com',
        apiKey: 'test-api-key',
        apiVersion: '2024-02-15-preview',
        deployment: 'gpt-5-mini-sentraa',
        fetch: async () => {
          fetchCalls++;
          return new Response(sseBody, {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' }
          });
        }
      });

      const guarded = client.wrapAzureOpenAI(realAzure);
      const stream = await guarded.chat.completions.create({
        model: 'gpt-5-mini-sentraa',
        messages: [{ role: 'user', content: 'Say hello streaming' }],
        stream: true
      });

      let collectedText = '';
      for await (const chunk of stream) {
        collectedText += chunk.choices[0]?.delta?.content || '';
      }

      assert.strictEqual(fetchCalls, 1);
      assert.strictEqual(collectedText, 'Hello streaming Azure!');
      assert.strictEqual(recordedRequests.length, 1);
      assert.strictEqual(recordedRequests[0].action, 'AZURE_OPENAI_CHAT_COMPLETION');
    });

    it('stream path (blocked): throws SentraError 403 pre-flight and never starts stream', async () => {
      const { client } = createStubbedClient({
        status: 'blocked',
        isAllowed: false,
        reason: 'Blocked stream request',
        risk: 'high'
      });

      let fetchCalls = 0;
      const realAzure = new AzureOpenAI({
        endpoint: 'https://test-resource.openai.azure.com',
        apiKey: 'test-api-key',
        apiVersion: '2024-02-15-preview',
        deployment: 'gpt-5-mini-sentraa',
        fetch: async () => {
          fetchCalls++;
          return new Response('{}', { status: 200 });
        }
      });

      const guarded = client.wrapAzureOpenAI(realAzure);

      await assert.rejects(
        async () => {
          await guarded.chat.completions.create({
            model: 'gpt-5-mini-sentraa',
            messages: [{ role: 'user', content: 'malicious streaming prompt' }],
            stream: true
          });
        },
        (err: any) => {
          assert.ok(err instanceof SentraError);
          assert.strictEqual(err.status, 403);
          assert.ok(err.message.includes('Blocked stream request'));
          return true;
        }
      );

      assert.strictEqual(fetchCalls, 0, 'Fetch must never be called on blocked stream');
    });
  });
});
