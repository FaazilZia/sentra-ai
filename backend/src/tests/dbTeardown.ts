import { execSync } from 'child_process';
import path from 'path';

export default async function dbTeardown(): Promise<void> {
  console.log('\n[dbTeardown] Tearing down Test Database...');
  const testDbUrl = process.env.DATABASE_URL_TEST || 'postgresql://mohammadfaazilzia@localhost:5432/sentra_test';

  try {
    console.log('[dbTeardown] Running prisma migrate reset --force...');
    execSync('npx prisma migrate reset --force', {
      cwd: path.resolve(__dirname, '../../'),
      env: { 
        ...process.env, 
        DATABASE_URL: process.env.DATABASE_URL_TEST || testDbUrl, 
        DIRECT_URL: process.env.DATABASE_URL_TEST || testDbUrl 
      },
      stdio: 'inherit'
    });
    console.log('[dbTeardown] Test database reset complete! ✅\n');
  } catch (err: any) {
    console.warn('[dbTeardown] ⚠️ Prisma migrate reset failed or skipped:', err.message);
  }
}
