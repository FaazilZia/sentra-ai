import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Readable } from 'node:stream';
import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand
} from '@aws-sdk/client-bedrock-runtime';
import { SentraClient, SentraError, extractBedrockPrompt } from '../src/index.ts';
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

// Mock Command classes following @aws-sdk/client-bedrock-runtime structure
class MockConverseCommand {
  readonly constructorName = 'ConverseCommand';
  constructor(public input: any) {}
}
Object.defineProperty(MockConverseCommand.prototype.constructor, 'name', { value: 'ConverseCommand' });

class MockInvokeModelCommand {
  readonly constructorName = 'InvokeModelCommand';
  constructor(public input: any) {}
}
Object.defineProperty(MockInvokeModelCommand.prototype.constructor, 'name', { value: 'InvokeModelCommand' });

class MockListFoundationModelsCommand {
  readonly constructorName = 'ListFoundationModelsCommand';
  constructor(public input: any) {}
}
Object.defineProperty(MockListFoundationModelsCommand.prototype.constructor, 'name', { value: 'ListFoundationModelsCommand' });

describe('wrapBedrock', () => {
  it('allow path (ConverseCommand): status "allowed" -> original send called once and result returned', async () => {
    const { client, recordedRequests } = createStubbedClient({
      status: 'allowed',
      isAllowed: true,
      reason: 'Safe Action'
    });

    let sendCalls = 0;
    const fakeResult = {
      output: {
        message: {
          role: 'assistant',
          content: [{ text: 'Hello from Bedrock Converse' }]
        }
      }
    };

    const fakeBedrockClient = {
      send: async (command: any) => {
        sendCalls++;
        return fakeResult;
      }
    };

    const wrapped = client.wrapBedrock(fakeBedrockClient);
    const cmd = new MockConverseCommand({
      modelId: 'amazon.nova-lite-v1:0',
      messages: [{ role: 'user', content: [{ text: 'Say hello in 5 words' }] }]
    });

    const result = await wrapped.send(cmd);

    assert.strictEqual(sendCalls, 1, 'Original send should be called once');
    assert.deepStrictEqual(result, fakeResult, 'Result should match original return value');
    assert.strictEqual(recordedRequests.length, 1);
    assert.strictEqual(recordedRequests[0].action, 'BEDROCK_CONVERSE');
    assert.strictEqual(recordedRequests[0].agent, 'bedrock-client');
    assert.strictEqual(recordedRequests[0].metadata?.model, 'amazon.nova-lite-v1:0');
    assert.strictEqual(recordedRequests[0].metadata?.prompt, 'Say hello in 5 words');
  });

  it('allow path (InvokeModelCommand): status "allowed" -> original send called once and result returned', async () => {
    const { client, recordedRequests } = createStubbedClient({
      status: 'allowed',
      isAllowed: true,
      reason: 'Safe Action'
    });

    let sendCalls = 0;
    const fakeResult = {
      body: Buffer.from(JSON.stringify({ completion: 'Hello from Bedrock InvokeModel' }))
    };

    const fakeBedrockClient = {
      send: async (command: any) => {
        sendCalls++;
        return fakeResult;
      }
    };

    const wrapped = client.wrapBedrock(fakeBedrockClient);
    const cmd = new MockInvokeModelCommand({
      modelId: 'us.amazon.nova-lite-v1:0',
      body: JSON.stringify({ prompt: 'Test InvokeModel prompt' })
    });

    const result = await wrapped.send(cmd);

    assert.strictEqual(sendCalls, 1);
    assert.deepStrictEqual(result, fakeResult);
    assert.strictEqual(recordedRequests.length, 1);
    assert.strictEqual(recordedRequests[0].action, 'BEDROCK_INVOKE_MODEL');
    assert.strictEqual(recordedRequests[0].agent, 'bedrock-client');
    assert.strictEqual(recordedRequests[0].metadata?.model, 'us.amazon.nova-lite-v1:0');
    assert.strictEqual(recordedRequests[0].metadata?.prompt, 'Test InvokeModel prompt');
  });

  it('block path: status "blocked" -> throws SentraError 403, original send NOT called', async () => {
    const { client, recordedRequests } = createStubbedClient({
      status: 'blocked',
      isAllowed: false,
      reason: 'Action blocked by Bedrock governance policy',
      risk: 'high'
    });

    let sendCalls = 0;
    const fakeBedrockClient = {
      send: async () => {
        sendCalls++;
        return { output: 'should-not-be-called' };
      }
    };

    const wrapped = client.wrapBedrock(fakeBedrockClient);
    const cmd = new MockConverseCommand({
      modelId: 'amazon.nova-lite-v1:0',
      messages: [{ role: 'user', content: [{ text: 'malicious prompt' }] }]
    });

    await assert.rejects(
      async () => {
        await wrapped.send(cmd);
      },
      (err: any) => {
        assert.ok(err instanceof SentraError, 'Should be an instance of SentraError');
        assert.strictEqual(err.status, 403, 'Status should be 403');
        assert.ok(err.message.includes('Action blocked by Bedrock governance policy'));
        return true;
      }
    );

    assert.strictEqual(sendCalls, 0, 'Original send must NOT be called on blocked path');
    assert.strictEqual(recordedRequests.length, 1);
  });

  it('flag path, flagMode "block" (default) -> throws SentraError 403, original send NOT called', async () => {
    const { client, recordedRequests } = createStubbedClient({
      status: 'flagged',
      isAllowed: false,
      reason: 'Action flagged for human review',
      risk: 'medium'
    });

    let sendCalls = 0;
    const fakeBedrockClient = {
      send: async () => {
        sendCalls++;
        return { output: 'should-not-be-called' };
      }
    };

    const wrapped = client.wrapBedrock(fakeBedrockClient);
    const cmd = new MockConverseCommand({
      modelId: 'amazon.nova-lite-v1:0',
      messages: [{ role: 'user', content: [{ text: 'flagged prompt' }] }]
    });

    await assert.rejects(
      async () => {
        await wrapped.send(cmd);
      },
      (err: any) => {
        assert.ok(err instanceof SentraError, 'Should be an instance of SentraError');
        assert.strictEqual(err.status, 403, 'Status should be 403');
        assert.ok(err.message.includes('Action flagged for human review'));
        return true;
      }
    );

    assert.strictEqual(sendCalls, 0, 'Original send must NOT be called on flagged block path');
    assert.strictEqual(recordedRequests.length, 1);
  });

  it('flag path, flagMode "allow" -> onFlag called with check, original called once', async () => {
    const flaggedResponse: Partial<ActionResponse> = {
      status: 'flagged',
      isAllowed: false,
      reason: 'Action flagged for Bedrock audit',
      risk: 'medium'
    };
    const { client, recordedRequests } = createStubbedClient(flaggedResponse);

    let sendCalls = 0;
    const fakeResult = { output: 'flagged content processed' };
    const fakeBedrockClient = {
      send: async () => {
        sendCalls++;
        return fakeResult;
      }
    };

    const flagEvents: ActionResponse[] = [];
    const wrapped = client.wrapBedrock(fakeBedrockClient, {
      flagMode: 'allow',
      onFlag: (check) => {
        flagEvents.push(check);
      }
    });

    const cmd = new MockConverseCommand({
      modelId: 'amazon.nova-lite-v1:0',
      messages: [{ role: 'user', content: [{ text: 'flagged prompt' }] }]
    });

    const result = await wrapped.send(cmd);

    assert.strictEqual(sendCalls, 1, 'Original send should be called once when flagMode is allow');
    assert.deepStrictEqual(result, fakeResult);
    assert.strictEqual(flagEvents.length, 1, 'onFlag callback must be invoked');
    assert.strictEqual(flagEvents[0].status, 'flagged');
    assert.strictEqual(flagEvents[0].reason, 'Action flagged for Bedrock audit');
    assert.strictEqual(recordedRequests.length, 1);
  });

  it('rate_limited -> throws SentraError 429, original send NOT called', async () => {
    const { client, recordedRequests } = createStubbedClient({
      status: 'rate_limited',
      isAllowed: false,
      reason: 'Bedrock rate limit exceeded'
    });

    let sendCalls = 0;
    const fakeBedrockClient = {
      send: async () => {
        sendCalls++;
        return { output: 'rate-limited' };
      }
    };

    const wrapped = client.wrapBedrock(fakeBedrockClient);
    const cmd = new MockConverseCommand({
      modelId: 'amazon.nova-lite-v1:0',
      messages: [{ role: 'user', content: [{ text: 'hello' }] }]
    });

    await assert.rejects(
      async () => {
        await wrapped.send(cmd);
      },
      (err: any) => {
        assert.ok(err instanceof SentraError, 'Should be an instance of SentraError');
        assert.strictEqual(err.status, 429, 'Status should be 429');
        assert.ok(err.message.includes('Bedrock rate limit exceeded'));
        return true;
      }
    );

    assert.strictEqual(sendCalls, 0, 'Original send must NOT be called on rate limit');
    assert.strictEqual(recordedRequests.length, 1);
  });

  it('action and agent labels: assert checkAction received action "BEDROCK_CONVERSE" and agent "bedrock-client"', async () => {
    const { client, recordedRequests } = createStubbedClient({ status: 'allowed' });
    const fakeBedrockClient = {
      send: async () => ({ output: 'ok' })
    };

    const wrapped = client.wrapBedrock(fakeBedrockClient);
    const cmd = new MockConverseCommand({
      modelId: 'amazon.nova-lite-v1:0',
      messages: [{ role: 'user', content: [{ text: 'check labels test' }] }]
    });

    await wrapped.send(cmd);

    assert.strictEqual(recordedRequests.length, 1);
    assert.strictEqual(recordedRequests[0].action, 'BEDROCK_CONVERSE');
    assert.strictEqual(recordedRequests[0].agent, 'bedrock-client');
    assert.strictEqual(recordedRequests[0].metadata?.model, 'amazon.nova-lite-v1:0');
    assert.strictEqual(recordedRequests[0].metadata?.prompt, 'check labels test');
    assert.strictEqual(recordedRequests[0].metadata?.prompt_length, 'check labels test'.length);
  });

  it('agent override: custom agent option is respected', async () => {
    const { client, recordedRequests } = createStubbedClient({ status: 'allowed' });
    const fakeBedrockClient = {
      send: async () => ({ output: 'ok' })
    };

    const wrapped = client.wrapBedrock(fakeBedrockClient, { agent: 'sentra-bedrock-custom-agent' });
    const cmd = new MockConverseCommand({
      modelId: 'amazon.nova-lite-v1:0',
      messages: [{ role: 'user', content: [{ text: 'custom agent test' }] }]
    });

    await wrapped.send(cmd);

    assert.strictEqual(recordedRequests.length, 1);
    assert.strictEqual(recordedRequests[0].agent, 'sentra-bedrock-custom-agent');
    assert.strictEqual(recordedRequests[0].action, 'BEDROCK_CONVERSE');
  });

  it('double wrap is a no-op (__sentra_wrapped__)', async () => {
    const { client, recordedRequests } = createStubbedClient({ status: 'allowed' });
    let sendCalls = 0;
    const fakeBedrockClient = {
      send: async () => {
        sendCalls++;
        return { output: 'double-wrap-ok' };
      }
    };

    const wrappedOnce = client.wrapBedrock(fakeBedrockClient);
    assert.strictEqual((wrappedOnce as any).__sentra_wrapped__, true);

    const wrappedTwice = client.wrapBedrock(wrappedOnce);
    assert.strictEqual(wrappedTwice, wrappedOnce, 'Second wrap should return identical reference');

    const cmd = new MockConverseCommand({
      modelId: 'amazon.nova-lite-v1:0',
      messages: [{ role: 'user', content: [{ text: 'test double wrap' }] }]
    });

    await wrappedTwice.send(cmd);

    assert.strictEqual(recordedRequests.length, 1, 'checkAction must be called only once');
    assert.strictEqual(sendCalls, 1, 'Original send must be called only once');
  });

  it('original provider errors propagate unchanged (AccessDeniedException, ValidationException, ThrottlingException)', async () => {
    const { client } = createStubbedClient({ status: 'allowed' });
    const accessDeniedError = new Error('User is not authorized to perform: bedrock:InvokeModel');
    (accessDeniedError as any).name = 'AccessDeniedException';
    (accessDeniedError as any).$metadata = { httpStatusCode: 403 };

    const fakeBedrockClient = {
      send: async () => {
        throw accessDeniedError;
      }
    };

    const wrapped = client.wrapBedrock(fakeBedrockClient);
    const cmd = new MockConverseCommand({
      modelId: 'amazon.nova-lite-v1:0',
      messages: [{ role: 'user', content: [{ text: 'test error propagation' }] }]
    });

    await assert.rejects(
      async () => {
        await wrapped.send(cmd);
      },
      (err: any) => {
        assert.strictEqual(err, accessDeniedError, 'Original error must propagate unchanged');
        assert.strictEqual(err.name, 'AccessDeniedException');
        assert.strictEqual(err.$metadata?.httpStatusCode, 403);
        return true;
      }
    );
  });

  it('passes through non-governed Bedrock commands unchanged (e.g. ListFoundationModelsCommand)', async () => {
    const { client, recordedRequests } = createStubbedClient({ status: 'allowed' });
    let sendCalls = 0;
    const fakeListResult = { modelSummaries: [{ modelId: 'amazon.nova-lite-v1:0' }] };

    const fakeBedrockClient = {
      send: async () => {
        sendCalls++;
        return fakeListResult;
      }
    };

    const wrapped = client.wrapBedrock(fakeBedrockClient);
    const cmd = new MockListFoundationModelsCommand({});

    const result = await wrapped.send(cmd);

    assert.strictEqual(sendCalls, 1, 'Original send should be called for non-governed commands');
    assert.deepStrictEqual(result, fakeListResult);
    assert.strictEqual(recordedRequests.length, 0, 'Non-governed commands must not trigger checkAction');
  });

  it('handles null / undefined / empty client gracefully', () => {
    const client = new SentraClient({ apiKey: 'sentra_test_sandbox' });
    assert.strictEqual(client.wrapBedrock(null), null);
    assert.strictEqual(client.wrapBedrock(undefined), undefined);

    const empty = {};
    const wrappedEmpty = client.wrapBedrock(empty);
    assert.strictEqual(wrappedEmpty, empty);
    assert.strictEqual((empty as any).__sentra_wrapped__, undefined);
  });

  describe('real @aws-sdk/client-bedrock-runtime with stubbed requestHandler', () => {
    it('real BedrockRuntimeClient with ConverseCommand and stubbed requestHandler', async () => {
      const { client, recordedRequests } = createStubbedClient({
        status: 'allowed',
        isAllowed: true,
        reason: 'Safe Action'
      });

      const cannedConverse = {
        output: {
          message: {
            role: 'assistant',
            content: [{ text: 'Hello from real Bedrock Converse' }]
          }
        },
        stopReason: 'end_turn',
        usage: { inputTokens: 5, outputTokens: 6, totalTokens: 11 }
      };

      const bedrockClient = new BedrockRuntimeClient({
        region: 'us-east-1',
        credentials: { accessKeyId: 'test-id', secretAccessKey: 'test-secret' },
        requestHandler: {
          handle: async () => {
            return {
              response: {
                statusCode: 200,
                headers: { 'content-type': 'application/json' },
                body: Readable.from([Buffer.from(JSON.stringify(cannedConverse))])
              }
            } as any;
          }
        }
      });

      const wrapped = client.wrapBedrock(bedrockClient);
      const cmd = new ConverseCommand({
        modelId: 'amazon.nova-lite-v1:0',
        messages: [{ role: 'user', content: [{ text: 'Say hello in 5 words' }] }]
      });

      const result = await wrapped.send(cmd);

      // Assert action, agent, model and prompt metadata correct
      assert.strictEqual(recordedRequests.length, 1);
      assert.strictEqual(recordedRequests[0].action, 'BEDROCK_CONVERSE');
      assert.strictEqual(recordedRequests[0].agent, 'bedrock-client');
      assert.strictEqual(recordedRequests[0].metadata?.model, 'amazon.nova-lite-v1:0');
      assert.strictEqual(recordedRequests[0].metadata?.prompt, 'Say hello in 5 words');
      assert.strictEqual(recordedRequests[0].metadata?.prompt_length, 'Say hello in 5 words'.length);

      // Assert reply returned unchanged
      assert.deepStrictEqual(result.output, cannedConverse.output);
      assert.strictEqual(result.output?.message?.content?.[0]?.text, 'Hello from real Bedrock Converse');
      assert.strictEqual(result.stopReason, 'end_turn');
    });

    it('real BedrockRuntimeClient with InvokeModelCommand and stubbed requestHandler', async () => {
      const { client, recordedRequests } = createStubbedClient({
        status: 'allowed',
        isAllowed: true,
        reason: 'Safe Action'
      });

      const cannedPayload = {
        completion: 'Hello from real Bedrock InvokeModel',
        stop_reason: 'end_turn'
      };

      const bedrockClient = new BedrockRuntimeClient({
        region: 'us-east-1',
        credentials: { accessKeyId: 'test-id', secretAccessKey: 'test-secret' },
        requestHandler: {
          handle: async () => {
            return {
              response: {
                statusCode: 200,
                headers: { 'content-type': 'application/json' },
                body: Readable.from([Buffer.from(JSON.stringify(cannedPayload))])
              }
            } as any;
          }
        }
      });

      const wrapped = client.wrapBedrock(bedrockClient);
      const promptText = 'Generate a summary of quantum computing';
      const cmd = new InvokeModelCommand({
        modelId: 'amazon.nova-lite-v1:0',
        body: JSON.stringify({ prompt: promptText })
      });

      const result = await wrapped.send(cmd);

      // Assert action, agent, model and prompt metadata correct
      assert.strictEqual(recordedRequests.length, 1);
      assert.strictEqual(recordedRequests[0].action, 'BEDROCK_INVOKE_MODEL');
      assert.strictEqual(recordedRequests[0].agent, 'bedrock-client');
      assert.strictEqual(recordedRequests[0].metadata?.model, 'amazon.nova-lite-v1:0');
      assert.strictEqual(recordedRequests[0].metadata?.prompt, promptText);
      assert.strictEqual(recordedRequests[0].metadata?.prompt_length, promptText.length);

      // Assert reply returned unchanged
      const decodedBody = JSON.parse(new TextDecoder().decode(result.body));
      assert.deepStrictEqual(decodedBody, cannedPayload);
      assert.strictEqual(decodedBody.completion, 'Hello from real Bedrock InvokeModel');
    });

    it('real BedrockRuntimeClient with ConverseStreamCommand: allowed stream passes through unchanged', async () => {
      const { client, recordedRequests } = createStubbedClient({
        status: 'allowed',
        isAllowed: true,
        reason: 'Safe Action'
      });

      let handleCalls = 0;
      const bedrockClient = new BedrockRuntimeClient({
        region: 'us-east-1',
        credentials: { accessKeyId: 'test-id', secretAccessKey: 'test-secret' },
        requestHandler: {
          handle: async () => {
            handleCalls++;
            return {
              response: {
                statusCode: 200,
                headers: { 'content-type': 'application/vnd.amazon.eventstream' },
                body: Readable.from([])
              }
            } as any;
          }
        }
      });

      const wrapped = client.wrapBedrock(bedrockClient);
      const promptText = 'Stream a response for real Bedrock ConverseStream';
      const cmd = new ConverseStreamCommand({
        modelId: 'amazon.nova-lite-v1:0',
        messages: [{ role: 'user', content: [{ text: promptText }] }]
      });

      const result = await wrapped.send(cmd);

      // Assert governance ran with expected action, agent, and prompt metadata
      assert.strictEqual(recordedRequests.length, 1, 'Governance checkAction must run exactly once');
      assert.strictEqual(recordedRequests[0].action, 'BEDROCK_CONVERSE');
      assert.strictEqual(recordedRequests[0].agent, 'bedrock-client');
      assert.strictEqual(recordedRequests[0].metadata?.model, 'amazon.nova-lite-v1:0');
      assert.strictEqual(recordedRequests[0].metadata?.prompt, promptText);
      assert.strictEqual(recordedRequests[0].metadata?.prompt_length, promptText.length);

      // Assert provider requestHandler was reached once and returned stream passed through unchanged
      assert.strictEqual(handleCalls, 1, 'Allowed stream must reach the provider exactly once');
      assert.ok(result.stream, 'Allowed stream property must be present and returned unchanged');
      assert.strictEqual(typeof result.stream[Symbol.asyncIterator], 'function', 'Stream must be an async iterable');
    });

    it('real BedrockRuntimeClient with ConverseStreamCommand: blocked stream never reaches provider', async () => {
      const { client, recordedRequests } = createStubbedClient({
        status: 'blocked',
        isAllowed: false,
        reason: 'Converse stream blocked by Bedrock governance policy'
      });

      let handleCalls = 0;
      const bedrockClient = new BedrockRuntimeClient({
        region: 'us-east-1',
        credentials: { accessKeyId: 'test-id', secretAccessKey: 'test-secret' },
        requestHandler: {
          handle: async () => {
            handleCalls++;
            return {
              response: {
                statusCode: 200,
                headers: { 'content-type': 'application/vnd.amazon.eventstream' },
                body: Readable.from([])
              }
            } as any;
          }
        }
      });

      const wrapped = client.wrapBedrock(bedrockClient);
      const promptText = 'Malicious prompt that triggers block on ConverseStream';
      const cmd = new ConverseStreamCommand({
        modelId: 'amazon.nova-lite-v1:0',
        messages: [{ role: 'user', content: [{ text: promptText }] }]
      });

      await assert.rejects(
        async () => {
          await wrapped.send(cmd);
        },
        (err: any) => {
          assert.ok(err instanceof SentraError, 'Should throw SentraError');
          assert.strictEqual(err.status, 403, 'HTTP status must be 403');
          assert.ok(err.message.includes('Converse stream blocked by Bedrock governance policy'));
          return true;
        }
      );

      // Assert governance ran
      assert.strictEqual(recordedRequests.length, 1, 'Governance checkAction must run once');
      assert.strictEqual(recordedRequests[0].action, 'BEDROCK_CONVERSE');
      assert.strictEqual(recordedRequests[0].agent, 'bedrock-client');
      assert.strictEqual(recordedRequests[0].metadata?.model, 'amazon.nova-lite-v1:0');
      assert.strictEqual(recordedRequests[0].metadata?.prompt, promptText);

      // Assert provider was NEVER reached
      assert.strictEqual(handleCalls, 0, 'Blocked stream must NEVER reach provider requestHandler');
    });

    it('real BedrockRuntimeClient with InvokeModelWithResponseStreamCommand: allowed stream passes through unchanged', async () => {
      const { client, recordedRequests } = createStubbedClient({
        status: 'allowed',
        isAllowed: true,
        reason: 'Safe Action'
      });

      let handleCalls = 0;
      const bedrockClient = new BedrockRuntimeClient({
        region: 'us-east-1',
        credentials: { accessKeyId: 'test-id', secretAccessKey: 'test-secret' },
        requestHandler: {
          handle: async () => {
            handleCalls++;
            return {
              response: {
                statusCode: 200,
                headers: { 'content-type': 'application/vnd.amazon.eventstream' },
                body: Readable.from([])
              }
            } as any;
          }
        }
      });

      const wrapped = client.wrapBedrock(bedrockClient);
      const promptText = 'Stream a response for real Bedrock InvokeModelWithResponseStream';
      const cmd = new InvokeModelWithResponseStreamCommand({
        modelId: 'amazon.nova-lite-v1:0',
        body: JSON.stringify({ prompt: promptText })
      });

      const result = await wrapped.send(cmd);

      // Assert governance ran with expected action, agent, and prompt metadata
      assert.strictEqual(recordedRequests.length, 1, 'Governance checkAction must run exactly once');
      assert.strictEqual(recordedRequests[0].action, 'BEDROCK_INVOKE_MODEL');
      assert.strictEqual(recordedRequests[0].agent, 'bedrock-client');
      assert.strictEqual(recordedRequests[0].metadata?.model, 'amazon.nova-lite-v1:0');
      assert.strictEqual(recordedRequests[0].metadata?.prompt, promptText);
      assert.strictEqual(recordedRequests[0].metadata?.prompt_length, promptText.length);

      // Assert provider requestHandler was reached once and returned body stream passed through unchanged
      assert.strictEqual(handleCalls, 1, 'Allowed stream must reach the provider exactly once');
      assert.ok(result.body, 'Allowed body stream property must be present and returned unchanged');
      assert.strictEqual(typeof result.body[Symbol.asyncIterator], 'function', 'Body stream must be an async iterable');
    });

    it('real BedrockRuntimeClient with InvokeModelWithResponseStreamCommand: blocked stream never reaches provider', async () => {
      const { client, recordedRequests } = createStubbedClient({
        status: 'blocked',
        isAllowed: false,
        reason: 'InvokeModel response stream blocked by Bedrock governance policy'
      });

      let handleCalls = 0;
      const bedrockClient = new BedrockRuntimeClient({
        region: 'us-east-1',
        credentials: { accessKeyId: 'test-id', secretAccessKey: 'test-secret' },
        requestHandler: {
          handle: async () => {
            handleCalls++;
            return {
              response: {
                statusCode: 200,
                headers: { 'content-type': 'application/vnd.amazon.eventstream' },
                body: Readable.from([])
              }
            } as any;
          }
        }
      });

      const wrapped = client.wrapBedrock(bedrockClient);
      const promptText = 'Malicious prompt that triggers block on InvokeModelWithResponseStream';
      const cmd = new InvokeModelWithResponseStreamCommand({
        modelId: 'amazon.nova-lite-v1:0',
        body: JSON.stringify({ prompt: promptText })
      });

      await assert.rejects(
        async () => {
          await wrapped.send(cmd);
        },
        (err: any) => {
          assert.ok(err instanceof SentraError, 'Should throw SentraError');
          assert.strictEqual(err.status, 403, 'HTTP status must be 403');
          assert.ok(err.message.includes('InvokeModel response stream blocked by Bedrock governance policy'));
          return true;
        }
      );

      // Assert governance ran
      assert.strictEqual(recordedRequests.length, 1, 'Governance checkAction must run once');
      assert.strictEqual(recordedRequests[0].action, 'BEDROCK_INVOKE_MODEL');
      assert.strictEqual(recordedRequests[0].agent, 'bedrock-client');
      assert.strictEqual(recordedRequests[0].metadata?.model, 'amazon.nova-lite-v1:0');
      assert.strictEqual(recordedRequests[0].metadata?.prompt, promptText);

      // Assert provider was NEVER reached
      assert.strictEqual(handleCalls, 0, 'Blocked stream must NEVER reach provider requestHandler');
    });
  });

  describe('extractBedrockPrompt', () => {
    it('handles ConverseCommand input with messages', () => {
      const input = {
        modelId: 'amazon.nova-lite-v1:0',
        messages: [
          { role: 'user', content: [{ text: 'Explain gravity in 10 words' }] }
        ]
      };
      assert.strictEqual(extractBedrockPrompt(input), 'Explain gravity in 10 words');
    });

    it('handles ConverseCommand input with system and messages', () => {
      const input = {
        modelId: 'amazon.nova-lite-v1:0',
        system: [{ text: 'You are a physics professor.' }],
        messages: [
          { role: 'user', content: [{ text: 'What is general relativity?' }] }
        ]
      };
      assert.strictEqual(
        extractBedrockPrompt(input),
        'You are a physics professor.\nWhat is general relativity?'
      );
    });

    it('handles ConverseCommand input with multi-part messages', () => {
      const input = {
        modelId: 'amazon.nova-lite-v1:0',
        messages: [
          { role: 'user', content: [{ text: 'Part 1' }, { text: 'Part 2' }] }
        ]
      };
      assert.strictEqual(extractBedrockPrompt(input), 'Part 1\nPart 2');
    });

    it('handles InvokeModelCommand with JSON body containing prompt (Anthropic style)', () => {
      const input = {
        modelId: 'anthropic.claude-v2',
        body: JSON.stringify({ prompt: 'Human: What is AI? Assistant:' })
      };
      assert.strictEqual(extractBedrockPrompt(input), 'Human: What is AI? Assistant:');
    });

    it('handles InvokeModelCommand with JSON body containing inputText (Titan style)', () => {
      const input = {
        modelId: 'amazon.titan-text-express-v1',
        body: JSON.stringify({ inputText: 'Translate to French: Hello' })
      };
      assert.strictEqual(extractBedrockPrompt(input), 'Translate to French: Hello');
    });

    it('handles InvokeModelCommand with JSON body containing messages (Nova / Llama style)', () => {
      const input = {
        modelId: 'amazon.nova-lite-v1:0',
        body: JSON.stringify({
          messages: [{ role: 'user', content: [{ text: 'Tell a joke' }] }]
        })
      };
      assert.strictEqual(extractBedrockPrompt(input), 'Tell a joke');
    });

    it('handles InvokeModelCommand with Buffer body', () => {
      const payload = JSON.stringify({ prompt: 'Prompt inside Buffer' });
      const input = {
        modelId: 'amazon.nova-lite-v1:0',
        body: Buffer.from(payload)
      };
      assert.strictEqual(extractBedrockPrompt(input), 'Prompt inside Buffer');
    });

    it('handles InvokeModelCommand with Uint8Array body', () => {
      const payload = JSON.stringify({ prompt: 'Prompt inside Uint8Array' });
      const input = {
        modelId: 'amazon.nova-lite-v1:0',
        body: new TextEncoder().encode(payload)
      };
      assert.strictEqual(extractBedrockPrompt(input), 'Prompt inside Uint8Array');
    });

    it('handles InvokeModelCommand with raw string body', () => {
      const input = {
        modelId: 'custom-model',
        body: 'raw text prompt without JSON wrapper'
      };
      assert.strictEqual(extractBedrockPrompt(input), 'raw text prompt without JSON wrapper');
    });

    it('handles plain string input directly', () => {
      assert.strictEqual(extractBedrockPrompt('Direct prompt string'), 'Direct prompt string');
    });

    it('handles garbage input without throwing and returns empty string', () => {
      assert.strictEqual(extractBedrockPrompt(null), '');
      assert.strictEqual(extractBedrockPrompt(undefined), '');
      assert.strictEqual(extractBedrockPrompt(12345), '');
      assert.strictEqual(extractBedrockPrompt(true), '');
      assert.strictEqual(extractBedrockPrompt({}), '');
      assert.strictEqual(extractBedrockPrompt({ unhandled: 'field', nested: [1, 2] }), '');

      const circular: any = {};
      circular.self = circular;
      assert.strictEqual(extractBedrockPrompt(circular), '');
    });
  });
});
