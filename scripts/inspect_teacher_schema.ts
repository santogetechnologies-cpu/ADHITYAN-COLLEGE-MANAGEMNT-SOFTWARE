import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) { console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'); process.exit(1); }

const sb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  console.log('--- Inspecting Profiles Table ---');
  const { data: p, error: pe } = await sb.from('profiles').select('*').limit(1);
  console.log('profiles sample row:', p);
  if (pe) console.error('profiles error:', pe);

  console.log('\n--- Checking Table Existence ---');
  for (const t of ['teacher_classes', 'teacher_allocations', 'teacher_assignments', 'classes', 'sections', 'timetables', 'daily_teaching_updates']) {
    const { data, error } = await sb.from(t).select('*').limit(1);
    console.log(`Table "${t}":`, error ? `Error: ${error.message} (${error.code})` : `Exists! Rows: ${data?.length}`);
  }
}

run().catch(console.error);

