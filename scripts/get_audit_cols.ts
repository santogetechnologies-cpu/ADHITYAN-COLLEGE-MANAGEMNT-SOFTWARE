import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) { console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'); process.exit(1); }
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function getColumns() {
  const { error } = await supabase.from('audit_logs').insert({ dummy_invalid_col: 1 });
  console.log('audit_logs insert response:', error?.message);
}

getColumns();
