import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GoogleGenAI } from '@google/genai';
import { SentraClient, SentraError, extractVertexPrompt, wrapVertex, wrapVertexAI } from '../src/index.ts';
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

describe('wrapVertex', () => {
  it('allow path: status "allowed" -> original generateContent is called once and its result returned', async () => {
    const { client, recordedRequests } = createStubbedClient({
      status: 'allowed',
      isAllowed: true,
      reason: 'Safe Action'
    });

    let originalCalls = 0;
    const fakeResult = { text: 'Hello from Gemini', candidates: [] };
    const fakeClient = {
      models: {
        generateContent: async (params: any) => {
          originalCalls++;
          return fakeResult;
        }
      }
    };

    const wrapped = client.wrapVertex(fakeClient);
    const result = await wrapped.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: 'Say hello in 5 words'
    });

    assert.strictEqual(originalCalls, 1, 'Original generateContent should be called once');
    assert.deepStrictEqual(result, fakeResult, 'Result should match original return value');
    assert.strictEqual(recordedRequests.length, 1);
    assert.strictEqual(recordedRequests[0].action, 'VERTEX_GENERATE_CONTENT');
    assert.strictEqual(recordedRequests[0].agent, 'vertex-client');
    assert.strictEqual(recordedRequests[0].metadata?.model, 'gemini-2.0-flash');
    assert.strictEqual(recordedRequests[0].metadata?.prompt, 'Say hello in 5 words');
  });

  it('block path: status "blocked" -> throws SentraError with status 403, original NOT called', async () => {
    const { client, recordedRequests } = createStubbedClient({
      status: 'blocked',
      isAllowed: false,
      reason: 'Action blocked by Vertex governance policy',
      risk: 'high'
    });

    let originalCalls = 0;
    const fakeClient = {
      models: {
        generateContent: async () => {
          originalCalls++;
          return { text: 'should-not-be-called' };
        }
      }
    };

    const wrapped = client.wrapVertex(fakeClient);

    await assert.rejects(
      async () => {
        await wrapped.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: 'sensitive or malicious prompt'
        });
      },
      (err: any) => {
        assert.ok(err instanceof SentraError, 'Should be an instance of SentraError');
        assert.strictEqual(err.status, 403, 'Status should be 403');
        assert.ok(err.message.includes('Action blocked by Vertex governance policy'));
        return true;
      }
    );

    assert.strictEqual(originalCalls, 0, 'Original generateContent must NOT be called on blocked path');
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
      models: {
        generateContent: async () => {
          originalCalls++;
          return { text: 'should-not-be-called' };
        }
      }
    };

    const wrapped = client.wrapVertex(fakeClient);

    await assert.rejects(
      async () => {
        await wrapped.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: 'flagged prompt'
        });
      },
      (err: any) => {
        assert.ok(err instanceof SentraError, 'Should be an instance of SentraError');
        assert.strictEqual(err.status, 403, 'Status should be 403');
        assert.ok(err.message.includes('Action flagged for human review'));
        return true;
      }
    );

    assert.strictEqual(originalCalls, 0, 'Original generateContent must NOT be called on flagged block path');
    assert.strictEqual(recordedRequests.length, 1);
  });

  it('flag path, flagMode "allow" -> onFlag called with the check, original called once', async () => {
    const flaggedResponse: Partial<ActionResponse> = {
      status: 'flagged',
      isAllowed: false,
      reason: 'Action flagged for Vertex audit',
      risk: 'medium'
    };
    const { client, recordedRequests } = createStubbedClient(flaggedResponse);

    let originalCalls = 0;
    const fakeResult = { text: 'flagged content processed' };
    const fakeClient = {
      models: {
        generateContent: async () => {
          originalCalls++;
          return fakeResult;
        }
      }
    };

    const flagEvents: ActionResponse[] = [];
    const wrapped = client.wrapVertex(fakeClient, {
      flagMode: 'allow',
      onFlag: (check) => {
        flagEvents.push(check);
      }
    });

    const result = await wrapped.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: 'flagged prompt'
    });

    assert.strictEqual(originalCalls, 1, 'Original generateContent should be called once when flagMode is allow');
    assert.deepStrictEqual(result, fakeResult);
    assert.strictEqual(flagEvents.length, 1, 'onFlag callback must be invoked');
    assert.strictEqual(flagEvents[0].status, 'flagged');
    assert.strictEqual(flagEvents[0].reason, 'Action flagged for Vertex audit');
    assert.strictEqual(recordedRequests.length, 1);
  });

  it('rate_limited -> throws SentraError 429', async () => {
    const { client, recordedRequests } = createStubbedClient({
      status: 'rate_limited',
      isAllowed: false,
      reason: 'Vertex rate limit exceeded'
    });

    let originalCalls = 0;
    const fakeClient = {
      models: {
        generateContent: async () => {
          originalCalls++;
          return { text: 'rate-limited' };
        }
      }
    };

    const wrapped = client.wrapVertex(fakeClient);

    await assert.rejects(
      async () => {
        await wrapped.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: 'hello rate limit'
        });
      },
      (err: any) => {
        assert.ok(err instanceof SentraError, 'Should be an instance of SentraError');
        assert.strictEqual(err.status, 429, 'Status should be 429');
        assert.ok(err.message.includes('Vertex rate limit exceeded'));
        return true;
      }
    );

    assert.strictEqual(originalCalls, 0, 'Original generateContent must NOT be called on rate limit');
    assert.strictEqual(recordedRequests.length, 1);
  });

  it('action and agent labels: assert checkAction received action "VERTEX_GENERATE_CONTENT" and agent "vertex-client"', async () => {
    const { client, recordedRequests } = createStubbedClient({ status: 'allowed' });
    const fakeClient = {
      models: {
        generateContent: async () => ({ text: 'ok' })
      }
    };

    const wrapped = client.wrapVertex(fakeClient);
    await wrapped.models.generateContent({
      model: 'gemini-2.0-pro-exp-0205',
      contents: 'check labels test'
    });

    assert.strictEqual(recordedRequests.length, 1);
    assert.strictEqual(recordedRequests[0].action, 'VERTEX_GENERATE_CONTENT');
    assert.strictEqual(recordedRequests[0].agent, 'vertex-client');
    assert.strictEqual(recordedRequests[0].metadata?.model, 'gemini-2.0-pro-exp-0205');
    assert.strictEqual(recordedRequests[0].metadata?.prompt, 'check labels test');
    assert.strictEqual(recordedRequests[0].metadata?.prompt_length, 'check labels test'.length);
  });

  it('agent override: custom agent option is respected', async () => {
    const { client, recordedRequests } = createStubbedClient({ status: 'allowed' });
    const fakeClient = {
      models: {
        generateContent: async () => ({ text: 'ok' })
      }
    };

    const wrapped = client.wrapVertex(fakeClient, { agent: 'sentra-vertex-custom-agent' });
    await wrapped.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: 'custom agent test'
    });

    assert.strictEqual(recordedRequests.length, 1);
    assert.strictEqual(recordedRequests[0].agent, 'sentra-vertex-custom-agent');
    assert.strictEqual(recordedRequests[0].action, 'VERTEX_GENERATE_CONTENT');
  });

  it('double wrap is a no-op (__sentra_wrapped__)', async () => {
    const { client, recordedRequests } = createStubbedClient({ status: 'allowed' });
    let createCalls = 0;
    const fakeClient = {
      models: {
        generateContent: async () => {
          createCalls++;
          return { text: 'double-wrap-ok' };
        }
      }
    };

    const wrappedOnce = client.wrapVertex(fakeClient);
    assert.strictEqual((wrappedOnce as any).__sentra_wrapped__, true);

    const wrappedTwice = client.wrapVertex(wrappedOnce);
    assert.strictEqual(wrappedTwice, wrappedOnce, 'Second wrap should return identical reference');

    await wrappedTwice.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: 'test double wrap'
    });

    assert.strictEqual(recordedRequests.length, 1, 'checkAction must be called only once');
    assert.strictEqual(createCalls, 1, 'Original generateContent must be called only once');
  });

  it('generateContentStream: allowed passes the stream through unchanged', async () => {
    const { client, recordedRequests } = createStubbedClient({ status: 'allowed' });
    let streamCalls = 0;
    const fakeStream = {
      async *[Symbol.asyncIterator]() {
        yield { text: 'chunk 1' };
        yield { text: 'chunk 2' };
      }
    };
    const fakeClient = {
      models: {
        generateContentStream: async (params: any) => {
          streamCalls++;
          return fakeStream;
        }
      }
    };

    const wrapped = client.wrapVertex(fakeClient);
    const stream = await wrapped.models.generateContentStream({
      model: 'gemini-2.0-flash',
      contents: 'stream test prompt'
    });

    assert.strictEqual(streamCalls, 1, 'Original generateContentStream must be called once');
    assert.strictEqual(stream, fakeStream, 'Returned stream must be the exact native stream');
    assert.strictEqual(recordedRequests.length, 1);
    assert.strictEqual(recordedRequests[0].action, 'VERTEX_GENERATE_CONTENT_STREAM');
    assert.strictEqual(recordedRequests[0].agent, 'vertex-client');
    assert.strictEqual(recordedRequests[0].metadata?.model, 'gemini-2.0-flash');
    assert.strictEqual(recordedRequests[0].metadata?.prompt, 'stream test prompt');

    // Consume stream chunks
    const chunks: string[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk.text);
    }
    assert.deepStrictEqual(chunks, ['chunk 1', 'chunk 2']);
  });

  it('generateContentStream: blocked does not call original and throws SentraError 403', async () => {
    const { client, recordedRequests } = createStubbedClient({
      status: 'blocked',
      isAllowed: false,
      reason: 'Stream blocked by policy'
    });

    let streamCalls = 0;
    const fakeClient = {
      models: {
        generateContentStream: async () => {
          streamCalls++;
          return { stream: 'blocked-stream' };
        }
      }
    };

    const wrapped = client.wrapVertex(fakeClient);

    await assert.rejects(
      async () => {
        await wrapped.models.generateContentStream({
          model: 'gemini-2.0-flash',
          contents: 'blocked stream request'
        });
      },
      (err: any) => {
        assert.ok(err instanceof SentraError);
        assert.strictEqual(err.status, 403);
        assert.ok(err.message.includes('Stream blocked by policy'));
        return true;
      }
    );

    assert.strictEqual(streamCalls, 0, 'Original generateContentStream must NOT be called on blocked path');
    assert.strictEqual(recordedRequests.length, 1);
  });

  it('GenerativeModel-style object: wraps direct generateContent and generateContentStream', async () => {
    const { client, recordedRequests } = createStubbedClient({ status: 'allowed' });
    let generateCalls = 0;
    let streamCalls = 0;

    const fakeModel = {
      model: 'gemini-1.5-pro',
      generateContent: async (contents: any) => {
        generateCalls++;
        return { response: { text: () => 'model content' } };
      },
      generateContentStream: async (contents: any) => {
        streamCalls++;
        return { response: Promise.resolve({ text: () => 'stream content' }) };
      }
    };

    const wrapped = client.wrapVertex(fakeModel);
    await wrapped.generateContent('direct model call');
    await wrapped.generateContentStream('direct model stream call');

    assert.strictEqual(generateCalls, 1);
    assert.strictEqual(streamCalls, 1);
    assert.strictEqual(recordedRequests.length, 2);
    assert.strictEqual(recordedRequests[0].action, 'VERTEX_GENERATE_CONTENT');
    assert.strictEqual(recordedRequests[0].metadata?.model, 'gemini-1.5-pro');
    assert.strictEqual(recordedRequests[0].metadata?.prompt, 'direct model call');

    assert.strictEqual(recordedRequests[1].action, 'VERTEX_GENERATE_CONTENT_STREAM');
    assert.strictEqual(recordedRequests[1].metadata?.model, 'gemini-1.5-pro');
    assert.strictEqual(recordedRequests[1].metadata?.prompt, 'direct model stream call');
  });

  it('original error propagates unchanged', async () => {
    const { client } = createStubbedClient({ status: 'allowed' });
    const vertexApiError = new Error('Publisher model not found: models/gemini-invalid');
    (vertexApiError as any).status = 404;
    (vertexApiError as any).code = 'MODEL_NOT_FOUND';

    const fakeClient = {
      models: {
        generateContent: async () => {
          throw vertexApiError;
        }
      }
    };

    const wrapped = client.wrapVertex(fakeClient);

    await assert.rejects(
      async () => {
        await wrapped.models.generateContent({
          model: 'gemini-invalid',
          contents: 'test error propagation'
        });
      },
      (err: any) => {
        assert.strictEqual(err, vertexApiError, 'Original error must propagate unchanged');
        assert.strictEqual(err.status, 404);
        assert.strictEqual(err.code, 'MODEL_NOT_FOUND');
        return true;
      }
    );
  });

  it('handles null / undefined / empty client gracefully', () => {
    const client = new SentraClient({ apiKey: 'sentra_test_sandbox' });
    assert.strictEqual(client.wrapVertex(null), null);
    assert.strictEqual(client.wrapVertex(undefined), undefined);

    const empty = {};
    const wrappedEmpty = client.wrapVertex(empty);
    assert.strictEqual(wrappedEmpty, empty);
    assert.strictEqual((empty as any).__sentra_wrapped__, undefined);
  });

  describe('extractVertexPrompt', () => {
    it('handles a plain string', () => {
      assert.strictEqual(extractVertexPrompt('What is the weather today?'), 'What is the weather today?');
    });

    it('handles string[]', () => {
      assert.strictEqual(extractVertexPrompt(['Hello', 'World']), 'Hello\nWorld');
    });

    it('handles Content { role, parts: [{ text }] }', () => {
      const content = {
        role: 'user',
        parts: [{ text: 'Explain quantum computing in one sentence.' }]
      };
      assert.strictEqual(extractVertexPrompt(content), 'Explain quantum computing in one sentence.');
    });

    it('handles Content[]', () => {
      const contents = [
        { role: 'user', parts: [{ text: 'Hello' }] },
        { role: 'model', parts: [{ text: 'Hi there!' }] },
        { role: 'user', parts: [{ text: 'How are you?' }] }
      ];
      assert.strictEqual(extractVertexPrompt(contents), 'Hello\nHi there!\nHow are you?');
    });

    it('handles Part[] (items with text)', () => {
      const parts = [
        { text: 'Part 1 text' },
        { text: 'Part 2 text' }
      ];
      assert.strictEqual(extractVertexPrompt(parts), 'Part 1 text\nPart 2 text');
    });

    it('handles config.systemInstruction as a string', () => {
      const params = {
        model: 'gemini-2.0-flash',
        contents: 'Help me with my homework',
        config: {
          systemInstruction: 'You are an expert tutor.'
        }
      };
      assert.strictEqual(extractVertexPrompt(params), 'You are an expert tutor.\nHelp me with my homework');
    });

    it('handles config.systemInstruction as Content', () => {
      const params = {
        model: 'gemini-2.0-flash',
        contents: 'Give me a summary',
        config: {
          systemInstruction: {
            role: 'system',
            parts: [{ text: 'You are a concise summarizer.' }]
          }
        }
      };
      assert.strictEqual(extractVertexPrompt(params), 'You are a concise summarizer.\nGive me a summary');
    });

    it('handles config.systemInstruction as Part', () => {
      const params = {
        model: 'gemini-2.0-flash',
        contents: 'Test query',
        config: {
          systemInstruction: { text: 'System part instruction.' }
        }
      };
      assert.strictEqual(extractVertexPrompt(params), 'System part instruction.\nTest query');
    });

    it('handles systemInstruction only without contents', () => {
      const params = {
        config: {
          systemInstruction: 'Only system instruction'
        }
      };
      assert.strictEqual(extractVertexPrompt(params), 'Only system instruction');
    });

    it('handles garbage input without throwing and returns empty string', () => {
      assert.strictEqual(extractVertexPrompt(null), '');
      assert.strictEqual(extractVertexPrompt(undefined), '');
      assert.strictEqual(extractVertexPrompt(12345), '');
      assert.strictEqual(extractVertexPrompt(true), '');
      assert.strictEqual(extractVertexPrompt({}), '');
      assert.strictEqual(extractVertexPrompt({ invalid: 'object', nested: { foo: 'bar' } }), '');
      assert.strictEqual(extractVertexPrompt([null, undefined, 42, {}]), '');

      // Circular reference object must never throw
      const circular: any = {};
      circular.self = circular;
      assert.strictEqual(extractVertexPrompt(circular), '');
    });
  });

  describe('real @google/genai (GoogleGenAI) with stubbed HTTP handler', () => {
    it('allow path: calls real GoogleGenAI generateContent with stubbed fetch and returns response', async () => {
      const { client, recordedRequests } = createStubbedClient({
        status: 'allowed',
        isAllowed: true,
        reason: 'Safe Action'
      });

      let fetchCalls = 0;
      const cannedResponse = {
        candidates: [{
          content: {
            role: 'model',
            parts: [{ text: 'Hello from real GoogleGenAI' }]
          },
          finishReason: 'STOP'
        }]
      };

      const realGenAI = new GoogleGenAI({
        vertexai: true,
        apiKey: 'test-vertex-key',
        project: 'test-project',
        location: 'us-central1',
        httpOptions: {
          fetch: async () => {
            fetchCalls++;
            return new Response(JSON.stringify(cannedResponse), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }
      });

      const guarded = client.wrapVertex(realGenAI);
      const res = await guarded.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: 'Say hello in 5 words'
      });

      assert.strictEqual(fetchCalls, 1, 'Stubbed fetch should be called once');
      assert.strictEqual(res.text, 'Hello from real GoogleGenAI');
      assert.strictEqual(recordedRequests.length, 1);
      assert.strictEqual(recordedRequests[0].action, 'VERTEX_GENERATE_CONTENT');
      assert.strictEqual(recordedRequests[0].agent, 'vertex-client');
      assert.strictEqual(recordedRequests[0].metadata?.model, 'gemini-2.0-flash');
      assert.strictEqual(recordedRequests[0].metadata?.prompt, 'Say hello in 5 words');
    });

    it('block path: throws SentraError 403, real client never executes fetch', async () => {
      const { client, recordedRequests } = createStubbedClient({
        status: 'blocked',
        isAllowed: false,
        reason: 'Action blocked by Vertex policy',
        risk: 'high'
      });

      let fetchCalls = 0;
      const realGenAI = new GoogleGenAI({
        vertexai: true,
        apiKey: 'test-vertex-key',
        httpOptions: {
          fetch: async () => {
            fetchCalls++;
            return new Response('{}', { status: 200 });
          }
        }
      });

      const guarded = client.wrapVertex(realGenAI);

      await assert.rejects(
        async () => {
          await guarded.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: 'malicious prompt'
          });
        },
        (err: any) => {
          assert.ok(err instanceof SentraError);
          assert.strictEqual(err.status, 403);
          assert.ok(err.message.includes('Action blocked by Vertex policy'));
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
        reason: 'Flagged for Vertex review',
        risk: 'medium'
      });

      let fetchCalls = 0;
      const realGenAI = new GoogleGenAI({
        vertexai: true,
        apiKey: 'test-vertex-key',
        httpOptions: {
          fetch: async () => {
            fetchCalls++;
            return new Response('{}', { status: 200 });
          }
        }
      });

      const guarded = client.wrapVertex(realGenAI);

      await assert.rejects(
        async () => {
          await guarded.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: 'borderline prompt'
          });
        },
        (err: any) => {
          assert.ok(err instanceof SentraError);
          assert.strictEqual(err.status, 403);
          assert.ok(err.message.includes('Flagged for Vertex review'));
          return true;
        }
      );

      assert.strictEqual(fetchCalls, 0);
    });

    it('flag path, flagMode "allow": calls onFlag callback and executes fetch', async () => {
      const { client } = createStubbedClient({
        status: 'flagged',
        isAllowed: true,
        reason: 'Flagged for Vertex review',
        risk: 'medium'
      });

      let fetchCalls = 0;
      let flaggedCheck: any = null;
      const cannedResponse = {
        candidates: [{
          content: { role: 'model', parts: [{ text: 'Flagged output' }] },
          finishReason: 'STOP'
        }]
      };

      const realGenAI = new GoogleGenAI({
        vertexai: true,
        apiKey: 'test-vertex-key',
        httpOptions: {
          fetch: async () => {
            fetchCalls++;
            return new Response(JSON.stringify(cannedResponse), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }
      });

      const guarded = client.wrapVertex(realGenAI, {
        flagMode: 'allow',
        onFlag: (check) => {
          flaggedCheck = check;
        }
      });

      const res = await guarded.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: 'borderline prompt'
      });

      assert.strictEqual(fetchCalls, 1);
      assert.strictEqual(res.text, 'Flagged output');
      assert.ok(flaggedCheck);
      assert.strictEqual(flaggedCheck.status, 'flagged');
    });

    it('stream path (allowed): passes through real streaming response from GoogleGenAI', async () => {
      const { client, recordedRequests } = createStubbedClient({
        status: 'allowed',
        isAllowed: true,
        reason: 'Safe Action'
      });

      let fetchCalls = 0;
      const chunk1 = JSON.stringify({
        candidates: [{ content: { role: 'model', parts: [{ text: 'Hello ' }] } }]
      });
      const chunk2 = JSON.stringify({
        candidates: [{ content: { role: 'model', parts: [{ text: 'real Vertex stream!' }] } }]
      });
      const sseBody = `data: ${chunk1}\n\ndata: ${chunk2}\n\n`;

      const realGenAI = new GoogleGenAI({
        vertexai: true,
        apiKey: 'test-vertex-key',
        httpOptions: {
          fetch: async () => {
            fetchCalls++;
            return new Response(sseBody, {
              status: 200,
              headers: { 'Content-Type': 'text/event-stream' }
            });
          }
        }
      });

      const guarded = client.wrapVertex(realGenAI);
      const stream = await guarded.models.generateContentStream({
        model: 'gemini-2.0-flash',
        contents: 'Say hello in stream'
      });

      let collectedText = '';
      for await (const chunk of stream) {
        collectedText += chunk.text;
      }

      assert.strictEqual(fetchCalls, 1);
      assert.strictEqual(collectedText, 'Hello real Vertex stream!');
      assert.strictEqual(recordedRequests.length, 1);
      assert.strictEqual(recordedRequests[0].action, 'VERTEX_GENERATE_CONTENT_STREAM');
      assert.strictEqual(recordedRequests[0].agent, 'vertex-client');
    });

    it('stream path (blocked): throws SentraError 403 pre-flight and never starts stream', async () => {
      const { client } = createStubbedClient({
        status: 'blocked',
        isAllowed: false,
        reason: 'Blocked streaming prompt',
        risk: 'high'
      });

      let fetchCalls = 0;
      const realGenAI = new GoogleGenAI({
        vertexai: true,
        apiKey: 'test-vertex-key',
        httpOptions: {
          fetch: async () => {
            fetchCalls++;
            return new Response('{}', { status: 200 });
          }
        }
      });

      const guarded = client.wrapVertex(realGenAI);

      await assert.rejects(
        async () => {
          await guarded.models.generateContentStream({
            model: 'gemini-2.0-flash',
            contents: 'malicious stream prompt'
          });
        },
        (err: any) => {
          assert.ok(err instanceof SentraError);
          assert.strictEqual(err.status, 403);
          assert.ok(err.message.includes('Blocked streaming prompt'));
          return true;
        }
      );

      assert.strictEqual(fetchCalls, 0);
    });

    it('wrapVertexAI: client method and top-level export wrap real GoogleGenAI identically', async () => {
      const { client } = createStubbedClient({
        status: 'allowed',
        isAllowed: true
      });

      const cannedResponse = {
        candidates: [{ content: { role: 'model', parts: [{ text: 'Response via wrapVertexAI' }] } }]
      };

      const realGenAI = new GoogleGenAI({
        vertexai: true,
        apiKey: 'test-vertex-key',
        httpOptions: {
          fetch: async () => new Response(JSON.stringify(cannedResponse), { status: 200, headers: { 'Content-Type': 'application/json' } })
        }
      });

      // Test SentraClient.prototype.wrapVertexAI
      const wrappedMethod = client.wrapVertexAI(realGenAI);
      const res1 = await wrappedMethod.models.generateContent({ model: 'gemini-2.0-flash', contents: 'Test' });
      assert.strictEqual(res1.text, 'Response via wrapVertexAI');

      // Test top-level export wrapVertexAI
      const freshClient = new GoogleGenAI({
        vertexai: true,
        apiKey: 'test-vertex-key',
        httpOptions: {
          fetch: async () => new Response(JSON.stringify(cannedResponse), { status: 200, headers: { 'Content-Type': 'application/json' } })
        }
      });
      const wrappedExport = wrapVertexAI(freshClient, undefined, client);
      const res2 = await wrappedExport.models.generateContent({ model: 'gemini-2.0-flash', contents: 'Test 2' });
      assert.strictEqual(res2.text, 'Response via wrapVertexAI');
    });
  });
});
