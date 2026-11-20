import { multiCollegeService, DEFAULT_PRIMARY_COLLEGE } from '../src/services/multiCollegeService';
import { collegeDataService } from '../src/services/collegeDataService';
import { INSTITUTIONAL_13_ROLES } from '../src/components/admin/superAdmin/liveCustomizer/RoleSelectionHub';

async function runPhase2Tests() {
  console.log('====================================================');
  console.log('🧪 TESTING PHASE 2: SUPER ADMIN TWO-TIER UI & MODE SWITCHER');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // Test 1: Verify default primary college
    assert(DEFAULT_PRIMARY_COLLEGE.id === '11111111-1111-1111-1111-111111111111', 'Test 1: Default primary college has deterministic ID');
    assert(DEFAULT_PRIMARY_COLLEGE.code === 'ADH-COLLEGE', 'Test 1b: Default primary college code is ADH-COLLEGE');

    // Test 2: List colleges
    const colleges = await multiCollegeService.listColleges();
    assert(Array.isArray(colleges) && colleges.length >= 1, `Test 2: Listed colleges count = ${colleges.length}`);

    // Test 3: Verify college data context synchronization
    collegeDataService.setCollegeContext(DEFAULT_PRIMARY_COLLEGE.id);
    assert(collegeDataService.getCollegeContext() === DEFAULT_PRIMARY_COLLEGE.id, 'Test 3: collegeDataService context aligns with active tenant');

    // Test 4: Verify 13 institutional roles registry for Mode 2 (Live Customizer)
    assert(INSTITUTIONAL_13_ROLES.length === 13, `Test 4: Institutional 13 roles count = ${INSTITUTIONAL_13_ROLES.length}`);
    const expectedRoles = [
      'student', 
      'teacher', 
      'principal', 
      'admin', 
      'finance_manager', 
      'parent', 
      'receptionist', 
      'store_manager', 
      'transport_driver', 
      'hr_manager', 
      'librarian', 
      'hostel_warden', 
      'placement_officer'
    ];
    const allFound = expectedRoles.every(r => INSTITUTIONAL_13_ROLES.some(meta => meta.key === r));
    assert(allFound, 'Test 4b: All 13 expected roles are present in the Live Customizer Hub');

    // Test 5: Provision a new isolated college tenant
    const testCollegeCode = `TEST-${Date.now().toString().slice(-4)}`;
    const provisionResult = await multiCollegeService.provisionCollege(
      {
        name: `Adithyan Test Campus ${Date.now().toString().slice(-4)}`,
        code: testCollegeCode,
        institution_type: 'Paramedical',
        contact_email: `admin@${testCollegeCode.toLowerCase()}.edu.in`,
        contact_phone: '+91 (044) 2800-0000',
        address: 'Coimbatore, TN',
        admin_account: {
          name: 'Campus Admin',
          email: `admin@${testCollegeCode.toLowerCase()}.edu.in`,
          password: 'Password@123'
        },
        academic_config: {
          programs: ['B.VOC MLT', 'B.VOC DT'],
          academicYears: ['2026-2027'],
          semesterStructure: 'Semester (1 to 6)',
          departments: ['MLT', 'DT']
        }
      },
      'superadmin@platform.adithyan.edu'
    );

    assert(provisionResult.success && !!provisionResult.college, `Test 5: Provisioned new isolated college "${testCollegeCode}"`);

    // Test 6: Verify new college exists in listing
    const updatedList = await multiCollegeService.listColleges();
    const foundNew = updatedList.find(c => c.code === testCollegeCode);
    assert(!!foundNew, 'Test 6: Newly provisioned college appears in colleges listing');

    // Test 7: Verify isolated configuration exists for new college
    if (provisionResult.college) {
      const newConfig = await multiCollegeService.getCollegeConfiguration(provisionResult.college.id);
      assert(!!newConfig && !!newConfig.roles, 'Test 7: Isolated configuration generated for new college tenant');
    }

  } catch (err) {
    console.error('Test suite error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2Tests();
