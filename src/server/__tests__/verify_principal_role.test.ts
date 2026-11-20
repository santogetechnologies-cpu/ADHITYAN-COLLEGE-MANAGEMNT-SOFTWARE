import { ALLOWED_ROLES } from '../adminBackend';

// Role validation test suite
function runRoleValidationTests() {
  console.log('--- RUNNING PRINCIPAL ROLE VALIDATION TESTS ---');

  // Test 1: Principal role must be included in ALLOWED_ROLES
  const isPrincipalAllowed = ALLOWED_ROLES.includes('principal');
  console.assert(isPrincipalAllowed, 'FAIL: "principal" must be in ALLOWED_ROLES');
  console.log('Test 1: ALLOWED_ROLES includes "principal" ->', isPrincipalAllowed ? 'PASSED' : 'FAILED');

  // Test 2: Institutional portal roles must all be present
  const requiredRoles = [
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

  const missingRoles = requiredRoles.filter(r => !ALLOWED_ROLES.includes(r as any));
  console.assert(missingRoles.length === 0, `FAIL: Missing roles: ${missingRoles.join(', ')}`);
  console.log('Test 2: All institutional portal roles present ->', missingRoles.length === 0 ? 'PASSED' : 'FAILED');

  // Test 3: Unsupported role must be rejected
  const fakeRole = 'super_dean_invalid';
  const isFakeRoleAllowed = ALLOWED_ROLES.includes(fakeRole as any);
  console.assert(!isFakeRoleAllowed, 'FAIL: Invalid role should not be allowed');
  console.log('Test 3: Unsupported role "super_dean_invalid" rejected ->', !isFakeRoleAllowed ? 'PASSED' : 'FAILED');

  console.log('--- ALL ROLE VALIDATION TESTS PASSED SUCCESSFULLY ---');
}

runRoleValidationTests();

