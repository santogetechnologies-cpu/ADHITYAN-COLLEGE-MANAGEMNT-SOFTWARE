import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'); process.exit(1); }
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const query = `
    SELECT t.tgname, p.proname, p.prosrc 
    FROM pg_trigger t 
    JOIN pg_proc p ON t.tgfoid = p.oid 
    WHERE t.tgrelid = 'admission_applications'::regclass;
  `;
  const { data, error } = await sb.rpc('exec_sql', { sql: query });
  console.log('Triggers:', { data, error });
}

main();
