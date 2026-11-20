import { supabase } from '../src/lib/supabase';

async function test() {
  const { data, error } = await supabase.from('institutional_settings').select('*').limit(1);
  console.log('institutional_settings columns:', data ? Object.keys(data[0] || {}) : 'none');
  console.log('Data:', data);
}

test();
