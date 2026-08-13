import request from 'supertest';
import { setupE2ETestToken } from './helpers/testSetup';

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'https://sentra-backend-node.onrender.com';

describe('Session-Based AIDR Detection E2E', () => {
  let token: string;
  let agentId: string;

  beforeAll(async () => {
    token = await setupE2ETestToken('session-aidr');

    // Register test AI System
    const agentRes = await request(TEST_BASE_URL)
      .post('/api/v1/ai-systems')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'AIDR Session Agent',
        description: 'Testing session-based AIDR rules',
        model_name: 'gpt-4o',
        model_version: '2026-05',
        vendor: 'OpenAI',
        use_case: 'AIDR Session Detection',
        risk_tier: 'CRITICAL',
        status: 'ACTIVE'
      });
    expect(agentRes.status).toBe(201);
    agentId = agentRes.body.data?.id || agentRes.body.id;
    if (!agentId) {
      throw new Error('Precondition setup failed: agentId was undefined after creation.');
    }

    // Explicitly enforce BLOCK mode for session AIDR tests
    await request(TEST_BASE_URL)
      .patch('/api/v1/tenant/aidr-enforcement-mode')
      .set('Authorization', `Bearer ${token}`)
      .send({ mode: 'BLOCK' });
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
    const resRead = await request(TEST_BASE_URL)
      .post('/api/v1/ai/check-action')
      .set('Authorization', `Bearer ${token}`)
      .send({
        agent: agentId,
        action: 'read_s3_phi_data',
        metadata: { sessionId, pii: true }
      });
    expect(resRead.status).toBe(200);

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
    expect(resExfil.body.data?.reason?.toLowerCase()).toContain('exfiltration');
  });

  test('Tool-call deviation — standard actions followed by unexpected admin tool execution triggers detection', async () => {
    const sessionId = `dev-sess-${Date.now()}`;

    // 1. Standard action
    const resStd = await request(TEST_BASE_URL)
      .post('/api/v1/ai/check-action')
      .set('Authorization', `Bearer ${token}`)
      .send({
        agent: agentId,
        action: 'query_user_name',
        metadata: { sessionId }
      });
    expect(resStd.status).toBe(200);

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
    expect(resDev.body.data?.reason).toContain('Sharp tool-call deviation');
  });

  test('Rapid scope probing — touching 3+ distinct tools within short timeframe triggers detection', async () => {
    const sessionId = `probe-sess-${Date.now()}`;

    // Tool 1
    const resTool1 = await request(TEST_BASE_URL)
      .post('/api/v1/ai/check-action')
      .set('Authorization', `Bearer ${token}`)
      .send({ agent: agentId, action: 'tool_a:read', metadata: { sessionId } });
    expect(resTool1.status).toBe(200);

    // Tool 2
    const resTool2 = await request(TEST_BASE_URL)
      .post('/api/v1/ai/check-action')
      .set('Authorization', `Bearer ${token}`)
      .send({ agent: agentId, action: 'tool_b:scan', metadata: { sessionId } });
    expect(resTool2.status).toBe(200);

    // Tool 3
    const resProbe = await request(TEST_BASE_URL)
      .post('/api/v1/ai/check-action')
      .set('Authorization', `Bearer ${token}`)
      .send({ agent: agentId, action: 'tool_c:delete', metadata: { sessionId } });

    expect(resProbe.status).toBe(200);
    expect(resProbe.body.data?.status).toBe('blocked');
    expect(resProbe.body.data?.reason?.toLowerCase()).toContain('probing');
  });
});
