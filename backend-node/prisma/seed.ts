/**
 * Sentra AI — Database Seed Script
 * Creates the default tenant and admin user if they don't exist.
 * Run: npx ts-node src/prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000002';

async function main() {
  console.log('🌱 Seeding database...');

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

  console.log('\n🎉 Seed completed!');
  console.log('   Login: admin@sentra.ai');
  console.log('   Password: Sentra@Admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
