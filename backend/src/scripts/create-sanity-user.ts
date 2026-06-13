import 'dotenv/config';
import { initializePrisma } from '../config/db';
import prisma from '../config/db';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

async function run() {
  console.log('🔄 Initializing Prisma client...');
  await initializePrisma();

  const email = 'sanitycheck_user_2@example.com';
  const passwordHash = await bcrypt.hash('TestPass123!', 12);
  const orgId = randomUUID();
  const userId = randomUUID();

  console.log('🧹 Cleaning up old user...');
  await prisma.users.deleteMany({ where: { email } });
  await prisma.organizations.deleteMany({ where: { slug: 'sanity-walkthrough-org' } });

  console.log('🏢 Creating organization...');
  await prisma.organizations.create({
    data: {
      id: orgId,
      name: 'Sanity Walkthrough Org',
      slug: 'sanity-walkthrough-org',
      is_active: true
    }
  });

  console.log('👤 Creating user...');
  await prisma.users.create({
    data: {
      id: userId,
      email,
      password_hash: passwordHash,
      full_name: 'Sanity User',
      role: 'ADMIN',
      is_active: true,
      organizationId: orgId,
      email_verified: true
    }
  });

  console.log('✅ Created sanity check user successfully:', email);
}

run()
  .catch(err => {
    console.error('❌ Failed to create sanity check user:', err);
    process.exit(1);
  })
  .finally(async () => {
    // We don't call $disconnect directly because database connections are managed by the adapter pool.
    process.exit(0);
  });
