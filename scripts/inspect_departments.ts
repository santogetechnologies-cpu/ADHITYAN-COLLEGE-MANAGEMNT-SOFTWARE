import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) { console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'); process.exit(1); }

const sb = createClient(url, key);

async function run() {
  const { data: depts } = await sb.from('departments').select('*');
  console.log('departments in db:', depts);
}

run().catch(console.error);

