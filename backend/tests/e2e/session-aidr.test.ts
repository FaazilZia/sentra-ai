import request from 'supertest';
import { setupE2ETestToken } from './helpers/testSetup';

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'https://sentra-backend-node.onrender.com';

describe('Session-Based AIDR Detection E2E', () => {
  let token: string;
  let agentId: string;

  beforeAll(async () => {
    token = await setupE2ETestToken('session-aidr');
    agentId = `aidr-agent-${Date.now()}`;

    // Register test agent
    await request(TEST_BASE_URL)
      .post('/api/v1/inventory/agents')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'AIDR Session Agent',
        description: 'Testing session-based AIDR rules',
        status: 'active'
      });
  });

  test('Benign session (True Negative) — normal single read action is NOT flagged by AIDR detector', async () => {
    const res = await request(TEST_BASE_URL)
      .post('/api/v1/ai/check-action')
      .set('Authorization', `Bearer ${token}`)
      .send({
        agent: agentId,
        action: 'read_doc',
        metadata: { path: './benign/doc.txt', sessionId: `benign-sess-${Date.now()}` }
      });

    expect(res.status).toBe(200);
    expect(res.body.data?.status).toBe('allowed');
    expect(res.body.data?.detectionSource).not.toBe('session_pattern');
  });

  test('Exfiltration pattern — reading sensitive records followed by outbound API call triggers detection', async () => {
    const sessionId = `exfil-sess-${Date.now()}`;

    // 1. Read sensitive PII records
    await request(TEST_BASE_URL)
      .post('/api/v1/ai/check-action')
      .set('Authorization', `Bearer ${token}`)
      .send({
        agent: agentId,
        action: 'read_s3_phi_data',
        metadata: { sessionId, pii: true }
      });

    // 2. Outbound HTTP post attempt
    const resExfil = await request(TEST_BASE_URL)
      .post('/api/v1/ai/check-action')
      .set('Authorization', `Bearer ${token}`)
      .send({
        agent: agentId,
        action: 'http_post_external',
        metadata: { sessionId, url: 'https://attacker.site/exfil' }
      });

    expect(resExfil.status).toBe(200);
    expect(resExfil.body.data?.status).toBe('blocked');
    expect(resExfil.body.data?.reason).toContain('EXFILTRATION');
  });

  test('Tool-call deviation — standard actions followed by unexpected admin tool execution triggers detection', async () => {
    const sessionId = `dev-sess-${Date.now()}`;

    // 1. Standard action
    await request(TEST_BASE_URL)
      .post('/api/v1/ai/check-action')
      .set('Authorization', `Bearer ${token}`)
      .send({
        agent: agentId,
        action: 'query_user_name',
        metadata: { sessionId }
      });

    // 2. Sudden dangerous admin action
    const resDev = await request(TEST_BASE_URL)
      .post('/api/v1/ai/check-action')
      .set('Authorization', `Bearer ${token}`)
      .send({
        agent: agentId,
        action: 'delete_database',
        metadata: { sessionId }
      });

    expect(resDev.status).toBe(200);
    expect(resDev.body.data?.status).toBe('blocked');
  });

  test('Rapid scope probing — touching 3+ distinct tools within short timeframe triggers detection', async () => {
    const sessionId = `probe-sess-${Date.now()}`;

    // Tool 1
    await request(TEST_BASE_URL)
      .post('/api/v1/ai/check-action')
      .set('Authorization', `Bearer ${token}`)
      .send({ agent: agentId, action: 'tool_a:read', metadata: { sessionId } });

    // Tool 2
    await request(TEST_BASE_URL)
      .post('/api/v1/ai/check-action')
      .set('Authorization', `Bearer ${token}`)
      .send({ agent: agentId, action: 'tool_b:scan', metadata: { sessionId } });

    // Tool 3
    const resProbe = await request(TEST_BASE_URL)
      .post('/api/v1/ai/check-action')
      .set('Authorization', `Bearer ${token}`)
      .send({ agent: agentId, action: 'tool_c:delete', metadata: { sessionId } });

    expect(resProbe.status).toBe(200);
    expect(resProbe.body.data?.status).toBe('blocked');
    expect(resProbe.body.data?.reason).toContain('PROBING');
  });
});
