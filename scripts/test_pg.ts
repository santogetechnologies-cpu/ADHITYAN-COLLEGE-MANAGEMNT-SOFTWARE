import { Client } from 'pg';

// Let's test standard Supabase direct postgres connection
// Note: In Supabase, host is db.<ref>.supabase.co, port is 5432 (session) or 6543 (transaction)
async function testPg() {
  const host = 'db.ogbbyqxulhegwvrtinib.supabase.co';
  console.log('Testing PG connection to:', host);
  // Without password, let's test if connection responds or requires password
  const client = new Client({
    host,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'password_test',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PG!');
    client.end();
  } catch (err: any) {
    console.log('PG test error:', err.message);
  }
}

testPg();
