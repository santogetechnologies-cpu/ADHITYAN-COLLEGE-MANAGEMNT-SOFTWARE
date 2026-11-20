import { createClient } from '@supabase/supabase-js';

try {
  process.loadEnvFile('.env');
} catch (e) {}

const url = process.env.VITE_SUPABASE_URL || 'https://ogbbyqxulhegwvrtinib.supabase.co';
const key = process.env.SUPABASE_SECRET_KEY || '';
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function check() {
  const { data: prods, error: prodErr } = await supabase.from('store_products').select('*');
  console.log('store_products count:', prods?.length, 'error:', prodErr);

  const { data: vehs, error: vehErr } = await supabase.from('transport_vehicles').select('*');
  console.log('transport_vehicles count:', vehs?.length, 'error:', vehErr);

  const { data: exams, error: examErr } = await supabase.from('exams').select('*');
  console.log('exams count:', exams?.length, 'error:', examErr);
}

check();
