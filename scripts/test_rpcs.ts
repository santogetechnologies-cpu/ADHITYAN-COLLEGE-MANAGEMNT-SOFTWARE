import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) { console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'); process.exit(1); }
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function testRpcs() {
  const rpcs = [
    'exec',
    'exec_sql',
    'execute_sql',
    'sql',
    'run_sql',
    'query',
    'get_admin_overview_stats',
    'resolve_login_id',
    'get_current_user_role'
  ];

  for (const r of rpcs) {
    try {
      const { data, error } = await supabase.rpc(r, {});
      console.log(`RPC ${r}:`, error ? error.message : 'EXISTS!');
    } catch (e: any) {
      console.log(`RPC ${r} catch:`, e.message);
    }
  }
}

testRpcs();
