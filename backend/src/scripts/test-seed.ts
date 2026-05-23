import 'dotenv/config';
import prisma, { initializePrisma } from '../config/db';
import { seedOrganizationGovernance } from '../services/governanceSeed.service';
import { randomUUID } from 'crypto';

async function main() {
  await initializePrisma();
  console.log('Testing seedOrganizationGovernance...');

  const orgId = randomUUID();
  try {
    await prisma.$transaction(async (tx) => {
      console.log('Creating organization:', orgId);
      await tx.organizations.create({
        data: {
          id: orgId,
          name: 'Seed Test Org',
          slug: 'seed-test-' + Date.now(),
          is_active: true,
          plan: 'free',
        },
      });

      console.log('Running seeder for organization...');
      await seedOrganizationGovernance(orgId, tx);
      console.log('Seeder ran successfully!');
    }, { timeout: 35000 });
    console.log('Transaction COMMITTED!');
  } catch (err: any) {
    console.error('Seeding failed with error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
