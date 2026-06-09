import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import { seedOrganizationGovernance } from '../src/services/governanceSeed.service';
import { seedEuAiActControls } from '../src/services/euAiActSeed.service';
import { seedNistAiRmf } from '../src/services/nistAiRmfSeed.service';
import { seedIso42001 } from '../src/services/iso42001Seed.service';
import { seedIso27001 } from '../src/services/iso27001Seed.service';
import { seedCcpa } from '../src/services/ccpaSeed.service';
import { seedDora } from '../src/services/doraSeed.service';
import { seedOecd } from '../src/services/oecdSeed.service';
import { seedFtc } from '../src/services/ftcSeed.service';
import { seedGdpr } from '../src/services/gdprSeed.service';
import { seedHipaa } from '../src/services/hipaaSeed.service';
import { seedSoc2 } from '../src/services/soc2Seed.service';
import { seedPci } from '../src/services/pciSeed.service';
import { seedDpdp } from '../src/services/dpdpSeed.service';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
const isSqlite = databaseUrl.startsWith('file:');

async function getPrisma() {
  if (isSqlite) {
    const { PrismaBetterSqlite3 } = await import('@prisma/adapter-better-sqlite3');
    const adapter = new PrismaBetterSqlite3({ url: 'dev.db' });
    return new PrismaClient({ adapter });
  } else {
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }
}

const DEFAULT_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001';
const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000002';

async function main() {
  console.log(`🌱 Seeding database (${isSqlite ? 'SQLite' : 'PostgreSQL'})...`);
  const prisma = await getPrisma();

  // 1. Ensure default company
  const company = await prisma.organizations.upsert({
    where: { id: DEFAULT_ORGANIZATION_ID },
    update: {},
    create: {
      id: DEFAULT_ORGANIZATION_ID,
      name: 'Sentra AI',
      slug: 'sentra-ai',
      is_active: true,
    },
  });
  console.log(`✅ Company: ${company.name} (${company.id})`);

  // 2. Ensure admin user
  const seedPassword = process.env.SEED_ADMIN_PASSWORD || `SentraAuto_${randomUUID().slice(0, 12)}`;
  const passwordHash = await bcrypt.hash(seedPassword, 12);
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
      organizationId: DEFAULT_ORGANIZATION_ID,
    },
  });
  console.log(`✅ Admin user: ${user.email} (password ${process.env.SEED_ADMIN_PASSWORD ? 'from env' : 'auto-generated — set SEED_ADMIN_PASSWORD to control'})`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log(`   Generated password: ${seedPassword}`);
  }

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
      organizationId: DEFAULT_ORGANIZATION_ID
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
      organizationId: DEFAULT_ORGANIZATION_ID
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
  const demoApiKey = process.env.SEED_DEMO_API_KEY || `sentra_demo_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const hashedApiKey = await bcrypt.hash(demoApiKey, 12);
  await prisma.api_keys.upsert({
    where: { id: '00000000-0000-0000-0000-000000000005' },
    update: {
      key_hash: hashedApiKey,
    },
    create: {
      id: '00000000-0000-0000-0000-000000000005',
      organizationId: DEFAULT_ORGANIZATION_ID,
      name: 'SDK Testing Key',
      key_prefix: 'demo',
      key_hash: hashedApiKey,
      key_type: 'service',
      is_active: true,
    },
  });
  console.log(`✅ Demo API Key seeded (Prefix: demo, source: ${process.env.SEED_DEMO_API_KEY ? 'env' : 'auto-generated'})`);
  if (!process.env.SEED_DEMO_API_KEY) {
    console.log(`   Generated API Key: ${demoApiKey}`);
  }

  // 5. Seed baseline controls & obligations for all companies
  console.log('🌱 Seeding baseline controls and obligations for all organizations...');
  const allCompanies = await prisma.organizations.findMany();
  for (const c of allCompanies) {
    try {
      await seedOrganizationGovernance(c.id, prisma);
      console.log(`   Seeded governance frameworks for org: ${c.name} (${c.id})`);
    } catch (e: any) {
      console.error(`   Failed to seed governance frameworks for org ${c.name}:`, e.message);
    }
  }

  // 6. Seed EU AI Act Controls
  console.log('🇪🇺 Seeding EU AI Act Controls...');
  try {
    await seedEuAiActControls(prisma);
  } catch (e: any) {
    console.error('❌ Failed to seed EU AI Act Controls:', e.message);
  }

  // 7. Seed NIST AI RMF 1.0 Controls
  console.log('🇺🇸 Seeding NIST AI RMF 1.0 Controls...');
  try {
    await seedNistAiRmf(prisma);
  } catch (e: any) {
    console.error('❌ Failed to seed NIST AI RMF 1.0 Controls:', e.message);
  }

  // 8. Seed ISO 42001 Controls
  console.log('🌐 Seeding ISO 42001 Controls...');
  try {
    await seedIso42001(prisma);
  } catch (e: any) {
    console.error('❌ Failed to seed ISO 42001 Controls:', e.message);
  }

  // 9. Seed ISO 27001 Controls
  console.log('🔒 Seeding ISO 27001 Controls...');
  try {
    await seedIso27001(prisma);
  } catch (e: any) {
    console.error('❌ Failed to seed ISO 27001 Controls:', e.message);
  }

  // 10. Seed CCPA Controls
  console.log('🐻 Seeding CCPA Controls...');
  try {
    await seedCcpa(prisma);
  } catch (e: any) {
    console.error('❌ Failed to seed CCPA Controls:', e.message);
  }

  // 11. Seed DORA
  console.log('🌍 Seeding DORA Controls...');
  try { await seedDora(prisma); } catch (e: any) { console.error('❌ Failed to seed DORA:', e.message); }

  // 12. Seed OECD
  console.log('🌐 Seeding OECD AI Principles...');
  try { await seedOecd(prisma); } catch (e: any) { console.error('❌ Failed to seed OECD:', e.message); }

  // 13. Seed FTC
  console.log('⚖️ Seeding FTC AI Guidelines...');
  try { await seedFtc(prisma); } catch (e: any) { console.error('❌ Failed to seed FTC:', e.message); }

  // 14. Seed GDPR
  console.log('🇪🇺 Seeding GDPR Controls...');
  try { await seedGdpr(DEFAULT_ORGANIZATION_ID, prisma); } catch (e: any) { console.error('❌ Failed to seed GDPR:', e.message); }

  // 15. Seed HIPAA
  console.log('🏥 Seeding HIPAA Controls...');
  try { await seedHipaa(DEFAULT_ORGANIZATION_ID, prisma); } catch (e: any) { console.error('❌ Failed to seed HIPAA:', e.message); }

  // 16. Seed SOC2
  console.log('🔐 Seeding SOC2 Controls...');
  try { await seedSoc2(DEFAULT_ORGANIZATION_ID, prisma); } catch (e: any) { console.error('❌ Failed to seed SOC2:', e.message); }

  // 17. Seed PCI-DSS
  console.log('💳 Seeding PCI-DSS Controls...');
  try { await seedPci(DEFAULT_ORGANIZATION_ID, prisma); } catch (e: any) { console.error('❌ Failed to seed PCI:', e.message); }

  // 18. Seed DPDP
  console.log('🇮🇳 Seeding DPDP Controls...');
  try { await seedDpdp(DEFAULT_ORGANIZATION_ID, prisma); } catch (e: any) { console.error('❌ Failed to seed DPDP:', e.message); }

  console.log('\n🎉 Seed completed!');
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  });
