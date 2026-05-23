import 'dotenv/config';
import prisma, { initializePrisma } from '../config/db';

async function main() {
  await initializePrisma();
  const controlsCount = await prisma.controls.count();
  const obligationsCount = await prisma.compliance_obligations.count();
  const orgs = await prisma.organizations.findMany({ where: { is_active: true } });
  
  console.log('=== SEED DATA COUNTS ===');
  console.log('Active Organizations:', orgs.length);
  console.log('Controls Count:', controlsCount);
  console.log('Compliance Obligations Count:', obligationsCount);
  console.log('Expected Controls:', 17 * orgs.length);
  console.log('Expected Obligations:', 23 * orgs.length);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
