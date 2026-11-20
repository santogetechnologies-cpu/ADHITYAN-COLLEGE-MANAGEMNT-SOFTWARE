import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) { console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'); process.exit(1); }

const sb = createClient(url, key);

async function run() {
  // Check if we can create a table or if rpc exists
  const { data, error } = await sb.rpc('execute_sql', { sql: 'SELECT 1;' });
  console.log('rpc execute_sql:', { data, error });
}

run().catch(console.error);

