import { createClient } from '@supabase/supabase-js';

try {
  process.loadEnvFile('.env');
} catch (e) {}

const url = process.env.VITE_SUPABASE_URL || 'https://ogbbyqxulhegwvrtinib.supabase.co';
const key = process.env.SUPABASE_SECRET_KEY || '';
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function seedProducts() {
  const storeItems = [
    { name: 'Medical Scrub Suit Set (Hospital Blue)', price: 950, category: 'Uniforms', stock: 80, description: 'Antimicrobial unisex medical scrub suit for operation theatre and hospital rotations.' },
    { name: 'Clinical Stethoscope (Dual Head)', price: 1450, category: 'Medical Kits', stock: 45, description: 'High acoustic sensitivity stethoscope for clinical training and diagnostics.' },
    { name: 'Digital Blood Pressure Monitor', price: 1850, category: 'Medical Kits', stock: 30, description: 'Accurate upper arm automatic BP monitor for practical training.' },
    { name: 'Medical Lab Practical Record Notebook', price: 120, category: 'Stationery', stock: 200, description: '200-page spiral bound ruled record book for laboratory experiments.' },
    { name: 'Scientific Multi-Function Calculator', price: 850, category: 'Electronics', stock: 50, description: 'Approved scientific calculator for medical statistics and bio-physics calculations.' },
  ];

  for (const it of storeItems) {
    const { data: existing } = await supabase.from('store_products').select('id').eq('name', it.name);
    if (!existing || existing.length === 0) {
      await supabase.from('store_products').insert(it);
      console.log('Inserted store product:', it.name);
    } else {
      console.log('Product already exists:', it.name);
    }
  }

  const { data: all } = await supabase.from('store_products').select('id, name, price, stock');
  console.log(`Total store products in database: ${all?.length}`);
}

seedProducts();
