import { handleAdminUserOperation } from '../src/server/adminBackend';
import { multiCollegeService, DEFAULT_PRIMARY_COLLEGE } from '../src/services/multiCollegeService';
import { CAPABILITY_REGISTRY } from '../src/services/capabilityRegistry';
import { RoleCustomizationState } from '../src/types/roleCustomization.types';

// Polyfill localStorage for node environment
if (typeof localStorage === 'undefined' || localStorage === null) {
  const storage = new Map<string, string>();
  (global as any).localStorage = {
    getItem: (k: string) => storage.get(k) || null,
    setItem: (k: string, v: string) => storage.set(k, String(v)),
    removeItem: (k: string) => storage.delete(k),
    clear: () => storage.clear()
  };
}

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: any) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName}`, details || '');
  }
}

async function runRoleCustomizationSuite() {
  console.log('\n========================================================================');
  console.log(' SUPER ADMIN — COMPLETE ROLE CUSTOMIZATION & CAPABILITY SUITE');
  console.log('========================================================================\n');

  const COLLEGE_A_ID = DEFAULT_PRIMARY_COLLEGE.id; // '11111111-1111-1111-1111-111111111111'
  const COLLEGE_B_ID = '22222222-2222-2222-2222-222222222222';

  // -------------------------------------------------------------------------
  // TEST 1: Capability Registry Integrity
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: Capability Registry Integrity & Backend Action Wiring ---');
  assert(CAPABILITY_REGISTRY.length >= 10, `Registry contains ${CAPABILITY_REGISTRY.length} capabilities`);

  const hasAttendanceCap = CAPABILITY_REGISTRY.some(c => c.id === 'teacher.attendance.mark' && c.backendAction === 'record_attendance');
  const hasAssignmentCap = CAPABILITY_REGISTRY.some(c => c.id === 'teacher.assignments.create' && c.backendAction === 'create_assignment');
  const hasFinanceCap = CAPABILITY_REGISTRY.some(c => c.id === 'finance.payments.collect' && c.backendAction === 'collect_fee_payment');
  const hasAdmissionCap = CAPABILITY_REGISTRY.some(c => c.id === 'receptionist.admissions.create' && c.backendAction === 'create_admission_application');

  assert(hasAttendanceCap, 'Capability teacher.attendance.mark maps to backendAction record_attendance');
  assert(hasAssignmentCap, 'Capability teacher.assignments.create maps to backendAction create_assignment');
  assert(hasFinanceCap, 'Capability finance.payments.collect maps to backendAction collect_fee_payment');
  assert(hasAdmissionCap, 'Capability receptionist.admissions.create maps to backendAction create_admission_application');

  // -------------------------------------------------------------------------
  // TEST 2: Role Configuration Loading for College A Teacher
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Load Default Role Customization for College A Teacher ---');
  const teacherConfigA = await multiCollegeService.getRoleConfiguration(COLLEGE_A_ID, 'teacher');
  assert(teacherConfigA.role === 'teacher', 'Loaded role configuration for teacher');
  assert(teacherConfigA.collegeId === COLLEGE_A_ID, 'Role configuration scoped to College A ID');
  assert(teacherConfigA.backendActions['record_attendance'] === true, 'Attendance marking action enabled by default');
  assert(teacherConfigA.backendActions['create_assignment'] === true, 'Assignment creation action enabled by default');
  assert(teacherConfigA.businessRules.restrictFinanceAccess === true, 'Finance access restricted for teacher by default');

  // -------------------------------------------------------------------------
  // TEST 3: Backend Action Execution Before Modification (Allowed)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Execution of Enabled Action (College A Teacher) ---');
  const teacherAToken = `mock-test-role:teacher:usr-teacher-a:${COLLEGE_A_ID}:teacher@adithyan.edu`;
  const validAssignmentCall = await handleAdminUserOperation(
    teacherAToken,
    {
      action: 'create_assignment',
      assignment: {
        title: 'Cardiac Pathology Case Study',
        class_name: 'B.Sc Cardiac Technology',
        due_date: '2026-12-01'
      }
    }
  );
  assert(
    validAssignmentCall.status === 200,
    'Enabled action "create_assignment" succeeds on backend (HTTP 200)',
    validAssignmentCall
  );

  // -------------------------------------------------------------------------
  // TEST 4: Super Admin Customizes Role: Disables create_assignment for College A
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Super Admin Disables "create_assignment" for College A Teacher ---');
  teacherConfigA.backendActions['create_assignment'] = false;
  teacherConfigA.enabledCapabilities = teacherConfigA.enabledCapabilities.filter(id => id !== 'teacher.assignments.create');
  await multiCollegeService.saveRoleConfiguration(COLLEGE_A_ID, 'teacher', teacherConfigA);

  const blockedAssignmentCall = await handleAdminUserOperation(
    teacherAToken,
    {
      action: 'create_assignment',
      assignment: {
        title: 'Cardiac Pathology Case Study - Blocked Attempt',
        class_name: 'B.Sc Cardiac Technology',
        due_date: '2026-12-01'
      }
    }
  );

  assert(
    blockedAssignmentCall.status === 403,
    'Disabled action rejected by backend gateway with HTTP 403',
    blockedAssignmentCall
  );
  assert(
    blockedAssignmentCall.body.code === 'ROLE_ACTION_DISABLED',
    'Rejection code is ROLE_ACTION_DISABLED',
    blockedAssignmentCall.body
  );

  // -------------------------------------------------------------------------
  // TEST 5: Strict Isolation Between Colleges (College B Teacher NOT affected)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Zero Bleed Between Colleges (College B Teacher Still Allowed) ---');
  const teacherBToken = `mock-test-role:teacher:usr-teacher-b:${COLLEGE_B_ID}:teacher@citymed.edu`;
  const colBAssignmentCall = await handleAdminUserOperation(
    teacherBToken,
    {
      action: 'create_assignment',
      assignment: {
        title: 'Nursing Fundamentals Journal',
        class_name: 'B.Sc Nursing',
        due_date: '2026-12-01'
      }
    }
  );

  assert(
    colBAssignmentCall.status === 200,
    'College B teacher is UNMUTATED and successfully creates assignment (HTTP 200)',
    colBAssignmentCall
  );

  // -------------------------------------------------------------------------
  // TEST 6: Business Rules Enforcement (restrictFinanceAccess)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: Business Rule Enforcement (Finance Restrictions for Teacher) ---');
  const illegalFinanceAttempt = await handleAdminUserOperation(
    teacherAToken,
    {
      action: 'collect_fee_payment',
      payment: { student_id: 'STU-001', amount: 5000 }
    }
  );

  assert(
    illegalFinanceAttempt.status === 403,
    'Teacher blocked from fee collection by business rule (HTTP 403)',
    illegalFinanceAttempt
  );
  assert(
    illegalFinanceAttempt.body.code === 'FINANCE_ACCESS_RESTRICTED',
    'Error code is strictly FINANCE_ACCESS_RESTRICTED',
    illegalFinanceAttempt.body
  );

  // -------------------------------------------------------------------------
  // TEST 7: Validation Engine Checks
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7: Role Customization Validation Engine ---');
  const adminConfig = await multiCollegeService.getRoleConfiguration(COLLEGE_A_ID, 'admin');
  adminConfig.status = 'suspended'; // Try to suspend super admin
  const issues = multiCollegeService.validateRoleConfiguration(adminConfig);
  
  const hasAdminProtectError = issues.some(i => i.type === 'error' && i.title === 'Super Admin Protected');
  assert(hasAdminProtectError, 'Validation engine flags error when trying to suspend Administrator');

  // -------------------------------------------------------------------------
  // TEST 8: Publishing with Version Bumping & Platform Audit Logging
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 8: Publish Role Configuration with Audit Trail ---');
  const pubResult = await multiCollegeService.publishRoleConfiguration(
    COLLEGE_A_ID,
    'teacher',
    'superadmin@platform.adithyan.edu',
    'Institutional policy update: disabled remote assignments for clinical semester'
  );

  assert(pubResult.success === true, 'Successfully published role customization');
  assert(!!pubResult.releaseVersion, `Published version generated: ${pubResult.releaseVersion}`);

  const auditLogs = await multiCollegeService.listPlatformAuditLogs({ collegeId: COLLEGE_A_ID, limit: 10 });
  const hasRolePublishLog = auditLogs.some(l => l.action === 'publish_role_configuration');
  assert(hasRolePublishLog, 'Platform audit trail recorded publish_role_configuration event');

  // Re-enable create_assignment to restore clean baseline
  teacherConfigA.backendActions['create_assignment'] = true;
  await multiCollegeService.saveRoleConfiguration(COLLEGE_A_ID, 'teacher', teacherConfigA);

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(` RESULT: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log('========================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runRoleCustomizationSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
