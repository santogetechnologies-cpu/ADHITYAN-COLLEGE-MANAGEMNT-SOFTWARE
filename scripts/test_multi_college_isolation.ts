import { handleAdminUserOperation } from '../src/server/adminBackend';
import { multiCollegeService, DEFAULT_PRIMARY_COLLEGE, BUILTIN_TEMPLATES } from '../src/services/multiCollegeService';
import { CollegeProvisioningPayload } from '../src/types/multiCollege.types';

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

async function runIsolationSuite() {
  console.log('\n========================================================================');
  console.log(' MULTI-COLLEGE ERP PLATFORM — STRICT TENANT ISOLATION & SECURITY SUITE');
  console.log('========================================================================\n');

  const COLLEGE_A_ID = DEFAULT_PRIMARY_COLLEGE.id; // '11111111-1111-1111-1111-111111111111'
  const COLLEGE_B_ID = '22222222-2222-2222-2222-222222222222';
  const COLLEGE_C_ID = '33333333-3333-3333-3333-333333333333';

  // -------------------------------------------------------------------------
  // TEST 1: Cross-Tenant Boundary Check (College A Admin -> College B)
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: Cross-Tenant Boundary Violation Block (College A -> College B) ---');
  const colAToken = `mock-test-role:admin:usr-col-a:${COLLEGE_A_ID}:admin@adhityan.edu`;
  const crossTenantAttempt1 = await handleAdminUserOperation(
    colAToken,
    { action: 'verify_tenant_isolation', targetCollegeId: COLLEGE_B_ID, collegeId: COLLEGE_B_ID }
  );

  assert(
    crossTenantAttempt1.status === 403,
    'Backend rejects College A admin accessing College B with HTTP 403',
    crossTenantAttempt1
  );
  assert(
    crossTenantAttempt1.body.code === 'CROSS_TENANT_VIOLATION',
    'Error code is strictly CROSS_TENANT_VIOLATION',
    crossTenantAttempt1.body
  );

  // -------------------------------------------------------------------------
  // TEST 2: Cross-Tenant Boundary Check (College B Admin -> College A)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Cross-Tenant Boundary Violation Block (College B -> College A) ---');
  const colBToken = `mock-test-role:admin:usr-col-b:${COLLEGE_B_ID}:admin@citymed.edu`;
  const crossTenantAttempt2 = await handleAdminUserOperation(
    colBToken,
    { action: 'verify_tenant_isolation', targetCollegeId: COLLEGE_A_ID, collegeId: COLLEGE_A_ID }
  );

  assert(
    crossTenantAttempt2.status === 403,
    'Backend rejects College B admin accessing College A with HTTP 403',
    crossTenantAttempt2
  );
  assert(
    crossTenantAttempt2.body.code === 'CROSS_TENANT_VIOLATION',
    'Error code is strictly CROSS_TENANT_VIOLATION',
    crossTenantAttempt2.body
  );

  // -------------------------------------------------------------------------
  // TEST 3: College Admin Blocked from Platform Super Admin Actions
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Privilege Separation (College Admin vs Platform Super Admin) ---');
  
  // Attempt 3a: College Admin trying to provision a college
  const illegalProvision = await handleAdminUserOperation(
    colAToken,
    {
      action: 'platform_provision_college',
      collegeData: { name: 'Hacked College', code: 'HACK-01' }
    }
  );
  assert(
    illegalProvision.status === 403,
    'College Admin forbidden from platform_provision_college (HTTP 403)',
    illegalProvision
  );
  assert(
    illegalProvision.body.code === 'FORBIDDEN_SUPER_ADMIN_REQUIRED',
    'Error code is FORBIDDEN_SUPER_ADMIN_REQUIRED',
    illegalProvision.body
  );

  // Attempt 3b: College Admin trying to toggle college status
  const illegalStatusToggle = await handleAdminUserOperation(
    colAToken,
    {
      action: 'platform_set_college_status',
      targetCollegeId: COLLEGE_B_ID,
      status: 'suspended'
    }
  );
  assert(
    illegalStatusToggle.status === 403,
    'College Admin forbidden from platform_set_college_status (HTTP 403)',
    illegalStatusToggle
  );
  assert(
    illegalStatusToggle.body.code === 'FORBIDDEN_SUPER_ADMIN_REQUIRED',
    'Error code is FORBIDDEN_SUPER_ADMIN_REQUIRED',
    illegalStatusToggle.body
  );

  // -------------------------------------------------------------------------
  // TEST 4: Platform Super Admin Allowed Globally Across Colleges
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Platform Super Admin Global Cross-Tenant Orchestration ---');
  const superAdminToken = `mock-test-role:platform_super_admin:usr-super-admin::superadmin@platform.adithyan.edu`;

  // Super admin verifying tenant isolation on College A
  const superAdminScopeA = await handleAdminUserOperation(
    superAdminToken,
    { action: 'verify_tenant_isolation', targetCollegeId: COLLEGE_A_ID }
  );
  assert(
    superAdminScopeA.status === 200,
    'Platform Super Admin authorized on College A (HTTP 200)',
    superAdminScopeA
  );
  assert(
    superAdminScopeA.body.accessScope === 'global',
    'Platform Super Admin has global access scope',
    superAdminScopeA.body
  );

  // Super admin verifying tenant isolation on College B
  const superAdminScopeB = await handleAdminUserOperation(
    superAdminToken,
    { action: 'verify_tenant_isolation', targetCollegeId: COLLEGE_B_ID }
  );
  assert(
    superAdminScopeB.status === 200,
    'Platform Super Admin authorized on College B (HTTP 200)',
    superAdminScopeB
  );

  // -------------------------------------------------------------------------
  // TEST 5: College Provisioning via MultiCollegeService
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Provisioning Independent Colleges with Isolated Configs ---');
  
  // Provision College 2: City Medical Institute
  const payloadB: CollegeProvisioningPayload = {
    name: 'City Medical Institute',
    code: 'CITY-MED',
    institution_type: 'Paramedical',
    contact_email: 'dean@citymed.edu',
    contact_phone: '+91 98765 43210',
    admin_account: {
      email: 'admin@citymed.edu',
      password: 'SecurePassword123!',
      full_name: 'Dr. Ramesh Kumar'
    },
    academic_config: {
      programs: ['B.Sc Nursing', 'B.Sc MLT'],
      academicYears: ['2025-2026', '2026-2027'],
      semesterStructure: 'Semester (1 to 8)',
      departments: ['Nursing', 'Laboratory Technology']
    },
    template_name: 'Minimal College Template',
    selected_modules: ['students', 'faculty', 'academics', 'attendance', 'finance']
  };

  const provResultB = await multiCollegeService.provisionCollege(payloadB, 'superadmin@platform.adithyan.edu');
  assert(provResultB.success === true, 'Successfully provisioned College B (CITY-MED)');
  assert(!!provResultB.college?.id, 'College B assigned unique ID');

  // Provision College 3: Apex Institute of Technology
  const payloadC: CollegeProvisioningPayload = {
    name: 'Apex Institute of Technology',
    code: 'APEX-TECH',
    institution_type: 'Multi-Disciplinary',
    contact_email: 'director@apextech.edu',
    contact_phone: '+91 98765 11223',
    admin_account: {
      email: 'admin@apextech.edu',
      password: 'ApexSecure123!',
      full_name: 'Prof. S. Narayanan'
    },
    academic_config: {
      programs: ['B.Tech Computer Science', 'B.Tech AI & DS'],
      academicYears: ['2025-2026', '2026-2027'],
      semesterStructure: 'Semester (1 to 8)',
      departments: ['Computer Science', 'Artificial Intelligence']
    },
    template_name: 'Full Multi-Disciplinary ERP Template',
    selected_modules: ['students', 'faculty', 'academics', 'attendance', 'examinations', 'finance', 'library', 'placements']
  };

  const provResultC = await multiCollegeService.provisionCollege(payloadC, 'superadmin@platform.adithyan.edu');
  assert(provResultC.success === true, 'Successfully provisioned College C (APEX-TECH)');
  assert(!!provResultC.college?.id, 'College C assigned unique ID');

  // Verify uniqueness enforcement: duplicate code must be rejected
  const duplicateCodeResult = await multiCollegeService.provisionCollege(payloadB, 'superadmin@platform.adithyan.edu');
  assert(
    duplicateCodeResult.success === false,
    'Provisioning rejected duplicate college code CITY-MED',
    duplicateCodeResult.error
  );

  // -------------------------------------------------------------------------
  // TEST 6: Strict Configuration Isolation Between 3 Colleges
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: Independent Dynamic Configurations for 3 Distinct Colleges ---');
  
  const configA = await multiCollegeService.getCollegeConfiguration(COLLEGE_A_ID);
  const configB = await multiCollegeService.getCollegeConfiguration(provResultB.college!.id);
  const configC = await multiCollegeService.getCollegeConfiguration(provResultC.college!.id);

  // Verify College A has its own identity
  assert(
    configA.globalSettings.institutionCode === 'ADH-COLLEGE',
    `College A institution code is ADH-COLLEGE (got: ${configA.globalSettings.institutionCode})`
  );

  // Verify College B has its own identity and minimal modules
  assert(
    configB.globalSettings.institutionCode === 'CITY-MED',
    `College B institution code is CITY-MED (got: ${configB.globalSettings.institutionCode})`
  );
  const colBHasLibrary = configB.modules.some(m => m.id === 'library' && m.enabled);
  assert(
    !colBHasLibrary,
    'College B (Minimal Template) does NOT have library module enabled'
  );

  // Verify College C has its own identity and placement module
  assert(
    configC.globalSettings.institutionCode === 'APEX-TECH',
    `College C institution code is APEX-TECH (got: ${configC.globalSettings.institutionCode})`
  );
  const colCHasPlacements = configC.modules.some(m => m.id === 'placements' && m.enabled);
  assert(
    colCHasPlacements,
    'College C (Multi-Disciplinary) HAS placements module enabled'
  );

  // Mutate College B's configuration and assert College A and C are NOT affected
  configB.globalSettings.institutionName = 'Renamed City Medical Institute';
  await multiCollegeService.saveCollegeConfiguration(provResultB.college!.id, configB);

  const reloadedA = await multiCollegeService.getCollegeConfiguration(COLLEGE_A_ID);
  const reloadedB = await multiCollegeService.getCollegeConfiguration(provResultB.college!.id);
  const reloadedC = await multiCollegeService.getCollegeConfiguration(provResultC.college!.id);

  assert(
    reloadedB.globalSettings.institutionName === 'Renamed City Medical Institute',
    'College B configuration successfully updated independently'
  );
  assert(
    reloadedA.globalSettings.institutionName === DEFAULT_PRIMARY_COLLEGE.name,
    'College A configuration remained completely unchanged and isolated'
  );
  assert(
    reloadedC.globalSettings.institutionName === 'Apex Institute of Technology',
    'College C configuration remained completely unchanged and isolated'
  );

  // -------------------------------------------------------------------------
  // TEST 7: Platform Audit Logging & Tenant Attribution
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7: Platform Audit Log & Tenant Attribution ---');
  const auditLogs = await multiCollegeService.listPlatformAuditLogs({ limit: 20 });
  assert(auditLogs.length > 0, `Platform audit logs recorded (${auditLogs.length} logs found)`);

  const hasProvisionB = auditLogs.some(l => l.college_code === 'CITY-MED' && l.action === 'provision_college');
  const hasProvisionC = auditLogs.some(l => l.college_code === 'APEX-TECH' && l.action === 'provision_college');
  assert(hasProvisionB, 'Audit log contains provisioning event for CITY-MED');
  assert(hasProvisionC, 'Audit log contains provisioning event for APEX-TECH');

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

runIsolationSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
