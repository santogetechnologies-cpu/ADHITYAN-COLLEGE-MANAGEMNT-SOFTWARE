import { db } from '../../services/supabase/database';
import { handleAdminUserOperation } from '../adminBackend';

async function runAdmissionApprovalWorkflowTests() {
  console.log('================================================================');
  console.log('LIVE ADMISSION APPROVAL & ACCOUNT PROVISIONING WORKFLOW TEST');
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

  const testSuffix = Date.now().toString().slice(-4);
  const testStudentEmail = `verify_std_${testSuffix}@adithyan.test.in`;
  const testParentPhone = `98765${testSuffix}`;
  let createdAppId: string = '';
  let studentAuthId: string = '';
  let parentAuthId: string = '';
  const adminToken = 'mock-test-role:admin:ed0ef274-5dd5-4775-accb-97119899cc00';

  try {
    // -------------------------------------------------------------
    // STEP 1: Application Submission (Receptionist / Admin Desk)
    // -------------------------------------------------------------
    console.log('\n--- STEP 1: Application Submission ---');
    const submitResultRaw = await handleAdminUserOperation(adminToken, {
      action: 'create_admission_application',
      application: {
        applicant_name: `Aravind Test ${testSuffix}`,
        date_of_birth: '2005-08-15',
        gender: 'Male',
        email: testStudentEmail,
        phone: `91234${testSuffix}`,
        address: '74 Anna Salai, Chennai, Tamil Nadu',
        guardian_name: `Ramasamy Test ${testSuffix}`,
        guardian_phone: testParentPhone,
        program_applied: 'B.Sc Medical Laboratory Technology (B.Sc MLT)',
        previous_institution: 'Adithyan Higher Secondary School',
        academic_score: '88.5%',
        blood_group: 'O+',
        category: 'General',
        remarks: 'Application submitted via Front Desk Reception',
      }
    });

    const submitResult = submitResultRaw.body?.application;
    assert(!!submitResult && !!submitResult.id, 'Application successfully persisted in Supabase database');
    createdAppId = submitResult?.id || '';
    console.log(`Created Application ID: ${createdAppId}`);

    // Verify it is initially "Submitted" - NO login accounts exist yet
    const apps = await db.getAdmissionApplications();
    console.log(`Retrieved ${apps.length} total applications from live registry.`);
    const currentApp = apps.find((a: any) => a.id === createdAppId || a.email === testStudentEmail || a.applicant_name?.includes(testSuffix));
    console.log('Current application in registry:', currentApp ? { id: currentApp.id, name: currentApp.applicant_name, status: currentApp.status, email: currentApp.email } : 'Not found');
    assert(!!currentApp, 'Application retrieved in registry queue');
    assert(currentApp?.status === 'Submitted', 'Initial application status is "Submitted" (Not yet provisioned)');

    // -------------------------------------------------------------
    // STEP 2: Pending Count Check for Dashboards
    // -------------------------------------------------------------
    console.log('\n--- STEP 2: Pending Admissions Counter Verification ---');
    const pendingCount = await db.getPendingAdmissionsCount();
    assert(pendingCount > 0, `Pending admissions count correctly reports ${pendingCount} applications`);

    // -------------------------------------------------------------
    // STEP 3: Admin / Principal Approval & Transactional Provisioning
    // -------------------------------------------------------------
    console.log('\n--- STEP 3: Admin/Principal Approval & Transactional Provisioning ---');
    const confirmResRaw = await handleAdminUserOperation(adminToken, {
      action: 'confirm_admission',
      application_id: createdAppId,
      student: {
        name: `Aravind Test ${testSuffix}`,
        email: testStudentEmail,
        phone: `91234${testSuffix}`,
        department: 'B.Sc Medical Laboratory Technology (B.Sc MLT)',
        class_name: 'Semester 1',
        date_of_birth: '2005-08-15',
        address: '74 Anna Salai, Chennai, Tamil Nadu',
        previous_school: 'Adithyan Higher Secondary School',
      },
      parent: {
        name: `Ramasamy Test ${testSuffix}`,
        phone: testParentPhone,
        relationship: 'Father',
      },
    });

    const confirmRes = confirmResRaw.body;
    assert(confirmRes.success === true, 'confirm_admission returned success: true');
    assert(confirmRes.student?.student_id?.startsWith('STU-2026-'), `Generated permanent Student ID format: ${confirmRes.student?.student_id}`);
    assert(confirmRes.parent?.parent_id?.startsWith('PAR-2026-'), `Generated unique Parent ID format: ${confirmRes.parent?.parent_id}`);
    assert(confirmRes.student?.is_first_login === true, 'Student account flagged for First Login / Password Setup');
    assert(confirmRes.parent?.is_first_login === true, 'Parent account flagged for First Login / Password Setup');

    studentAuthId = confirmRes.student?.id;
    parentAuthId = confirmRes.parent?.id;

    // -------------------------------------------------------------
    // STEP 4: Verify Database Status & Linkage
    // -------------------------------------------------------------
    console.log('\n--- STEP 4: Database Status & Parent-Student Relationship ---');
    const updatedApps = await db.getAdmissionApplications();
    const approvedApp = updatedApps.find((a: any) => a.id === createdAppId || a.email === testStudentEmail || a.applicant_name?.includes(testSuffix));
    assert(approvedApp?.status === 'Approved', 'Application status updated to "Approved"');
    assert(approvedApp?.student_id === confirmRes.student?.student_id, 'Application has provisioned Student ID attached');
    assert(approvedApp?.parent_id === confirmRes.parent?.parent_id, 'Application has provisioned Parent ID attached');

    // -------------------------------------------------------------
    // STEP 5: Multi-Identifier Login Resolution Verification
    // -------------------------------------------------------------
    console.log('\n--- STEP 5: Student & Parent Login Identifier Resolution ---');
    
    // Resolve Student by Student ID
    const studentResolveById = await handleAdminUserOperation(adminToken, {
      action: 'resolve_login_id',
      identifier: confirmRes.student.student_id,
      role: 'student',
    });
    assert(studentResolveById.body.success && studentResolveById.body.email === testStudentEmail, 'Student logs in with Student ID');

    // Resolve Student by Mobile
    const studentResolveByPhone = await handleAdminUserOperation(adminToken, {
      action: 'resolve_login_id',
      identifier: `91234${testSuffix}`,
      role: 'student',
    });
    assert(studentResolveByPhone.body.success && studentResolveByPhone.body.email === testStudentEmail, 'Student logs in with Registered Mobile');

    // Resolve Parent by Parent ID
    const parentResolveById = await handleAdminUserOperation(adminToken, {
      action: 'resolve_login_id',
      identifier: confirmRes.parent.parent_id,
      role: 'parent',
    });
    assert(parentResolveById.body.success && !!parentResolveById.body.email, `Parent logs in with Parent ID (${confirmRes.parent.parent_id} -> ${parentResolveById.body.email})`);

    // Resolve Parent by Mobile
    const parentResolveByPhone = await handleAdminUserOperation(adminToken, {
      action: 'resolve_login_id',
      identifier: testParentPhone,
      role: 'parent',
    });
    assert(parentResolveByPhone.body.success && !!parentResolveByPhone.body.email, 'Parent logs in with Registered Mobile');

  } catch (err: any) {
    console.error('Test execution error:', err);
    assert(false, 'Workflow test threw exception', err.message);
  } finally {
    // -------------------------------------------------------------
    // CLEANUP TEST USERS (Preserving Admin untouched)
    // -------------------------------------------------------------
    console.log('\n--- CLEANUP: Removing Test Accounts ---');
    if (studentAuthId) {
      await handleAdminUserOperation(adminToken, { action: 'delete_user', userId: studentAuthId });
      console.log(`Cleaned up student test user: ${studentAuthId}`);
    }
    if (parentAuthId) {
      await handleAdminUserOperation(adminToken, { action: 'delete_user', userId: parentAuthId });
      console.log(`Cleaned up parent test user: ${parentAuthId}`);
    }
  }

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAdmissionApprovalWorkflowTests();
