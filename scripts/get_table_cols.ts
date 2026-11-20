import { createClient } from '@supabase/supabase-js';

try {
  process.loadEnvFile('.env');
} catch (e) {}

const url = process.env.VITE_SUPABASE_URL || 'https://ogbbyqxulhegwvrtinib.supabase.co';
const key = process.env.SUPABASE_SECRET_KEY || '';
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function check() {
  const { data: sec } = await supabase.from('sections').select('*').limit(1);
  console.log('sections columns:', Object.keys(sec?.[0] || {}));
  const { data: crs } = await supabase.from('courses').select('*').limit(1);
  console.log('courses columns:', Object.keys(crs?.[0] || {}));
  console.log('sample course:', crs?.[0]);
}

check();
