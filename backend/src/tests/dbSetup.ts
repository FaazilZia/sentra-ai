import { execSync } from 'child_process';
import path from 'path';

export default async function dbSetup(): Promise<void> {
  console.log('\n[dbSetup] Starting Test Database Setup...');
  
  // 1. Point to DATABASE_URL_TEST env var or fall back to default PG test DB
  const testDbUrl = process.env.DATABASE_URL_TEST || 'postgresql://mohammadfaazilzia@localhost:5432/sentra_jest_test';
  
  // Set DATABASE_URL, DIRECT_URL, and TEST_DATABASE_URL to DATABASE_URL_TEST so migrations and prisma use the test DB
  process.env.DATABASE_URL = testDbUrl;
  process.env.DIRECT_URL = testDbUrl;
  process.env.TEST_DATABASE_URL = testDbUrl;

  console.log(`[dbSetup] Target Test Database: ${testDbUrl}`);

  // 2. Run prisma db push against the test DB
  try {
    console.log('[dbSetup] Synchronizing schema via Prisma db push on test database...');
    execSync('npx prisma db push --accept-data-loss', {
      cwd: path.resolve(__dirname, '../../'),
      env: { 
        ...process.env, 
        DATABASE_URL: process.env.DATABASE_URL_TEST || testDbUrl, 
        DIRECT_URL: process.env.DATABASE_URL_TEST || testDbUrl 
      },
      stdio: 'inherit'
    });
  } catch (err: any) {
    console.error('[dbSetup] ❌ Prisma db push failed:', err.message);
    throw err;
  }

  // 3. Seed minimal fixture data using existing prisma seed logic
  try {
    console.log('[dbSetup] Seeding fixture data on test database...');
    execSync('npx ts-node prisma/seed.ts', {
      cwd: path.resolve(__dirname, '../../'),
      env: { 
        ...process.env, 
        DATABASE_URL: process.env.DATABASE_URL_TEST || testDbUrl, 
        DIRECT_URL: process.env.DATABASE_URL_TEST || testDbUrl 
      },
      stdio: 'inherit'
    });
    console.log('[dbSetup] Test database setup complete! ✅\n');
  } catch (err: any) {
    console.error('[dbSetup] ❌ Seeding failed:', err.message);
    throw err;
  }
}
