import prisma from './config/db';

async function main() {
  console.log('🔍 Testing DB connection...');
  try {
    const tenants = await prisma.tenants.findMany({ take: 1 });
    console.log('✅ Connection successful. Found tenants:', tenants.length);
  } catch (err) {
    console.error('❌ Connection failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
