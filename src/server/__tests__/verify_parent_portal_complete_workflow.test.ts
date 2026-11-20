import { db } from '../../services/supabase/database';
import { handleAdminUserOperation, handleResolveLoginId, handleFirstLoginChallenge, handleCompleteFirstLogin } from '../adminBackend';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) { throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'); }
const adminToken = 'mock-test-role:admin:ed0ef274-5dd5-4775-accb-97119899cc00';

async function runParentPortalCompleteWorkflowTests() {
  console.log('================================================================');
  console.log('PARENT MODULE: COMPLETE AUDIT & FULL WORKFLOW VERIFICATION TEST');
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
  const testParentPhone = `98222${testSuffix}`;
  const testParentEmail = `parent_${testSuffix}@adithyan.test.in`;
  const testWard1Email = `ward1_${testSuffix}@adithyan.test.in`;
  const testWard2Email = `ward2_${testSuffix}@adithyan.test.in`;

  // Secondary parent to verify strict account isolation
  const otherParentEmail = `other_parent_${testSuffix}@adithyan.test.in`;
  const otherWardEmail = `other_ward_${testSuffix}@adithyan.test.in`;

  let parentAuthId = '';
  let generatedParentId = '';
  let ward1AuthId = '';
  let generatedWard1Id = '';
  let ward2AuthId = '';
  let generatedWard2Id = '';

  let otherParentAuthId = '';
  let otherWardAuthId = '';

  let teacherAuthId = '';
  let createdAssignmentId = '';
  let createdSubmissionId = '';
  let createdExamId = '';
  let createdExamResultId = '';
  let createdTimetableId = '';
  let createdMessageId = '';
  let createdConcernId = '';
  let createdFeeReceiptNo = '';

  const assignedClassName = `Semester 1 - Cohort ${testSuffix}`;
  const assignedSubject = `Clinical Anatomy & Physiology ${testSuffix}`;

  try {
    // -------------------------------------------------------------
    // STEP 1: Parent & Ward Provisioning (Admission Confirmation)
    // -------------------------------------------------------------
    console.log('--- 1. Parent & Ward Provisioning ---');
    const confirmRes1 = await handleAdminUserOperation(adminToken, {
      action: 'confirm_admission',
      student: {
        name: `Ramesh Ward ${testSuffix}`,
        email: testWard1Email,
        phone: `91661${testSuffix}`,
        department: 'B.Sc Medical Laboratory Technology',
        class_name: assignedClassName,
        date_of_birth: '2005-06-15',
        address: '44 Gandhi Road, Coimbatore',
        previous_school: 'Adithyan Higher Secondary',
      },
      parent: {
        name: `Sundaram Parent ${testSuffix}`,
        email: testParentEmail,
        phone: testParentPhone,
        relationship: 'Father',
      },
    });

    assert(confirmRes1.body.success === true, 'Parent & Ward 1 created during admission confirmation');
    parentAuthId = confirmRes1.body.parent?.id;
    generatedParentId = confirmRes1.body.parent?.parent_id;
    ward1AuthId = confirmRes1.body.student?.id;
    generatedWard1Id = confirmRes1.body.student?.student_id;

    assert(Boolean(generatedParentId && generatedParentId.startsWith('PAR-2026-')), `Parent ID successfully generated: ${generatedParentId}`);

    // Verify parent profile in database
    const { data: parentProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', parentAuthId)
      .single();

    assert(Boolean(parentProfile && parentProfile.role === 'parent'), 'Parent profile verified in database with role "parent"');

    // -------------------------------------------------------------
    // STEP 2: Multi-Identifier Login Resolution
    // -------------------------------------------------------------
    console.log('\n--- 2. Multi-Identifier Login Resolution ---');
    const emailFromId = await handleResolveLoginId(generatedParentId, 'parent');
    assert(emailFromId === testParentEmail, `Parent ID resolves to registered email: ${emailFromId}`);

    const emailFromMobile = await handleResolveLoginId(testParentPhone, 'parent');
    assert(emailFromMobile === testParentEmail, `Parent Mobile resolves to registered email: ${emailFromMobile}`);

    const emailDirect = await handleResolveLoginId(testParentEmail, 'parent');
    assert(emailDirect === testParentEmail, `Direct Email login identifier resolved: ${emailDirect}`);

    // Strict role check: Student ID must NOT resolve as a parent
    const studentAsParent = await handleResolveLoginId(generatedWard1Id, 'parent');
    assert(studentAsParent === null, 'Student ID correctly rejected when attempting Parent login');

    // -------------------------------------------------------------
    // STEP 3: Multi-Ward Linking & Ward Isolation
    // -------------------------------------------------------------
    console.log('\n--- 3. Multi-Ward Linking & Strict Scope Isolation ---');
    // Provision a second child (Ward 2) for the same parent
    const confirmRes2 = await handleAdminUserOperation(adminToken, {
      action: 'confirm_admission',
      student: {
        name: `Deepa Ward ${testSuffix}`,
        email: testWard2Email,
        phone: `91662${testSuffix}`,
        department: 'B.Sc Dialysis Technology',
        class_name: 'Semester 2',
        date_of_birth: '2006-03-22',
        address: '44 Gandhi Road, Coimbatore',
        previous_school: 'Adithyan Higher Secondary',
      },
      parent: {
        name: `Sundaram Parent ${testSuffix}`,
        email: testParentEmail,
        phone: testParentPhone,
        relationship: 'Father',
      },
    });

    ward2AuthId = confirmRes2.body.student?.id;
    generatedWard2Id = confirmRes2.body.student?.student_id;

    // Link both wards to parent
    await db.linkParentToStudent(parentAuthId, ward1AuthId, 'Father');
    await db.linkParentToStudent(parentAuthId, ward2AuthId, 'Father');

    // Provision an unrelated parent and student to verify isolation
    const confirmResOther = await handleAdminUserOperation(adminToken, {
      action: 'confirm_admission',
      student: {
        name: `Unrelated Student ${testSuffix}`,
        email: otherWardEmail,
        phone: `91663${testSuffix}`,
        department: 'B.Sc Radiology Technology',
        class_name: 'Semester 3',
        date_of_birth: '2005-01-10',
        address: '10 Racecourse Road, Coimbatore',
        previous_school: 'Adithyan Vidyalaya',
      },
      parent: {
        name: `Other Parent ${testSuffix}`,
        email: otherParentEmail,
        phone: `98333${testSuffix}`,
        relationship: 'Mother',
      },
    });
    otherParentAuthId = confirmResOther.body.parent?.id;
    otherWardAuthId = confirmResOther.body.student?.id;
    await db.linkParentToStudent(otherParentAuthId, otherWardAuthId, 'Mother');

    // Retrieve all linked wards for parent 1
    const linkedWards1 = await db.getParentStudentLinks(parentAuthId);
    assert(linkedWards1.length >= 2, `Parent 1 retrieves ${linkedWards1.length} linked wards`);

    const hasWard1 = linkedWards1.some(l => l.student_id === ward1AuthId);
    const hasWard2 = linkedWards1.some(l => l.student_id === ward2AuthId);
    const hasUnrelated = linkedWards1.some(l => l.student_id === otherWardAuthId);

    assert(hasWard1 && hasWard2, 'Both linked wards (Ward 1 & Ward 2) present under parent account');
    assert(!hasUnrelated, 'STRICT ISOLATION: Unrelated student is completely excluded from parent account');

    // Retrieve linked wards for other parent
    const linkedWardsOther = await db.getParentStudentLinks(otherParentAuthId);
    assert(
      linkedWardsOther.length === 1 && linkedWardsOther[0].student_id === otherWardAuthId,
      'Other parent retrieves exclusively their own linked ward'
    );

    // -------------------------------------------------------------
    // STEP 4: Attendance Synchronization (Teacher -> Student & Parent)
    // -------------------------------------------------------------
    console.log('\n--- 4. Attendance Synchronization ---');
    const today = new Date().toISOString().split('T')[0];

    // Seed real attendance entries for Ward 1
    await supabaseAdmin.from('student_attendance').insert([
      { student_id: ward1AuthId, date: today, status: 'present', subject: assignedSubject },
      { student_id: ward1AuthId, date: '2026-11-01', status: 'present', subject: 'Hematology' },
      { student_id: ward1AuthId, date: '2026-11-02', status: 'absent', subject: 'Microbiology' },
    ]);

    const wardAttendance = await db.getStudentAttendance(ward1AuthId);
    assert(wardAttendance.length >= 3, `Parent retrieves ${wardAttendance.length} attendance records for Ward 1`);

    const todayAtt = wardAttendance.find(a => a.date === today && a.subject === assignedSubject);
    assert(Boolean(todayAtt && todayAtt.status === 'present'), 'Teacher attendance update immediately visible on Parent portal');

    const presentCount = wardAttendance.filter(a => a.status?.toLowerCase() === 'present').length;
    const rate = Math.round((presentCount / wardAttendance.length) * 100);
    assert(rate === 67, `Live attendance percentage calculated from real database records: ${rate}%`);

    // -------------------------------------------------------------
    // STEP 5: Academic Performance & Exams (Teacher -> Student & Parent)
    // -------------------------------------------------------------
    console.log('\n--- 5. Academic Performance & Published Marks ---');
    // Create teacher account to simulate faculty grading
    const { data: teacherUser } = await supabaseAdmin.auth.admin.createUser({
      email: `faculty_${testSuffix}@adithyan.test.in`,
      password: 'TemporaryPassword123!',
      email_confirm: true,
      user_metadata: { name: `Prof. Swaminathan ${testSuffix}`, role: 'teacher' },
    });
    teacherAuthId = teacherUser.user.id;
    await supabaseAdmin.from('profiles').upsert({
      id: teacherAuthId,
      name: `Prof. Swaminathan ${testSuffix}`,
      email: `faculty_${testSuffix}@adithyan.test.in`,
      role: 'teacher',
      department: 'Medical Laboratory Technology',
    });

    const exam = await db.createExam({
      name: `Mid-Semester Assessment ${testSuffix}`,
      term: 'Term 1',
      academic_year: '2026-2027',
      start_date: today,
      end_date: today,
      status: 'Scheduled',
    });
    createdExamId = exam?.id || 'e1111111-1111-1111-1111-111111111111';

    // Teacher records student result with feedback
    const recordedResult = await db.recordExamResult({
      exam_id: createdExamId,
      student_id: ward1AuthId,
      student_name: `Ramesh Ward ${testSuffix}`,
      class_name: assignedClassName,
      subject: assignedSubject,
      marks_obtained: 92,
      max_marks: 100,
      percentage: 92,
      grade: 'O',
      remarks: 'Outstanding analytical precision in physiological enzyme assays.',
    });
    assert(Boolean(recordedResult?.id), 'Teacher recorded exam result in database');
    createdExamResultId = recordedResult?.id || '';

    // Verify parent retrieves the published transcript
    const parentExamResults = await db.getExamResults(ward1AuthId);
    const wardTranscript = parentExamResults.find(r => r.student_id === ward1AuthId && r.subject === assignedSubject);
    assert(Boolean(wardTranscript), 'Ward examination transcript queryable by parent');
    assert(wardTranscript?.marks_obtained === 92, 'Actual marks obtained verified: 92/100 (zero dummy data)');
    assert(wardTranscript?.grade === 'O', 'Letter grade verified: O (Outstanding)');
    assert(
      wardTranscript?.remarks === 'Outstanding analytical precision in physiological enzyme assays.',
      'Teacher feedback and evaluation remarks displayed on Parent portal'
    );

    // -------------------------------------------------------------
    // STEP 6: Coursework, Homework & Grading Lifecycle
    // -------------------------------------------------------------
    console.log('\n--- 6. Coursework & Grading Lifecycle (Teacher -> Student -> Parent) ---');
    // 1. Teacher assigns homework
    const newAssign = await db.createAssignment({
      title: `Pathology Clinical Case ${testSuffix}`,
      subject: assignedSubject,
      classes: [assignedClassName],
      description: 'Prepare detailed notes on histopathology staining methods.',
      due_date: new Date(Date.now() + 5 * 86400000).toISOString(),
      type: 'assignment',
      priority: 'high',
      teacher_id: teacherAuthId,
      teacher_name: `Prof. Swaminathan ${testSuffix}`,
    });
    assert(Boolean(newAssign?.id), 'Teacher created assignment for ward class');
    createdAssignmentId = newAssign?.id || '';

    // Parent sees assignment for class
    const parentAsgs = await db.getAssignments(assignedClassName);
    assert(parentAsgs.some(a => a.id === createdAssignmentId), 'Parent sees newly created assignment for ward class');

    // 2. Student submits homework with attachment
    const { data: subRecord, error: subErr } = await supabaseAdmin
      .from('assignment_submissions')
      .insert({
        assignment_id: createdAssignmentId,
        student_id: ward1AuthId,
        student_name: `Ramesh Ward ${testSuffix}`,
        subject: assignedSubject,
        status: 'submitted',
        attachment_url: 'https://example.com/student_case_report.pdf',
        submission_text: 'Histopathology staining protocols and microphotographs attached.',
      })
      .select()
      .single();
    assert(!subErr && Boolean(subRecord?.id), 'Student submitted homework assignment');
    createdSubmissionId = subRecord?.id || '';

    // Parent sees submission status 'submitted'
    let parentSubs = await db.getAssignmentSubmissions(ward1AuthId);
    let matchSub = parentSubs.find(s => s.assignment_id === createdAssignmentId);
    assert(Boolean(matchSub && matchSub.status === 'submitted'), 'Parent portal displays submission status as "Submitted"');

    // 3. Teacher reviews and grades submission
    const gradeOk = await db.gradeAssignmentSubmission(
      createdSubmissionId,
      95,
      'Exemplary slide documentation and thorough methodology.'
    );
    assert(gradeOk === true, 'Teacher graded submission with marks and feedback');

    // Parent sees updated status 'graded', score and teacher feedback
    parentSubs = await db.getAssignmentSubmissions(ward1AuthId);
    matchSub = parentSubs.find(s => s.id === createdSubmissionId);
    assert(Boolean(matchSub && matchSub.status === 'graded'), 'Parent portal immediately updates status to "Graded"');
    assert(matchSub?.score === 95, 'Parent portal displays updated score: 95/100');
    assert(
      matchSub?.feedback === 'Exemplary slide documentation and thorough methodology.',
      'Parent portal displays teacher constructive feedback'
    );

    // -------------------------------------------------------------
    // STEP 7: Class Timetable Retrieval
    // -------------------------------------------------------------
    console.log('\n--- 7. Class Timetable Retrieval ---');
    const slot = await db.addTimetableSlot({
      class_name: assignedClassName,
      subject: assignedSubject,
      teacher_id: teacherAuthId,
      teacher_name: `Prof. Swaminathan ${testSuffix}`,
      day_of_week: 'Monday',
      start_time: '10:00',
      end_time: '11:00',
      room: 'LH-102',
    });
    assert(Boolean(slot?.id), 'Admin added timetable slot for ward class');
    createdTimetableId = slot?.id || '';

    const parentTimetables = await db.getTimetableSlots(assignedClassName);
    assert(
      parentTimetables.some(s => s.id === createdTimetableId),
      'Ward class timetable slots retrieved for Parent viewing'
    );

    // -------------------------------------------------------------
    // STEP 8: Finance Module Fees & Payment Verification
    // -------------------------------------------------------------
    console.log('\n--- 8. Fees, Online Payment & Official Receipts ---');
    await supabaseAdmin.from('student_fees').insert({
      student_id: ward1AuthId,
      student_name: `Ramesh Ward ${testSuffix}`,
      class_name: assignedClassName,
      total_due: 45000,
      paid_amount: 0,
      due_date: '2026-12-31',
      status: 'pending',
    });

    const wardFees = await db.getStudentFees(ward1AuthId);
    assert(wardFees.length > 0 && wardFees[0].total_due === 45000, 'Parent retrieves ward fee structure from Finance module');

    // Parent makes fee payment
    const payRes = await db.recordFeePayment({
      studentId: ward1AuthId,
      studentName: `Ramesh Ward ${testSuffix}`,
      amount: 15000,
      paymentMethod: 'Parent_Online_UPI',
      notes: 'Parent tuition installment payment',
    });
    assert(payRes.success === true, 'Parent processes fee installment payment of ₹15,000');

    // Generate formal fee receipt
    createdFeeReceiptNo = `AIP-PAR-REC-2026-${testSuffix}`;
    const receipt = await db.generateFeeReceipt({
      receipt_number: createdFeeReceiptNo,
      student_id: ward1AuthId,
      student_name: `Ramesh Ward ${testSuffix}`,
      roll_number: generatedWard1Id,
      department: 'B.Sc Medical Laboratory Technology',
      academic_year: '2026-2027',
      semester: 'Semester 1',
      fee_type: 'Parent Portal Academic Installment Payment',
      gross_amount: 15000,
      discount_applied: 0,
      amount_paid: 15000,
      balance_remaining: 30000,
      payment_mode: 'Parent_Online_UPI',
      transaction_reference: `UPI-${testSuffix}`,
      qr_verification_token: `QR-${createdFeeReceiptNo}`,
    });
    assert(Boolean(receipt), `Official fee receipt issued for download: ${createdFeeReceiptNo}`);

    const wardReceipts = await db.getFeeReceipts(ward1AuthId);
    assert(
      wardReceipts.some(r => r.receipt_number === createdFeeReceiptNo),
      'Receipt appears in Ward 1 fee payment ledger'
    );

    // -------------------------------------------------------------
    // STEP 9: Teacher Communication (Parent -> Teacher & Reply)
    // -------------------------------------------------------------
    console.log('\n--- 9. Teacher Communication & Message Threads ---');
    // Parent sends inquiry to assigned teacher
    const sentOk = await db.sendMessageToTeacher({
      sender_id: parentAuthId,
      sender_name: `Sundaram Parent ${testSuffix}`,
      sender_email: testParentEmail,
      teacher_id: teacherAuthId,
      teacher_name: `Prof. Swaminathan ${testSuffix}`,
      subject: `[Parent Inquiry - Ramesh Ward] Regarding Lab Practical Evaluation`,
      message: 'Respected Professor, could you please share guidance on the upcoming clinical histology lab?',
    });
    assert(sentOk === true, 'Parent sent direct inquiry to assigned teacher');

    // Teacher retrieves inquiry in inbox
    const teacherInbox = await db.getTeacherMessages(teacherAuthId);
    const teacherReceived = teacherInbox.find(m => m.sender_id === parentAuthId);
    assert(Boolean(teacherReceived), 'Assigned teacher received parent inquiry in inbox');
    createdMessageId = teacherReceived?.id || '';

    // Teacher replies to parent
    const replyOk = await db.replyTeacherMessage(
      createdMessageId,
      'Dear Parent, Ramesh is performing well. Please ensure he reviews the tissue fixation principles for chapter 4.'
    );
    assert(replyOk === true, 'Teacher replied to parent inquiry');

    // Parent sees reply in message history
    const parentMessages = await db.getTeacherMessages(parentAuthId);
    const receivedReply = parentMessages.find(m => m.sender_id === teacherAuthId && m.teacher_id === parentAuthId);
    assert(Boolean(receivedReply), 'Parent received teacher response in conversation history');

    // -------------------------------------------------------------
    // STEP 10: System Notifications & Attendance Shortage Alert
    // -------------------------------------------------------------
    console.log('\n--- 10. System Notifications & Shortage Alerts ---');
    const shortageNotif = await db.createNotification({
      user_id: parentAuthId,
      title: `Attendance Compliance Warning: Ramesh Ward`,
      message: 'Official notice: Ward attendance is currently 67%, below the mandatory 75% threshold.',
      type: 'warning',
      priority: 'high',
      is_read: false,
    });
    assert(Boolean(shortageNotif?.id), 'System successfully dispatched attendance shortage notice to parent account');

    const parentNotifs = await db.getNotifications(parentAuthId);
    assert(
      parentNotifs.some(n => n.id === shortageNotif?.id),
      'Parent portal notification center displays high-priority attendance compliance alert'
    );

  } catch (err: any) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    // -------------------------------------------------------------
    // STEP 11: Clean Teardown of Transient Test Data
    // -------------------------------------------------------------
    console.log('\n--- 11. Clean Teardown of Test Artifacts ---');
    try {
      if (createdTimetableId) await supabaseAdmin.from('timetables').delete().eq('id', createdTimetableId);
      if (createdSubmissionId) await supabaseAdmin.from('assignment_submissions').delete().eq('id', createdSubmissionId);
      if (createdAssignmentId) await supabaseAdmin.from('assignments').delete().eq('id', createdAssignmentId);
      if (createdExamResultId) await supabaseAdmin.from('exam_results').delete().eq('id', createdExamResultId);
      if (createdExamId) await supabaseAdmin.from('exams').delete().eq('id', createdExamId);
      if (createdMessageId) await supabaseAdmin.from('teacher_messages').delete().or(`sender_id.eq.${parentAuthId},teacher_id.eq.${parentAuthId}`);
      if (parentAuthId) await supabaseAdmin.from('notifications').delete().eq('user_id', parentAuthId);
      if (teacherAuthId) {
        await supabaseAdmin.from('profiles').delete().eq('id', teacherAuthId);
        await supabaseAdmin.auth.admin.deleteUser(teacherAuthId);
      }
      if (ward1AuthId) {
        await supabaseAdmin.from('student_attendance').delete().eq('student_id', ward1AuthId);
        await supabaseAdmin.from('student_fees').delete().eq('student_id', ward1AuthId);
        await supabaseAdmin.from('fee_receipts').delete().eq('student_id', ward1AuthId);
        await supabaseAdmin.from('parent_student_links').delete().eq('student_id', ward1AuthId);
        await handleAdminUserOperation(adminToken, { action: 'delete_user', userId: ward1AuthId });
      }
      if (ward2AuthId) {
        await supabaseAdmin.from('parent_student_links').delete().eq('student_id', ward2AuthId);
        await handleAdminUserOperation(adminToken, { action: 'delete_user', userId: ward2AuthId });
      }
      if (parentAuthId) {
        await supabaseAdmin.from('parent_student_links').delete().eq('parent_id', parentAuthId);
        await handleAdminUserOperation(adminToken, { action: 'delete_user', userId: parentAuthId });
      }
      if (otherWardAuthId) {
        await supabaseAdmin.from('parent_student_links').delete().eq('student_id', otherWardAuthId);
        await handleAdminUserOperation(adminToken, { action: 'delete_user', userId: otherWardAuthId });
      }
      if (otherParentAuthId) {
        await supabaseAdmin.from('parent_student_links').delete().eq('parent_id', otherParentAuthId);
        await handleAdminUserOperation(adminToken, { action: 'delete_user', userId: otherParentAuthId });
      }
      console.log('✓ All test records, profiles, and auth accounts cleanly purged.');
    } catch (cleanupErr) {
      console.warn('Cleanup note:', cleanupErr);
    }
  }

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runParentPortalCompleteWorkflowTests();
