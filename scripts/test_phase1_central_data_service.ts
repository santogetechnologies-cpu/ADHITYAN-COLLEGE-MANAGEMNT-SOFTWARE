import { collegeDataService, DataChangeEventPayload } from '../src/services/collegeDataService';
import { OFFICIAL_COURSES, getCollegeCourses } from '../src/constants/courses';

async function runPhase1Tests() {
  console.log('====================================================');
  console.log('🧪 TESTING PHASE 1: CENTRAL DATA SERVICE & COURSE DISCONNECT');
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
    // Test 1: Active College context
    const initialContext = collegeDataService.getCollegeContext();
    assert(!!initialContext, 'Test 1: College context is initialized');

    // Test 2: Fetch courses
    const courses = await collegeDataService.getCourses(initialContext, true);
    assert(Array.isArray(courses) && courses.length >= 9, `Test 2: Fetched ${courses.length} courses from collegeDataService`);

    // Test 3: OFFICIAL_COURSES is synchronized
    assert(OFFICIAL_COURSES.length >= 9, `Test 3: OFFICIAL_COURSES in-memory array synchronized (${OFFICIAL_COURSES.length} courses)`);

    // Test 4: Dynamic helper getCollegeCourses()
    const dynamicCourses = await getCollegeCourses(initialContext);
    assert(dynamicCourses.length === courses.length, `Test 4: getCollegeCourses() helper returned ${dynamicCourses.length} courses`);

    // Test 5: Event dispatch on data change
    let eventFired = false;
    let eventDetail: any = null;
    const testHandler = (e: any) => {
      eventFired = true;
      eventDetail = e.detail;
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('college_data_updated', testHandler);
    }

    // Test 6: Create new Course
    const testCourseName = `Test Biomedical Engineering ${Date.now()}`;
    const createdCourse = await collegeDataService.createCourse({
      code: 'TEST-BME',
      name: testCourseName,
      duration_years: 4,
      type: 'Degree',
      department: 'Biomedical Engineering',
      tuition_fee: 95000,
      description: 'Test 4-Year B.Tech Biomedical Engineering',
      eligibility: '10+2 with Physics, Chemistry, Math/Bio',
      status: 'active'
    });

    assert(createdCourse.id && createdCourse.name === testCourseName, 'Test 6: Created course via collegeDataService');

    // Test 7: Verify newly created course is in OFFICIAL_COURSES
    const inOfficial = OFFICIAL_COURSES.find(c => c.name === testCourseName);
    assert(!!inOfficial, 'Test 7: Newly created course dynamically available in OFFICIAL_COURSES');

    // Test 8: Update Course
    const updated = await collegeDataService.updateCourse(createdCourse.id, {
      tuition_fee: 105000,
      description: 'Updated fee and curriculum'
    });
    assert(updated.tuition_fee === 105000, 'Test 8: Course updated successfully');

    // Test 9: Delete Course
    const deleted = await collegeDataService.deleteCourse(createdCourse.id);
    assert(deleted === true, 'Test 9: Course deleted cleanly');
    const stillInOfficial = OFFICIAL_COURSES.find(c => c.id === createdCourse.id);
    assert(!stillInOfficial, 'Test 9b: Deleted course removed from OFFICIAL_COURSES');

    // Test 10: Institutional Settings
    const settings = await collegeDataService.getCollegeSettings();
    assert(!!settings && !!settings.institution_name, `Test 10: Retrieved settings for "${settings.institution_name}"`);

    // Test 11: Update Settings
    const updatedSettings = await collegeDataService.updateCollegeSettings({
      min_attendance_percentage: 78
    });
    assert(updatedSettings.min_attendance_percentage === 78, 'Test 11: Updated institutional settings');

    // Test 12: Students Management CRUD
    const testStudent = await collegeDataService.createStudent({
      name: 'Adithyan Test Candidate',
      email: `candidate_${Date.now()}@test.edu`,
      student_id: `ADM-TEST-${Date.now().toString().slice(-4)}`,
      roll_number: `ROLL-TEST-${Date.now().toString().slice(-4)}`,
      department: 'B.VOC Medical Lab Technology (MLT)',
      class_name: 'Year 1'
    });
    assert(!!testStudent.id && testStudent.name === 'Adithyan Test Candidate', 'Test 12: Created student in database');

    const fetchedStudents = await collegeDataService.getCollegeStudents(initialContext, { search: 'Adithyan Test Candidate' });
    assert(fetchedStudents.length > 0, `Test 12b: Verified student searchable in profile repository (${fetchedStudents.length} found)`);

    // Clean up test student
    await collegeDataService.deleteStudent(testStudent.id);

    // Test 13: Fee Structures CRUD
    const feeStructures = await collegeDataService.getFeeStructures();
    assert(Array.isArray(feeStructures), `Test 13: Retrieved fee structures (${feeStructures.length} records)`);

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

runPhase1Tests();
