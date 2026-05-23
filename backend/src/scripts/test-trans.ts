import 'dotenv/config';
import prisma, { initializePrisma } from '../config/db';
import { randomUUID } from 'crypto';

async function main() {
  await initializePrisma();
  console.log('Testing interactive transaction...');

  try {
    await prisma.$transaction(async (tx) => {
      const orgId = randomUUID();
      console.log('Creating organization with ID:', orgId);
      const createdOrg = await tx.organizations.create({
        data: {
          id: orgId,
          name: 'Transaction Test Org',
          slug: 'tx-test-' + Date.now(),
          is_active: true,
          plan: 'free',
        },
      });
      console.log('Created org:', createdOrg.id);

      console.log('Creating control linked to org...');
      const dbCtrl = await tx.controls.create({
        data: {
          id: randomUUID(),
          organizationId: createdOrg.id,
          framework: 'NIST_AI_RMF',
          control_id: 'TEST-CTRL-1',
          title: 'Test Control',
          description: 'Testing transaction referential integrity',
          category: 'GOVERN',
        },
      });
      console.log('Created control:', dbCtrl.id);
    });
    console.log('Transaction succeeded!');
  } catch (err: any) {
    console.error('Transaction failed with error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
