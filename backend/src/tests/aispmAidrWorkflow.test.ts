import request from 'supertest';
import app from '../app';
import prisma, { initializePrisma } from '../config/db';
import { generateAccessToken } from '../utils/jwt';
import { AgentPostureService } from '../services/agentPosture.service';
import { makeDecision } from '../services/decisionEngine';

describe('AISPM & AIDR End-to-End Integration Workflow', () => {
  const ORG_ID = '00000000-0000-0000-0000-000000000001';
  const USER_ID = '00000000-0000-0000-0000-000000000099';
  let testAgentId: string;
  let authToken: string;

  beforeAll(async () => {
    await initializePrisma();

    // Ensure test organization exists with default BLOCK mode
    await prisma.organizations.upsert({
      where: { id: ORG_ID },
      update: { aidrEnforcementMode: 'BLOCK' },
      create: {
        id: ORG_ID,
        name: 'Sentraa AI Test',
        slug: 'sentraa-ai-test',
        is_active: true,
        aidrEnforcementMode: 'BLOCK',
      },
    });

    // Ensure test admin user exists
    await prisma.users.upsert({
      where: { id: USER_ID },
      update: {},
      create: {
        id: USER_ID,
        email: 'test-admin@sentra.ai',
        full_name: 'Test Admin User',
        role: 'ADMIN',
        is_active: true,
        organizationId: ORG_ID,
        email_verified: true
      }
    });

    authToken = generateAccessToken({ id: USER_ID, role: 'ADMIN', organizationId: ORG_ID });

    // Create a test AI agent with broad access capabilities to trigger posture findings
    const agent = await prisma.agent.create({
      data: {
        organizationId: ORG_ID,
        name: 'Test Healthcare & Financial Assistant',
        type: 'SQL_CONNECTOR',
        source: 'SQL Database Connector',
        accessLevel: 'READ_WRITE',
        permissions: {
          riskTier: 'CRITICAL',
          scope: 'full-db-access'
        },
      }
    });
    testAgentId = agent.id;
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.audit_logs.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.agent_posture_findings.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.blockEvent.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.agent.deleteMany({ where: { id: testAgentId } });
    await prisma.users.deleteMany({ where: { id: USER_ID } });
  });

  describe('1. AISPM Posture Scan (Scan → Flag)', () => {
    it('should scan agent posture and persist findings for 5 supported frameworks', async () => {
      const scanResult = await AgentPostureService.scanAgent(ORG_ID, testAgentId);

      expect(scanResult).toBeDefined();
      expect(scanResult.findings.length).toBeGreaterThan(0);

      // Verify findings exist in database for the 5 supported frameworks
      const storedFindings = await prisma.agent_posture_findings.findMany({
        where: { organizationId: ORG_ID, agentId: testAgentId }
      });

      expect(storedFindings.length).toBeGreaterThan(0);
      const frameworkNames = storedFindings.map(f => f.framework);
      
      expect(frameworkNames).toContain('HIPAA');
      expect(frameworkNames).toContain('PCI_DSS');
      expect(frameworkNames).toContain('DPDP');
    });
  });

  describe('2. AIDR Interception & Logging (Detect → Block)', () => {
    it('should detect policy violations and log block events tagged with compliance frameworks', async () => {
      // Simulate real-time AIDR governance decision for illegal data export
      const decision = await makeDecision(
        testAgentId,
        'export_data to evil-collector.io with patient phi records',
        ORG_ID
      );

      expect(decision.status).toBe('blocked');
      expect(decision.compliance).toContain('GDPR');
      expect(decision.compliance).toContain('HIPAA');

      // Persist runtime block event tagged with frameworks
      const blockEvent = await prisma.blockEvent.create({
        data: {
          organizationId: ORG_ID,
          agentId: testAgentId,
          action: 'export_data to evil-collector.io',
          resource: 'patient_phi_db',
          status: 'BLOCKED',
          mode: 'BLOCK',
          frameworks: decision.compliance
        }
      });

      expect(blockEvent.id).toBeDefined();
      expect(blockEvent.frameworks).toContain('GDPR');
      expect(blockEvent.frameworks).toContain('HIPAA');
    });
  });

  describe('3. Unified Framework View API (Combined AISPM & AIDR View)', () => {
    it('should return combined static posture findings and runtime block events for GDPR', async () => {
      const response = await request(app)
        .get('/api/v1/compliance/unified/GDPR')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-organization-id', ORG_ID);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.framework).toBe('GDPR');
      expect(response.body.data.aispmPostureFindingsCount).toBeGreaterThanOrEqual(0);
      expect(response.body.data.aidrRuntimeBlocksCount).toBeGreaterThanOrEqual(1);
      expect(response.body.data.postureFindings).toBeDefined();
      expect(response.body.data.runtimeBlocks).toBeDefined();
    });

    it('should return combined findings and block events for HIPAA', async () => {
      const response = await request(app)
        .get('/api/v1/compliance/unified/HIPAA')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-organization-id', ORG_ID);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.framework).toBe('HIPAA');
      expect(response.body.data.aispmPostureFindingsCount).toBeGreaterThanOrEqual(1);
      expect(response.body.data.aidrRuntimeBlocksCount).toBeGreaterThanOrEqual(1);
    });

    it('should reject requests for removed/unsupported frameworks with HTTP 400', async () => {
      const response = await request(app)
        .get('/api/v1/compliance/unified/EU_AI_ACT')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-organization-id', ORG_ID);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Unsupported framework');
    });
  });

  describe('4. AIDR Enforcement Mode Controls & Audit Trail (Stage 4)', () => {
    it('should fetch current org enforcement mode', async () => {
      const response = await request(app)
        .get('/api/v1/tenant/aidr-enforcement-mode')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-organization-id', ORG_ID);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.mode).toBe('BLOCK');
    });

    it('should update enforcement mode to FLAG_ONLY and write audit log', async () => {
      const updateRes = await request(app)
        .patch('/api/v1/tenant/aidr-enforcement-mode')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-organization-id', ORG_ID)
        .send({ mode: 'FLAG_ONLY' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.data.mode).toBe('FLAG_ONLY');

      // Verify decision engine allows action in FLAG_ONLY mode
      const decision = await makeDecision(
        testAgentId,
        'export_data to evil-collector.io with patient phi records',
        ORG_ID
      );

      expect(decision.status).toBe('allowed');
      expect(decision.mode).toBe('FLAG_ONLY');
      expect(decision.reason).toContain('[FLAG_ONLY MODE]');
    });

    it('should restore enforcement mode to BLOCK', async () => {
      const updateRes = await request(app)
        .patch('/api/v1/tenant/aidr-enforcement-mode')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-organization-id', ORG_ID)
        .send({ mode: 'BLOCK' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.mode).toBe('BLOCK');

      // Verify decision engine blocks action in BLOCK mode
      const decision = await makeDecision(
        testAgentId,
        'export_data to evil-collector.io with patient phi records',
        ORG_ID
      );

      expect(decision.status).toBe('blocked');
      expect(decision.mode).toBe('BLOCK');
    });
  });
});
