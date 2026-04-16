import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import Database from 'better-sqlite3';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
const isSqlite = databaseUrl.startsWith('file:');

let prisma: PrismaClient;

if (isSqlite) {
  // Local Development with SQLite
  const adapter = new PrismaBetterSqlite3({ url: 'dev.db' });
  prisma = new PrismaClient({ adapter });
} else {
  // Production with PostgreSQL (Supabase)
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
}

export default prisma;
