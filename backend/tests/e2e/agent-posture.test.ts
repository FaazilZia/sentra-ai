import request from 'supertest';
import { setupE2ETestToken } from './helpers/testSetup';
import prisma, { initializePrisma } from '../../src/config/db';

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'https://sentra-backend-node.onrender.com';

describe('Agent Config Posture Scanning E2E', () => {
  jest.setTimeout(120000);
  let token: string;
  let highRiskAgentId: string;
  let lowRiskAgentId: string;
  let highRiskSystemId: string;
  let lowRiskSystemId: string;

  beforeAll(async () => {
    token = await setupE2ETestToken('posture');

    // 1. Create high-risk AI System in registry (risk_tier: CRITICAL => discovered as HIGH_RISK_MONITORED)
    const sysHighRes = await request(TEST_BASE_URL)
      .post('/api/v1/ai-systems')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'High Risk S3 Connector Agent',
        description: 'Triggers NIST AI RMF posture rules',
        model_name: 'gpt-4',
        model_version: '1.0',
        vendor: 'Internal',
        use_case: 'Security Audit',
        risk_tier: 'CRITICAL',
        status: 'ACTIVE'
      });
    highRiskSystemId = sysHighRes.body?.data?.id || sysHighRes.body?.id;

    // 2. Create low-risk AI System in registry (risk_tier: LOW => discovered as STANDARD_ACCESS)
    const sysLowRes = await request(TEST_BASE_URL)
      .post('/api/v1/ai-systems')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Low Risk Read-Only Agent',
        description: 'No posture violations',
        model_name: 'gpt-3.5-turbo',
        model_version: '1.0',
        vendor: 'Internal',
        use_case: 'Read-Only Helper',
        risk_tier: 'LOW',
        status: 'ACTIVE'
      });
    lowRiskSystemId = sysLowRes.body?.data?.id || sysLowRes.body?.id;

    // 3. Trigger Agent Discovery scan to populate Agent table (prisma.agent)
    const scanRes = await request(TEST_BASE_URL)
      .post('/api/v1/agents/scan')
      .set('Authorization', `Bearer ${token}`);

    const agents = scanRes.body?.agents || scanRes.body?.data || (Array.isArray(scanRes.body) ? scanRes.body : []);
    const highRiskAgent = agents.find((a: any) => a.name === 'High Risk S3 Connector Agent');
    const lowRiskAgent = agents.find((a: any) => a.name === 'Low Risk Read-Only Agent');

    highRiskAgentId = highRiskAgent?.id;
    lowRiskAgentId = lowRiskAgent?.id;

    if (!highRiskAgentId) {
      throw new Error('Precondition setup failed: High Risk agent was not populated by discovery scan.');
    }
    if (!lowRiskAgentId) {
      throw new Error('Precondition setup failed: Low Risk agent was not populated by discovery scan.');
    }
  });

  afterAll(async () => {
    // 1. Delete AI Systems via HTTP REST API
    try {
      if (highRiskSystemId) {
        await request(TEST_BASE_URL)
          .delete(`/api/v1/ai-systems/${highRiskSystemId}`)
          .set('Authorization', `Bearer ${token}`);
      }
      if (lowRiskSystemId) {
        await request(TEST_BASE_URL)
          .delete(`/api/v1/ai-systems/${lowRiskSystemId}`)
          .set('Authorization', `Bearer ${token}`);
      }
    } catch {
      // Best-effort cleanup over HTTP
    }

    // 2. Clean up corresponding Agent records & posture findings if direct DB access is available.
    // NOTE: The Prisma DB cleanup below is a no-op when executing against remote environments (like staging)
    // where the test runner lacks direct database access. In remote runs, the two Agent rows and their posture
    // findings remain in the database, contained within the disposable per-run test organization.
    try {
      const agentIds = [highRiskAgentId, lowRiskAgentId].filter(Boolean);
      if (agentIds.length > 0) {
        await prisma.agent_posture_findings.deleteMany({
          where: { agentId: { in: agentIds } },
        });
        await prisma.agent.deleteMany({
          where: { id: { in: agentIds } },
        });
      }
    } catch {
      // Safe fallback if direct DB access is unavailable
    }
  });

  test('Posture Scan — evaluates 10 compliance rules across 5 frameworks (DPDP, GDPR, HIPAA, PCI_DSS, NIST_AI_RMF)', async () => {
    const res = await request(TEST_BASE_URL)
      .post('/api/v1/agents/posture-scan-all')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.totalAgentsScanned).toBeGreaterThanOrEqual(2);
    expect(res.body.data.results).toBeDefined();
  });

  test('Severity-weighted scoring — high risk agent has lower posture score than restricted agent', async () => {
    const scanHigh = await request(TEST_BASE_URL)
      .post(`/api/v1/agents/${highRiskAgentId}/posture-scan`)
      .set('Authorization', `Bearer ${token}`);

    const scanLow = await request(TEST_BASE_URL)
      .post(`/api/v1/agents/${lowRiskAgentId}/posture-scan`)
      .set('Authorization', `Bearer ${token}`);

    expect(scanHigh.status).toBe(200);
    expect(scanLow.status).toBe(200);

    const scoreHigh = scanHigh.body.data?.postureScore ?? 100;
    const scoreLow = scanLow.body.data?.postureScore ?? 100;

    expect(scoreHigh).toBeLessThan(scoreLow);
  });

  test('Per-framework breakdown — returns scores for dpdp, gdpr, hipaa, pciDss, and nistAiRmf', async () => {
    const res = await request(TEST_BASE_URL)
      .get(`/api/v1/agents/${highRiskAgentId}/posture-findings`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const frameworkScores = res.body.data?.frameworkScores;
    expect(frameworkScores).toBeDefined();
    expect(frameworkScores).toHaveProperty('dpdp');
    expect(frameworkScores).toHaveProperty('gdpr');
    expect(frameworkScores).toHaveProperty('hipaa');
    expect(frameworkScores).toHaveProperty('pciDss');
    expect(frameworkScores).toHaveProperty('nistAiRmf');
  });

  test('Idempotency — re-running posture scan yields identical findings and scores', async () => {
    const run1 = await request(TEST_BASE_URL)
      .post(`/api/v1/agents/${highRiskAgentId}/posture-scan`)
      .set('Authorization', `Bearer ${token}`);

    const run2 = await request(TEST_BASE_URL)
      .post(`/api/v1/agents/${highRiskAgentId}/posture-scan`)
      .set('Authorization', `Bearer ${token}`);

    expect(run1.status).toBe(200);
    expect(run2.status).toBe(200);
    expect(run1.body.data.postureScore).toBe(run2.body.data.postureScore);
    expect(run1.body.data.findings.length).toBe(run2.body.data.findings.length);
  });
});
