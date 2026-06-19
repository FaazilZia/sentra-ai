import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const DEFAULT_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001';
const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000002';
const TARGET_PASSWORD = process.env.ADMIN_RESET_PASSWORD || (() => { throw new Error('ADMIN_RESET_PASSWORD env var is required'); })();

async function main() {
  console.log('🔄 Connecting to Database...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL!, max: 5 });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  console.log('🔑 Hashing password...');
  const passwordHash = await bcrypt.hash(TARGET_PASSWORD, 12);

  console.log('👤 Updating/Upserting administrator user...');
  const user = await prisma.users.upsert({
    where: { email: 'admin@sentra.ai' },
    update: {
      password_hash: passwordHash,
    },
    create: {
      id: ADMIN_USER_ID,
      email: 'admin@sentra.ai',
      full_name: 'Sentraa Admin',
      password_hash: passwordHash,
      role: 'ADMIN',
      is_active: true,
      organizationId: DEFAULT_ORGANIZATION_ID,
    },
  });

  console.log(`✅ Admin user password successfully set to: ${TARGET_PASSWORD}`);
  console.log(`   User Email: ${user.email}`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => {
  console.error('❌ Password reset failed:', e.message);
  process.exit(1);
});
