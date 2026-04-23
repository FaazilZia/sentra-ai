import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log('Fixing password_hash column...');
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;');
    console.log('Success: password_hash is now nullable.');
  } catch (err) {
    console.error('Error fixing column:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
