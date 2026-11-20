import { createClient } from '@supabase/supabase-js';

try {
  process.loadEnvFile('.env');
} catch (e) {}

const url = process.env.VITE_SUPABASE_URL || 'https://ogbbyqxulhegwvrtinib.supabase.co';
const key = process.env.SUPABASE_SECRET_KEY || '';
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function check() {
  const { data: profiles, error: profError } = await supabase.from('profiles').select('*').limit(1);
  if (profError) {
    console.error('Profiles error:', profError);
  } else {
    console.log('Profile columns:', Object.keys(profiles[0] || {}));
    console.log('Sample profile:', profiles[0]);
  }
}

check();
