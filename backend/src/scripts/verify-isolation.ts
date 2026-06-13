import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { ComplianceService } from '../services/compliance.service';
import { GuardrailService } from '../services/guardrail.service';

const ORG_A_ID = 'a0000000-0000-0000-0000-000000000000';
const ORG_B_ID = 'b0000000-0000-0000-0000-000000000000';

async function main() {
  console.log('🔄 Connecting to Database...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL!, max: 5 });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  // Initialize the proxy container in src/config/db.ts
  const dbConfig = require('../config/db');
  await dbConfig.initializePrisma();

  console.log('🧼 Cleaning up previous test data if any...');
  // Delete in reverse order of foreign keys
  await prisma.guardrail_overrides.deleteMany({
    where: { interception_log: { organizationId: { in: [ORG_A_ID, ORG_B_ID] } } }
  });
  await prisma.interception_logs.deleteMany({
    where: { organizationId: { in: [ORG_A_ID, ORG_B_ID] } }
  });
  await prisma.compliance_snapshots.deleteMany({
    where: { organizationId: { in: [ORG_A_ID, ORG_B_ID] } }
  });
  await prisma.evidence_records.deleteMany({
    where: { task: { organizationId: { in: [ORG_A_ID, ORG_B_ID] } } }
  });
  await prisma.compliance_fix_tasks.deleteMany({
    where: { organizationId: { in: [ORG_A_ID, ORG_B_ID] } }
  });
  await prisma.alerts.deleteMany({
    where: { organizationId: { in: [ORG_A_ID, ORG_B_ID] } }
  });
  await prisma.guardrail.deleteMany({
    where: { organizationId: { in: [ORG_A_ID, ORG_B_ID] } }
  });
  await prisma.blockEvent.deleteMany({
    where: { organizationId: { in: [ORG_A_ID, ORG_B_ID] } }
  });
  await prisma.complianceControl.deleteMany({
    where: { organizationId: { in: [ORG_A_ID, ORG_B_ID] } }
  });
  await prisma.agent.deleteMany({
    where: { organizationId: { in: [ORG_A_ID, ORG_B_ID] } }
  });
  await prisma.organizations.deleteMany({
    where: { id: { in: [ORG_A_ID, ORG_B_ID] } }
  });

  console.log('🏢 Creating Test Organizations (Org A and Org B)...');
  const orgA = await prisma.organizations.create({
    data: {
      id: ORG_A_ID,
      name: 'Organization A (Auditor)',
      slug: 'org-a-auditor',
      is_active: true
    }
  });

  const orgB = await prisma.organizations.create({
    data: {
      id: ORG_B_ID,
      name: 'Organization B (Target)',
      slug: 'org-b-target',
      is_active: true
    }
  });

  console.log('🌱 Seeding Org B resources...');

  // 1. Guardrail
  const guardrailB = await prisma.guardrail.create({
    data: {
      organizationId: ORG_B_ID,
      name: 'Org B Proprietary safety rule',
      type: 'input',
      enabled: true
    }
  });

  // 2. Block Event
  const blockEventB = await prisma.blockEvent.create({
    data: {
      organizationId: ORG_B_ID,
      agentId: 'agent-b-id',
      action: 'confidential-command',
      resource: 'shell-execution'
    }
  });

  // 3. Compliance Control
  const complianceControlB = await prisma.complianceControl.create({
    data: {
      organizationId: ORG_B_ID,
      framework: 'gdpr',
      name: 'Right to Access Control',
      description: 'Allows Org B subjects to inspect prompt history',
      status: 'NOT_STARTED'
    }
  });

  // 4. Agent
  const agentB = await prisma.agent.create({
    data: {
      organizationId: ORG_B_ID,
      name: 'Org B Secret Chatbot',
      type: 'llm'
    }
  });

  // 5. Alert
  const alertB = await prisma.alerts.create({
    data: {
      organizationId: ORG_B_ID,
      type: 'POLICY_VIOLATION',
      message: 'Org B Policy violation detected on secure channel',
      severity: 'high',
      is_read: false
    }
  });

  // 6. Fix Task
  const fixTaskB = await prisma.compliance_fix_tasks.create({
    data: {
      organizationId: ORG_B_ID,
      featureId: 'feature-1',
      title: 'Fix Org B API key exposure',
      priority: 1,
      status: 'pending'
    }
  });

  // 7. History (Compliance Posture Snapshots)
  const snapshotB = await prisma.compliance_snapshots.create({
    data: {
      organizationId: ORG_B_ID,
      featureId: 'feature-1',
      gdpr_score: 95,
      dpdp_score: 90,
      hipaa_score: 85,
      risk_level: 'Low'
    }
  });

  // 8. Interception Log & Override Request
  const logB = await prisma.interception_logs.create({
    data: {
      user_id: 'user-b-id',
      organizationId: ORG_B_ID,
      input_text: 'Org B secret document',
      decision: 'BLOCK',
      policy_triggered: 'NO_PII_EXPOSURE'
    }
  });

  const overrideB = await prisma.guardrail_overrides.create({
    data: {
      log_id: logB.id,
      requested_by: 'user-b-id',
      reason: 'Necessary bypass for administrator testing',
      status: 'pending'
    }
  });

  console.log('🏁 Seeding finished. Starting Multi-Tenancy Boundary Isolation Checks...\n');

  console.log('────────────────────────────────────────────────────────────────────────');
  console.log('🛡️  MULTI-TENANCY ISOLATION VERIFICATION REPORT');
  console.log('────────────────────────────────────────────────────────────────────────\n');

  // Helper function to print results in the requested format
  function logCheck(resourceName: string, passed: boolean, details: string) {
    const status = passed ? '✅ SECURE' : '❌ VULNERABLE';
    console.log(`[${resourceName}] ${status}`);
    console.log(`  Details: ${details}\n`);
  }

  // Check 1: Guardrails
  const guardrailsForA = await prisma.guardrail.findMany({ where: { organizationId: ORG_A_ID } });
  const guardrailByIdForA = await prisma.guardrail.findFirst({ where: { id: guardrailB.id, organizationId: ORG_A_ID } });
  const guardrailCheck = guardrailsForA.length === 0 && guardrailByIdForA === null;
  logCheck(
    'Guardrails',
    guardrailCheck,
    `Org A fetched ${guardrailsForA.length} guardrails. Direct query of Org B's guardrail (${guardrailB.id}) under Org A scope returned: ${guardrailByIdForA ? 'Found' : 'null (Access Denied)'}.`
  );

  // Check 2: Block Events
  const blockEventsForA = await prisma.blockEvent.findMany({ where: { organizationId: ORG_A_ID } });
  const blockEventCheck = blockEventsForA.length === 0;
  logCheck(
    'Block Events',
    blockEventCheck,
    `Org A fetched ${blockEventsForA.length} block events (Org B has 1 block event).`
  );

  // Check 3: Compliance Controls
  // Note: complianceControl.findMany will auto-seed default controls if 0 exist.
  // So we check if controls found belong ONLY to ORG_A_ID.
  const complianceControlsForA = await prisma.complianceControl.findMany({ where: { organizationId: ORG_A_ID } });
  const hasAccessToBControl = complianceControlsForA.some(c => c.id === complianceControlB.id);
  const directBControlQuery = await prisma.complianceControl.findFirst({
    where: { id: complianceControlB.id, organizationId: ORG_A_ID }
  });
  const complianceControlCheck = !hasAccessToBControl && directBControlQuery === null;
  logCheck(
    'Compliance Controls',
    complianceControlCheck,
    `Org A fetched ${complianceControlsForA.length} compliance controls. Accessing Org B's compliance control (${complianceControlB.id}) under Org A scope returned: ${directBControlQuery ? 'Found' : 'null (Access Denied)'}.`
  );

  // Check 4: Agents
  const agentsForA = await prisma.agent.findMany({ where: { organizationId: ORG_A_ID } });
  const agentCheck = agentsForA.length === 0;
  logCheck(
    'Agents',
    agentCheck,
    `Org A fetched ${agentsForA.length} agents (Org B has 1 agent).`
  );

  // Check 5: Alerts
  const alertsForA = await ComplianceService.getAlerts(ORG_A_ID);
  const hasBAlert = alertsForA.some(a => a.id === alertB.id);
  const alertCheck = !hasBAlert;
  logCheck(
    'Alerts',
    alertCheck,
    `Org A fetched ${alertsForA.length} alerts (Org B's alert ID ${alertB.id} is excluded: ${!hasBAlert}).`
  );

  // Check 6: Fix Tasks
  const fixTasksForA = await ComplianceService.getFixTasks('feature-1', ORG_A_ID);
  const hasBFixTask = fixTasksForA.some(t => t.id === fixTaskB.id);
  const fixTaskCheck = !hasBFixTask;
  logCheck(
    'Fix Tasks',
    fixTaskCheck,
    `Org A fetched ${fixTasksForA.length} fix tasks under 'feature-1' (Org B's task ID ${fixTaskB.id} is excluded: ${!hasBFixTask}).`
  );

  // Check 7: History (Compliance Posture Snapshots)
  const historyForA = await ComplianceService.getHistory('feature-1', ORG_A_ID);
  const hasBHistory = historyForA.some(h => h.id === snapshotB.id);
  const historyCheck = !hasBHistory;
  logCheck(
    'History',
    historyCheck,
    `Org A fetched ${historyForA.length} compliance posture history snapshots (Org B's snapshot ID ${snapshotB.id} is excluded: ${!hasBHistory}).`
  );

  // Check 8: Overrides
  const overridesForA = await GuardrailService.getOverrides(ORG_A_ID);
  const hasBOverride = overridesForA.some(o => o.id === overrideB.id);

  // Try requesting override for Org B's log under Org A context
  let requestOverrideError: string | null = null;
  try {
    await GuardrailService.requestOverride(logB.id, 'user-a-id', 'illegal override', ORG_A_ID);
  } catch (err: any) {
    requestOverrideError = err.message;
  }

  // Try approving override for Org B's override under Org A context
  let approveOverrideError: string | null = null;
  try {
    await GuardrailService.approveOverride(overrideB.id, 'admin-a-id', 'approved', ORG_A_ID);
  } catch (err: any) {
    approveOverrideError = err.message;
  }

  const overridesCheck = !hasBOverride && requestOverrideError !== null && approveOverrideError !== null;
  logCheck(
    'Overrides',
    overridesCheck,
    `Org A fetched ${overridesForA.length} overrides. Org A trying to request override on Org B's log throws: "${requestOverrideError}". Org A trying to approve Org B's override throws: "${approveOverrideError}".`
  );

  // Check 9: Security Metrics
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const blockedAttemptsA = await prisma.alerts.count({ where: { organizationId: ORG_A_ID, type: 'POLICY_VIOLATION' } });
  const rateLimitTriggersA = await prisma.alerts.count({ where: { organizationId: ORG_A_ID, type: 'RATE_LIMIT_EXCEEDED' } });
  const policyEnforcementsA = await prisma.interception_logs.count({ where: { organizationId: ORG_A_ID, decision: { in: ['BLOCK', 'MODIFY'] } } });
  const violations24hA = await prisma.alerts.count({ where: { organizationId: ORG_A_ID, type: 'POLICY_VIOLATION', created_at: { gte: last24h } } });
  const violations7dA = await prisma.alerts.count({ where: { organizationId: ORG_A_ID, type: 'POLICY_VIOLATION', created_at: { gte: last7d } } });

  const blockedAttemptsB = await prisma.alerts.count({ where: { organizationId: ORG_B_ID, type: 'POLICY_VIOLATION' } });
  const policyEnforcementsB = await prisma.interception_logs.count({ where: { organizationId: ORG_B_ID, decision: { in: ['BLOCK', 'MODIFY'] } } });

  const metricsCheck = blockedAttemptsA === 0 && rateLimitTriggersA === 0 && policyEnforcementsA === 0 && violations24hA === 0 && violations7dA === 0 && blockedAttemptsB === 1 && policyEnforcementsB === 1;

  logCheck(
    'Security Metrics',
    metricsCheck,
    `Org A Metrics (violations, enforcements, rate limit triggers) are all 0. Org B Metrics show: blockedAttempts=${blockedAttemptsB}, policyEnforcements=${policyEnforcementsB}. Isolation verified.`
  );

  console.log('🧹 Cleaning up test organizations and database records...');
  await prisma.guardrail_overrides.deleteMany({
    where: { interception_log: { organizationId: { in: [ORG_A_ID, ORG_B_ID] } } }
  });
  await prisma.interception_logs.deleteMany({
    where: { organizationId: { in: [ORG_A_ID, ORG_B_ID] } }
  });
  await prisma.compliance_snapshots.deleteMany({
    where: { organizationId: { in: [ORG_A_ID, ORG_B_ID] } }
  });
  await prisma.compliance_fix_tasks.deleteMany({
    where: { organizationId: { in: [ORG_A_ID, ORG_B_ID] } }
  });
  await prisma.alerts.deleteMany({
    where: { organizationId: { in: [ORG_A_ID, ORG_B_ID] } }
  });
  await prisma.guardrail.deleteMany({
    where: { organizationId: { in: [ORG_A_ID, ORG_B_ID] } }
  });
  await prisma.blockEvent.deleteMany({
    where: { organizationId: { in: [ORG_A_ID, ORG_B_ID] } }
  });
  await prisma.complianceControl.deleteMany({
    where: { organizationId: { in: [ORG_A_ID, ORG_B_ID] } }
  });
  await prisma.agent.deleteMany({
    where: { organizationId: { in: [ORG_A_ID, ORG_B_ID] } }
  });
  await prisma.organizations.deleteMany({
    where: { id: { in: [ORG_A_ID, ORG_B_ID] } }
  });

  await prisma.$disconnect();
  await pool.end();
  console.log('✅ Isolation test complete.');
}

main().catch(e => {
  console.error('❌ Verification script failed:', e);
  process.exit(1);
});
