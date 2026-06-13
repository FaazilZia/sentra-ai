import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  console.log('🔄 Connecting to Database...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL!, max: 5 });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  console.log(`🏢 Checking if Default Org (${DEFAULT_ORG_ID}) exists...`);
  const org = await prisma.organizations.findUnique({
    where: { id: DEFAULT_ORG_ID }
  });

  if (org) {
    console.log(`✅ Default Org already exists: "${org.name}"`);
  } else {
    console.log(`➕ Default Org not found. Creating it...`);
    const newOrg = await prisma.organizations.create({
      data: {
        id: DEFAULT_ORG_ID,
        name: 'Sentra AI Default',
        slug: 'sentra-ai-default',
        is_active: true,
      }
    });
    console.log(`✅ Created Default Org: "${newOrg.name}"`);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => {
  console.error('❌ Failed:', e.message);
  process.exit(1);
});
