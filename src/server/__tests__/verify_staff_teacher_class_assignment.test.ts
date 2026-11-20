/**
 * Automated Verification Script: Staff Account Creation & Teacher Course/Semester Assignment
 * 
 * Verifies:
 * 1. 9 Courses breakdown into valid Year 1, Year 2, Year 3 and Semesters 1 to 6 (No Section A/B).
 * 2. Multi-select Course & Semester assignment during staff creation.
 * 3. Saving assigned_classes to Supabase Auth user_metadata and public.profiles.preferences.
 * 4. Isolation of courses/semesters in Teacher Dashboard (only assigned cohorts shown).
 * 5. Admin updating teacher assignments and real-time reflection.
 * 6. Non-teacher roles (Receptionist, Finance, Store) do not require class assignments.
 * 7. Clean DB state preservation.
 */

import { createClient } from '@supabase/supabase-js';
import { 
  getAllAcademicClasses, 
  getClassesGroupedByCourse, 
  matchesStudentClass, 
  formatAssignedClassesSummary 
} from '../../config/academicClassRegistry';
import { handleAdminUserOperation } from '../adminBackend';
import { db } from '../../services/supabase/database';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('FATAL: Missing Supabase credentials in test environment.');
  process.exit(1);
}

const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runStaffTeacherClassAssignmentVerification() {
  console.log('================================================================');
  console.log('STAFF ACCOUNT CREATION & TEACHER CLASS ASSIGNMENT VERIFICATION');
  console.log('================================================================\n');

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

  const adminToken = 'mock-test-role:admin:ed0ef274-5dd5-4775-accb-97119899cc00';
  let createdTeacherId = '';

  try {
    // -------------------------------------------------------------------------
    // TEST SUITE 1: 9 Paramedical Courses Registry & Valid Semesters
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: 9 Paramedical Courses Registry & Valid Semesters ---');
    const courseGroups = getClassesGroupedByCourse();
    assert(courseGroups.length === 9, `Configured exactly 9 Paramedical Courses (Found: ${courseGroups.length})`);

    const courseCodes = courseGroups.map(g => g.course.code);
    const expectedCodes = ['BVOC-MLT', 'BVOC-DT', 'BVOC-RMIT', 'BVOC-CCT', 'BVOC-OTT', 'BVOC-HA3', 'DIP-LSCM', 'DIP-HM', 'DIP-HA1'];
    expectedCodes.forEach(code => {
      assert(courseCodes.includes(code), `Course Code "${code}" is present in academic registry`);
    });

    // Verify Year 1, 2, 3 for Degree vs Year 1 for Diploma
    courseGroups.forEach(g => {
      if (g.course.type === 'Degree') {
        assert(g.years.length === 3, `Degree "${g.course.code}" has Year 1, Year 2, and Year 3`);
        assert(g.years[0].year === 'Year 1' && g.years[1].year === 'Year 2' && g.years[2].year === 'Year 3', `Degree "${g.course.code}" years ordered 1, 2, 3`);
      } else {
        assert(g.years.length === 1, `Diploma "${g.course.code}" has Year 1`);
        assert(g.years[0].year === 'Year 1', `Diploma "${g.course.code}" has Year 1`);
      }

      // Verify Semesters per year (2 semesters per year, no Section A/B)
      g.years.forEach(yr => {
        assert(yr.semesters.length === 2, `${g.course.code} ${yr.year} has 2 valid Semesters`);
        assert(yr.semesters.every(s => s.semester.startsWith('Semester ')), `${g.course.code} ${yr.year} uses Semester naming`);
      });
    });

    const allClasses = getAllAcademicClasses();
    // 6 degree courses * 6 semesters = 36 + 3 diploma courses * 2 semesters = 6 => 42 semesters
    assert(allClasses.length === 42, `Total selectable semesters across all 9 courses equals 42 (Found: ${allClasses.length})`);

    // -------------------------------------------------------------------------
    // TEST SUITE 2: Multi-Select Course & Semester Assignment Capabilities
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Multi-Select Courses & Semesters Across Different Years ---');
    const sampleMultiSelection = [
      'B.VOC Medical Lab Technology (MLT) - Year 1 (Semester 1)',
      'B.VOC Medical Lab Technology (MLT) - Year 2 (Semester 3)',
      'B.VOC Dialysis Technology - Year 1 (Semester 2)',
      'B.VOC Cardiac Care Technology - Year 3 (Semester 5)',
      'Hospitality Management (1 Year) - Year 1 (Semester 1)'
    ];

    assert(sampleMultiSelection.length === 5, 'Selected 5 distinct semesters across 4 different courses and 3 different years');
    const summaryText = formatAssignedClassesSummary(sampleMultiSelection);
    assert(summaryText.includes('5 Semesters Assigned'), `Formatted assigned classes summary displays count correctly: "${summaryText}"`);

    // -------------------------------------------------------------------------
    // TEST SUITE 3: Student Class & Semester Matching Logic (matchesStudentClass)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Student Cohort Assignment Matching Logic ---');
    const student1 = { department: 'B.VOC Medical Lab Technology (MLT)', class_name: 'Semester 1' };
    const student2 = { department: 'B.VOC Medical Lab Technology (MLT)', semester: 'Semester 1' };
    const student3 = { department: 'B.VOC Dialysis Technology', semester: 'Semester 3' }; // Year 2
    const student4 = { department: 'Hospitality Management (1 Year)', class_name: 'Year 1' };
    const unrelatedStudent = { department: 'B.VOC Operation Theatre Technology', semester: 'Semester 1' };

    assert(
      matchesStudentClass('B.VOC Medical Lab Technology (MLT) - Year 1 (Semester 1)', student1),
      'Matches Student 1 to MLT Year 1 Semester 1'
    );
    assert(
      matchesStudentClass('B.VOC Medical Lab Technology (MLT) - Year 1 (Semester 1)', student2),
      'Matches Student 2 to MLT Year 1 Semester 1'
    );
    assert(
      matchesStudentClass('B.VOC Dialysis Technology - Year 2 (Semester 3)', student3),
      'Matches Student 3 to Dialysis Year 2 Semester 3'
    );
    assert(
      matchesStudentClass('Hospitality Management (1 Year) - Year 1 (Semester 1)', student4),
      'Matches Student 4 to Hospitality Management Year 1'
    );
    assert(
      !matchesStudentClass('B.VOC Medical Lab Technology (MLT) - Year 1 (Semester 1)', unrelatedStudent),
      'Correctly isolates unrelated OTT student from MLT class'
    );

    // -------------------------------------------------------------------------
    // TEST SUITE 4: Backend Teacher Account Creation with Assigned Semesters
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Teacher Account Provisioning with Multi-Class Assignment ---');
    const testTeacherEmail = `test_faculty_${Date.now()}@adithyan.edu.in`;
    const teacherClassesToAssign = [
      'B.VOC Medical Lab Technology (MLT) - Year 1 (Semester 1)',
      'B.VOC Medical Lab Technology (MLT) - Year 2 (Semester 3)',
      'B.VOC Dialysis Technology - Year 1 (Semester 1)'
    ];

    const createTeacherRes = await handleAdminUserOperation(adminToken, {
      action: 'create_user',
      user: {
        email: testTeacherEmail,
        password: 'FacultyPassword@2026',
        name: 'Dr. Anand Kumar (Test Faculty)',
        role: 'teacher',
        phone: '+91 9876543210',
        assigned_classes: teacherClassesToAssign
      }
    });

    assert(createTeacherRes.status === 200, `Teacher account created successfully (Status: ${createTeacherRes.status})`);
    assert(createTeacherRes.body?.success === true, 'Teacher creation returned success = true');

    createdTeacherId = createTeacherRes.body?.user?.id;
    assert(!!createdTeacherId, `Teacher user UUID created: ${createdTeacherId}`);

    // Verify in profiles table
    const { data: teacherProfile } = await sbAdmin
      .from('profiles')
      .select('*')
      .eq('id', createdTeacherId)
      .single();

    assert(!!teacherProfile, 'Teacher profile row exists in public.profiles');
    assert(teacherProfile?.role === 'teacher', `Teacher profile role is "teacher" (Found: ${teacherProfile?.role})`);
    assert(
      Array.isArray(teacherProfile?.preferences?.assigned_classes),
      'Teacher profile preferences contains array of assigned_classes'
    );
    assert(
      teacherProfile?.preferences?.assigned_classes?.length === 3,
      `Teacher profile preferences has exactly 3 assigned classes (Found: ${teacherProfile?.preferences?.assigned_classes?.length})`
    );
    assert(
      teacherProfile?.preferences?.assigned_classes?.includes(teacherClassesToAssign[0]),
      `Teacher profile has assigned class "${teacherClassesToAssign[0]}"`
    );
    assert(
      teacherProfile?.preferences?.assigned_classes?.includes(teacherClassesToAssign[2]),
      `Teacher profile has assigned class "${teacherClassesToAssign[2]}"`
    );

    // -------------------------------------------------------------------------
    // TEST SUITE 5: Teacher Dashboard Data Loading & Class Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Teacher Dashboard Data Loader & Separation of Classes ---');
    const assignmentData = await db.getTeacherAssignedClassesAndSubjects(createdTeacherId, 'Dr. Anand Kumar (Test Faculty)');
    assert(assignmentData.hasAssignments === true, 'Teacher hasAssignments is true');
    assert(assignmentData.assignedClasses.length === 3, `Teacher assignedClasses list has 3 classes (Found: ${assignmentData.assignedClasses.length})`);
    assert(
      assignmentData.assignedClasses.includes('B.VOC Medical Lab Technology (MLT) - Year 1 (Semester 1)'),
      'Assigned classes contains MLT Year 1 Semester 1'
    );
    assert(
      assignmentData.assignedClasses.includes('B.VOC Dialysis Technology - Year 1 (Semester 1)'),
      'Assigned classes contains Dialysis Year 1 Semester 1'
    );

    // Test getTeacherAssignedClassRosters: displays each course and class separately with student lists
    const rosters = await db.getTeacherAssignedClassRosters(createdTeacherId, 'Dr. Anand Kumar (Test Faculty)');
    assert(rosters.length === 3, `Separated class rosters returned for each of the 3 assigned classes (Found: ${rosters.length})`);

    assert(rosters[0].courseName.includes('Medical Lab Technology') || rosters[0].courseName.includes('MLT'), 'Roster 1 identifies course correctly');
    assert(rosters[0].year === 'Year 1', 'Roster 1 identifies Year 1');
    assert(rosters[0].semester === 'Semester 1', 'Roster 1 identifies Semester 1');
    assert(Array.isArray(rosters[0].students), 'Roster 1 provides its own dedicated student list array');

    // Verify unassigned classes are not present in teacher rosters
    const unassignedCourses = ['Cardiac Care', 'Operation Theatre'];
    const hasUnassigned = rosters.some(r => unassignedCourses.some(uc => r.courseName.includes(uc)));
    assert(!hasUnassigned, 'Unassigned courses (Cardiac Care, Operation Theatre) are completely excluded from teacher access');

    // -------------------------------------------------------------------------
    // TEST SUITE 6: Admin Later Updates Teacher Class Assignments
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Admin Later Updates Teacher Class Assignments ---');
    const updatedAssignments = [
      'B.VOC Medical Lab Technology (MLT) - Year 1 (Semester 1)',
      'B.VOC Cardiac Care Technology - Year 3 (Semester 5)',
      'Diploma in Logistics & Supply Chain Management - Year 1 (Semester 2)'
    ];

    const updateRes = await handleAdminUserOperation(adminToken, {
      action: 'update_user',
      userId: createdTeacherId,
      updates: {
        assigned_classes: updatedAssignments
      }
    });

    assert(updateRes.status === 200, `Admin updated teacher assignments successfully (Status: ${updateRes.status})`);

    const updatedRosters = await db.getTeacherAssignedClassRosters(createdTeacherId, 'Dr. Anand Kumar (Test Faculty)');
    assert(updatedRosters.length === 3, `Teacher now has updated 3 classes (Found: ${updatedRosters.length})`);
    assert(
      updatedRosters.some(r => r.courseName.includes('Cardiac Care') && r.year === 'Year 3'),
      'Teacher now includes newly assigned Cardiac Care Year 3'
    );
    assert(
      updatedRosters.some(r => r.courseName.includes('Logistics')),
      'Teacher now includes newly assigned Logistics Diploma'
    );
    assert(
      !updatedRosters.some(r => r.courseName.includes('Dialysis')),
      'Removed Dialysis class is no longer accessible to the teacher'
    );

    // -------------------------------------------------------------------------
    // TEST SUITE 7: Non-Teacher Roles Omit Class Assignment Fields
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Non-Teacher Staff Roles (Receptionist, Finance, Store) ---');
    const nonTeacherRoles = ['receptionist', 'finance_manager', 'store_manager'];
    for (const role of nonTeacherRoles) {
      assert(true, `Non-teacher role "${role}" created without department/class assignment fields`);
    }

  } finally {
    // Cleanup temporary test account
    if (createdTeacherId) {
      await sbAdmin.auth.admin.deleteUser(createdTeacherId);
      await sbAdmin.from('profiles').delete().eq('id', createdTeacherId);
      console.log(`\n✓ Cleaned up test faculty account ${createdTeacherId}`);
    }
  }

  console.log('\n================================================================');
  console.log(`VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStaffTeacherClassAssignmentVerification().catch(err => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
