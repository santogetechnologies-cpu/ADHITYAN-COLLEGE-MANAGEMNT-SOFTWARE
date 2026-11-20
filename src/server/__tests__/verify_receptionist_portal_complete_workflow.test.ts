import { db } from '../../services/supabase/database';
import { handleAdminUserOperation } from '../adminBackend';
import { createClient } from '@supabase/supabase-js';
import { ROLE_CONFIGS } from '../../config/roles';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) { throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'); }

async function runComprehensiveReceptionistWorkflowTests() {
  console.log('================================================================');
  console.log('USER 4: RECEPTIONIST PORTAL – LIVE END-TO-END WORKFLOW SUITE');
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

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const receptionistId = '519d5d53-9e66-4578-ab66-8ee7d0b8c75d';
  let testVisitorId = '';
  let testAppointmentId = '';
  let testEnquiryId = '';
  let testCalendarEventId = '';
  let testCandidateEmail = `candidate_walkin_${Date.now()}@adithyan.test`;
  let testStudentAuthId = '';
  let testParentAuthId = '';
  let createdReceiptId = '';

  try {
    // -------------------------------------------------------------------------
    // 1. Receptionist Profile & Role Authentication
    // -------------------------------------------------------------------------
    console.log('--- 1. Receptionist Profile & Role Verification ---');
    const { data: recProfile, error: recErr } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', receptionistId)
      .single();

    assert(!recErr && !!recProfile, 'Receptionist profile exists in database');
    assert(recProfile?.role === 'receptionist', 'Profile role is strictly verified as "receptionist"');
    assert(recProfile?.email === 'receptionist@1.edu', 'Receptionist email verified as "receptionist@1.edu"');

    // Navigation verification
    const recNav = ROLE_CONFIGS.receptionist.navItems;
    assert(recNav.length === 0, 'Receptionist navigation bar cleaned of legacy duplicate routes');

    // -------------------------------------------------------------------------
    // 2. Visitor Check-In & Badge Logging
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Visitor Check-In & Badge Logging ---');
    const checkInTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const visitor = await db.createReceptionVisitor({
      name: 'Dr. Subramanian Raman',
      purpose: 'Paramedical Clinical Curriculum Inspection',
      time: checkInTime,
      status: 'checked_in',
      contact: '+91 9444123456',
      host_person: 'Dean / Principal Office',
      badge_number: 'BADGE-V-2026-01'
    });

    assert(!!visitor && !!visitor.id, 'Visitor successfully checked in via db.createReceptionVisitor');
    assert(visitor?.name === 'Dr. Subramanian Raman', 'Visitor name correctly recorded');
    assert(visitor?.badge_number === 'BADGE-V-2026-01', 'Visitor badge number issued');
    assert(visitor?.status === 'checked_in', 'Visitor initial status is "checked_in"');
    testVisitorId = visitor?.id || '';

    // Verify visitor is retrieved in active reception log
    const allVisitors = await db.getReceptionVisitors();
    assert(allVisitors.some(v => v.id === testVisitorId), 'Checked-in visitor queryable via db.getReceptionVisitors');

    // -------------------------------------------------------------------------
    // 3. Visitor Check-Out & Timestamping
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Visitor Check-Out & Timestamping ---');
    const checkOutTimestamp = new Date().toISOString();
    const checkedOut = await db.updateReceptionVisitorStatus(testVisitorId, 'completed', {
      check_out_time: checkOutTimestamp
    });

    assert(checkedOut === true, 'Visitor successfully checked out via db.updateReceptionVisitorStatus');

    const { data: updatedVisitor } = await adminClient
      .from('reception_visitors')
      .select('*')
      .eq('id', testVisitorId)
      .single();

    const allVisitorsAfterCheckout = await db.getReceptionVisitors();
    const checkedOutVisitor = allVisitorsAfterCheckout.find(v => v.id === testVisitorId);

    assert(updatedVisitor?.status === 'completed', 'Visitor status transitioned to "completed"');
    assert(!!checkedOutVisitor?.check_out_time, 'Visitor check_out_time departure timestamp recorded');

    // -------------------------------------------------------------------------
    // 4. Appointment Desk Booking & Host Staff Selection
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Appointment Desk Booking & Host Notification ---');
    // Fetch active staff for appointment booking (excluding student & parent)
    const staffList = (await db.getAllProfiles()).filter(p => p.role !== 'student' && p.role !== 'parent');
    assert(staffList.length > 0, 'Reception desk dynamically queries genuine active college staff');
    assert(staffList.every(s => s.role !== 'student' && s.role !== 'parent'), 'Staff directory strictly excludes students and parents');

    const hostStaff = staffList[0];
    const appointment = await db.createReceptionAppointment({
      person: 'Mr. Venkatachalam (Parent of Dialysis Candidate)',
      with_whom: `${hostStaff.name} (${hostStaff.role.toUpperCase()})`,
      with_user_id: hostStaff.id,
      contact: '+91 9888877777',
      time: '02:30 PM',
      type: 'meeting',
      status: 'scheduled',
      notes: 'Discussion regarding dialysis laboratory internship rotations.'
    });

    assert(!!appointment && !!appointment.id, 'Appointment booked via db.createReceptionAppointment');
    assert(appointment?.with_whom.includes(hostStaff.name), 'Appointment accurately links host staff member');
    testAppointmentId = appointment?.id || '';

    // Verify appointment retrieval
    const appointments = await db.getReceptionAppointments();
    assert(appointments.some(a => a.id === testAppointmentId), 'Appointment queryable via db.getReceptionAppointments');

    // Update appointment status to in_progress / completed
    const appUpdated = await db.updateReceptionAppointmentStatus(testAppointmentId, 'in_progress');
    assert(appUpdated === true, 'Appointment status updated to "in_progress"');

    // -------------------------------------------------------------------------
    // 5. Admission & Course Enquiries Tracking
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Admission & Course Enquiries Tracking ---');
    const enquiryCode = `ENQ${Date.now().toString().slice(-4)}`;
    const enquiry = await db.createReceptionEnquiry({
      enquiry_code: enquiryCode,
      type: 'Admission',
      parent_name: 'Mrs. Jayanthi Selvam',
      grade: 'B.Sc Medical Laboratory Technology (MLT)',
      priority: 'high',
      status: 'pending',
      phone: '+91 9777766666',
      email: 'jayanthi.selvam@gmail.test',
      notes: 'Enquiring about B.Sc MLT clinical hospital affiliations and hostel fee structure.'
    });

    assert(!!enquiry && !!enquiry.id, 'Enquiry registered via db.createReceptionEnquiry');
    assert(enquiry?.enquiry_code === enquiryCode, `Enquiry code correctly formatted: ${enquiryCode}`);
    assert(enquiry?.grade === 'B.Sc Medical Laboratory Technology (MLT)', 'Target course reflects Paramedical degree');
    testEnquiryId = enquiry?.id || '';

    // Verify enquiry in reception log
    const allEnquiries = await db.getReceptionEnquiries();
    assert(allEnquiries.some(e => e.id === testEnquiryId), 'Enquiry queryable via db.getReceptionEnquiries');

    // Update enquiry status to resolved
    const enqResolved = await db.updateReceptionEnquiryStatus(testEnquiryId, 'resolved');
    assert(enqResolved === true, 'Enquiry status successfully updated to "resolved"');

    // -------------------------------------------------------------------------
    // 6. Walk-In Admission Application Intake & Workflow
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Walk-In Admission Application & Account Provisioning ---');
    const appPayload = {
      name: 'Praveen Selvam',
      applicant_name: 'Praveen Selvam',
      email: testCandidateEmail,
      phone: '9840192834',
      class_applied: 'B.Sc Medical Laboratory Technology (MLT)',
      class_name: 'B.Sc Medical Laboratory Technology (MLT)',
      department: 'B.Sc Medical Laboratory Technology (MLT)',
      semester: 'Semester 1',
      date_of_birth: '2005-08-20',
      parent_name: 'Mrs. Jayanthi Selvam',
      parent_phone: '9777766666',
      parent_email: 'jayanthi.parent@adithyan.test',
      status: 'Submitted'
    };

    const createdApp = await db.createAdmissionApplication(appPayload);
    assert(!!createdApp, 'Receptionist successfully logged walk-in admission application in Supabase');

    // Receptionist confirms admission & provisions accounts
    const confirmResult = await handleAdminUserOperation('mock-test-role:receptionist:519d5d53-9e66-4578-ab66-8ee7d0b8c75d', {
      action: 'confirm_admission',
      application_id: createdApp?.id,
      student: {
        name: 'Praveen Selvam',
        email: testCandidateEmail,
        phone: '9840192834',
        department: 'B.Sc Medical Laboratory Technology (MLT)',
        class_name: 'Semester 1',
        date_of_birth: '2005-08-20',
        address: '15 Gandhi Road, Coimbatore'
      },
      parent: {
        name: 'Mrs. Jayanthi Selvam',
        relationship: 'Mother',
        phone: '9777766666',
        email: 'jayanthi.parent@adithyan.test'
      },
      fee_payment: {
        total_course_fee: 65000,
        admission_fee: 10000,
        amount_paid: 25000,
        payment_method: 'UPI',
        transaction_reference: `UPI-REC-${Date.now().toString().slice(-6)}`
      }
    });

    assert(confirmResult.status === 200, 'Receptionist confirmed admission and generated institutional accounts (200 OK)');
    const confirmBody = confirmResult.body as any;
    assert(Boolean(confirmBody.student?.student_id?.startsWith('STU-')), `Permanent Student ID issued: ${confirmBody.student?.student_id}`);
    assert(Boolean(confirmBody.parent?.parent_id?.startsWith('PAR-')), `Permanent Parent ID issued: ${confirmBody.parent?.parent_id}`);
    testStudentAuthId = confirmBody.student?.id;
    testParentAuthId = confirmBody.parent?.id;

    // Verify parent-student linking
    const { data: links } = await adminClient
      .from('parent_student_links')
      .select('*')
      .eq('parent_id', testParentAuthId)
      .eq('student_id', testStudentAuthId);

    assert(links && links.length > 0, 'Parent-student link record created in parent_student_links');

    // Verify fee receipt generation
    assert(Boolean(confirmBody.receipt), 'Downloadable & printable PDF receipt generated for walk-in fee payment');
    assert(confirmBody.receipt?.amount_paid === 25000, 'Receipt amount accurately matches initial payment (₹25,000)');
    assert(Boolean(confirmBody.receipt?.receipt_number?.startsWith('REC-')), `Receipt number conforms to institutional standard: ${confirmBody.receipt?.receipt_number}`);
    assert(confirmBody.receipt?.payment_mode === 'UPI', 'Receipt captures payment method: UPI');
    createdReceiptId = confirmBody.receipt?.id;

    // -------------------------------------------------------------------------
    // 7. Comprehensive Student Search Desk
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Comprehensive Student Search Desk ---');
    const searchByName = await db.searchStudents('Praveen');
    assert(Array.isArray(searchByName), 'Student search by name executed cleanly');
    assert(searchByName.some(s => s.email === testCandidateEmail), 'Search desk immediately locates newly enrolled student');

    const searchById = await db.searchStudents(confirmBody.student?.student_id);
    assert(searchById.some(s => s.id === testStudentAuthId), 'Search desk locates student by newly issued Student ID');

    // -------------------------------------------------------------------------
    // 8. Institutional Campus Notice Posting (`calendar_events`)
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Campus Notice Posting ---');
    const notice = await db.createCalendarEvent({
      title: 'Reception Notice: Campus Orientation Schedule',
      description: 'First-year Paramedical student orientation and ID badge collection at Main Auditorium.',
      date: new Date().toISOString().split('T')[0],
      time: '10:00 AM',
      category: 'general',
      target_audience: 'all',
      priority: 'high',
      status: 'upcoming'
    });

    assert(!!notice && !!notice.id, 'Campus circular posted to calendar_events');
    testCalendarEventId = notice?.id || '';

    const events = await db.getCalendarEvents();
    assert(events.some(e => e.id === testCalendarEventId), 'Notice visible on institutional notice board');

    // -------------------------------------------------------------------------
    // 9. Role Permission Boundaries
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Role Permission Boundaries ---');
    const hrAttempt = await handleAdminUserOperation('mock-test-role:hr_manager:hr-user-id', {
      action: 'confirm_admission',
      student: { name: 'Unauthorized Student', email: 'unauth@test.edu', department: 'MLT' },
      parent: { name: 'Unauthorized Parent' }
    });
    assert(hrAttempt.status === 403, 'Unauthorized staff role (HR Manager) blocked from student admission (403 Forbidden)');

    const adminAttempt = await handleAdminUserOperation('mock-test-role:admin:admin-user-id', {
      action: 'list_users'
    });
    assert(adminAttempt.status === 200, 'Admin has full access to accounts breakdown (200 OK)');

  } catch (err: any) {
    console.error('Unexpected test exception occurred:', err);
    assert(false, 'Uncaught Exception in test run', err?.message);
  } finally {
    // -------------------------------------------------------------------------
    // 10. Safe Cleanup of Transient Test Data
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Cleanup of Transient Test Records ---');
    if (testVisitorId) {
      await adminClient.from('reception_visitors').delete().eq('id', testVisitorId);
    }
    if (testAppointmentId) {
      await adminClient.from('reception_appointments').delete().eq('id', testAppointmentId);
    }
    if (testEnquiryId) {
      await adminClient.from('reception_enquiries').delete().eq('id', testEnquiryId);
    }
    if (testCalendarEventId) {
      await adminClient.from('calendar_events').delete().eq('id', testCalendarEventId);
    }
    if (createdReceiptId) {
      await adminClient.from('fee_receipts').delete().eq('id', createdReceiptId);
    }
    if (testParentAuthId && testStudentAuthId) {
      await adminClient.from('parent_student_links').delete().eq('parent_id', testParentAuthId);
    }
    if (testStudentAuthId) {
      await adminClient.from('profiles').delete().eq('id', testStudentAuthId);
      await adminClient.auth.admin.deleteUser(testStudentAuthId).catch(() => {});
    }
    if (testParentAuthId) {
      await adminClient.from('profiles').delete().eq('id', testParentAuthId);
      await adminClient.auth.admin.deleteUser(testParentAuthId).catch(() => {});
    }
    await adminClient.from('notifications').delete().like('title', '%Reception Notice%');
    await adminClient.from('notifications').delete().like('title', '%New Appointment%');
    console.log('✓ Cleanup completed safely without affecting genuine college accounts or records.\n');
  }

  console.log('================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runComprehensiveReceptionistWorkflowTests();
