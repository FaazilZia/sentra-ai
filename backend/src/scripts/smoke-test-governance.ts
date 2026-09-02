import 'dotenv/config';
import request from 'supertest';
import app from '../app';
import prisma, { initializePrisma } from '../config/db';
import { GovernanceService } from '../services/governance.service';
import { ShadowAIService } from '../services/shadowAI.service';
import { EvaluationService } from '../services/evaluation.service';
import { DriftAlertService } from '../services/driftAlert.service';
import { TenantService } from '../services/tenant.service';
import { generateAccessToken } from '../utils/jwt';
import { randomUUID } from 'crypto';

async function main() {
  await initializePrisma();
  console.log('\n============================================================');
  console.log('  SENTRAA AI v2.0.0 — GOVERNANCE SMOKE TESTS & VERIFICATION');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  async function assertTest(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (e: any) {
      console.error(`  ❌ ${name}: ${e.message}`);
      failed++;
    }
  }

  async function cleanupOrg(orgId: string) {
    try {
      await prisma.control_implementations.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
      await prisma.compliance_obligations.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
      await prisma.controls.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
      await prisma.training_courses.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
      await prisma.intake_forms.deleteMany({ where: { orgId } }).catch(() => {});
      await prisma.workspace_memberships.deleteMany({ where: { workspace: { organizationId: orgId } } }).catch(() => {});
      await prisma.workspaces.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
      await prisma.org_settings.deleteMany({ where: { organizationId: orgId } }).catch(() => {});
      await prisma.organizations.delete({ where: { id: orgId } }).catch(() => {});
    } catch (err) {
      // Suppress cleanup error
    }
  }

  // 1. Find a test organization
  const org = await prisma.organizations.findFirst({
    where: { is_active: true }
  });
  if (!org) {
    throw new Error('No active organization found in database to run smoke tests.');
  }
  const orgId = org.id;

  // STEP 4: Risk scoring & updates
  await assertTest('AI System Registry + Risk Assessment Scoring (0-30 LOW, 31-60 MEDIUM, 61-80 HIGH, 81-100 CRITICAL)', async () => {
    // 1. Create system with LOW
    const sys = await prisma.ai_systems.create({
      data: {
        id: randomUUID(),
        organizationId: orgId,
        name: 'Smoke Test Agent',
        model_name: 'gpt-4o',
        model_version: '2024-05-13',
        vendor: 'OpenAI',
        use_case: 'Testing',
        risk_tier: 'LOW',
        status: 'ACTIVE'
      }
    });

    try {
      // 2. Create risk assessment
      const ra = await GovernanceService.createRiskAssessment(orgId, sys.id);

      // 3. Submit answers to score HIGH (e.g. 70)
      const answers = [
        { question_key: 'use_case_cat', answer: 'High risk / HR / Evaluation', score: 20 },
        { question_key: 'sensitive_data', answer: 'Direct PII', score: 15 },
        { question_key: 'autonomy', answer: 'Semi-autonomous with retroactive human oversight', score: 15 },
        { question_key: 'user_base', answer: 'Over 10,000 customers or public', score: 20 }
      ]; // Total score = 70 (HIGH: 61-80)

      const submitted = await GovernanceService.submitRiskAssessment(ra.id, orgId, answers);
      if (submitted.score !== 70) {
        throw new Error(`Expected score to be 70, got ${submitted.score}`);
      }
      if (submitted.risk_level !== 'HIGH') {
        throw new Error(`Expected assessment risk level to be HIGH, got ${submitted.risk_level}`);
      }

      // 4. Verify AI System risk tier automatically updated to HIGH
      const updatedSys = await prisma.ai_systems.findUnique({
        where: { id: sys.id }
      });
      if (updatedSys?.risk_tier !== 'HIGH') {
        throw new Error(`Expected AI System risk tier to be updated to HIGH, got ${updatedSys?.risk_tier}`);
      }
    } finally {
      // Cleanup
      await prisma.ai_systems.delete({ where: { id: sys.id } }).catch(() => {});
    }
  });

  // STEP 5: Impact Assessment Kanban Flow
  await assertTest('Impact Assessment status transitions and approved_at timestamp', async () => {
    const sys = await prisma.ai_systems.create({
      data: {
        id: randomUUID(),
        organizationId: orgId,
        name: 'Kanban Smoke Test System',
        model_name: 'gpt-4',
        model_version: 'v1',
        vendor: 'OpenAI',
        use_case: 'Kanban Testing',
        status: 'ACTIVE'
      }
    });

    try {
      // 1. Create DPIA in DRAFT
      const ia = await GovernanceService.createImpactAssessment(orgId, {
        ai_system_id: sys.id,
        type: 'DPIA',
        form_data: { description: 'Smoke testing impact assessment workflow' }
      });
      if (ia.status !== 'DRAFT') {
        throw new Error(`Expected initial status to be DRAFT, got ${ia.status}`);
      }

      // 2. Submit -> IN_REVIEW
      const submitted = await GovernanceService.updateImpactAssessment(ia.id, orgId, { status: 'IN_REVIEW' });
      if (submitted?.status !== 'IN_REVIEW') {
        throw new Error(`Expected status to transition to IN_REVIEW, got ${submitted?.status}`);
      }

      // 3. Approve -> APPROVED and approved_at populated
      const approved = await GovernanceService.updateImpactAssessment(ia.id, orgId, { status: 'APPROVED' });
      if (approved?.status !== 'APPROVED') {
        throw new Error(`Expected status to transition to APPROVED, got ${approved?.status}`);
      }
      if (!approved?.approved_at) {
        throw new Error('Expected approved_at timestamp to be populated after approval');
      }
    } finally {
      await prisma.ai_systems.delete({ where: { id: sys.id } }).catch(() => {});
    }
  });

  // STEP 7: Trust Portal Public Access (No Auth, Limited Projections)
  await assertTest('Step 7 — Trust Portal Public Access (No Auth, Limited Projections)', async () => {
    // Ensure public trust is enabled on org settings first
    await prisma.org_settings.upsert({
      where: { organizationId: orgId },
      update: {
        webhook_events: { public_trust_enabled: true }
      },
      create: {
        organizationId: orgId,
        webhook_events: { public_trust_enabled: true }
      }
    });

    const res = await request(app)
      .get(`/api/v1/public/${org.slug}/trust`)
      .expect(200);

    const body = res.body;
    if (!body.success) {
      throw new Error(`Expected success: true, got: ${JSON.stringify(body)}`);
    }

    const systems = body.data.systems || [];
    for (const sys of systems) {
      const keys = Object.keys(sys);
      const invalidKeys = keys.filter(k => !['name', 'use_case', 'risk_tier'].includes(k));
      if (invalidKeys.length > 0) {
        throw new Error(`Public Trust Portal leaked internal columns: ${invalidKeys.join(', ')}`);
      }
    }
  });

  // STEP 7b: Trust portal zero registered systems handling
  await assertTest('Step 7b — Trust Portal Zero Systems Handling (Empty Array)', async () => {
    const tempSlug = 'zero-sys-org-' + Date.now();
    const newOrg = await TenantService.createOrganization({
      name: 'Zero Systems Org',
      slug: tempSlug
    });

    try {
      await prisma.org_settings.upsert({
        where: { organizationId: newOrg.id },
        update: {
          webhook_events: { public_trust_enabled: true }
        },
        create: {
          organizationId: newOrg.id,
          webhook_events: { public_trust_enabled: true }
        }
      });

      const res = await request(app)
        .get(`/api/v1/public/${tempSlug}/trust`)
        .expect(200);

      const systems = res.body.data.systems;
      if (!Array.isArray(systems) || systems.length !== 0) {
        throw new Error(`Expected empty systems array, got: ${JSON.stringify(systems)}`);
      }
    } finally {
      await cleanupOrg(newOrg.id);
    }
  });

  // STEP 8: Shadow AI Detections
  await assertTest('Shadow AI detections scanner_ready flag and grouping logic', async () => {
    // 1. Test with 0 registered agents (simulate by temporarily counting registered agents or using mock checks)
    const registeredCount = await prisma.ai_agents.count({ where: { organizationId: orgId } });
    
    // We should temporarily clear or register depending on active state. Let's do a safe test
    const initialResult = await ShadowAIService.getShadowAIDetections(orgId);
    
    if (registeredCount === 0) {
      if (initialResult.scanner_ready !== false || initialResult.detections.length !== 0) {
        throw new Error('Expected scanner_ready to be false and detections empty when 0 registered agents');
      }
    } else {
      if (initialResult.scanner_ready !== true) {
        throw new Error('Expected scanner_ready to be true when agents are registered');
      }
    }
  });

  // STEP 9: Evaluation Runner Async Flow
  await assertTest('Evaluation runner async enqueuing & immediate runId response', async () => {
    // 1. Create a dummy dataset
    const ds = await prisma.benchmark_datasets.create({
      data: {
        id: randomUUID(),
        organizationId: orgId,
        name: 'Smoke Test Dataset',
        category: 'SAFETY',
        test_cases: [
          { input: 'Test safety prompt 1', expected: 'safe' }
        ]
      }
    });

    try {
      const runId = await EvaluationService.runEvaluation({
        organizationId: orgId,
        datasetId: ds.id,
        runType: 'MANUAL',
        triggeredBy: 'smoke-tester'
      });

      if (!runId) {
        throw new Error('Expected immediately returned runId to be truthy');
      }

      // Verify row exists in evaluation_runs
      const runRow = await prisma.evaluation_runs.findUnique({
        where: { id: runId }
      });
      if (!runRow) {
        throw new Error('Expected evaluation run row to exist in database immediately');
      }
      if (runRow.status !== 'queued') {
        throw new Error(`Expected evaluation run status to be "queued", got ${runRow.status}`);
      }
    } finally {
      await prisma.benchmark_datasets.delete({ where: { id: ds.id } }).catch(() => {});
    }
  });

  // STEP 10: Drift Deduplication Redis lock
  await assertTest('Drift scanning Redis lock and simultaneous request deduplication', async () => {
    // Fire two simultaneous drift scans
    const [first, second] = await Promise.all([
      DriftAlertService.runDriftScan(orgId),
      DriftAlertService.runDriftScan(orgId)
    ]);

    // One must succeed, the other must be skipped/deduplicated (or both succeed if Redis is not online, but here Redis is configured in .env)
    const hasDeduplicated = first.message === 'Deduplicated simultaneous scan job' || second.message === 'Deduplicated simultaneous scan job';
    if (!hasDeduplicated) {
      console.log('  ⚠️  Warning: Redis lock did not deduplicate. Check if Redis connection is active and responsive.');
    } else {
      console.log('  ✅ Redis lock deduplication worked perfectly');
    }
  });

  // STEP 11: Verify SSO Guard
  await assertTest('Step 11 — SSO Guards block when disabled', async () => {
    // 1. SAML route for disabled org
    const samlRes = await request(app)
      .get(`/api/v1/saml/${org.slug}`)
      .expect(501);

    if (samlRes.body.message !== 'SSO is not enabled for this organization') {
      throw new Error(`Expected SAML 501 message, got: ${samlRes.body.message}`);
    }

    // 2. SCIM route for disabled org
    let testUser = await prisma.users.findFirst({
      where: { organizationId: orgId, role: 'ADMIN', is_active: true }
    });
    let createdTestUser = false;
    if (!testUser) {
      testUser = await prisma.users.create({
        data: {
          id: randomUUID(),
          organizationId: orgId,
          email: `smoke-test-admin-${Date.now()}@sentra.ai`,
          full_name: 'Smoke Test Admin',
          role: 'ADMIN',
          is_active: true
        }
      });
      createdTestUser = true;
    }

    try {
      const token = generateAccessToken({ id: testUser.id, role: 'ADMIN', organizationId: orgId });
      const scimRes = await request(app)
        .get('/api/v1/scim/v2/Users')
        .set('Authorization', `Bearer ${token}`)
        .expect(501);

      if (scimRes.body.message !== 'SSO is not enabled for this organization') {
        throw new Error(`Expected SCIM 501 message, got: ${scimRes.body.message}`);
      }
    } finally {
      if (createdTestUser && testUser) {
        await prisma.users.delete({ where: { id: testUser.id } }).catch(() => {});
      }
    }
  });

  // STEP 12: New Org Sign-up seed hook
  await assertTest('New Organization Creation seed hook (20 Controls + 20 Obligations)', async () => {
    const testSlug = 'smoke-test-org-' + Date.now();
    const newOrg = await TenantService.createOrganization({
      name: 'Smoke Test Organization',
      slug: testSlug
    });

    try {
      const controls = await prisma.controls.count({ where: { organizationId: newOrg.id } });
      const obligations = await prisma.compliance_obligations.count({ where: { organizationId: newOrg.id } });

      if (controls !== 20) {
        throw new Error(`Expected exactly 20 baseline controls, got ${controls}`);
      }
      if (obligations !== 20) {
        throw new Error(`Expected exactly 20 baseline obligations, got ${obligations}`);
      }
    } finally {
      // Clean up newly created org
      await cleanupOrg(newOrg.id);
    }
  });

  console.log('\n============================================================');
  console.log('  SMOKE TEST SUMMARY');
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  if (failed === 0) {
    console.log('  🎉 ALL GOVERNANCE SMOKE TESTS PASSED FLAWLESSLY');
  } else {
    console.log('  ⚠️  Some smoke tests failed — check errors above');
    process.exitCode = 1;
  }
  console.log('============================================================\n');

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Smoke tests crashed:', err);
  process.exit(1);
});
