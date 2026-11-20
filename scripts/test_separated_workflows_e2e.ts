import { createClient } from '@supabase/supabase-js';
import { bulkAccountProvisioningService } from '../src/services/bulkAccountProvisioningService';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'); process.exit(1); }
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runSeparatedWorkflowsE2ETest() {
  console.log('========================================================================');
  console.log('🎯 SEPARATED WORKFLOWS E2E TEST: ADMISSION, STUDENT LOGIN & PARENT ACCOUNTS');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testId: string, description: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testId}: ${description}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testId}: ${description}`);
      failed++;
    }
  }

  const timestamp = Date.now().toString().slice(-6);
  const testStudentId1 = `STU-TEST-${timestamp}-A`;
  const testStudentId2 = `STU-TEST-${timestamp}-B`;
  const testStudentEmail1 = `test.student.${timestamp}.a@example.com`;
  const testStudentEmail2 = `test.student.${timestamp}.b@example.com`;
  const testParentEmail = `test.parent.${timestamp}@example.com`;
  let createdAdmissionId1: string | null = null;
  let createdAdmissionId2: string | null = null;
  let createdStudentAuthId1: string | null = null;
  let createdStudentAuthId2: string | null = null;
  let createdParentAuthId: string | null = null;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Baseline Official Stats
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Testing Baseline Telemetry ---');
    const baselineStats = await bulkAccountProvisioningService.getOfficialStudentStats();
    console.log('Baseline Telemetry:', baselineStats);
    assert(
      typeof baselineStats.official_enrolled_students === 'number' &&
      typeof baselineStats.provisioned_student_logins === 'number' &&
      typeof baselineStats.provisioned_parent_accounts === 'number',
      'T1',
      'Successfully queried decoupled institutional student stats'
    );

    // -------------------------------------------------------------------------
    // TEST 2: Admission Application Created (Pending Review)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing Admission Independence: Pending Review ---');
    const { data: newApp, error: appErr } = await sb
      .from('admission_merit_lists')
      .insert({
        student_name: `Applicant ${timestamp} A`,
        course_name: 'B.Sc Cardiac Technology',
        merit_score: 92,
        rank: 1,
        category: 'Merit',
        status: 'Submitted',
        academic_year: '2026-2027'
      })
      .select()
      .single();

    if (appErr || !newApp) {
      throw new Error(`Failed to insert test admission application: ${appErr?.message}`);
    }
    createdAdmissionId1 = newApp.id;

    // Also record metadata in admission_document_verifications so student ID is linked
    await sb.from('admission_document_verifications').insert({
      student_name: `Applicant ${timestamp} A`,
      document_type: 'APPLICATION_METADATA',
      document_url: JSON.stringify({
        id: createdAdmissionId1,
        student_id: testStudentId1,
        name: `Applicant ${timestamp} A`,
        email: testStudentEmail1
      }),
      status: 'Pending',
      submission_date: '2026-11-19'
    });

    // Verify stats: Official enrolled student count must NOT have changed!
    const statsAfterPending = await bulkAccountProvisioningService.getOfficialStudentStats();
    assert(
      statsAfterPending.official_enrolled_students === baselineStats.official_enrolled_students,
      'T2',
      `Pending admission application does NOT increment official enrolled student count (${statsAfterPending.official_enrolled_students} === ${baselineStats.official_enrolled_students})`
    );

    // -------------------------------------------------------------------------
    // TEST 3: Admission Approval (Official Enrolled Student Count Increases)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing Official Enrollment Counting Without Login ---');
    const { error: approveErr } = await sb
      .from('admission_merit_lists')
      .update({ status: 'Admitted' })
      .eq('id', createdAdmissionId1);

    if (approveErr) {
      throw new Error(`Failed to approve admission: ${approveErr.message}`);
    }

    const statsAfterApprove = await bulkAccountProvisioningService.getOfficialStudentStats();
    assert(
      statsAfterApprove.official_enrolled_students === baselineStats.official_enrolled_students + 1,
      'T3',
      `Approved admission immediately increments official enrolled students (${statsAfterApprove.official_enrolled_students} === ${baselineStats.official_enrolled_students + 1}) without any login account existing`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Student Login Bulk Import
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing Student Login Bulk Import ---');
    const studentImportResult = await bulkAccountProvisioningService.executeStudentBulkImport([
      {
        name: `Applicant ${timestamp} A`,
        student_id: testStudentId1,
        email: testStudentEmail1,
        password: 'Password@123',
        department: 'Cardiac Technology',
        class_name: 'Semester 1'
      }
    ]);

    assert(
      studentImportResult.success === true && studentImportResult.successCount === 1,
      'T4.1',
      `Student login provisioned successfully for ${testStudentId1}`
    );

    if (studentImportResult.results[0]?.accountId) {
      createdStudentAuthId1 = studentImportResult.results[0].accountId;
    }

    // Verify student count DID NOT INCREASE (remains baseline + 1)
    const statsAfterStudentLogin = await bulkAccountProvisioningService.getOfficialStudentStats();
    assert(
      statsAfterStudentLogin.official_enrolled_students === baselineStats.official_enrolled_students + 1,
      'T4.2',
      `Student login creation did NOT alter official enrolled student count (${statsAfterStudentLogin.official_enrolled_students} === ${baselineStats.official_enrolled_students + 1})`
    );
    assert(
      statsAfterStudentLogin.provisioned_student_logins === baselineStats.provisioned_student_logins + 1,
      'T4.3',
      `Provisioned student logins accurately incremented by 1 (${statsAfterStudentLogin.provisioned_student_logins})`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Duplicate Student ID & Email Rejection
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Testing Duplicate Detection & Validation ---');
    const duplicateImportResult = await bulkAccountProvisioningService.executeStudentBulkImport([
      {
        name: `Duplicate User`,
        student_id: testStudentId1,
        email: `another.${timestamp}@example.com`,
        password: 'Password@123'
      }
    ]);

    assert(
      duplicateImportResult.failureCount === 1 && duplicateImportResult.failedRows.length === 1,
      'T5.1',
      `Duplicate student ID was rejected correctly with failure reason: "${duplicateImportResult.failedRows[0]?.failure_reason}"`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Parent Account Bulk Provisioning & Student Linking
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Testing Parent Account Provisioning & Linking ---');
    const parentImportResult1 = await bulkAccountProvisioningService.executeParentBulkImport([
      {
        student_id: testStudentId1,
        parent_name: `Guardian ${timestamp}`,
        parent_email: testParentEmail,
        password: 'Password@Parent123',
        relationship: 'Mother'
      }
    ]);

    assert(
      parentImportResult1.success === true && parentImportResult1.successCount === 1,
      'T6.1',
      `Parent account provisioned and linked to student ID ${testStudentId1}`
    );

    // Verify parent account exists and relationship is linked
    const { data: parentProfile } = await sb
      .from('profiles')
      .select('id, name, email, role')
      .eq('email', testParentEmail)
      .maybeSingle();

    assert(
      parentProfile !== null && parentProfile.role === 'parent',
      'T6.2',
      `Parent profile verified in database with role = 'parent' (ID: ${parentProfile?.id})`
    );
    if (parentProfile) createdParentAuthId = parentProfile.id;

    // Verify official student count DID NOT INCREASE (remains baseline + 1)
    const statsAfterParent = await bulkAccountProvisioningService.getOfficialStudentStats();
    assert(
      statsAfterParent.official_enrolled_students === baselineStats.official_enrolled_students + 1,
      'T6.3',
      `Parent account creation did NOT increase official student count (${statsAfterParent.official_enrolled_students})`
    );

    // -------------------------------------------------------------------------
    // TEST 7: Parent Account Reuse on Multiple Students
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Testing Parent Account Reuse (Multiple Children) ---');
    // Create second student admission
    const { data: app2 } = await sb
      .from('admission_merit_lists')
      .insert({
        student_name: `Applicant ${timestamp} B (Sibling)`,
        course_name: 'B.Sc Medical Laboratory Technology',
        merit_score: 89,
        rank: 2,
        category: 'Merit',
        status: 'Admitted',
        academic_year: '2026-2027'
      })
      .select()
      .single();

    if (app2) createdAdmissionId2 = app2.id;

    await sb.from('admission_document_verifications').insert({
      student_name: `Applicant ${timestamp} B (Sibling)`,
      document_type: 'APPLICATION_METADATA',
      document_url: JSON.stringify({
        id: createdAdmissionId2,
        student_id: testStudentId2,
        name: `Applicant ${timestamp} B (Sibling)`,
        email: testStudentEmail2
      }),
      status: 'Verified',
      submission_date: '2026-11-19'
    });

    // Provision student 2 account
    const s2Result = await bulkAccountProvisioningService.executeStudentBulkImport([
      {
        name: `Applicant ${timestamp} B (Sibling)`,
        student_id: testStudentId2,
        email: testStudentEmail2,
        password: 'Password@123',
        department: 'Medical Laboratory Technology',
        class_name: 'Semester 1'
      }
    ]);
    if (s2Result.results[0]?.accountId) {
      createdStudentAuthId2 = s2Result.results[0].accountId;
    }

    // Import parent for student 2 with SAME parent email
    const parentImportResult2 = await bulkAccountProvisioningService.executeParentBulkImport([
      {
        student_id: testStudentId2,
        parent_name: `Guardian ${timestamp}`,
        parent_email: testParentEmail, // Same email!
        relationship: 'Mother'
      }
    ]);

    assert(
      parentImportResult2.successCount === 1 && parentImportResult2.results[0]?.isReused === true,
      'T7.1',
      `Existing parent account was reused (isReused: true) without creating duplicate accounts`
    );

    // Verify parent now has 2 links in parent_student_links
    const { count: linkCount } = await sb
      .from('parent_student_links')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', parentProfile?.id);

    assert(
      (linkCount || 0) >= 2,
      'T7.2',
      `Parent account successfully linked to multiple children (${linkCount} active ward links)`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Combined Import with Graceful Parent Fallback
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Testing Combined Import & Graceful Partial Import ---');
    const combinedTestId = `STU-COMB-${timestamp}`;
    const combinedEmail = `comb.${timestamp}@example.com`;
    const combinedResult = await bulkAccountProvisioningService.executeCombinedBulkImport([
      {
        student_name: `Combined Student ${timestamp}`,
        student_id: combinedTestId,
        student_email: combinedEmail,
        student_password: 'Password@123',
        department: 'Radio Imaging Technology'
        // Parent details intentionally omitted
      }
    ]);

    assert(
      combinedResult.successCount === 1 && combinedResult.results[0]?.studentCreated === true,
      'T8.1',
      'Combined import provisions student login smoothly even when parent details are omitted'
    );

    // -------------------------------------------------------------------------
    // TEST 9: Security & Audit Logging Verification
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Testing Security & Audit Logging ---');
    // Check that profiles table does NOT have raw passwords in fields
    const { data: testProfileCheck } = await sb
      .from('profiles')
      .select('*')
      .eq('email', testStudentEmail1)
      .single();

    assert(
      testProfileCheck && !(testProfileCheck as any).password,
      'T9.1',
      'Security verified: Raw passwords are not stored in the profiles database table'
    );

    // Check audit logs
    const { data: auditLogs } = await sb
      .from('audit_logs')
      .select('*')
      .in('action', ['bulk_import_student_accounts', 'bulk_import_parent_accounts', 'bulk_import_combined_accounts'])
      .order('created_at', { ascending: false })
      .limit(5);

    assert(
      (auditLogs?.length || 0) > 0,
      'T9.2',
      `Audit logs recorded for account provisioning actions (${auditLogs?.length} recent audit logs found)`
    );

  } catch (err: any) {
    console.error('💥 Test suite crashed with error:', err);
    failed++;
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log('\n--- Cleaning up test artifacts ---');
    try {
      if (createdParentAuthId) {
        await sb.from('parent_student_links').delete().eq('parent_id', createdParentAuthId);
        await sb.from('profiles').delete().eq('id', createdParentAuthId);
        await sb.auth.admin.deleteUser(createdParentAuthId);
      }
      if (createdStudentAuthId1) {
        await sb.from('profiles').delete().eq('id', createdStudentAuthId1);
        await sb.auth.admin.deleteUser(createdStudentAuthId1);
      }
      if (createdStudentAuthId2) {
        await sb.from('profiles').delete().eq('id', createdStudentAuthId2);
        await sb.auth.admin.deleteUser(createdStudentAuthId2);
      }
      // Clean student 1 if not caught by auth id
      const { data: p1 } = await sb.from('profiles').select('id').eq('email', testStudentEmail1).maybeSingle();
      if (p1) {
        await sb.from('parent_student_links').delete().eq('student_id', p1.id);
        await sb.from('profiles').delete().eq('id', p1.id);
        await sb.auth.admin.deleteUser(p1.id);
      }
      // Clean combined
      const { data: pComb } = await sb.from('profiles').select('id').eq('roll_number', `STU-COMB-${timestamp}`).maybeSingle();
      if (pComb) {
        await sb.from('profiles').delete().eq('id', pComb.id);
        await sb.auth.admin.deleteUser(pComb.id);
      }
      if (createdAdmissionId1) {
        await sb.from('admission_merit_lists').delete().eq('id', createdAdmissionId1);
        await sb.from('admission_document_verifications').delete().ilike('document_url', `%${testStudentId1}%`);
      }
      if (createdAdmissionId2) {
        await sb.from('admission_merit_lists').delete().eq('id', createdAdmissionId2);
        await sb.from('admission_document_verifications').delete().ilike('document_url', `%${testStudentId2}%`);
      }
      console.log('Cleanup completed successfully.');
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr);
    }
  }

  console.log('\n========================================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================');
  if (failed > 0) {
    process.exit(1);
  }
}

runSeparatedWorkflowsE2ETest();
