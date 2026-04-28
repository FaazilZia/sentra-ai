const { Client } = require('pg');
const client = new Client({
  connectionString: "postgresql://postgres:SentraAI-2026-Security-Tower-99@db.kanlqyjmvfbkhpkfygvh.supabase.co:5432/postgres"
});

async function test() {
  try {
    await client.connect();
    const res = await client.query('SELECT 1');
    console.log('Connection successful:', res.rows);
    await client.end();
  } catch (err) {
    console.error('Connection failed:', err);
  }
}

test();
