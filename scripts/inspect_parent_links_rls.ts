import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) { console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'); process.exit(1); }

const sb = createClient(url, key);

async function run() {
  const { data: pLinks, error: pLinksErr } = await sb.from('parent_student_links').select('*').limit(1);
  console.log('parent_student_links sample:', pLinks, 'error:', pLinksErr);

  // Check RLS policies if possible via pg_policies view or select
  const { data: policies, error: polErr } = await sb.from('pg_policies').select('*').limit(5);
  console.log('pg_policies query:', { policies, polErr });
}

run().catch(console.error);

