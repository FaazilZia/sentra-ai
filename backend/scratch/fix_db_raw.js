const { Client } = require('pg');
require('dotenv').config();

async function fix() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB');
    await client.query('ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;');
    console.log('Successfully removed NOT NULL constraint from password_hash');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

fix();
