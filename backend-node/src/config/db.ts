import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
const isSqlite = databaseUrl.startsWith('file:');

let prisma: PrismaClient;

// We use dynamic imports to avoid initializing incompatible adapters
// specifically for Prisma 7 requirements
async function initializePrisma() {
  if (isSqlite) {
    const { PrismaBetterSqlite3 } = await import('@prisma/adapter-better-sqlite3');
    const adapter = new PrismaBetterSqlite3({ url: 'dev.db' });
    prisma = new PrismaClient({ adapter });
  } else {
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  }
}

// Since top-level await is tricky in CommonJS/some TS configs, 
// we'll export a proxy or a lazy-loader. 
// For this MVP, we'll just initialize it on first use or use a global.

const proxy = new Proxy({} as PrismaClient, {
  get: (target, prop) => {
    if (!prisma) {
      throw new Error("Prisma not initialized. Call await initializePrisma() or ensure it's ready.");
    }
    return (prisma as any)[prop];
  }
});

export { initializePrisma, prisma as prismaRaw };
export default proxy;
