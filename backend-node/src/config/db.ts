import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';

const isSqlite = process.env.DATABASE_URL?.startsWith('file:');

let prisma: PrismaClient;

if (isSqlite) {
  const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
  prisma = new PrismaClient({ adapter });
} else {
  // Standard Postgres initialization
  prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
  });
}

export default prisma;
