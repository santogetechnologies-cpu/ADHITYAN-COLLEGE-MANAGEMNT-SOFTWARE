import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) { console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'); process.exit(1); }
const sb = createClient(url, key);

async function run() {
  const { data, error } = await sb.from('institutional_settings').select('*').limit(5);
  console.log('institutional_settings count:', data?.length, 'error:', error);
  if (data && data.length > 0) {
    console.log('sample row keys:', Object.keys(data[0]));
    console.log('sample row:', data[0]);
  }
}

run().catch(console.error);
