import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) { console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'); process.exit(1); }

if (!key) {
  console.error('Missing SUPABASE_SECRET_KEY!');
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function purgeAllDataPreserveAdmin() {
  console.log('================================================================');
  console.log('PURGE ALL ERP & DATABASE RECORDS (PRESERVING ONLY ADMIN)');
  console.log('================================================================\n');

  // 1. Identify Admin Account
  const { data: usersData, error: usersErr } = await sb.auth.admin.listUsers();
  if (usersErr || !usersData?.users) {
    console.error('Failed to query auth users:', usersErr);
    process.exit(1);
  }

  const adminAuthUser = usersData.users.find(u => 
    u.email === 'admin@gmail.com' || u.user_metadata?.role === 'admin'
  );

  if (!adminAuthUser) {
    console.error('CRITICAL: Admin account (admin@gmail.com) not found in auth.users! Aborting purge.');
    process.exit(1);
  }

  const adminId = adminAuthUser.id;
  const adminEmail = adminAuthUser.email;
  console.log(`✓ Located Protected Admin Account:`);
  console.log(`  - Auth UUID: ${adminId}`);
  console.log(`  - Email:     ${adminEmail}`);
  console.log(`  - Role:      ${adminAuthUser.user_metadata?.role || 'admin'}`);
  console.log(`  - Created:   ${adminAuthUser.created_at}\n`);

  // 2. Tables to truncate / delete all rows from (in child-to-parent order)
  const TABLES_TO_CLEAR = [
    // Messages & Interactions
    'ai_chat_messages',
    'teacher_messages',
    'concerns',
    'feedback_submissions',
    'wellness_checkins',
    'notifications',

    // Attendance & Academics
    'student_attendance',
    'student_achievements',
    'student_goals',
    'assignment_submissions',
    'assignments',
    'daily_teaching_updates',
    'timetables',

    // Exams
    'exam_results',
    'exam_schedules',
    'exams',

    // Health & Clinical
    'health_records',
    'infirmary_visits',

    // Transport & Fleet
    'student_transport_logs',
    'vehicle_maintenance',
    'transport_stops',
    'transport_vehicles',

    // Store & Inventory
    'store_orders',
    'inventory_transactions',
    'inventory_items',
    'store_products',

    // Library
    'book_issues',
    'digital_library_resources',
    'library_books',

    // Certificates & Discipline
    'certificates',
    'disciplinary_incidents',

    // Events & Sports
    'sports_events',
    'sports_teams',
    'calendar_events',

    // NAAC & Accreditation
    'naac_documents',
    'naac_criterion_progress',

    // Reception & Front Office
    'reception_visitors',
    'reception_appointments',
    'reception_enquiries',

    // Finance & Fees
    'finance_transactions',
    'student_fees',
    'admission_fees',

    // Admissions
    'admission_merit_lists',
    'admission_entrance_tests',
    'admission_document_verifications',
    'admission_applications',

    // Alumni
    'alumni_donations',
    'alumni_events',
    'alumni_profiles',

    // Student & Parent relationships
    'parent_student_links',
    'students'
  ];

  console.log('--- Phase 1: Deleting All Operational & Module Records ---');
  for (const table of TABLES_TO_CLEAR) {
    try {
      // Use neq on primary key or dummy condition to delete all rows
      // First check if table exists
      const { data: rows, error: selectErr } = await sb.from(table).select('id').limit(1000);
      if (selectErr) {
        if (selectErr.code !== '42P01') {
          console.warn(`[Skip] Table "${table}": ${selectErr.message}`);
        }
        continue;
      }

      if (rows && rows.length > 0) {
        const ids = rows.map((r: any) => r.id).filter(Boolean);
        if (ids.length > 0) {
          const { error: delErr } = await sb.from(table).delete().in('id', ids);
          if (delErr) {
            console.error(`✗ Error deleting from "${table}": ${delErr.message}`);
          } else {
            console.log(`✓ Cleared ${ids.length} records from table: "${table}"`);
          }
        }
      } else {
        // Table already empty
        console.log(`• Table "${table}": 0 records (Already clean)`);
      }
    } catch (e: any) {
      console.warn(`[Exception on "${table}"]: ${e.message}`);
    }
  }

  // 3. Clean Profiles Table (Preserving ONLY Admin)
  console.log('\n--- Phase 2: Purging Profiles (Preserving ONLY Admin Profile) ---');
  const { data: nonAdminProfiles, error: profSelectErr } = await sb
    .from('profiles')
    .select('id, email, name, role')
    .neq('id', adminId);

  if (profSelectErr) {
    console.error('Failed to query non-admin profiles:', profSelectErr);
  } else if (nonAdminProfiles && nonAdminProfiles.length > 0) {
    console.log(`Found ${nonAdminProfiles.length} non-admin profiles to remove.`);
    const nonAdminIds = nonAdminProfiles.map(p => p.id);
    const { error: profDelErr } = await sb
      .from('profiles')
      .delete()
      .in('id', nonAdminIds);

    if (profDelErr) {
      console.error('Failed to delete non-admin profiles:', profDelErr);
    } else {
      console.log(`✓ Successfully deleted ${nonAdminIds.length} non-admin profiles.`);
    }
  } else {
    console.log('• Profiles table has no non-admin profiles.');
  }

  // Ensure Admin Profile exists and is in pristine active state
  const { error: ensureAdminErr } = await sb.from('profiles').upsert({
    id: adminId,
    email: adminEmail,
    name: adminAuthUser.user_metadata?.name || 'System Administrator',
    role: 'admin',
    preferences: { status: 'active', theme: 'light', notifications: true },
    updated_at: new Date().toISOString()
  });

  if (ensureAdminErr) {
    console.error('Failed to ensure admin profile:', ensureAdminErr);
  } else {
    console.log(`✓ Preserved & verified Admin profile (${adminEmail}) in public.profiles.`);
  }

  // 4. Clean Auth Users (Preserving ONLY Admin)
  console.log('\n--- Phase 3: Purging Supabase Auth Users (Preserving ONLY Admin User) ---');
  const nonAdminUsers = usersData.users.filter(u => u.id !== adminId);
  console.log(`Found ${nonAdminUsers.length} non-admin auth users to remove.`);

  let deletedAuthCount = 0;
  for (const u of nonAdminUsers) {
    try {
      const { error: userDelErr } = await sb.auth.admin.deleteUser(u.id);
      if (userDelErr) {
        console.error(`✗ Failed to delete auth user ${u.email} (${u.id}): ${userDelErr.message}`);
      } else {
        deletedAuthCount++;
      }
    } catch (e: any) {
      console.error(`Exception deleting auth user ${u.id}:`, e);
    }
  }
  console.log(`✓ Successfully deleted ${deletedAuthCount}/${nonAdminUsers.length} non-admin auth accounts.`);

  // 5. Verification Phase
  console.log('\n================================================================');
  console.log('FINAL PURGE VERIFICATION AUDIT');
  console.log('================================================================\n');

  // Verify Auth Users count is strictly 1
  const { data: finalUsers } = await sb.auth.admin.listUsers();
  console.log(`- Total Remaining Auth Users: ${finalUsers?.users.length || 0}`);
  if (finalUsers?.users.length === 1 && finalUsers.users[0].id === adminId) {
    console.log(`  ✓ ONLY the Admin account (${finalUsers.users[0].email}) remains in Supabase Auth.`);
  } else {
    console.warn(`  ⚠ Warning: Unexpected user count in Auth: ${finalUsers?.users.length}`);
  }

  // Verify Profiles count is strictly 1
  const { data: finalProfiles, count: profileCount } = await sb
    .from('profiles')
    .select('*', { count: 'exact' });
  console.log(`- Total Remaining Profiles:   ${profileCount || finalProfiles?.length || 0}`);
  if (finalProfiles && finalProfiles.length === 1 && finalProfiles[0].id === adminId) {
    console.log(`  ✓ ONLY the Admin profile (${finalProfiles[0].email}) remains in public.profiles.`);
  } else {
    console.warn(`  ⚠ Warning: Unexpected profile count: ${finalProfiles?.length}`);
  }

  // Verify operational tables are empty
  const keyTablesToCheck = [
    'students',
    'parent_student_links',
    'admission_applications',
    'admission_document_verifications',
    'student_fees',
    'finance_transactions',
    'timetables',
    'assignments',
    'assignment_submissions',
    'store_orders',
    'library_books',
    'exams',
    'notifications',
    'student_attendance'
  ];

  console.log('\n- Sample Operational Table Counts:');
  for (const t of keyTablesToCheck) {
    const { count } = await sb.from(t).select('*', { count: 'exact', head: true });
    console.log(`  • ${t}: ${count ?? 0} rows`);
  }

  console.log('\n✓ Database purge complete. Application structure and Admin login preserved.');
}

purgeAllDataPreserveAdmin().catch(err => {
  console.error('Purge error:', err);
  process.exit(1);
});

