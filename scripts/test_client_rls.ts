import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const adminKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !anonKey || !adminKey) { console.error('Missing VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_SECRET_KEY env vars'); process.exit(1); }

const sbAdmin = createClient(url, adminKey);
const sbAnon = createClient(url, anonKey);

async function testRLS() {
  console.log('Testing queries with Anon client (simulates unauthenticated or client-side token without admin bypass):');
  
  const tables = [
    'parent_student_links',
    'profiles',
    'timetables',
    'student_fees',
    'student_attendance',
    'exam_results',
    'assignments',
    'departments',
    'sections'
  ];

  for (const t of tables) {
    const { data, error } = await sbAnon.from(t).select('*').limit(2);
    console.log(`Table ${t} (anon):`, error ? `ERROR: ${error.message} (${error.code})` : `OK (${data?.length} rows)`);
  }
}

testRLS().catch(console.error);

