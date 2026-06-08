import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { seedOrganizationGovernance } from '../services/governanceSeed.service';

const PROD_TEST_ORG_ID = '00000000-0000-0000-0000-000000000009';

async function main() {
  console.log('🔄 Connecting to Database...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL!, max: 5 });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  console.log('🏢 Creating Production Test Organization...');
  const org = await prisma.organizations.upsert({
    where: { id: PROD_TEST_ORG_ID },
    update: {},
    create: {
      id: PROD_TEST_ORG_ID,
      name: 'Sentra Production Test',
      slug: 'sentra-production-test',
      is_active: true,
    }
  });

  console.log('🌱 Seeding governance for Production Test Organization...');
  await seedOrganizationGovernance(PROD_TEST_ORG_ID, prisma as any);

  console.log('👤 Updating admin@sentra.ai to use the new organization...');
  const user = await prisma.users.update({
    where: { email: 'admin@sentra.ai' },
    data: {
      email_verified: true,
      organizationId: PROD_TEST_ORG_ID,
    },
  });

  console.log(`✅ admin@sentra.ai updated to org: ${PROD_TEST_ORG_ID}`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => {
  console.error('❌ Failed:', e.message);
  process.exit(1);
});
