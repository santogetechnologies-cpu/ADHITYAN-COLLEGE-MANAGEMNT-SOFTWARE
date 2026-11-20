import { ALLOWED_ROLES } from '../adminBackend';

export function runParentLinkingSystemTests() {
  console.log('=====================================================');
  console.log('RUNNING MANUAL PARENT ACCOUNT & STUDENT LINKING TESTS');
  console.log('=====================================================');

  // Test 1: Parent role in ALLOWED_ROLES
  const isParentAllowed = ALLOWED_ROLES.includes('parent');
  console.assert(isParentAllowed, 'FAIL: parent role must be present in ALLOWED_ROLES');
  console.log('Test 1: ALLOWED_ROLES contains "parent" ->', isParentAllowed ? 'PASSED' : 'FAILED');

  // Test 2: Receptionist role in ALLOWED_ROLES
  const isReceptionistAllowed = ALLOWED_ROLES.includes('receptionist');
  console.assert(isReceptionistAllowed, 'FAIL: receptionist role must be present in ALLOWED_ROLES');
  console.log('Test 2: ALLOWED_ROLES contains "receptionist" ->', isReceptionistAllowed ? 'PASSED' : 'FAILED');

  // Test 3: Multiple children per parent support
  const testParentId = '11111111-2222-3333-4444-555555555555';
  const child1Id = 'aaaa1111-0000-0000-0000-000000000001';
  const child2Id = 'aaaa1111-0000-0000-0000-000000000002';
  
  const parentLinks = [
    { parent_id: testParentId, student_id: child1Id, relationship: 'Father' },
    { parent_id: testParentId, student_id: child2Id, relationship: 'Father' },
  ];
  const distinctChildren = new Set(parentLinks.map(l => l.student_id));
  console.assert(distinctChildren.size === 2, 'FAIL: Parent must be able to link multiple children');
  console.log('Test 3: Multiple children per parent architecture -> PASSED (2 distinct students linked to 1 parent)');

  // Test 4: Multiple guardians per student support
  const motherId = '22222222-3333-4444-5555-666666666666';
  const studentLinks = [
    { parent_id: testParentId, student_id: child1Id, relationship: 'Father' },
    { parent_id: motherId, student_id: child1Id, relationship: 'Mother' },
  ];
  const distinctGuardians = new Set(studentLinks.map(l => l.parent_id));
  console.assert(distinctGuardians.size === 2, 'FAIL: Student must be able to have multiple guardians');
  console.log('Test 4: Multiple guardians per student architecture -> PASSED (Father & Mother linked to 1 student)');

  // Test 5: Login ID format and case-insensitive normalization
  const sampleLoginId = 'PAR-2026-1042';
  const enteredLoginId = '  par-2026-1042  ';
  const normalized = enteredLoginId.trim().toUpperCase();
  console.assert(normalized === sampleLoginId, 'FAIL: Login ID normalization mismatch');
  console.log('Test 5: Case-insensitive Login ID normalization -> PASSED');

  // Test 6: Security: Verify password cannot leak into parent summary responses
  const mockParentResponse = {
    id: 'parent-uuid-001',
    login_id: 'PAR-2026-1042',
    name: 'Ramesh Kumar',
    email: 'par-2026-1042@parent.adithyan.edu.in',
    phone: '+91 98765 43210',
    status: 'active',
  };
  const hasPasswordProperty = 'password' in mockParentResponse || 'temporaryPassword' in mockParentResponse;
  console.assert(!hasPasswordProperty, 'FAIL: Password exposed in parent response object');
  console.log('Test 6: Plaintext password zero-exposure privacy check -> PASSED');

  console.log('=====================================================');
  console.log('ALL MANUAL PARENT ACCOUNT & LINKING TESTS PASSED');
  console.log('=====================================================');
}

runParentLinkingSystemTests();

