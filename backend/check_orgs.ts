import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organizations.findMany({ take: 5 });
  console.log('Organizations:', JSON.stringify(orgs, null, 2));
  
  const incidents = await prisma.incidents.findMany({ take: 5 });
  console.log('Incidents:', JSON.stringify(incidents, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
