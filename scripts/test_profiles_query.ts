import { supabase } from '../src/lib/supabase';

async function test() {
  const { count: sCount, error: sErr } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
  console.log('Students count in profiles:', sCount, 'Error:', sErr);

  const { count: tCount, error: tErr } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['teacher', 'hod', 'faculty']);
  console.log('Faculty count in profiles:', tCount, 'Error:', tErr);

  const { count: dCount, error: dErr } = await supabase.from('departments').select('*', { count: 'exact', head: true });
  console.log('Departments count:', dCount, 'Error:', dErr);
}

test();
