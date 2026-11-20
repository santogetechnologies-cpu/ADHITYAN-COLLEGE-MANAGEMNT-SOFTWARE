import { supabase } from '../src/lib/supabase';
import { createClient } from '@supabase/supabase-js';

async function testQuery() {
  const { data, error } = await supabase.from('store_products').select('*');
  console.log('anon query data length:', data?.length, 'error:', error);

  const adminClient = createClient(
    process.env.VITE_SUPABASE_URL || 'https://ogbbyqxulhegwvrtinib.supabase.co',
    process.env.SUPABASE_SECRET_KEY || ''
  );
  const { data: aData, error: aError } = await adminClient.from('store_products').select('*');
  console.log('admin query data length:', aData?.length, 'error:', aError);
  if (aData && aData.length > 0) {
    console.log('Sample product:', aData[0]);
  }
}

testQuery();
