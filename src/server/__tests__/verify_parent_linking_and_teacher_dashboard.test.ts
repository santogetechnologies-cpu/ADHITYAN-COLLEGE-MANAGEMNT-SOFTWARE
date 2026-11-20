/**
 * Verification Test Suite: Parent Portal Student-Linking & Teacher Dashboard Student Data Integration
 * 
 * Verifies:
 * 1. Automatic linking of Parent account during admission confirmation and student account provisioning.
 * 2. Receptionist and Admin permissions to manage and verify parent-student links without 403 Forbidden.
 * 3. Parent portal data isolation: Parents cannot manually select students, and only fetch their linked children.
 * 4. Parent child telemetry: Student profile, attendance, fees, receipts, and exams load seamlessly.
 * 5. Teacher assigned classes: Multi-course, multi-year, multi-section cohort isolation.
 * 6. Teacher student rosters: Real-time student lists per assigned class (unassigned classes hidden).
 * 7. Admin updates teacher class assignments: Dynamic assignment changes reflect immediately.
 * 8. Clean database state preservation.
 */

import { createClient } from '@supabase/supabase-js';
import { handleAdminUserOperation } from '../adminBackend';
import { db } from '../../services/supabase/database';
import { getAllAcademicClasses, matchesStudentClass } from '../../config/academicClassRegistry';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('FATAL: Missing essential Supabase credentials in test environment.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const PROTECTED_ADMIN_ID = 'ed0ef274-5dd5-4775-accb-97119899cc00';

async function runParentLinkingAndTeacherDashboardTests() {
  console.log('================================================================');
  console.log('PARENT LINKING & TEACHER DASHBOARD STUDENT INTEGRATION AUDIT');
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

  const createdUserIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // TEST 1: RECEPTIONIST & ADMIN PERMISSIONS FOR PARENT MANAGEMENT
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Receptionist & Admin Permissions for Parent Management ---');

    // Create a mock Receptionist token
    const mockReceptionistToken = 'mock-test-role:receptionist:11111111-2222-3333-4444-555555555555';
    const mockAdminToken = `mock-test-role:admin:${PROTECTED_ADMIN_ID}`;
    const mockParentToken = 'mock-test-role:parent:77777777-8888-9999-aaaa-bbbbbbbbbbbb';

    // A. Receptionist calls list_parent_links
    const recListRes = await handleAdminUserOperation(mockReceptionistToken, { action: 'list_parent_links' });
    assert(recListRes.status === 200, 'Receptionist can invoke list_parent_links (Status 200)');
    assert(recListRes.body?.success === true, 'Receptionist list_parent_links returns success = true');

    // B. Receptionist calls list_parent_accounts
    const recAccountsRes = await handleAdminUserOperation(mockReceptionistToken, { action: 'list_parent_accounts' });
    assert(recAccountsRes.status === 200, 'Receptionist can invoke list_parent_accounts (Status 200)');

    // C. Receptionist calls list_students_for_parent_linking
    const recStudentsRes = await handleAdminUserOperation(mockReceptionistToken, { action: 'list_students_for_parent_linking' });
    assert(recStudentsRes.status === 200, 'Receptionist can invoke list_students_for_parent_linking (Status 200)');

    // D. Admin calls list_parent_links
    const adminListRes = await handleAdminUserOperation(mockAdminToken, { action: 'list_parent_links' });
    assert(adminListRes.status === 200, 'Admin can invoke list_parent_links (Status 200)');

    // -------------------------------------------------------------------------
    // TEST 2: ADMISSION PROVISIONING WITH AUTOMATIC PARENT LINKING
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Admission Provisioning with Automatic Parent Linking ---');

    const testStudentId = `STU-TEST-${Date.now().toString().slice(-5)}`;
    const testStudentEmail = `stu_${Date.now()}@test.adithyan.edu.in`;
    const testParentName = `Parent of ${testStudentId}`;
    const testParentPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testParentEmail = `parent_${Date.now()}@test.adithyan.edu.in`;

    // Provision student with parent details
    const provRes = await handleAdminUserOperation(mockReceptionistToken, {
      action: 'provision_student_account',
      student_id: testStudentId,
      name: `Candidate ${testStudentId}`,
      email: testStudentEmail,
      password: 'Student@2026',
      department: 'B.VOC Medical Lab Technology (MLT)',
      class_name: 'B.VOC Medical Lab Technology (MLT) - Year 1 (Semester 1)',
      phone: '9845000001',
      parent_name: testParentName,
      parent_phone: testParentPhone,
      parent_email: testParentEmail,
      relationship: 'Father'
    });

    assert(provRes.status === 200, 'Provisioning student with parent details succeeds (Status 200)');
    assert(provRes.body?.success === true, 'Provisioning returns success = true');
    const studentUser = provRes.body?.user;
    assert(Boolean(studentUser?.id), `Student user account created with UUID: ${studentUser?.id}`);
    if (studentUser?.id) createdUserIds.push(studentUser.id);

    // Verify student fee initialized automatically
    const { data: fees } = await supabaseAdmin.from('student_fees').select('*').eq('student_id', studentUser?.id);
    assert((fees || []).length > 0, 'Student fee record automatically initialized for Finance integration');

    // Verify parent account was automatically created
    const { data: parentProfiles } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('phone', testParentPhone)
      .eq('role', 'parent');

    assert((parentProfiles || []).length > 0, 'Parent profile was automatically provisioned in profiles table');
    const parentUser = parentProfiles?.[0];
    assert(Boolean(parentUser?.id), `Parent user account UUID: ${parentUser?.id}`);
    if (parentUser?.id) createdUserIds.push(parentUser.id);
    assert(parentUser?.roll_number?.startsWith('PAR-'), `Parent assigned unique Parent ID: ${parentUser?.roll_number}`);

    // Verify parent_student_links record
    const { data: links } = await supabaseAdmin
      .from('parent_student_links')
      .select('*')
      .eq('parent_id', parentUser?.id)
      .eq('student_id', studentUser?.id);

    assert((links || []).length === 1, 'Automatic parent-student link created in parent_student_links table');
    assert(links?.[0]?.verified === true, 'Parent-student link is marked verified = true');
    assert(links?.[0]?.relationship === 'Father', 'Relationship preserved correctly as "Father"');

    // -------------------------------------------------------------------------
    // TEST 3: PARENT PORTAL ACCESS & DATA ISOLATION
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Parent Portal Access & Data Isolation ---');

    const realParentToken = `mock-test-role:parent:${parentUser?.id}`;

    // A. Parent queries get_parent_student_links
    const parentLinksRes = await handleAdminUserOperation(realParentToken, {
      action: 'get_parent_student_links'
    });

    assert(parentLinksRes.status === 200, 'Parent calling get_parent_student_links returns Status 200');
    assert(Array.isArray(parentLinksRes.body?.links), 'Parent links response contains links array');
    assert(parentLinksRes.body?.links?.length === 1, 'Parent strictly retrieves their own 1 linked child (Found: 1)');
    const linkedChild = parentLinksRes.body?.links?.[0]?.student;
    assert(linkedChild?.id === studentUser?.id, 'Linked child UUID matches studentUser.id');
    assert(linkedChild?.name === `Candidate ${testStudentId}`, 'Linked child name matches student name');
    assert(linkedChild?.roll_number === testStudentId, 'Linked child Student ID matches');

    // B. Verify Parent cannot access unrelated student telemetry
    const unrelatedStudentId = '00000000-0000-0000-0000-000000000000';
    const unauthorizedTeleRes = await handleAdminUserOperation(realParentToken, {
      action: 'get_child_telemetry',
      studentId: unrelatedStudentId
    });
    assert(unauthorizedTeleRes.status === 403, 'Parent denied access to unrelated student telemetry (Status 403 Forbidden)');

    // C. Parent accesses their own child telemetry
    // Insert mock attendance record for student
    const todayStr = new Date().toISOString().split('T')[0];
    const { error: attErr } = await supabaseAdmin.from('student_attendance').insert({
      student_id: studentUser?.id,
      date: todayStr,
      status: 'present',
      subject: 'Clinical Hematology'
    });
    if (attErr) {
      console.warn('Attendance insert warning:', attErr.message);
    }

    const authorizedTeleRes = await handleAdminUserOperation(realParentToken, {
      action: 'get_child_telemetry',
      studentId: studentUser?.id
    });

    assert(authorizedTeleRes.status === 200, 'Parent authorized to fetch linked child telemetry (Status 200)');
    assert(authorizedTeleRes.body?.attendance?.length >= 1, 'Child attendance telemetry returned to parent');
    assert(authorizedTeleRes.body?.fees?.length >= 1, 'Child fee telemetry returned to parent');

    // -------------------------------------------------------------------------
    // TEST 4: TEACHER CLASS ASSIGNMENT & STRICT DATA ISOLATION
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Teacher Class Assignment & Strict Data Isolation ---');

    // Create Teacher 1 assigned to MLT Year 1 Section A
    const teacher1Email = `teacher1_${Date.now()}@test.adithyan.edu.in`;
    const teacher1Res = await handleAdminUserOperation(mockAdminToken, {
      action: 'create_user',
      user: {
        name: 'Prof. Anitha MLT',
        email: teacher1Email,
        password: 'Teacher@2026',
        role: 'teacher',
        assigned_classes: [
          'B.VOC Medical Lab Technology (MLT) - Year 1 (Semester 1)'
        ]
      }
    });

    assert(teacher1Res.status === 200, 'Teacher 1 created successfully (Status 200)');
    const teacher1User = teacher1Res.body?.user;
    if (teacher1User?.id) createdUserIds.push(teacher1User.id);

    // Create Teacher 2 assigned to Dialysis Technology Year 2 Semester 3
    const teacher2Email = `teacher2_${Date.now()}@test.adithyan.edu.in`;
    const teacher2Res = await handleAdminUserOperation(mockAdminToken, {
      action: 'create_user',
      user: {
        name: 'Dr. Rajesh Dialysis',
        email: teacher2Email,
        password: 'Teacher@2026',
        role: 'teacher',
        assigned_classes: [
          'B.VOC Dialysis Technology - Year 2 (Semester 3)'
        ]
      }
    });

    assert(teacher2Res.status === 200, 'Teacher 2 created successfully (Status 200)');
    const teacher2User = teacher2Res.body?.user;
    if (teacher2User?.id) createdUserIds.push(teacher2User.id);

    // A. Verify Teacher 1 assigned classes and student roster
    const t1Rosters = await db.getTeacherAssignedClassRosters(teacher1User?.id, teacher1User?.name);
    assert(t1Rosters.length === 1, 'Teacher 1 has exactly 1 assigned class roster (Found: 1)');
    assert(t1Rosters[0]?.className === 'B.VOC Medical Lab Technology (MLT) - Year 1 (Semester 1)', 'Teacher 1 roster is MLT Year 1 Semester 1');
    
    // Check that student created in Test 2 appears in Teacher 1's class roster
    const t1Students = t1Rosters[0]?.students || [];
    assert(t1Students.some((s: any) => s.id === studentUser?.id), 'Test Student is present in Teacher 1 assigned class roster');

    // B. Verify Teacher 2 cannot access MLT student
    const t2Rosters = await db.getTeacherAssignedClassRosters(teacher2User?.id, teacher2User?.name);
    assert(t2Rosters.length === 1, 'Teacher 2 has exactly 1 assigned class roster (Found: 1)');
    assert(t2Rosters[0]?.className === 'B.VOC Dialysis Technology - Year 2 (Semester 3)', 'Teacher 2 roster is Dialysis Year 2 Semester 3');
    const t2Students = t2Rosters[0]?.students || [];
    assert(!t2Students.some((s: any) => s.id === studentUser?.id), 'Teacher 2 does NOT see MLT student (Strict data isolation verified)');

    // -------------------------------------------------------------------------
    // TEST 5: REAL-TIME ADMIN ASSIGNMENT UPDATES
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Real-Time Admin Assignment Updates ---');

    // Admin updates Teacher 1 to add a second class: Cardiac Care Year 1 Semester 1
    const updateRes = await handleAdminUserOperation(mockAdminToken, {
      action: 'update_user',
      id: teacher1User?.id,
      assigned_classes: [
        'B.VOC Medical Lab Technology (MLT) - Year 1 (Semester 1)',
        'B.VOC Cardiac Care Technology (CCT) - Year 1 (Semester 1)'
      ]
    });

    assert(updateRes.status === 200, 'Admin successfully updated teacher class assignments (Status 200)');

    // Re-query Teacher 1 assigned rosters
    const updatedT1Rosters = await db.getTeacherAssignedClassRosters(teacher1User?.id, teacher1User?.name);
    assert(updatedT1Rosters.length === 2, 'Teacher 1 now has 2 assigned class rosters (Found: 2)');
    assert(updatedT1Rosters.some(r => r.className.includes('Cardiac Care')), 'Teacher 1 now includes newly assigned Cardiac Care cohort');
    assert(updatedT1Rosters.some(r => r.className.includes('Medical Lab Technology')), 'Teacher 1 retains assigned MLT cohort');

    // Admin removes MLT class from Teacher 1
    const updateRes2 = await handleAdminUserOperation(mockAdminToken, {
      action: 'update_user',
      id: teacher1User?.id,
      assigned_classes: [
        'B.VOC Cardiac Care Technology (CCT) - Year 1 (Semester 1)'
      ]
    });

    assert(updateRes2.status === 200, 'Admin updated teacher class assignments again (Status 200)');
    const finalT1Rosters = await db.getTeacherAssignedClassRosters(teacher1User?.id, teacher1User?.name);
    assert(finalT1Rosters.length === 1, 'Teacher 1 now has exactly 1 class after removal (Found: 1)');
    assert(!finalT1Rosters.some(r => r.className.includes('Medical Lab Technology')), 'Removed MLT cohort disappeared from teacher access');
    const finalT1Students = await db.getStudentsForTeacher(teacher1User?.id, teacher1User?.name);
    assert(!finalT1Students.some(s => s.id === studentUser?.id), 'Students of removed class are no longer accessible to the teacher');

    // -------------------------------------------------------------------------
    // TEST 6: ADMIN / RECEPTIONIST UNLINK & LINK MANAGEMENT
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Admin / Receptionist Unlink & Link Management ---');

    // Receptionist unlinks child from parent
    const unlinkRes = await handleAdminUserOperation(mockReceptionistToken, {
      action: 'unlink_parent_student',
      parentId: parentUser?.id,
      studentId: studentUser?.id
    });

    assert(unlinkRes.status === 200, 'Receptionist can unlink student from parent (Status 200)');

    // Verify link is removed
    const verifyUnlink = await supabaseAdmin
      .from('parent_student_links')
      .select('*')
      .eq('parent_id', parentUser?.id)
      .eq('student_id', studentUser?.id);
    assert((verifyUnlink.data || []).length === 0, 'Link removed from parent_student_links table');

    // Receptionist re-links student to parent
    const linkRes = await handleAdminUserOperation(mockReceptionistToken, {
      action: 'link_parent_student',
      parentId: parentUser?.id,
      studentId: studentUser?.id,
      relationship: 'Guardian'
    });

    assert(linkRes.status === 200, 'Receptionist re-establishes link with relationship "Guardian" (Status 200)');

    const verifyRelink = await supabaseAdmin
      .from('parent_student_links')
      .select('*')
      .eq('parent_id', parentUser?.id)
      .eq('student_id', studentUser?.id);
    assert((verifyRelink.data || []).length === 1, 'Link restored in parent_student_links table');
    assert(verifyRelink.data?.[0]?.relationship === 'Guardian', 'Restored link relationship is "Guardian"');

  } catch (err: any) {
    console.error('UNEXPECTED TEST ERROR:', err);
    failed++;
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP TEST USERS
    // -------------------------------------------------------------------------
    console.log('\n--- CLEANUP: Deleting Created Test Records ---');
    for (const uid of createdUserIds) {
      if (uid === PROTECTED_ADMIN_ID) continue; // Safety safeguard
      try {
        await supabaseAdmin.from('parent_student_links').delete().or(`parent_id.eq.${uid},student_id.eq.${uid}`);
        await supabaseAdmin.from('student_fees').delete().eq('student_id', uid);
        await supabaseAdmin.from('student_attendance').delete().eq('student_id', uid);
        await supabaseAdmin.from('profiles').delete().eq('id', uid);
        await supabaseAdmin.auth.admin.deleteUser(uid);
        console.log(`✓ Cleaned up test user ${uid}`);
      } catch (ce) {
        console.warn(`Cleanup notice for user ${uid}:`, ce);
      }
    }
  }

  console.log('\n================================================================');
  console.log(`VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runParentLinkingAndTeacherDashboardTests();
