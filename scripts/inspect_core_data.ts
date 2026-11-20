import { supabase } from '../src/lib/supabase';

async function test() {
  const { data: dept } = await supabase.from('departments').select('*').limit(2);
  console.log('DEPARTMENTS:', JSON.stringify(dept, null, 2));
  const { data: crs } = await supabase.from('courses').select('*').limit(2);
  console.log('COURSES:', JSON.stringify(crs, null, 2));
  const { data: fees } = await supabase.from('fee_structures').select('*').limit(2);
  console.log('FEES:', JSON.stringify(fees, null, 2));
  const { data: settings } = await supabase.from('institutional_settings').select('*').limit(1);
  console.log('SETTINGS:', JSON.stringify(settings, null, 2));
  const { data: profiles } = await supabase.from('profiles').select('id, name, email, role, department, class_name').limit(3);
  console.log('PROFILES:', JSON.stringify(profiles, null, 2));
}

test();
