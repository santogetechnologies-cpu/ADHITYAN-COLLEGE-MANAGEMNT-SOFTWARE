import { handleAdminUserOperation } from '../adminBackend';
import { db } from '../../services/supabase/database';
import { getAllAcademicClasses, matchesStudentClass } from '../../config/academicClassRegistry';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) { throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'); }
const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✓ [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`✗ [FAIL] ${msg}`);
    failed++;
  }
}

async function run() {
  console.log('================================================================');
  console.log('AUDIT & VERIFICATION: TEACHER ASSIGNMENTS, BACKEND & DATABASE');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // TEST 1: TeacherAssignments.tsx Code Quality & Zero Dummy Checks
  // -------------------------------------------------------------
  console.log('--- TEST 1: TeacherAssignments.tsx Static Audit ---');
  const compPath = path.resolve('src/components/admin/TeacherAssignments.tsx');
  const compCode = fs.readFileSync(compPath, 'utf-8');

  assert(compCode.includes("import { supabase } from '@/lib/supabase';"), 'TeacherAssignments imports supabase client properly');
  assert(compCode.includes("import { getAllAcademicClasses, matchesStudentClass } from '@/config/academicClassRegistry';"), 'TeacherAssignments imports academicClassRegistry');
  assert(!compCode.includes('stuCount > 0 ? stuCount : 25'), 'No hardcoded fake student count (25) in TeacherAssignments');
  assert(!compCode.includes('stuCount > 0 ? stuCount : 30'), 'No hardcoded fake student count (30) in TeacherAssignments');
  assert(compCode.includes('db.assignClassToTeacher'), 'TeacherAssignments calls db.assignClassToTeacher on assignment');
  assert(compCode.includes('db.unassignClassFromTeacher'), 'TeacherAssignments calls db.unassignClassFromTeacher on removal');

  // -------------------------------------------------------------
  // TEST 2: Database Service Methods Audit
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: database.ts Service Methods Audit ---');
  assert(typeof db.assignClassToTeacher === 'function', 'db.assignClassToTeacher method exists');
  assert(typeof db.unassignClassFromTeacher === 'function', 'db.unassignClassFromTeacher method exists');
  assert(typeof db.deleteTimetableSlot === 'function', 'db.deleteTimetableSlot method exists');
  assert(typeof db.getStudentsByClass === 'function', 'db.getStudentsByClass method exists');

  // -------------------------------------------------------------
  // TEST 3: Create Teacher and Assign Classes via Database Service
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Teacher Assignment Workflow (Database Service) ---');
  const testEmail = `audit.teacher.${Date.now()}@example.com`;
  const adminToken = 'mock-test-role:admin:test-admin-uuid';

  const createRes = await handleAdminUserOperation(adminToken, {
    action: 'create_user',
    user: {
      email: testEmail,
      password: 'AuditPassword123!',
      name: 'Dr. Audit Paramedical',
      role: 'teacher',
      department: 'Clinical Faculty',
      assigned_classes: [
        'B.VOC Medical Lab Technology (MLT) - Year 1 (Semester 1)'
      ]
    }
  });

  assert(createRes.status === 200, 'Test teacher created successfully');
  const teacherId = createRes.body?.user?.id;
  assert(Boolean(teacherId), `Teacher created with UUID ${teacherId}`);

  // Check initial teacher assignment
  const initialRosters = await db.getTeacherAssignedClassRosters(teacherId, 'Dr. Audit Paramedical');
  assert(initialRosters.length === 1, `Teacher has 1 initial class roster (Found: ${initialRosters.length})`);
  assert(initialRosters[0]?.className === 'B.VOC Medical Lab Technology (MLT) - Year 1 (Semester 1)', 'Initial roster is MLT Year 1 Semester 1');

  // Assign a second class via db.assignClassToTeacher
  const secondClass = 'B.VOC Dialysis Technology - Year 2 (Semester 3)';
  const assignOk = await db.assignClassToTeacher(teacherId, secondClass, 'Dialysis Principles & Water Treatment', 'subject_teacher');
  assert(assignOk === true, 'db.assignClassToTeacher succeeded for Dialysis Year 2');

  // Verify second class appears in rosters
  const updatedRosters = await db.getTeacherAssignedClassRosters(teacherId, 'Dr. Audit Paramedical');
  assert(updatedRosters.length === 2, `Teacher now has 2 assigned class rosters (Found: ${updatedRosters.length})`);
  const hasDialysis = updatedRosters.some(r => r.className === secondClass);
  assert(hasDialysis, 'Second class roster contains Dialysis Year 2 Semester 3');

  // Verify timetable slot was created
  const teacherSlots = await db.getTeacherTimetables(teacherId, 'Dr. Audit Paramedical');
  const slotMatch = teacherSlots.find(s => s.class_name === secondClass && s.subject === 'Dialysis Principles & Water Treatment');
  assert(Boolean(slotMatch), 'Timetable slot created with matching class and subject');

  // -------------------------------------------------------------
  // TEST 4: Backend assign_teacher_classes Action & Permissions
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Backend assign_teacher_classes Action & Permissions ---');
  // Student role must be forbidden
  const forbiddenRes = await handleAdminUserOperation('mock-test-role:student:test-student-uuid', {
    action: 'assign_teacher_classes',
    teacherId,
    assigned_classes: [secondClass]
  });
  assert(forbiddenRes.status === 403, 'Student cannot invoke assign_teacher_classes (Status: 403)');

  // Principal role must be authorized
  const thirdClass = 'B.VOC Cardiac Care Technology - Year 3 (Semester 5)';
  const principalRes = await handleAdminUserOperation('mock-test-role:principal:test-principal-uuid', {
    action: 'assign_teacher_classes',
    teacherId,
    assigned_classes: [secondClass, thirdClass]
  });
  assert(principalRes.status === 200, 'Principal successfully invoked assign_teacher_classes (Status: 200)');
  assert(principalRes.body?.assigned_classes?.length === 2, 'Principal set 2 classes via backend action');

  // Verify teacher rosters now reflect Principal updates
  const principalRosters = await db.getTeacherAssignedClassRosters(teacherId, 'Dr. Audit Paramedical');
  assert(principalRosters.length === 2, `Teacher now has 2 classes after Principal update (Found: ${principalRosters.length})`);
  assert(principalRosters.some(r => r.className === thirdClass), 'Teacher now has Cardiac Care Year 3');

  // -------------------------------------------------------------
  // TEST 5: Unassign Class from Teacher
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Unassign Class Workflow ---');
  const unassignOk = await db.unassignClassFromTeacher(teacherId, secondClass);
  assert(unassignOk === true, 'db.unassignClassFromTeacher returned true');

  const afterUnassignRosters = await db.getTeacherAssignedClassRosters(teacherId, 'Dr. Audit Paramedical');
  assert(afterUnassignRosters.length === 1, `Teacher has 1 class left after unassigning Dialysis (Found: ${afterUnassignRosters.length})`);
  assert(!afterUnassignRosters.some(r => r.className === secondClass), 'Removed Dialysis class is gone from teacher rosters');

  // Check that timetable slot was also deleted
  const remainingSlots = await db.getTeacherTimetables(teacherId, 'Dr. Audit Paramedical');
  const deletedSlotFound = remainingSlots.some(s => s.class_name === secondClass);
  assert(!deletedSlotFound, 'Timetable slot for removed class was successfully cleaned up');

  // -------------------------------------------------------------
  // TEST 6: getStudentsByClass Registry Matching
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: getStudentsByClass Matching ---');
  const all42 = getAllAcademicClasses();
  assert(all42.length === 42, `Registry provides 42 academic semester cohorts (Found: ${all42.length})`);

  // Verify matchesStudentClass accurately matches
  const mockStudent = {
    department: 'B.VOC Medical Lab Technology (MLT)',
    course: 'B.VOC Medical Lab Technology (MLT)',
    year: 'Year 1',
    semester: 'Semester 1',
    class_name: 'B.VOC Medical Lab Technology (MLT) - Year 1 (Semester 1)'
  };
  assert(matchesStudentClass('B.VOC Medical Lab Technology (MLT) - Year 1 (Semester 1)', mockStudent), 'matchesStudentClass matches exact semester');
  assert(!matchesStudentClass('B.VOC Medical Lab Technology (MLT) - Year 2 (Semester 3)', mockStudent), 'matchesStudentClass isolates wrong semester');

  // -------------------------------------------------------------
  // CLEANUP
  // -------------------------------------------------------------
  console.log('\n--- CLEANUP: Deleting Test Records ---');
  if (teacherId) {
    await sbAdmin.from('timetables').delete().or(`teacher_id.eq.${teacherId},teacher_name.eq.Dr. Audit Paramedical`);
    await sbAdmin.from('profiles').delete().eq('id', teacherId);
    await sbAdmin.auth.admin.deleteUser(teacherId);
    console.log(`✓ Cleaned up test teacher account and slots for ${teacherId}`);
  }

  console.log('\n================================================================');
  console.log(`VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
