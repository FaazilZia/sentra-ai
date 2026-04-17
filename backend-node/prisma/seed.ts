import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import Database from 'better-sqlite3';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
const isSqlite = databaseUrl.startsWith('file:');

let prisma: PrismaClient;

if (isSqlite) {
  const adapter = new PrismaBetterSqlite3({ url: 'dev.db' });
  prisma = new PrismaClient({ adapter });
} else {
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
}

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000002';

async function main() {
  console.log(`🌱 Seeding database (${isSqlite ? 'SQLite' : 'PostgreSQL'})...`);

  // 1. Ensure default tenant
  const tenant = await prisma.tenants.upsert({
    where: { id: DEFAULT_TENANT_ID },
    update: {},
    create: {
      id: DEFAULT_TENANT_ID,
      name: 'Sentra AI',
      slug: 'sentra-ai',
      is_active: true,
    },
  });
  console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`);

  // 2. Ensure admin user
  const passwordHash = await bcrypt.hash('Sentra@Admin123', 10);
  const user = await prisma.users.upsert({
    where: { email: 'admin@sentra.ai' },
    update: {
      password_hash: passwordHash,
    },
    create: {
      id: ADMIN_USER_ID,
      email: 'admin@sentra.ai',
      full_name: 'Sentra Admin',
      password_hash: passwordHash,
      role: 'ADMIN',
      is_active: true,
      tenant_id: DEFAULT_TENANT_ID,
    },
  });
  console.log(`✅ Admin user: ${user.email}`);

  // 3. AI Governance Policies
  console.log('🤖 Seeding AI Governance Policies...');
  const policies = [
    {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'finance-bot',
      description: 'Controls actions for the Finance AI Agent',
      enabled: true,
      priority: 1,
      effect: 'deny',
      status: 'published',
      current_version: 1,
      scope: { agent: 'finance-bot' },
      conditions: {
        allowed_actions: ['read_data', 'analyze_budget'],
        blocked_actions: ['send_email', 'external_api', 'delete_record']
      },
      obligations: {},
      tenant_id: DEFAULT_TENANT_ID
    },
    {
      id: '00000000-0000-0000-0000-000000000004',
      name: 'support-bot',
      description: 'Controls actions for the Customer Support AI Agent',
      enabled: true,
      priority: 2,
      effect: 'deny',
      status: 'published',
      current_version: 1,
      scope: { agent: 'support-bot' },
      conditions: {
        allowed_actions: ['read_faq', 'create_ticket', 'send_email'],
        blocked_actions: ['external_api', 'read_pii']
      },
      obligations: {},
      tenant_id: DEFAULT_TENANT_ID
    }
  ];

  for (const p of policies) {
    await prisma.policies.upsert({
      where: { id: p.id },
      update: p as any,
      create: p as any
    });
  }
  console.log(`✅ ${policies.length} AI Policies seeded`);

  // 4. API Key for SDK Demo
  console.log('🔑 Seeding Demo API Key...');
  const demoApiKey = 'sentra_demo_secretkey123';
  const hashedApiKey = await bcrypt.hash(demoApiKey, 10);
  await prisma.api_keys.upsert({
    where: { id: '00000000-0000-0000-0000-000000000005' },
    update: {
      key_hash: hashedApiKey,
    },
    create: {
      id: '00000000-0000-0000-0000-000000000005',
      tenant_id: DEFAULT_TENANT_ID,
      name: 'SDK Testing Key',
      key_prefix: 'demo',
      key_hash: hashedApiKey,
      key_type: 'service',
      is_active: true,
    },
  });
  console.log('✅ Demo API Key: sentra_demo_secretkey123 (Prefix: demo)');

  console.log('\n🎉 Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
