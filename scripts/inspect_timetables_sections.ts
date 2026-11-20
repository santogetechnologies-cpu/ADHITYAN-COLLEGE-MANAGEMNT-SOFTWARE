import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) { console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'); process.exit(1); }

const sb = createClient(url, key);

async function run() {
  const { data: sec } = await sb.from('sections').select('*').limit(3);
  console.log('sections:', sec);

  // Inspect timetables columns
  const { data: tt, error: tte } = await sb.from('timetables').select('*').limit(1);
  console.log('timetables sample:', tt, 'error:', tte);
}

run().catch(console.error);

