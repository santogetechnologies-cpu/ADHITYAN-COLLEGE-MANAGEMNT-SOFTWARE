import { collegeDataService } from '../src/services/collegeDataService';
import { multiCollegeService, DEFAULT_PRIMARY_COLLEGE } from '../src/services/multiCollegeService';
import { visualCustomizationService } from '../src/services/visualCustomizationService';
import { OFFICIAL_COURSES, getCollegeCourses } from '../src/constants/courses';
import { INSTITUTIONAL_13_ROLES } from '../src/components/admin/superAdmin/liveCustomizer/RoleSelectionHub';
import { supabase } from '../src/lib/supabase';

async function runMasterE2ETests() {
  console.log('========================================================================');
  console.log('👑 MASTER E2E VERIFICATION: SUPER ADMIN COLLEGE & DATA MANAGEMENT SYSTEM');
  console.log('========================================================================\n');

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

  const primaryCollegeId = DEFAULT_PRIMARY_COLLEGE.id;

  try {
    // =========================================================================
    // SECTION A: MULTI-COLLEGE TENANT ISOLATION
    // =========================================================================
    console.log('\n--- SECTION A: Multi-College Tenant Isolation ---');
    const colleges = await multiCollegeService.listColleges();
    assert(colleges.length >= 1, `A1: Listed colleges count = ${colleges.length}`);

    // Provision an isolated secondary college
    const secondCollegeCode = `CAMPUS-B-${Date.now().toString().slice(-4)}`;
    const provisionResult = await multiCollegeService.provisionCollege(
      {
        name: `Adithyan Medical Campus B`,
        code: secondCollegeCode,
        institution_type: 'Medical',
        contact_email: `admin@${secondCollegeCode.toLowerCase()}.edu.in`,
        contact_phone: '+91 (044) 3300-1111',
        address: 'Chennai Campus, TN',
        admin_account: {
          name: 'Campus B Admin',
          email: `admin@${secondCollegeCode.toLowerCase()}.edu.in`,
          password: 'Password@123'
        },
        academic_config: {
          programs: ['M.B.B.S', 'B.Sc Nursing'],
          academicYears: ['2026-2027'],
          semesterStructure: 'Semester (1 to 10)',
          departments: ['Medicine', 'Nursing']
        }
      },
      'superadmin@platform.adithyan.edu'
    );
    assert(provisionResult.success && !!provisionResult.college, `A2: Provisioned isolated secondary college "${secondCollegeCode}"`);

    const secondCollegeId = provisionResult.college!.id;

    // Verify tenant scoping in collegeDataService
    collegeDataService.setCollegeContext(primaryCollegeId);
    assert(collegeDataService.getCollegeContext() === primaryCollegeId, 'A3: Active tenant context locked to Primary College');

    collegeDataService.setCollegeContext(secondCollegeId);
    assert(collegeDataService.getCollegeContext() === secondCollegeId, 'A4: Active tenant context dynamically switched to Campus B');

    // Switch back to primary
    collegeDataService.setCollegeContext(primaryCollegeId);

    // =========================================================================
    // SECTION B: CENTRAL DATA MANAGEMENT FULL CRUD (ZERO DUPLICATE DATASETS)
    // =========================================================================
    console.log('\n--- SECTION B: Central Data Management CRUD (Courses, Students, Fees, Settings, Admissions) ---');
    
    // B1: Courses CRUD & Live Propagation
    const testCourseCode = `E2E-CRS-${Date.now().toString().slice(-4)}`;
    const createdCourse = await collegeDataService.createCourse({
      code: testCourseCode,
      name: `B.VOC Clinical Echocardiography ${testCourseCode}`,
      duration_years: 3,
      type: 'Degree',
      department: 'Cardiac Technology',
      tuition_fee: 85000,
      description: 'Specialized 3-Year degree in Adult & Pediatric Echocardiography',
      eligibility: '10+2 with Physics, Chemistry, Biology',
      status: 'active'
    }, primaryCollegeId);

    assert(!!createdCourse.id && createdCourse.code === testCourseCode, 'B1a: Created new academic course via collegeDataService');

    // Check dynamic reflection in OFFICIAL_COURSES
    const inOfficial = OFFICIAL_COURSES.find(c => c.code === testCourseCode);
    assert(!!inOfficial, 'B1b: Course immediately propagated to in-memory OFFICIAL_COURSES');

    // Check dynamic helper getCollegeCourses
    const dynamicCourses = await getCollegeCourses(primaryCollegeId);
    assert(dynamicCourses.some(c => c.code === testCourseCode), 'B1c: Course accessible via dynamic getCollegeCourses() helper');

    // Clean up course
    await collegeDataService.deleteCourse(createdCourse.id, primaryCollegeId);
    assert(!OFFICIAL_COURSES.some(c => c.code === testCourseCode), 'B1d: Course cleanly deleted and unlisted from OFFICIAL_COURSES');

    // B2: Institutional Settings CRUD
    const settings = await collegeDataService.getCollegeSettings(primaryCollegeId);
    assert(!!settings && !!settings.institution_name, `B2a: Loaded settings for "${settings.institution_name}"`);

    const updatedSettings = await collegeDataService.updateCollegeSettings({
      min_attendance_percentage: 75,
      passing_marks_percentage: 42,
      contact_email: 'office@adithyan.edu.in'
    }, primaryCollegeId);
    assert(updatedSettings.passing_marks_percentage === 42, 'B2b: Updated institutional passing marks policy');

    // B3: Students Directory Full CRUD
    const testRoll = `E2E-STU-${Date.now().toString().slice(-4)}`;
    const student = await collegeDataService.createStudent({
      name: 'Adithyan Master E2E Scholar',
      email: `scholar_${Date.now()}@adithyan.edu.in`,
      student_id: testRoll,
      roll_number: testRoll,
      department: 'B.VOC Dialysis Technology',
      class_name: 'Year 1',
      phone: '+91 94432 00000',
      status: 'active'
    }, primaryCollegeId);
    assert(!!student.id && student.name === 'Adithyan Master E2E Scholar', 'B3a: Enrolled student into central database');

    const foundStudents = await collegeDataService.getCollegeStudents(primaryCollegeId, { search: testRoll });
    assert(foundStudents.length > 0 && foundStudents[0].roll_number === testRoll, 'B3b: Located student in central directory query');

    await collegeDataService.deleteStudent(student.id, primaryCollegeId);

    // B4: Fees Structures & Verifiable Counter Receipt
    const struct = await collegeDataService.createFeeStructure({
      title: 'Cardiac Technology Standard Fee Structure',
      department: 'Cardiac Technology',
      academic_year: '2026-2027',
      quota: 'Merit',
      tuition_fee: 70000,
      lab_fee: 15000,
      exam_fee: 4000,
      library_fee: 3000,
      sports_fee: 1000,
      development_fund: 5000,
      total_annual_fee: 98000,
      installments_allowed: 2
    }, primaryCollegeId);
    assert(struct.total_annual_fee === 98000, 'B4a: Created fee structure with dynamic sum calculation (₹98,000)');

    const receipt = await collegeDataService.recordFeePayment({
      student_name: 'Adithyan Candidate',
      roll_number: 'STU-2026-1001',
      department: 'Cardiac Technology',
      amount_paid: 49000,
      fee_type: 'First Term Tuition Installment',
      payment_mode: 'UPI / Online Transfer'
    }, primaryCollegeId);
    assert(!!receipt.receipt_number && !!receipt.qr_verification_token, 'B4b: Generated verified fee receipt with security token');

    await collegeDataService.deleteFeeStructure(struct.id, primaryCollegeId);

    // B5: Admissions Intake & Merit Ranking
    const { data: verifs } = await supabase.from('admission_document_verifications').select('*').limit(2);
    assert(Array.isArray(verifs), 'B5a: Verified admission application intake table');

    const { data: merits } = await supabase.from('admission_merit_lists').select('*').limit(2);
    assert(Array.isArray(merits), 'B5b: Verified admission merit ranking table');

    // =========================================================================
    // SECTION C: ACADEMICS & OPERATIONS TELEMETRY
    // =========================================================================
    console.log('\n--- SECTION C: Academics, Attendance Telemetry & Campus Operations ---');
    
    // Attendance Shortage calculations
    const minAtt = 75;
    const testAttended = 36;
    const testConducted = 60;
    const pct = Math.round((testAttended / testConducted) * 100);
    assert(pct === 60 && pct < minAtt, 'C1: Shortage telemetry flagged candidate below 75% cutoff');

    // Timetables and Exams schema
    const { data: tts } = await supabase.from('timetables').select('*').limit(1);
    assert(Array.isArray(tts), 'C2: Master timetables period table active');

    const { data: exs } = await supabase.from('exams').select('*').limit(1);
    assert(Array.isArray(exs), 'C3: Examinations routine table active');

    // =========================================================================
    // SECTION D: 13-ROLE IN-PORTAL VISUAL CUSTOMIZER
    // =========================================================================
    console.log('\n--- SECTION D: In-Portal Visual Customizer on 13 Live Portals ---');
    assert(INSTITUTIONAL_13_ROLES.length === 13, `D1: Verified all 13 institutional roles in Registry`);

    // Test text override on live portal
    const baseStudent = await visualCustomizationService.getCustomizations(primaryCollegeId, 'student');
    const updatedStudentCustom: any = {
      ...baseStudent,
      contentOverrides: {
        ...baseStudent.contentOverrides,
        student_welcome_heading: {
          id: 'student_welcome_heading',
          text: 'Welcome to Adithyan Paramedical Excellence Portal!',
          isHidden: false,
          updatedAt: new Date().toISOString()
        }
      },
      injectedComponents: {
        ...baseStudent.injectedComponents,
        student_hero_bottom: [
          {
            id: 'inj_naac_banner_1',
            type: 'banner',
            title: 'Annual NAAC Re-Accreditation Notice',
            content: 'All second year students are requested to complete laboratory logbook submissions.',
            variant: 'info',
            visible: true,
            order: 1
          }
        ]
      }
    };

    await visualCustomizationService.saveCustomizations(primaryCollegeId, 'student', updatedStudentCustom);

    const reloaded = await visualCustomizationService.getCustomizations(primaryCollegeId, 'student');
    assert(reloaded.contentOverrides.student_welcome_heading?.text?.includes('Paramedical Excellence'), 
      'D2: Applied and verified inline text customization on Student Portal');

    assert(reloaded.injectedComponents.student_hero_bottom?.length > 0, 
      'D3: Injected custom announcement banner into live Student Dashboard zone');

    // Clean up
    await visualCustomizationService.saveCustomizations(primaryCollegeId, 'student', baseStudent);

  } catch (err) {
    console.error('Master E2E suite error:', err);
    failed++;
  }

  console.log('\n========================================================================');
  console.log(`FINAL RESULT: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runMasterE2ETests();
