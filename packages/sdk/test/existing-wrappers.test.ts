import { describe, it } from 'node:test';
import assert from 'node:assert';
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

describe('Existing Wrappers Regression', () => {
  it('wrapOpenAI: preserves action names and agent labels', async () => {
    const { client, recordedRequests } = createStubbedClient({ status: 'allowed' });
    const fakeResult = { id: 'chat-openai-1', choices: [] };
    const fakeClient = {
      chat: {
        completions: {
          create: async () => fakeResult
        }
      },
      responses: {
        create: async () => ({ id: 'resp-openai-1' })
      }
    };

    const wrapped = client.wrapOpenAI(fakeClient);

    const chatRes = await wrapped.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello openai' }]
    });
    assert.deepStrictEqual(chatRes, fakeResult);
    assert.strictEqual(recordedRequests[0].action, 'OPENAI_CHAT_COMPLETION');
    assert.strictEqual(recordedRequests[0].agent, 'openai-client');
    assert.strictEqual(recordedRequests[0].metadata?.model, 'gpt-4o');

    await wrapped.responses.create({
      model: 'gpt-4o',
      prompt: 'hello responses'
    });
    assert.strictEqual(recordedRequests[1].action, 'OPENAI_RESPONSES_CREATE');
    assert.strictEqual(recordedRequests[1].agent, 'openai-client');
  });

  it('wrapAnthropic: preserves ANTHROPIC_MESSAGES_CREATE and anthropic-client', async () => {
    const { client, recordedRequests } = createStubbedClient({ status: 'allowed' });
    const fakeClient = {
      messages: {
        create: async () => ({ id: 'msg-1' })
      }
    };

    const wrapped = client.wrapAnthropic(fakeClient);
    await wrapped.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: 'hello claude' }]
    });

    assert.strictEqual(recordedRequests.length, 1);
    assert.strictEqual(recordedRequests[0].action, 'ANTHROPIC_MESSAGES_CREATE');
    assert.strictEqual(recordedRequests[0].agent, 'anthropic-client');
  });

  it('wrapFetch: intercepts and applies governance', async () => {
    const { client, recordedRequests } = createStubbedClient({ status: 'allowed' });
    let fetchCalled = false;
    const mockFetch = (async () => {
      fetchCalled = true;
      return new Response('ok');
    }) as unknown as typeof fetch;

    const guardedFetch = client.wrapFetch(mockFetch);
    await guardedFetch('https://api.example.com/data', { method: 'POST' });

    assert.strictEqual(fetchCalled, true);
    assert.strictEqual(recordedRequests.length, 1);
    assert.strictEqual(recordedRequests[0].action, 'API_CALL');
    assert.strictEqual(recordedRequests[0].agent, 'fetch-interceptor');
  });

  it('wrapLangChain: intercepts call/invoke and applies governance', async () => {
    const { client, recordedRequests } = createStubbedClient({ status: 'allowed' });
    let invokeCalled = false;
    const fakeChain = {
      invoke: async (input: any) => {
        invokeCalled = true;
        return { text: 'chain output' };
      }
    };

    const wrappedChain = client.wrapLangChain(fakeChain);
    await wrappedChain.invoke('langchain test prompt');

    assert.strictEqual(invokeCalled, true);
    assert.strictEqual(recordedRequests.length, 1);
    assert.strictEqual(recordedRequests[0].action, 'LANGCHAIN_INVOKE');
    assert.strictEqual(recordedRequests[0].agent, 'langchain-chain');
  });
});
