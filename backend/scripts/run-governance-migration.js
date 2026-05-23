require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Connected. Running select count on compliance_obligations...');
  const res = await client.query('SELECT COUNT(*) FROM "compliance_obligations";');
  console.log('Count:', res.rows);
  await client.end();
}

main();
