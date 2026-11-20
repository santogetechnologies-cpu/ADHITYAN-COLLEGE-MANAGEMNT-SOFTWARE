import { createClient } from '@supabase/supabase-js';
import { db } from '../../services/supabase/database';
import { matchesStudentClass } from '../../config/academicClassRegistry';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) { throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'); }
const sbAdmin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function verifyTeacherPortalWorkflow() {
  console.log('================================================================');
  console.log('TEACHER PORTAL – STUDENT SYNC & CLASS WORKFLOW VERIFICATION');
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

  // 1. TEACHER AND STUDENT PROFILES
  console.log('--- 1. Teacher & Student Profiles in Central Supabase Database ---');
  const { data: teacher } = await sbAdmin.from('profiles').select('*').eq('email', 'teacher@gmail.com').single();
  assert(!!teacher && teacher.role === 'teacher', 'Teacher account exists with role "teacher"');

  const { data: student } = await sbAdmin.from('profiles').select('*').eq('email', 'student@gmail.com').single();
  assert(!!student && student.role === 'student', 'Student account exists with role "student"');

  // 2. CLASS ROSTER AND STUDENT ASSIGNMENT MATCHING
  console.log('\n--- 2. Class Assignment & Non-Duplication Matching ---');
  const rosters = await db.getTeacherAssignedClassRosters(teacher.id, teacher.name);
  assert(Array.isArray(rosters) && rosters.length >= 1, `Teacher has ${rosters.length} assigned class rosters`);

  const year1Roster = rosters.find(r => r.className === 'B.VOC Cardiac Care Technology - Year 1 (Semester 1)');
  assert(!!year1Roster, 'Year 1 (Semester 1) class roster is present');
  assert(year1Roster?.totalStudents === 1, `Year 1 (Semester 1) contains exact enrolled student (found: ${year1Roster?.totalStudents})`);
  assert(year1Roster?.students.some(s => s.id === student.id), 'Enrolled student ID matches student@gmail.com');

  const otherRosters = rosters.filter(r => r.className !== 'B.VOC Cardiac Care Technology - Year 1 (Semester 1)');
  const otherRosterStudentsCount = otherRosters.reduce((acc, r) => acc + r.totalStudents, 0);
  assert(otherRosterStudentsCount === 0, `No student leakage to other classes (Year 2/Year 3/Hospital Admin count = ${otherRosterStudentsCount})`);

  // 3. STUDENT-TEACHER ASSIGNMENT & SUBMISSION SYNCHRONIZATION
  console.log('\n--- 3. Real-Time Assignment & Submission Synchronization ---');
  let testAssignmentId = '';
  let testSubmissionId = '';

  try {
    // A. Teacher creates assignment for this class
    const createdAssignment = await db.createAssignment({
      title: 'Automated Sync Verification Assignment',
      subject: 'Cardiac Care Diagnostic Protocols',
      description: 'End-to-end sync verification between teacher and student portals.',
      type: 'assignment',
      priority: 'high',
      due_date: new Date(Date.now() + 86400000).toISOString(),
      classes: ['B.VOC Cardiac Care Technology - Year 1 (Semester 1)'],
      teacher_id: teacher.id,
      teacher_name: teacher.name,
      attachments: []
    });

    assert(!!createdAssignment && !!createdAssignment.id, 'Teacher: Assignment successfully created in Supabase database');
    testAssignmentId = createdAssignment?.id || '';

    // B. Student fetches assignments for their class
    const studentAssignments = await db.getAssignments(student.class_name);
    const foundInStudentPortal = studentAssignments.some(a => a.id === testAssignmentId);
    assert(foundInStudentPortal, 'Student: Assignment appeared in Student Portal for matching class');

    // C. Student submits coursework
    const submission = await db.submitAssignment({
      assignment_id: testAssignmentId,
      student_id: student.id,
      student_name: student.name,
      subject: 'Cardiac Care Diagnostic Protocols',
      submission_text: 'Verification coursework submitted by student.',
      attachment_url: 'https://storage.adithyan.edu.in/assignments/test-report.pdf',
      status: 'submitted'
    });

    assert(!!submission && !!submission.id, 'Student: Coursework submission persisted in Supabase database');
    testSubmissionId = submission?.id || '';

    // D. Teacher grades the submission
    const gradeOk = await db.gradeAssignmentSubmission(testSubmissionId, 95, 'Outstanding diagnostic methodology.');
    assert(gradeOk, 'Teacher: Assignment submission graded with 95% and feedback');

    // E. Verify student sees updated grade
    const { data: updatedSub } = await sbAdmin.from('assignment_submissions').select('*').eq('id', testSubmissionId).single();
    assert(updatedSub?.status === 'graded' && updatedSub?.score === 95, 'Sync: Student submission updated to "graded" with score 95%');

  } finally {
    // Clean up test records
    if (testSubmissionId) {
      await sbAdmin.from('assignment_submissions').delete().eq('id', testSubmissionId);
    }
    if (testAssignmentId) {
      await sbAdmin.from('assignments').delete().eq('id', testAssignmentId);
    }
  }

  // 4. ATTENDANCE SYNCHRONIZATION
  console.log('\n--- 4. Teacher-Student Attendance Synchronization ---');
  let testAttRecordId = '';
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: attRecord, error: attErr } = await sbAdmin
      .from('student_attendance')
      .insert({
        student_id: student.id,
        date: today,
        status: 'present',
        subject: 'Cardiac Anatomy',
        remarks: 'Verified attendance sync test',
        recorded_by: teacher.id
      })
      .select()
      .single();

    assert(!attErr && !!attRecord, 'Teacher: Period attendance marked in Supabase database', attErr ? JSON.stringify(attErr) : undefined);
    testAttRecordId = attRecord?.id || '';

    const studentAtt = await db.getStudentAttendance(student.id);
    const recordFound = studentAtt.some(a => a.date === today && a.status === 'present');
    assert(recordFound, 'Student: Attendance record synchronized into Student Portal');
  } finally {
    if (testAttRecordId) {
      await sbAdmin.from('student_attendance').delete().eq('id', testAttRecordId);
    }
  }

  // 5. DAILY LESSON UPDATE SYNCHRONIZATION
  console.log('\n--- 5. Daily Lesson Updates Synchronization ---');
  let testUpdateId = '';
  try {
    const today = new Date().toISOString().split('T')[0];
    const createdUpdate = await db.createDailyTeachingUpdate({
      subject: 'Electrocardiography',
      class_name: 'B.VOC Cardiac Care Technology - Year 1 (Semester 1)',
      date: today,
      topics_covered: ['12-lead ECG electrode placement', 'P-QRS-T waveform analysis'],
      important_topics: ['ST-segment elevation myocardial infarction patterns'],
      pyq: ['Explain anatomical positioning of precordial chest leads V1-V6.'],
      next_class_prep: 'Review cardiac conduction pathway physiology.',
      teacher_id: teacher.id,
      teacher_name: teacher.name
    });

    assert(!!createdUpdate && !!createdUpdate.id, 'Teacher: Daily lesson update posted to Supabase database');
    testUpdateId = createdUpdate?.id || '';

    const allUpdates = await db.getDailyTeachingUpdates();
    const updateFound = allUpdates.some(u => u.id === testUpdateId);
    assert(updateFound, 'Sync: Lesson update retrievable across portals');
  } finally {
    if (testUpdateId) {
      await sbAdmin.from('daily_teaching_updates').delete().eq('id', testUpdateId);
    }
  }

  console.log('\n================================================================');
  console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    throw new Error(`${failed} teacher workflow tests failed.`);
  }
}

verifyTeacherPortalWorkflow().catch(e => {
  console.error(e);
  process.exit(1);
});
