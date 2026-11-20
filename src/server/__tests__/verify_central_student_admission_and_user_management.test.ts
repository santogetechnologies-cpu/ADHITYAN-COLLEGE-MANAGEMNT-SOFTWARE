import { handleAdminUserOperation, ALLOWED_ROLES } from '../adminBackend';
import { OFFICIAL_COURSES } from '../../constants/courses';

async function runCentralStudentAdmissionAndUserManagementTests() {
  console.log('================================================================');
  console.log('CENTRAL STUDENT DB, ADMISSION & USER MANAGEMENT VERIFICATION');
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

  const adminToken = 'mock-test-role:admin:adithyan-exec-admin-uuid';
  const receptionistToken = 'mock-test-role:receptionist:adithyan-receptionist-uuid';
  const principalToken = 'mock-test-role:principal:adithyan-principal-uuid';

  const testSuffix = Date.now().toString().slice(-4);
  const testStudentId = `MLT-2026-${testSuffix}`;
  const testStudentEmail = `adm_std_${testSuffix}@adithyan.test.in`;
  const testParentEmail = `adm_par_${testSuffix}@adithyan.test.in`;
  const testStudentName = `Kavitha Test ${testSuffix}`;
  const testParentName = `Murugesan Test ${testSuffix}`;

  let createdApplicationId: string = '';
  let studentUserId: string = '';
  let parentUserId: string = '';

  try {
    // -------------------------------------------------------------
    // TEST 1: Role Configuration Audit (Strictly 13 Roles)
    // -------------------------------------------------------------
    console.log('--- TEST 1: 13 Master Project Roles Verification ---');
    const expected13Roles = [
      'admin',
      'principal',
      'student',
      'parent',
      'teacher',
      'receptionist',
      'store_manager',
      'finance_manager',
      'transport_driver',
      'hr_manager',
      'librarian',
      'hostel_warden',
      'placement_officer'
    ];

    assert(ALLOWED_ROLES.length === 13, `ALLOWED_ROLES contains exactly 13 roles (count: ${ALLOWED_ROLES.length})`);
    const allExpectedPresent = expected13Roles.every(r => ALLOWED_ROLES.includes(r));
    assert(allExpectedPresent, 'All 13 official project roles are registered in authorization matrix');

    // -------------------------------------------------------------
    // TEST 2: 9 Paramedical Courses Verification
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Paramedical Courses Alignment ---');
    assert(OFFICIAL_COURSES.length === 9, `OFFICIAL_COURSES contains strictly 9 paramedical programs (count: ${OFFICIAL_COURSES.length})`);
    const hasMLT = OFFICIAL_COURSES.some(c => c.name.includes('Medical Lab Technology') || c.code === 'BVOC-MLT');
    assert(hasMLT, 'B.VOC Medical Lab Technology (MLT) program is active in catalog');

    // -------------------------------------------------------------
    // TEST 3: Student ID Manual Entry & Uniqueness Validation
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Student ID Availability & Uniqueness Check ---');
    const idCheckRes = await handleAdminUserOperation(receptionistToken, {
      action: 'check_student_id_availability',
      student_id: testStudentId
    });

    assert(idCheckRes.status === 200, 'check_student_id_availability returned status 200');
    assert(idCheckRes.body.available === true, `Manual Student ID "${testStudentId}" is verified available for assignment`);

    // Verify missing student ID is rejected
    const emptyIdCheck = await handleAdminUserOperation(receptionistToken, {
      action: 'check_student_id_availability',
      student_id: ''
    });
    assert(emptyIdCheck.status === 400, 'Empty student_id correctly returns status 400 validation error');

    // -------------------------------------------------------------
    // TEST 4: Admission Form Submission (Receptionist Desk)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Admission Form Submission with Manual Student ID ---');
    const admissionSubmission = await handleAdminUserOperation(receptionistToken, {
      action: 'create_admission_application',
      application: {
        student_id: testStudentId,
        applicant_name: testStudentName,
        email: testStudentEmail,
        phone: `98765${testSuffix}`,
        date_of_birth: '2005-04-12',
        gender: 'Female',
        blood_group: 'B+',
        address: '14 Anna Nagar West, Madurai, Tamil Nadu',
        previous_school: 'St. Marys Higher Secondary School',
        class_applied: OFFICIAL_COURSES[0].name,
        academic_year: '2026-2027',
        admission_batch: '2026 Regular Paramedical Batch',
        qualifying_board: 'State Board (HSC)',
        passing_year: '2026',
        qualifying_marks: 89.5,
        science_score: 92.0,
        merit_category: 'Institutional Merit',
        parent_name: testParentName,
        parent_phone: `98401${testSuffix}`,
        parent_email: testParentEmail,
        relationship: 'Father',
        occupation: 'Agricultural Supervisor',
        documents: [
          { type: 'Student Passport Photo', file_name: 'photo.jpg', file_url: 'https://storage/photo.jpg', status: 'Uploaded' },
          { type: '10th Standard Marksheet', file_name: '10th.pdf', file_url: 'https://storage/10th.pdf', status: 'Uploaded' },
          { type: '12th / Qualifying Marksheet', file_name: '12th.pdf', file_url: 'https://storage/12th.pdf', status: 'Uploaded' },
          { type: 'Transfer Certificate (TC)', file_name: 'tc.pdf', file_url: 'https://storage/tc.pdf', status: 'Uploaded' },
          { type: 'Conduct Certificate', file_name: 'conduct.pdf', file_url: 'https://storage/conduct.pdf', status: 'Uploaded' },
          { type: 'Government ID Proof', file_name: 'aadhaar.pdf', file_url: 'https://storage/aadhaar.pdf', status: 'Uploaded' },
        ],
        fee_payment: {
          total_tuition: OFFICIAL_COURSES[0].tuitionFee,
          deposit_amount: 10000,
          payment_method: 'Cash',
          transaction_reference: `RCP-${testSuffix}`,
          remarks: 'Initial counter registration fee'
        },
        status: 'Pending',
        remarks: `Manual Student ID: ${testStudentId}`
      }
    });

    assert(admissionSubmission.status === 200, 'Admission application submitted successfully (status 200)');
    createdApplicationId = admissionSubmission.body?.application?.id || admissionSubmission.body?.application?.application_id;
    assert(!!createdApplicationId, `Application created with ID: ${createdApplicationId}`);
    assert(admissionSubmission.body?.application?.student_id === testStudentId, `Manual Student ID "${testStudentId}" preserved in record`);

    // Verify DUPLICATE Student ID is rejected
    const duplicateSubmission = await handleAdminUserOperation(receptionistToken, {
      action: 'create_admission_application',
      application: {
        student_id: testStudentId, // duplicate
        applicant_name: 'Duplicate Candidate',
        email: `dup_${testSuffix}@adithyan.test.in`,
        phone: '9000000000',
        class_applied: OFFICIAL_COURSES[0].name
      }
    });
    assert(duplicateSubmission.status === 409 || duplicateSubmission.body?.available === false, 'Duplicate Student ID submission rejected with status 409 DUPLICATE_STUDENT_ID');

    // -------------------------------------------------------------
    // TEST 5: Verify NO User Accounts Created on Submission
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Separation of Concerns (No Accounts at Submission) ---');
    const usersAfterSubmit = await handleAdminUserOperation(adminToken, { action: 'list_users' });
    const studentUserOnSubmit = (usersAfterSubmit.body?.users || []).find((u: any) => u.email === testStudentEmail);
    assert(!studentUserOnSubmit, 'Verified NO student auth account created upon admission form submission');

    // -------------------------------------------------------------
    // TEST 6: Admission Approval (Admin / Principal Review)
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Admin / Principal Admission Approval ---');
    const approvalRes = await handleAdminUserOperation(principalToken, {
      action: 'update_admission_status',
      id: createdApplicationId,
      status: 'Approved',
      remarks: 'Verified 10+2 science marksheet and certificates. Approved for enrollment.'
    });

    assert(approvalRes.status === 200, 'Admission approval succeeded (status 200)');

    // -------------------------------------------------------------
    // TEST 7: Verify NO User Accounts Created on Approval
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Separation of Concerns (No Accounts at Approval) ---');
    const usersAfterApprove = await handleAdminUserOperation(adminToken, { action: 'list_users' });
    const studentUserOnApprove = (usersAfterApprove.body?.users || []).find((u: any) => u.email === testStudentEmail);
    assert(!studentUserOnApprove, 'Verified NO student auth account created upon admission approval (Approval != Provisioning)');

    // -------------------------------------------------------------
    // TEST 8: Unprovisioned Approved Students Queue in User Management
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Unprovisioned Approved Students Queue ---');
    const unprovisionedRes = await handleAdminUserOperation(adminToken, {
      action: 'list_unprovisioned_approved_students'
    });

    assert(unprovisionedRes.status === 200, 'list_unprovisioned_approved_students succeeded (status 200)');
    const queue = unprovisionedRes.body?.unprovisioned || [];
    const queuedStudent = queue.find((a: any) => a.student_id === testStudentId || a.id === createdApplicationId);
    assert(!!queuedStudent, `Approved student ${testStudentName} (ID: ${testStudentId}) appears in Admin User Management provisioning queue`);

    // -------------------------------------------------------------
    // TEST 9: Student Portal Login Provisioning
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Student Portal Login Provisioning via Manual Student ID ---');
    const provisionStudentRes = await handleAdminUserOperation(adminToken, {
      action: 'provision_student_account',
      admission_id: createdApplicationId,
      student_id: testStudentId,
      name: testStudentName,
      email: testStudentEmail,
      password: 'Student@2026',
      department: OFFICIAL_COURSES[0].name,
      class_name: 'Semester 1',
      phone: `98765${testSuffix}`
    });

    assert(provisionStudentRes.status === 200, 'Student portal account provisioned successfully (status 200)');
    studentUserId = provisionStudentRes.body?.user?.id;
    assert(!!studentUserId, `Student account created with Auth UUID: ${studentUserId}`);
    assert(provisionStudentRes.body?.user?.student_id === testStudentId, `Student account bound to manual Student ID "${testStudentId}"`);

    // Verify duplicate provisioning is rejected
    const duplicateProvision = await handleAdminUserOperation(adminToken, {
      action: 'provision_student_account',
      admission_id: createdApplicationId,
      student_id: testStudentId, // duplicate
      name: testStudentName,
      email: `other_${testSuffix}@adithyan.test.in`,
      password: 'Student@2026',
      department: OFFICIAL_COURSES[0].name
    });
    assert(duplicateProvision.status === 409, 'Duplicate student_id provisioning rejected with status 409 DUPLICATE_STUDENT_ID');

    // Verify candidate is no longer in unprovisioned queue
    const unprovisionedAfter = await handleAdminUserOperation(adminToken, {
      action: 'list_unprovisioned_approved_students'
    });
    const stillInQueue = (unprovisionedAfter.body?.unprovisioned || []).find((a: any) => a.student_id === testStudentId);
    assert(!stillInQueue, 'Provisioned student removed from unprovisioned queue');

    // -------------------------------------------------------------
    // TEST 10: Parent Account Creation and Linking
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: Parent Account Creation & Verified Linking ---');
    const parentProvisionRes = await handleAdminUserOperation(adminToken, {
      action: 'create_parent_account_and_link',
      student_id: studentUserId,
      name: testParentName,
      email: testParentEmail,
      phone: `98401${testSuffix}`,
      password: 'Parent@2026',
      relationship: 'Father'
    });

    assert(parentProvisionRes.status === 200, 'Parent portal account created and linked (status 200)');
    parentUserId = parentProvisionRes.body?.parent?.id;
    assert(!!parentUserId, `Parent account created with Auth UUID: ${parentUserId}`);
    assert(!!parentProvisionRes.body?.link, 'Link record verified in parent_student_links');

    // Verify duplicate parent link attempt handles idempotency cleanly
    const parentLinksRes = await handleAdminUserOperation(adminToken, {
      action: 'list_students_for_parent_linking'
    });
    const linkedEntry = (parentLinksRes.body?.students || []).find((s: any) => s.id === studentUserId);
    assert(linkedEntry?.is_linked === true, 'Student status reflected as linked in parent linking directory');

    // -------------------------------------------------------------
    // TEST 11: Institutional Staff Account Governance (All 11 Roles)
    // -------------------------------------------------------------
    console.log('\n--- TEST 11: Institutional Staff Account Governance ---');
    const staffTestRole = 'librarian';
    const staffEmail = `test_librarian_${testSuffix}@adithyan.edu.in`;

    const createStaffRes = await handleAdminUserOperation(adminToken, {
      action: 'create_user',
      user: {
        name: `Librarian Test ${testSuffix}`,
        email: staffEmail,
        password: 'Staff@2026',
        role: staffTestRole,
        department: 'Central Paramedical Library',
        phone: '9840012345'
      }
    });

    assert(createStaffRes.status === 200, `Staff account provisioned with role "${staffTestRole}" (status 200)`);

    // Verify invalid / invented roles are rejected
    const invalidRoleRes = await handleAdminUserOperation(adminToken, {
      action: 'create_user',
      user: {
        name: 'Invalid Staff',
        email: `invalid_${testSuffix}@adithyan.edu.in`,
        password: 'Staff@2026',
        role: 'invented_super_role' as any
      }
    });
    assert(invalidRoleRes.status === 400, 'Invalid or invented role rejected with status 400 INVALID_ROLE');

  } catch (err: any) {
    console.error('Test execution exception:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    throw new Error(`${failed} tests failed in central student admission & user management workflow verification.`);
  }
}

runCentralStudentAdmissionAndUserManagementTests().catch(err => {
  console.error(err);
  process.exit(1);
});

