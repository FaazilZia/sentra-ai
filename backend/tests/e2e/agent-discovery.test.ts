import request from 'supertest';
import { setupE2ETestToken } from './helpers/testSetup';

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'https://sentra-backend-node.onrender.com';

describe('Agent Discovery Engine E2E', () => {
  let tokenOrgA: string;
  let tokenOrgB: string;

  beforeAll(async () => {
    tokenOrgA = await setupE2ETestToken('disc-orga');
    tokenOrgB = await setupE2ETestToken('disc-orgb');
  });

  test('POST /api/v1/agents/scan - triggers discovery scan across connectors', async () => {
    const res = await request(TEST_BASE_URL)
      .post('/api/v1/agents/scan')
      .set('Authorization', `Bearer ${tokenOrgA}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('scan_completed');
    expect(Array.isArray(res.body.agents)).toBe(true);
  });

  test('Deduplication: scanning twice creates no duplicate agent rows', async () => {
    // Run scan #1
    const scan1 = await request(TEST_BASE_URL)
      .post('/api/v1/agents/scan')
      .set('Authorization', `Bearer ${tokenOrgA}`);
    expect(scan1.status).toBe(200);
    const count1 = scan1.body.agents.length;

    // Run scan #2 immediately
    const scan2 = await request(TEST_BASE_URL)
      .post('/api/v1/agents/scan')
      .set('Authorization', `Bearer ${tokenOrgA}`);
    expect(scan2.status).toBe(200);
    const count2 = scan2.body.agents.length;

    expect(count2).toBe(count1);
  });

  test('Multi-tenant isolation: Org A discovery scan never surfaces Org B agents', async () => {
    // Precondition 1: Create AI System under Org B & assert 201 Created
    const createAiSystemRes = await request(TEST_BASE_URL)
      .post('/api/v1/ai-systems')
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .send({
        name: 'Org B Secret Discovery AI System',
        description: 'Org B AI system for isolation test',
        model_name: 'gpt-4o',
        model_version: '2026-05',
        vendor: 'OpenAI',
        use_case: 'Multi-Tenant Isolation Testing',
        risk_tier: 'CRITICAL',
        status: 'ACTIVE'
      });
    expect(createAiSystemRes.status).toBe(201);

    // Precondition 2: Run Discovery Scan for Org B & assert 200 OK
    const scanOrgBRes = await request(TEST_BASE_URL)
      .post('/api/v1/agents/scan')
      .set('Authorization', `Bearer ${tokenOrgB}`);
    expect(scanOrgBRes.status).toBe(200);

    // Run scan for Org A
    const resA = await request(TEST_BASE_URL)
      .get('/api/v1/agents')
      .set('Authorization', `Bearer ${tokenOrgA}`);

    expect(resA.status).toBe(200);
    const agentsA = Array.isArray(resA.body) ? resA.body : resA.body.data || [];
    const orgBAgentInA = agentsA.find((a: any) => a.name === 'Org B Secret Discovery AI System');
    expect(orgBAgentInA).toBeUndefined();
  });

  test('Legacy seed purge: old fake seed rows are purged after scan', async () => {
    const res = await request(TEST_BASE_URL)
      .post('/api/v1/agents/scan')
      .set('Authorization', `Bearer ${tokenOrgA}`);

    expect(res.status).toBe(200);
    const agents = res.body.agents || [];
    const seedNames = ['Customer Support Bot', 'Financial Analyst Agent', 'Security Auditing Agent'];
    const fakeSeedFound = agents.find((a: any) => seedNames.includes(a.name) && a.source === 'seed');
    expect(fakeSeedFound).toBeUndefined();
  });
});
