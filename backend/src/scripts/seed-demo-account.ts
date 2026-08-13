/**
 * ==============================================================================
 * SENTRA AI — DEMO ACCOUNT SEED SCRIPT
 * ==============================================================================
 * 
 * Creates a standalone demo/test organization, admin user, governance policies,
 * and API key specifically for live SDK testing and dashboard showcases.
 * 
 * ENVIRONMENT VARIABLES REQUIRED:
 * ------------------------------------------------------------------------------
 * DEMO_ACCOUNT_EMAIL    : Required. Email address for the demo admin user.
 * DEMO_ACCOUNT_PASSWORD : Required. Password for the demo admin user.
 * DEMO_ORG_NAME         : Optional. Organization name (default: "Sentraa Demo Org").
 * DEMO_ORG_SLUG         : Optional. Organization slug (default: "sentraa-demo-org").
 * 
 * HOW TO RUN THIS SCRIPT:
 * ------------------------------------------------------------------------------
 * cd backend
 * DEMO_ACCOUNT_EMAIL="demo.admin@sentra.ai" \
 * DEMO_ACCOUNT_PASSWORD="DemoAdminSecurePassword123!" \
 * npx ts-node src/scripts/seed-demo-account.ts
 * 
 * OR via npm script:
 * npm run seed:demo
 * ==============================================================================
 */

import 'dotenv/config';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../config/db';
import { seedOrganizationGovernance } from '../services/governanceSeed.service';

const DEMO_ORG_NAME = process.env.DEMO_ORG_NAME || 'Sentraa Demo Org';
const DEMO_ORG_SLUG = process.env.DEMO_ORG_SLUG || 'sentraa-demo-org';

async function seedDemoAccount() {
  const email = process.env.DEMO_ACCOUNT_EMAIL;
  const password = process.env.DEMO_ACCOUNT_PASSWORD;

  console.log('\n============================================================');
  console.log('  SENTRA AI — DEMO ACCOUNT & ORGANIZATIONAL SEED');
  console.log('============================================================\n');

  if (!email || !password) {
    console.error('❌ ERROR: Missing required environment variables.\n');
    console.error('Please specify both DEMO_ACCOUNT_EMAIL and DEMO_ACCOUNT_PASSWORD.\n');
    console.error('Example command:');
    console.error(
      '  DEMO_ACCOUNT_EMAIL="demo@sentra.ai" DEMO_ACCOUNT_PASSWORD="SecurePass123!" npx ts-node src/scripts/seed-demo-account.ts\n'
    );
    process.exit(1);
  }

  // 1. Check Idempotency — see if demo organization already exists
  const existingOrg = await prisma.organizations.findFirst({
    where: {
      OR: [
        { slug: DEMO_ORG_SLUG },
        { name: DEMO_ORG_NAME }
      ]
    },
    include: {
      users: { where: { email } },
      api_keys: { where: { is_active: true } }
    }
  });

  if (existingOrg) {
    console.log(`ℹ️ [IDEMPOTENT] Demo organization "${existingOrg.name}" already exists.`);
    console.log(`   Org ID   : ${existingOrg.id}`);
    console.log(`   Org Slug : ${existingOrg.slug}`);
    
    if (existingOrg.users.length > 0) {
      console.log(`   User     : ${existingOrg.users[0].email} (Existing User ID: ${existingOrg.users[0].id})`);
    } else {
      console.log(`   User     : ${email} (Creating user for existing org...)`);
    }

    // If org exists but user doesn't, create user
    if (existingOrg.users.length === 0) {
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await prisma.users.create({
        data: {
          organizationId: existingOrg.id,
          email,
          full_name: 'Demo Administrator',
          password_hash: passwordHash,
          role: 'ADMIN',
          is_active: true,
          email_verified: true,
        }
      });
      console.log(`   ✅ Created missing user: ${user.email}`);
    }

    console.log('\n============================================================');
    console.log('  EXISTING DEMO ACCOUNT CONFIRMED — NO DUPLICATES CREATED');
    console.log('============================================================');
    console.log(`Organization Name : ${existingOrg.name}`);
    console.log(`Login Email       : ${email}`);
    console.log(`User Role         : ADMIN`);
    if (existingOrg.apiKey) {
      console.log(`API Key (Org)     : ${existingOrg.apiKey}`);
    } else if (existingOrg.api_keys.length > 0) {
      console.log(`API Key Prefix    : ${existingOrg.api_keys[0].key_prefix}...`);
    }
    console.log('============================================================\n');
    return;
  }

  // 2. Create Standalone Demo Organization
  console.log(`[ 1/4 ] Creating demo organization: "${DEMO_ORG_NAME}"...`);
  const org = await prisma.organizations.create({
    data: {
      name: DEMO_ORG_NAME,
      slug: DEMO_ORG_SLUG,
      is_active: true,
      plan: 'enterprise',
      aidrEnforcementMode: 'BLOCK',
      data_region: 'US',
    }
  });
  console.log(`  ✅ Organization created: ID ${org.id}`);

  // 3. Seed Governance Baseline Rules for Demo Org
  console.log('[ 2/4 ] Seeding governance rules & baseline policy for demo org...');
  try {
    await seedOrganizationGovernance(org.id, prisma as any);
    console.log('  ✅ Governance rules & default policies successfully seeded.');
  } catch (err: any) {
    console.warn('  ⚠️ Governance seeding warning:', err.message || err);
  }

  // 4. Create Demo Admin User
  console.log(`[ 3/4 ] Creating demo admin user (${email})...`);
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.users.create({
    data: {
      organizationId: org.id,
      email,
      full_name: 'Demo Administrator',
      password_hash: passwordHash,
      role: 'ADMIN',
      is_active: true,
      email_verified: true,
    }
  });
  console.log(`  ✅ User created: ID ${user.id}`);

  // Link role in user_roles table if system ADMIN role exists
  try {
    const adminRole = await prisma.roles.findUnique({ where: { name: 'ADMIN' } });
    if (adminRole) {
      await prisma.user_roles.create({
        data: {
          user_id: user.id,
          role_id: adminRole.id,
          organizationId: org.id,
        }
      });
      console.log('  ✅ User linked to system ADMIN role.');
    }
  } catch (roleErr) {
    // Non-blocking if roles table isn't initialized yet
  }

  // 5. Generate Demo SDK API Key
  console.log('[ 4/4 ] Generating dedicated SDK API Key...');
  const prefix = crypto.randomBytes(4).toString('hex');
  const secret = crypto.randomBytes(24).toString('base64url');
  const fullApiKey = `sentra_${prefix}_${secret}`;
  const key_hash = await bcrypt.hash(fullApiKey, 10);

  const apiKeyRecord = await prisma.api_keys.create({
    data: {
      organizationId: org.id,
      name: 'Demo Live SDK Key',
      key_prefix: prefix,
      key_hash,
      key_type: 'service',
      is_active: true,
    }
  });

  // Also update organization.apiKey for legacy compatibility
  await prisma.organizations.update({
    where: { id: org.id },
    data: { apiKey: fullApiKey }
  });

  console.log('  ✅ API Key generated & hashed in database.');

  // 6. Print Summary
  console.log('\n============================================================');
  console.log('🎉 DEMO ACCOUNT SEEDED SUCCESSFULLY');
  console.log('============================================================');
  console.log(`Organization Name : ${org.name}`);
  console.log(`Organization Slug : ${org.slug}`);
  console.log(`Organization ID   : ${org.id}`);
  console.log(`Demo Admin Email  : ${user.email}`);
  console.log(`Demo Admin Role   : ${user.role}`);
  console.log('------------------------------------------------------------');
  console.log('🔑 DEMO API KEY — save this, shown once:');
  console.log(`   ${fullApiKey}`);
  console.log('============================================================\n');
}

seedDemoAccount()
  .catch((err) => {
    console.error('\n❌ Fatal error during demo account seeding:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
