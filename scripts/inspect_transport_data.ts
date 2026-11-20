import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
  
  const { data: v } = await supabase.from('transport_vehicles').select('*');
  console.log('--- ALL VEHICLES ---');
  console.log(JSON.stringify(v, null, 2));

  const { data: s } = await supabase.from('transport_stops').select('*');
  console.log('--- ALL STOPS ---');
  console.log(JSON.stringify(s, null, 2));
}

main().catch(console.error);
