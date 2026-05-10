import { initializePrisma } from '../config/db';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const prisma = await initializePrisma();
  console.log('🚀 Starting Production Database Hardening...');

  const orgId = '00000000-0000-0000-0000-000000000001';

  // 1. Clean up dependencies first (Strict Order for Foreign Keys)
  console.log('Cleaning up all legacy data...');
  try {
    await prisma.policy_versions.deleteMany();
    await prisma.incidents.deleteMany();
    await prisma.interception_logs.deleteMany();
    await prisma.logs.deleteMany();
    await prisma.audit_logs.deleteMany();
    await prisma.policies.deleteMany();
    console.log('✅ Legacy data purged.');
  } catch (err: any) {
    console.warn('⚠️ Some deletions failed (likely already empty or circular):', err.message);
  }

  // 2. Seed Standard Hardened Policies
  console.log('Seeding hardened production policies...');
  const policies = [
    {
      id: '00000000-0000-0000-0000-000000000003',
      organizationId: orgId,
      name: 'finance-bot',
      description: 'Controls financial data exports and PII access for finance agents.',
      explanation: 'Ensures SOC2 and GDPR compliance by blocking unauthorized financial exports.',
      compliance: ['GDPR', 'SOC2'],
      impact: 'High',
      enabled: true,
      priority: 1,
      effect: 'deny',
      status: 'published',
      current_version: 1,
      scope: { agent: 'finance-bot' },
      conditions: { blocked_actions: ['export_data', 'read_pii'] },
      obligations: {}
    },
    {
      id: '00000000-0000-0000-0000-000000000004',
      organizationId: orgId,
      name: 'support-bot',
      description: 'Customer support access limits to prevent PII exposure.',
      explanation: 'Prevents support agents from accessing customer PII or external APIs.',
      compliance: ['GDPR', 'HIPAA'],
      impact: 'Medium',
      enabled: true,
      priority: 2,
      effect: 'deny',
      status: 'published',
      current_version: 1,
      scope: { agent: 'support-bot' },
      conditions: { blocked_actions: ['external_api', 'read_pii'] },
      obligations: {}
    },
    {
      id: '00000000-0000-0000-0000-000000000005',
      organizationId: orgId,
      name: 'Global PII Protection Guard',
      description: 'Universal block for sensitive data across all agents.',
      explanation: 'Cross-agent guardrail to prevent any credential or PII leakage.',
      compliance: ['GDPR', 'HIPAA', 'PCI-DSS'],
      impact: 'Critical',
      enabled: true,
      priority: 3,
      effect: 'deny',
      status: 'published',
      current_version: 1,
      scope: {},
      conditions: { blocked_actions: ['read_pii', 'export_passwords', 'read_credentials'] },
      obligations: {}
    },
    {
      id: '00000000-0000-0000-0000-000000000006',
      organizationId: orgId,
      name: 'Real-time Threat Interceptor',
      description: 'Blocks prompt injections and simulated audit attacks.',
      explanation: 'Active security layer to neutralize malicious intent strings.',
      compliance: ['SOC2', 'ISO27001'],
      impact: 'Critical',
      enabled: true,
      priority: 4,
      effect: 'deny',
      status: 'published',
      current_version: 1,
      scope: {},
      conditions: { blocked_actions: ['SIMULATED_AUDIT_ATTACK', 'PROMPT_INJECTION_DETECTED'] },
      obligations: {}
    }
  ];

  for (const policy of policies) {
    await prisma.policies.create({
      data: policy as any
    });
  }

  // 3. Verify Users
  const admin = await prisma.users.findUnique({
    where: { email: 'admin@sentra.ai' }
  });
  if (!admin) {
    console.warn('⚠️ Admin user missing! Please ensure admin@sentra.ai is created.');
  } else {
    console.log('✅ Admin user verified: admin@sentra.ai');
  }

  console.log('✨ Production Database Hardening Complete.');
}

main()
  .catch((e) => {
    console.error('❌ Hardening Failed:', e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
