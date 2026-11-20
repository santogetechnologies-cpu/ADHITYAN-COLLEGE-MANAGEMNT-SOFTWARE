import { db } from '../../services/supabase/database';
import { handleAdminUserOperation } from '../adminBackend';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) { throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'); }
const adminToken = 'mock-test-role:admin:ed0ef274-5dd5-4775-accb-97119899cc00';

async function runStudentPortalCompleteWorkflowTests() {
  console.log('================================================================');
  console.log('STUDENT MODULE: COMPLETE AUDIT & FULL WORKFLOW VERIFICATION');
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

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const testSuffix = Date.now().toString().slice(-4);
  const testStudentEmail = `live_stu_${testSuffix}@adithyan.test.in`;
  const testParentPhone = `98111${testSuffix}`;
  let studentAuthId = '';
  let parentAuthId = '';
  let generatedStudentId = '';
  let createdAssignmentId = '';
  let createdSubmissionId = '';
  let createdConcernId = '';
  let createdOrderId = '';
  let createdTimetableId = '';
  let createdExamResultId = '';

  try {
    // -------------------------------------------------------------
    // STEP 1: Student Provisioning & Identity Verification
    // -------------------------------------------------------------
    console.log('\n--- 1. Student Identity & Profile Verification ---');
    const confirmRes = await handleAdminUserOperation(adminToken, {
      action: 'confirm_admission',
      student: {
        name: `Karthik Student ${testSuffix}`,
        email: testStudentEmail,
        phone: `91888${testSuffix}`,
        department: 'B.Sc Medical Laboratory Technology (B.Sc MLT)',
        class_name: 'Semester 1',
        date_of_birth: '2005-04-12',
        address: '12 College Road, Coimbatore, Tamil Nadu',
        previous_school: 'Adithyan Vidyalaya',
      },
      parent: {
        name: `Natarajan ${testSuffix}`,
        phone: testParentPhone,
        relationship: 'Father',
      },
    });

    assert(confirmRes.body.success === true, 'Student admission confirmed with transactional accounts');
    studentAuthId = confirmRes.body.student?.id;
    parentAuthId = confirmRes.body.parent?.id;
    generatedStudentId = confirmRes.body.student?.student_id;

    assert(generatedStudentId.startsWith('STU-2026-'), `Student ID generated: ${generatedStudentId}`);
    assert(confirmRes.body.student?.is_first_login === true, 'Student flagged for First-Time Password Setup');

    // Verify student profile in database
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', studentAuthId)
      .single();

    assert(!!profile, 'Student profile exists in database profiles table');
    assert(profile?.role === 'student', 'Profile role is strictly "student"');
    assert(profile?.roll_number === generatedStudentId, 'Roll number matches generated Student ID');
    assert(profile?.department === 'B.Sc Medical Laboratory Technology (B.Sc MLT)', 'Department matches enrolled course');

    // -------------------------------------------------------------
    // STEP 2: Attendance Workflow (Simple, Clean, Teacher-Updated)
    // -------------------------------------------------------------
    console.log('\n--- 2. Academic Attendance Workflow ---');
    // Teacher marks daily attendance entries
    const today = new Date().toISOString().split('T')[0];
    const { data: attRecord, error: attErr } = await supabaseAdmin
      .from('student_attendance')
      .insert([
        {
          student_id: studentAuthId,
          date: today,
          status: 'present',
          subject: 'Clinical Biochemistry',
          remarks: 'Present for enzymatic assay practical',
        },
        {
          student_id: studentAuthId,
          date: '2026-11-01',
          status: 'present',
          subject: 'Hematology & Blood Banking',
          remarks: 'Participated in blood smear session',
        },
        {
          student_id: studentAuthId,
          date: '2026-11-02',
          status: 'absent',
          subject: 'Medical Microbiology',
          remarks: 'Absent without prior intimation',
        },
      ])
      .select();

    assert(!attErr && !!attRecord, 'Teacher/Faculty marks daily attendance in student_attendance');

    // Retrieve attendance through database service
    const attendance = await db.getStudentAttendance(studentAuthId);
    assert(attendance.length >= 3, `Student retrieves ${attendance.length} attendance records`);

    const presentCount = attendance.filter((a: any) => a.status === 'present').length;
    const rate = Math.round((presentCount / attendance.length) * 100);
    assert(rate === 67, `Attendance percentage computed: ${rate}% (Detention alert threshold is 75%)`);
    assert(attendance[0].status === 'present', 'Attendance status correctly verified');

    // -------------------------------------------------------------
    // STEP 3: Class Timetable (View-Only Regular Weekly Table)
    // -------------------------------------------------------------
    console.log('\n--- 3. Class Timetable (Weekly View-Only Schedule) ---');
    // Admin/Teacher publishes a timetable slot
    const { data: ttSlot, error: ttErr } = await supabaseAdmin
      .from('timetables')
      .insert({
        class_name: 'Semester 1',
        day_of_week: 'Monday',
        start_time: '09:00',
        end_time: '10:00',
        subject: 'Hematology & Clinical Microscopy',
        teacher_name: 'Dr. M. Sangeetha',
        room: 'Lecture Hall 101',
      })
      .select()
      .single();

    assert(!ttErr && !!ttSlot, 'Admin/Teacher publishes weekly timetable slot');
    createdTimetableId = ttSlot?.id || '';

    // Student queries timetable view
    const timetables = await db.getTimetables({
      courseName: 'B.Sc Medical Laboratory Technology (B.Sc MLT)',
      yearSemester: 'Semester 1',
    });
    assert(Array.isArray(timetables) && timetables.length > 0, 'Student retrieves regular weekly class timetable');
    const matchedSlot = timetables.find(s => s.id === createdTimetableId);
    assert(!!matchedSlot, 'Published timetable slot visible to student');
    assert(matchedSlot?.day_of_week === 'Monday', 'Slot specifies working day: Monday');
    assert(matchedSlot?.teacher_name === 'Dr. M. Sangeetha', 'Slot specifies faculty teacher name');

    // -------------------------------------------------------------
    // STEP 4: Coursework, File Uploads & Teacher Review Workflow
    // -------------------------------------------------------------
    console.log('\n--- 4. Assignments, File Submissions & Grading ---');
    // Teacher creates an assignment
    const { data: newAssignment, error: assignErr } = await supabaseAdmin
      .from('assignments')
      .insert({
        title: `Clinical Pathology Worksheet ${testSuffix}`,
        subject: 'Clinical Pathology',
        classes: ['Semester 1'],
        description: 'Complete the laboratory analysis on blood smear examination and attach report.',
        due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
        type: 'assignment',
        priority: 'high',
      })
      .select()
      .single();

    createdAssignmentId = newAssignment?.id || '';
    assert(!assignErr && !!createdAssignmentId, 'Teacher posts new course assignment');

    // Student submits assignment with uploaded document
    const samplePdfDataUrl = 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXr...';
    const submitResult = await db.submitAssignment({
      assignment_id: createdAssignmentId,
      student_id: studentAuthId,
      student_name: `Karthik Student ${testSuffix}`,
      subject: 'Clinical Pathology',
      submission_text: 'Completed smear examination. All cell counts verified within standard range.',
      attachment_url: samplePdfDataUrl,
      status: 'submitted',
    });

    assert(!!submitResult && submitResult.assignment_id === createdAssignmentId, 'Student submits assignment with uploaded file attachment');
    createdSubmissionId = submitResult?.id || '';

    // Student resubmission test
    const resubmitResult = await db.submitAssignment({
      assignment_id: createdAssignmentId,
      student_id: studentAuthId,
      student_name: `Karthik Student ${testSuffix}`,
      subject: 'Clinical Pathology',
      submission_text: 'Updated smear examination with differential leukocyte count chart.',
      attachment_url: samplePdfDataUrl,
      status: 'submitted',
    });
    assert(!!resubmitResult, 'Student successfully resubmits assignment before review');

    // Teacher reviews and grades the submission
    const gradeSuccess = await db.gradeAssignmentSubmission(
      resubmitResult.id,
      95,
      'Excellent microscopic smear documentation and accurate differential count.'
    );
    assert(gradeSuccess === true, 'Teacher grades submission with score (95/100) and written feedback');

    // Verify student sees graded status and teacher score
    const submissions = await db.getAssignmentSubmissions(studentAuthId);
    const gradedSub = submissions.find((s: any) => s.assignment_id === createdAssignmentId);
    assert(gradedSub?.status === 'graded', 'Submission status updated to "graded" in student view');
    assert(gradedSub?.score === 95, 'Student sees score of 95/100 awarded by faculty');
    assert(!!gradedSub?.feedback, 'Student sees teacher evaluation remarks');

    // -------------------------------------------------------------
    // STEP 5: Performance Analytics & Semester Marks
    // -------------------------------------------------------------
    console.log('\n--- 5. Performance Analytics & Verified Marks ---');
    // Teacher/Admin enters exam marks
    const { data: newExamRes, error: examErr } = await supabaseAdmin
      .from('exam_results')
      .insert({
        exam_id: 'e1111111-1111-1111-1111-111111111111',
        student_id: studentAuthId,
        student_name: `Karthik Student ${testSuffix}`,
        class_name: 'Semester 1',
        subject: 'Clinical Pathology',
        marks_obtained: 88,
        max_marks: 100,
        grade: 'A',
      })
      .select()
      .single();

    assert(!examErr && !!newExamRes, 'Teacher/Admin records published exam marks in exam_results');
    createdExamResultId = newExamRes?.id || '';

    // Student retrieves performance marks
    const studentResults = await db.getExamResults(studentAuthId);
    assert(studentResults.length > 0, 'Student retrieves published assessment marks');
    const myResult = studentResults.find(r => r.id === createdExamResultId);
    assert(myResult?.marks_obtained === 88, 'Marks verified accurately as 88/100');
    assert(myResult?.grade === 'A', 'Verified grade confirmed as "A"');

    // -------------------------------------------------------------
    // STEP 6: Fees & Official Receipt Workflow
    // -------------------------------------------------------------
    console.log('\n--- 6. Fees, Payments & Receipt Generation ---');
    // Finance officer seeds fee record
    await supabaseAdmin.from('student_fees').insert({
      student_id: studentAuthId,
      student_name: `Karthik Student ${testSuffix}`,
      class_name: 'B.Sc Medical Laboratory Technology (B.Sc MLT)',
      term: 'Annual Tuition & Lab Composite Fee',
      total_due: 65000,
      paid_amount: 0,
      due_date: '2026-12-31',
      status: 'unpaid',
    });

    // Student makes fee payment
    const paymentRes = await db.processStudentFeePayment({
      studentId: studentAuthId,
      studentName: `Karthik Student ${testSuffix}`,
      amount: 25000,
      paymentMethod: 'Online_UPI',
    });

    assert(paymentRes.success === true, 'Student processes online fee payment of ₹25,000');

    // Generate official fee receipt
    const receiptNo = `AIP-REC-2026-${testSuffix}`;
    const receipt = await db.generateFeeReceipt({
      receipt_number: receiptNo,
      student_id: studentAuthId,
      student_name: `Karthik Student ${testSuffix}`,
      roll_number: generatedStudentId,
      department: 'B.Sc Medical Laboratory Technology (B.Sc MLT)',
      academic_year: '2026-2027',
      semester: 'Semester 1',
      fee_type: 'Semester Tuition & Composite Academic Installment',
      gross_amount: 25000,
      discount_applied: 0,
      amount_paid: 25000,
      balance_remaining: 40000,
      payment_mode: 'Online_UPI',
      transaction_reference: `TXN-UPI-${testSuffix}`,
      qr_verification_token: `QR-${receiptNo}`,
    });

    assert(!!receipt, `Official institutional fee receipt generated: ${receiptNo}`);

    const studentReceipts = await db.getFeeReceipts(studentAuthId);
    assert(studentReceipts.length > 0, 'Receipt is immediately available in student portal receipt ledger');

    // -------------------------------------------------------------
    // STEP 7: Campus Fleet Transit & Bus Information
    // -------------------------------------------------------------
    console.log('\n--- 7. Campus Bus & Transit Information ---');
    const busAssignment = await db.getStudentTransportAssignment(studentAuthId);
    assert(!!busAssignment.vehicle, 'Student accesses assigned campus fleet bus telematics');
    assert(busAssignment.vehicle?.vehicle_number.includes('TN-38-AD'), 'Standard institutional bus number verified');
    assert(!!busAssignment.vehicle?.driver_name, 'Driver identity accessible to student');

    // -------------------------------------------------------------
    // STEP 8: Student Mood & Wellbeing Check-in
    // -------------------------------------------------------------
    console.log('\n--- 8. Student Wellbeing & Mood Check-in ---');
    const moodRes = await db.submitStudentMoodCheckin({
      userId: studentAuthId,
      studentId: generatedStudentId,
      session: 'morning',
      mood: 'Happy',
      notes: 'Excited for microbiology culture practical session.',
      date: today,
    });
    assert(!!moodRes, 'Student logs daily session mood check-in (completely separate from attendance)');

    const todayMoods = await db.getTodayStudentMoodCheckin(studentAuthId);
    assert(todayMoods.morning?.mood === 'Happy', 'Mood check-in retrieved accurately for morning session');

    // -------------------------------------------------------------
    // STEP 9: Campus Store Orders
    // -------------------------------------------------------------
    console.log('\n--- 9. Campus Store & Supplies Ordering ---');
    const products = await db.getStoreProducts();
    assert(Array.isArray(products) && products.length > 0, 'Campus store products catalog retrieved');

    const sampleProduct = products[0];
    const orderRes = await db.placeStoreOrderAtomic({
      userId: studentAuthId,
      userName: `Karthik Student ${testSuffix}`,
      items: [{ id: sampleProduct.id, name: sampleProduct.name, price: sampleProduct.price, quantity: 1 }],
      totalAmount: sampleProduct.price,
    });

    assert(orderRes.success === true, 'Student places order for campus lab supplies/uniform');
    if (orderRes.orderId) createdOrderId = orderRes.orderId;

    const studentOrders = await db.getUserStoreOrders(studentAuthId);
    assert(studentOrders.length > 0, 'Placed order appears in student store order history');

    // -------------------------------------------------------------
    // STEP 10: Student Grievance / Complaints Lodging
    // -------------------------------------------------------------
    console.log('\n--- 10. Grievance & Complaints Lodging ---');
    const concern = await db.createConcern({
      student_id: studentAuthId,
      user_id: studentAuthId,
      student_name: `Karthik Student ${testSuffix}`,
      class_name: 'Semester 1',
      category: 'Laboratory & Equipment',
      priority: 'medium',
      subject: 'Spectrophotometer calibration required in Biochem Lab 2',
      description: 'The digital readout on machine B displays fluctuating optical density readings.',
      status: 'Pending',
      is_anonymous: false,
    });

    assert(!!concern && !!concern.id, 'Student lodges academic concern ticket');
    createdConcernId = concern?.id || '';

    const concernsList = await db.getStudentConcerns(studentAuthId);
    assert(concernsList.some((c: any) => c.id === createdConcernId), 'Concern ticket tracked in student complaints registry');

    // -------------------------------------------------------------
    // STEP 11: Student Profile & Settings Update
    // -------------------------------------------------------------
    console.log('\n--- 11. Profile & Settings Update ---');
    const updateSuccess = await db.updateProfile(studentAuthId, {
      phone: `91777${testSuffix}`,
    });
    assert(updateSuccess === true, 'Student updates contact details in profile settings');

    const { data: updatedProf } = await supabaseAdmin
      .from('profiles')
      .select('phone')
      .eq('id', studentAuthId)
      .single();
    assert(updatedProf?.phone === `91777${testSuffix}`, 'Updated phone number verified in database');

  } catch (err: any) {
    console.error('Test execution exception:', err);
    assert(false, 'Student complete workflow test threw exception', err.message);
  } finally {
    // -------------------------------------------------------------
    // CLEANUP TEST USERS & RECORDS (Preserving Admin untouched)
    // -------------------------------------------------------------
    console.log('\n--- CLEANUP: Removing Test Records & Test Users ---');
    if (createdTimetableId) {
      await supabaseAdmin.from('timetables').delete().eq('id', createdTimetableId);
    }
    if (createdExamResultId) {
      await supabaseAdmin.from('exam_results').delete().eq('id', createdExamResultId);
    }
    if (createdAssignmentId) {
      await supabaseAdmin.from('assignment_submissions').delete().eq('assignment_id', createdAssignmentId);
      await supabaseAdmin.from('assignments').delete().eq('id', createdAssignmentId);
    }
    if (createdConcernId) {
      await supabaseAdmin.from('concerns').delete().eq('id', createdConcernId);
    }
    if (studentAuthId) {
      await supabaseAdmin.from('student_attendance').delete().eq('student_id', studentAuthId);
      await supabaseAdmin.from('student_mood_checkins').delete().eq('user_id', studentAuthId);
      await supabaseAdmin.from('student_fees').delete().eq('student_id', studentAuthId);
      await supabaseAdmin.from('fee_receipts').delete().eq('student_id', studentAuthId);
      await supabaseAdmin.from('store_orders').delete().eq('user_id', studentAuthId);
      await supabaseAdmin.from('admission_document_verifications').delete().eq('verified_by', studentAuthId);
      await handleAdminUserOperation(adminToken, { action: 'delete_user', userId: studentAuthId });
      console.log(`Cleaned up student test user: ${studentAuthId}`);
    }
    if (parentAuthId) {
      await handleAdminUserOperation(adminToken, { action: 'delete_user', userId: parentAuthId });
      console.log(`Cleaned up parent test user: ${parentAuthId}`);
    }
  }

  console.log('\n================================================================');
  console.log(`STUDENT WORKFLOW VERIFICATION: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStudentPortalCompleteWorkflowTests();
