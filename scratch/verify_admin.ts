import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

async function main() {
  console.log('🔄 Connecting to Database...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL!, max: 5 });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  console.log('👤 Verifying admin@sentra.ai user email...');
  const user = await prisma.users.update({
    where: { email: 'admin@sentra.ai' },
    data: {
      email_verified: true,
    },
  });

  console.log(`✅ admin@sentra.ai email_verified set to true`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => {
  console.error('❌ Failed:', e.message);
  process.exit(1);
});
