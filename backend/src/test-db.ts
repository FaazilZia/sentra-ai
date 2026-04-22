import prisma from './config/db';

async function main() {
  console.log('🔍 Testing DB connection...');
  try {
    const companies = await prisma.organizations.findMany({ take: 1 });
    console.log('✅ Connection successful. Found companies:', companies.length);
  } catch (err) {
    console.error('❌ Connection failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
