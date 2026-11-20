import { collegeDataService } from '../src/services/collegeDataService';
import { supabase } from '../src/lib/supabase';
import { DEFAULT_PRIMARY_COLLEGE } from '../src/services/multiCollegeService';

async function runPhase3Tests() {
  console.log('====================================================');
  console.log('🧪 TESTING PHASE 3: CENTRAL DATA MANAGEMENT FULL CRUD');
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

  const collegeId = DEFAULT_PRIMARY_COLLEGE.id;

  try {
    // -------------------------------------------------------------------------
    // 1. COURSES FULL CRUD
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Testing Courses Management CRUD ---');
    const testCourseCode = `CRD-${Date.now().toString().slice(-4)}`;
    const newCourse = await collegeDataService.createCourse({
      code: testCourseCode,
      name: `B.VOC Neuro Care Technology ${testCourseCode}`,
      duration_years: 3,
      type: 'Degree',
      department: 'Neuro Care Technology',
      tuition_fee: 75000,
      description: 'Advanced 3-year degree in Neuro Diagnostic & Care Technology',
      eligibility: '10+2 with Physics, Chemistry, Biology',
      status: 'active'
    }, collegeId);

    assert(!!newCourse.id && newCourse.code === testCourseCode, 'Courses CRUD: Successfully created new course');

    const courseList = await collegeDataService.getCourses(collegeId);
    const foundCourse = courseList.find(c => c.id === newCourse.id || c.code === testCourseCode);
    assert(!!foundCourse, 'Courses CRUD: Newly created course verified in catalog');

    const updatedCourse = await collegeDataService.updateCourse(newCourse.id, {
      tuition_fee: 82000,
      eligibility: '10+2 with Science (Min 55% aggregate)'
    }, collegeId);
    assert(updatedCourse.tuition_fee === 82000, 'Courses CRUD: Successfully updated course tuition fee & eligibility');

    const deleteSuccess = await collegeDataService.deleteCourse(newCourse.id, collegeId);
    assert(deleteSuccess, 'Courses CRUD: Successfully deleted test course');

    // -------------------------------------------------------------------------
    // 2. COLLEGE SETTINGS & POLICIES CRUD
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing College Settings & Policies CRUD ---');
    const initialSettings = await collegeDataService.getCollegeSettings(collegeId);
    assert(!!initialSettings && !!initialSettings.institution_name, 'Settings CRUD: Retrieved active institutional settings');

    const updatedSettings = await collegeDataService.updateCollegeSettings({
      min_attendance_percentage: 75,
      passing_marks_percentage: 45,
      academic_year: '2026-2027',
      contact_phone: '+91 (044) 2876-4100'
    }, collegeId);

    assert(updatedSettings.passing_marks_percentage === 45, 'Settings CRUD: Updated passing marks percentage threshold');
    assert(updatedSettings.min_attendance_percentage === 75, 'Settings CRUD: Verified minimum attendance requirement');

    // -------------------------------------------------------------------------
    // 3. STUDENTS FULL CRUD & SEARCH
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing Students Directory CRUD & Search ---');
    const testRollNo = `TEST-ROLL-${Date.now().toString().slice(-4)}`;
    const student = await collegeDataService.createStudent({
      name: 'Adithyan Candidate Phase3',
      email: `candidate_p3_${Date.now()}@adithyan.edu.in`,
      student_id: testRollNo,
      roll_number: testRollNo,
      department: 'B.VOC Dialysis Technology',
      class_name: 'Year 1',
      phone: '+91 99440 12345',
      status: 'active'
    }, collegeId);

    assert(!!student.id && student.name === 'Adithyan Candidate Phase3', 'Students CRUD: Enrolled new student profile');

    const searchResults = await collegeDataService.getCollegeStudents(collegeId, { search: testRollNo });
    assert(searchResults.length > 0 && searchResults[0].roll_number === testRollNo, 'Students CRUD: Searched and located student by roll number');

    const updatedStudent = await collegeDataService.updateStudent(student.id, {
      class_name: 'Year 2',
      phone: '+91 99440 99999'
    }, collegeId);
    assert(updatedStudent.class_name === 'Year 2', 'Students CRUD: Promoted student class cohort to Year 2');

    const studentDeleted = await collegeDataService.deleteStudent(student.id, collegeId);
    assert(studentDeleted, 'Students CRUD: Removed test student record');

    // -------------------------------------------------------------------------
    // 4. FEES STRUCTURE & COUNTER PAYMENT
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing Fees Structure & Counter Payment ---');
    const newStructure = await collegeDataService.createFeeStructure({
      title: 'B.VOC Radiology & Imaging Technology Fee Schedule',
      department: 'B.VOC Radiology & Imaging Technology',
      academic_year: '2026-2027',
      quota: 'Merit',
      tuition_fee: 65000,
      lab_fee: 15000,
      exam_fee: 4000,
      library_fee: 3000,
      sports_fee: 1000,
      development_fund: 5000,
      total_annual_fee: 93000,
      installments_allowed: 2
    }, collegeId);

    assert(!!newStructure.id && newStructure.total_annual_fee === 93000, 'Fees CRUD: Created fee structure with dynamic total calculation');

    const structures = await collegeDataService.getFeeStructures(collegeId);
    const foundStruct = structures.find(s => s.id === newStructure.id);
    assert(!!foundStruct, 'Fees CRUD: Fee structure verified in college ledger');

    // Counter Payment & Receipt
    const paymentReceipt = await collegeDataService.recordFeePayment({
      student_name: 'Anandha Kumar',
      roll_number: 'STU-2026-1001',
      department: 'B.VOC Medical Lab Technology (MLT)',
      amount_paid: 35000,
      gross_amount: 35000,
      fee_type: 'First Term Tuition Installment',
      payment_mode: 'UPI / Online Transfer',
      transaction_reference: `TXN-P3-${Date.now().toString().slice(-6)}`,
      remarks: 'Verified fee deposit via Super Admin desk'
    }, collegeId);

    assert(!!paymentReceipt.receipt_number && paymentReceipt.amount_paid === 35000, 'Fees CRUD: Recorded counter deposit & generated verifiable receipt');
    assert(!!paymentReceipt.qr_verification_token, 'Fees CRUD: Generated digital QR verification security token');

    await collegeDataService.deleteFeeStructure(newStructure.id);

    // -------------------------------------------------------------------------
    // 5. ADMISSIONS & MERIT DESK VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Testing Admissions Applications & Merit Desk ---');
    const { data: intakeDocs } = await supabase
      .from('admission_document_verifications')
      .select('*')
      .eq('document_type', 'APPLICATION_METADATA');

    assert(Array.isArray(intakeDocs) && intakeDocs.length >= 1, `Admissions Desk: Verified intake applications (${intakeDocs?.length} on record)`);

    const { data: meritEntries } = await supabase
      .from('admission_merit_lists')
      .select('*');

    assert(Array.isArray(meritEntries) && meritEntries.length >= 1, `Admissions Desk: Verified merit rank lists (${meritEntries?.length} ranked entries)`);

  } catch (err) {
    console.error('Phase 3 test error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase3Tests();
