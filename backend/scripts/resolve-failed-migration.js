require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log('[SELF-HEAL] DATABASE_URL is not set. Skipping self-healing check.');
    return;
  }

  // Hide credentials in logged connection string for security
  const maskedString = connectionString.replace(/:([^:@]+)@/, ':****@');
  console.log(`[SELF-HEAL] Connecting to database to check migration status: ${maskedString}`);

  const client = new Client({ 
    connectionString,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    
    // Check if _prisma_migrations table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_prisma_migrations'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log("[SELF-HEAL] '_prisma_migrations' table exists. Checking if database tables are initialized...");
      
      const companiesCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'companies'
        );
      `);
      
      const tablesExist = companiesCheck.rows[0].exists;
      
      if (tablesExist) {
        console.log("[SELF-HEAL] Database tables already exist. Checking if RLS migration is in a failed state...");
        const checkFailed = await client.query(`
          SELECT finished_at FROM _prisma_migrations 
          WHERE migration_name = '0_rls_policies';
        `);
        
        if (checkFailed.rows.length > 0 && !checkFailed.rows[0].finished_at) {
          console.log("[SELF-HEAL] Found failed '0_rls_policies' migration. Clearing failed state to allow auto-repair...");
          
          const result = await client.query(`
            DELETE FROM _prisma_migrations 
            WHERE migration_name = '0_rls_policies' 
            AND finished_at IS NULL;
          `);
          
          console.log(`[SELF-HEAL] Successfully removed ${result.rowCount} failed migration record(s).`);
        } else {
          console.log("[SELF-HEAL] No failed '0_rls_policies' migration records found.");
        }
      } else {
        console.log("[SELF-HEAL] Core tables (companies) do not exist. Deleting history for '0_init_production' and '0_rls_policies' so Prisma can create them...");
        const resetResult = await client.query(`
          DELETE FROM _prisma_migrations 
          WHERE migration_name IN ('0_init_production', '0_rls_policies');
        `);
        console.log(`[SELF-HEAL] Purged ${resetResult.rowCount} stale migration records from empty database.`);
      }
    } else {
      console.log("[SELF-HEAL] '_prisma_migrations' table does not exist yet (fresh database).");
    }
  } catch (error) {
    // Fail-closed/safe: log error but do NOT crash the startup flow. Let standard Prisma retry if possible.
    console.error('[SELF-HEAL WARNING] Pre-migration cleanup encountered an error (ignoring):', error.message);
  } finally {
    try {
      await client.end();
    } catch (error) {
      console.error('[SELF-HEAL WARNING] Error closing client connection:', error.message);
    }
  }
}

main();
