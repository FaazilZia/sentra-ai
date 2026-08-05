import { SentraClient } from '@sentra-ai/sdk';
import { setupE2ETestToken } from './helpers/testSetup';

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'https://sentra-backend-node.onrender.com';

describe('@sentra-ai/sdk Integration', () => {
  let client: SentraClient;
  let token: string;

  beforeAll(async () => {
    token = await setupE2ETestToken('sdk');
    client = new SentraClient({
      apiKey: token,
      baseUrl: `${TEST_BASE_URL}/api/v1`,
      timeout: 5000,
    });
  });

  test('SDK initializes with valid API key', () => {
    expect(client).toBeDefined();
  });

  test('SDK submits action and receives decision', async () => {
    const res = await client.checkAction({
      agent: 'sdk-test-agent',
      action: 'read_file',
      metadata: { path: './test-data/test.txt' }
    });
    
    expect(res).toBeDefined();
    expect(res.status).toBeDefined();
    expect(['allowed', 'blocked']).toContain(res.status);
    expect(res.reason).toBeDefined();
  });

  test('SDK handles network timeout or unreachable host gracefully (fail-closed)', async () => {
    const unreachableClient = new SentraClient({
      apiKey: token,
      baseUrl: 'http://127.0.0.1:59999/api/v1',
      timeout: 500,
      maxRetries: 0
    });
    
    const result = await unreachableClient.checkAction({
      agent: 'sdk-test-agent',
      action: 'read_file'
    });
    
    // Fail-closed design returns blocked status when server unreachable
    expect(result.status).toBe('blocked');
    expect(result.reason).toContain('unreachable');
  });

  test('SDK works with invalid API key - fails closed or returns error status', async () => {
    const invalidClient = new SentraClient({
      apiKey: 'invalid_key_value',
      baseUrl: `${TEST_BASE_URL}/api/v1`,
      timeout: 2000,
      maxRetries: 0
    });
    
    const result = await invalidClient.checkAction({
      agent: 'sdk-test-agent',
      action: 'read_file'
    });

    expect(result.status).toBe('blocked');
  });
});
