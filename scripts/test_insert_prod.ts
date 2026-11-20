import { createClient } from '@supabase/supabase-js';

try {
  process.loadEnvFile('.env');
} catch (e) {}

const url = process.env.VITE_SUPABASE_URL || 'https://ogbbyqxulhegwvrtinib.supabase.co';
const key = process.env.SUPABASE_SECRET_KEY || '';
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function insertProd() {
  const item = {
    name: 'Standard Clinical Lab Coat (White)',
    price: 650,
    category: 'Uniforms',
    stock: 120,
    description: '100% Cotton embroidered institutional lab coat for clinical and lab sessions.'
  };

  const { data: upsertData, error: upsertErr } = await supabase
    .from('store_products')
    .upsert(item, { onConflict: 'name' });
  console.log('upsert with onConflict name:', upsertData, 'error:', upsertErr);

  const { data: insertData, error: insertErr } = await supabase
    .from('store_products')
    .insert(item)
    .select();
  console.log('insert without onConflict:', insertData, 'error:', insertErr);
}

insertProd();
