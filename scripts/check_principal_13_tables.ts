import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const adminKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !adminKey) { console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'); process.exit(1); }
const client = createClient(url, adminKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function checkTables() {
  const tables = [
    'profiles',
    'departments',
    'sections',
    'student_attendance',
    'staff_leave_applications',
    'scholarship_applications',
    'admission_applications',
    'certificates',
    'institutional_broadcasts',
    'events',
    'timetables',
    'daily_teaching_updates',
    'exams',
    'student_grades',
    'attendance_shortage_warnings',
    'disciplinary_incidents'
  ];

  console.log('--- Checking Database Tables for Principal 13 Modules ---');
  for (const t of tables) {
    const { count, error } = await client.from(t).select('*', { count: 'exact', head: true });
    console.log(`Table ${t}:`, error ? `ERROR: ${error.message}` : `Count: ${count}`);
  }
}

checkTables().catch(console.error);
