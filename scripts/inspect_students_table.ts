import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) { console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'); process.exit(1); }

const sb = createClient(url, key);

async function run() {
  const { data: st, error: ste } = await sb.from('students').select('*').limit(1);
  console.log('students table sample:', st, 'error:', ste);
}

run().catch(console.error);

