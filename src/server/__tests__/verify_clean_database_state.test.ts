import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) { throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'); }
const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function verifyCleanDatabaseState() {
  console.log('================================================================');
  console.log('DATABASE PURGE & CLEAN-STATE VERIFICATION AUDIT');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  // 1. Verify ONLY Admin user exists in Supabase Auth
  console.log('--- 1. Supabase Auth Users Audit ---');
  const { data: authData, error: authErr } = await sb.auth.admin.listUsers();
  assert(!authErr, 'Auth listUsers query executed successfully');
  assert(authData?.users?.length === 1, `Auth users count is strictly 1 (Found: ${authData?.users?.length})`);

  const adminUser = authData?.users[0];
  assert(adminUser?.email === 'admin@gmail.com', `Preserved Auth User email is "admin@gmail.com" (Found: ${adminUser?.email})`);
  assert(adminUser?.user_metadata?.role === 'admin', `Preserved Auth User role is "admin" (Found: ${adminUser?.user_metadata?.role})`);

  // 2. Verify ONLY Admin profile exists in public.profiles
  console.log('\n--- 2. Public Profiles Table Audit ---');
  const { data: profData, error: profErr } = await sb.from('profiles').select('*');
  assert(!profErr, 'Profiles select query executed successfully');
  assert(profData?.length === 1, `Profiles count is strictly 1 (Found: ${profData?.length})`);

  const adminProfile = profData?.[0];
  assert(adminProfile?.email === 'admin@gmail.com', `Preserved Profile email is "admin@gmail.com"`);
  assert(adminProfile?.role === 'admin', `Preserved Profile role is "admin"`);
  assert(adminProfile?.id === adminUser?.id, `Profile UUID matches Auth User UUID (${adminUser?.id})`);

  // 3. Verify Operational & Module Tables are Completely Empty (0 Records)
  console.log('\n--- 3. Module & Operational Tables (Zero-Record Clean State) ---');
  const TABLES_TO_VERIFY = [
    'parent_student_links',
    'admission_applications',
    'admission_document_verifications',
    'admission_merit_lists',
    'admission_entrance_tests',
    'admission_fees',
    'student_fees',
    'finance_transactions',
    'timetables',
    'assignments',
    'assignment_submissions',
    'daily_teaching_updates',
    'feedback_submissions',
    'concerns',
    'teacher_messages',
    'wellness_checkins',
    'health_records',
    'infirmary_visits',
    'transport_vehicles',
    'transport_stops',
    'student_transport_logs',
    'vehicle_maintenance',
    'store_products',
    'store_orders',
    'inventory_items',
    'inventory_transactions',
    'library_books',
    'book_issues',
    'digital_library_resources',
    'certificates',
    'disciplinary_incidents',
    'exams',
    'exam_schedules',
    'exam_results',
    'sports_events',
    'sports_teams',
    'calendar_events',
    'notifications',
    'naac_documents',
    'naac_criterion_progress',
    'reception_visitors',
    'reception_appointments',
    'reception_enquiries',
    'student_achievements',
    'student_goals',
    'student_attendance',
    'ai_chat_messages',
    'alumni_profiles',
    'alumni_events',
    'alumni_donations'
  ];

  for (const table of TABLES_TO_VERIFY) {
    try {
      const { count, error } = await sb.from(table).select('*', { count: 'exact', head: true });
      if (error && error.code === '42P01') {
        // Table not present in this schema
        continue;
      }
      assert(count === 0, `Table "${table}" has 0 records (Clean State)`);
    } catch (e: any) {
      assert(false, `Table "${table}" check failed: ${e.message}`);
    }
  }

  // 4. Verify Institutional Course Definitions are Preserved
  console.log('\n--- 4. Institutional Foundation & Schema Integrity ---');
  const { data: depts, error: deptErr } = await sb.from('departments').select('id, name');
  assert(!deptErr, 'Departments table query succeeded');
  assert((depts?.length || 0) === 9, `9 Paramedical academic course departments preserved (Found: ${depts?.length})`);

  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    throw new Error(`${failed} tests failed in database clean-state verification.`);
  }
}

verifyCleanDatabaseState().catch(err => {
  console.error(err);
  process.exit(1);
});

