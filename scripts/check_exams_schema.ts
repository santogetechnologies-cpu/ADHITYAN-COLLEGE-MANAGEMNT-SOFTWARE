import { createClient } from '@supabase/supabase-js';

try {
  process.loadEnvFile('.env');
} catch (e) {}

const url = process.env.VITE_SUPABASE_URL || 'https://ogbbyqxulhegwvrtinib.supabase.co';
const key = process.env.SUPABASE_SECRET_KEY || '';
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function check() {
  const { data: ins, error: insErr } = await supabase.from('exams').insert({
    name: 'First Internal Assessment 2026',
    term: 'Internal Assessment 1',
    academic_year: '2026-2027',
    start_date: '2026-11-25',
    end_date: '2026-12-05',
    status: 'Scheduled'
  }).select();
  console.log('insert exam:', ins, 'error:', insErr);
}

check();
