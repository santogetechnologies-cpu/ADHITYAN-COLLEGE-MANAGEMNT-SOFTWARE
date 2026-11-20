import { createClient } from '@supabase/supabase-js';
import { db } from '../../services/supabase/database';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) { console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'); process.exit(1); }
const sbAdmin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function verifyAllRolesAndModules() {
  console.log('================================================================');
  console.log('ERP FULL BACKEND & ROLE CONNECTIVITY AUDIT');
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

  // -------------------------------------------------------------------------
  // 1. ADMIN & LEADERSHIP CONNECTIVITY
  // -------------------------------------------------------------------------
  console.log('--- 1. Admin & Leadership Domain ---');
  try {
    const profiles = await db.getAllProfiles();
    assert(Array.isArray(profiles) && profiles.length > 0, 'Admin: db.getAllProfiles() returns live profiles', `Count: ${profiles.length}`);
    const adminProfile = profiles.find((p: any) => p.email === 'admin@gmail.com');
    assert(!!adminProfile && adminProfile.role === 'admin', 'Admin: Protected administrator profile active');

    const instSettings = await db.getInstitutionalSettings();
    assert(instSettings !== null && typeof instSettings === 'object', 'Admin: db.getInstitutionalSettings() returns configuration');

    const notifications = await db.getNotifications();
    assert(Array.isArray(notifications), 'Admin: db.getNotifications() returns system notifications array');
  } catch (e: any) {
    assert(false, 'Admin Domain check exception', e.message);
  }

  // -------------------------------------------------------------------------
  // 2. ADMISSION & STUDENT ENROLLMENT CONNECTIVITY
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Admissions & Student Management Domain ---');
  try {
    const admissions = await db.getAdmissionApplications();
    assert(Array.isArray(admissions), 'Admissions: db.getAdmissionApplications() returns array');

    const entranceTests = await db.getAdmissionEntranceTests();
    assert(Array.isArray(entranceTests), 'Admissions: db.getAdmissionEntranceTests() returns array');

    const meritList = await db.getAdmissionMeritLists();
    assert(Array.isArray(meritList), 'Admissions: db.getAdmissionMeritLists() returns array');

    const students = await db.getAllStudents();
    assert(Array.isArray(students), 'Students: db.getAllStudents() returns array');
  } catch (e: any) {
    assert(false, 'Admissions Domain check exception', e.message);
  }

  // -------------------------------------------------------------------------
  // 3. FINANCE & FEES CONNECTIVITY
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Finance & Accounts Domain ---');
  try {
    const fees = await db.getStudentFees();
    assert(Array.isArray(fees), 'Finance: db.getStudentFees() returns array');

    const txs = await db.getFinanceTransactions();
    assert(Array.isArray(txs), 'Finance: db.getFinanceTransactions() returns array');
  } catch (e: any) {
    assert(false, 'Finance Domain check exception', e.message);
  }

  // -------------------------------------------------------------------------
  // 4. TEACHER & ACADEMICS CONNECTIVITY
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Teacher & Academics Domain ---');
  try {
    const assignments = await db.getAssignments();
    assert(Array.isArray(assignments), 'Academics: db.getAssignments() returns array');

    const timetables = await db.getTimetables();
    assert(Array.isArray(timetables), 'Academics: db.getTimetables() returns array');

    const depts = await db.getDepartments();
    assert(Array.isArray(depts) && depts.length === 9, 'Academics: 9 standard paramedical course departments active in database');

    const attendance = await db.getStudentAttendance();
    assert(Array.isArray(attendance), 'Academics: db.getStudentAttendance() returns array');
  } catch (e: any) {
    assert(false, 'Teacher Domain check exception', e.message);
  }

  // -------------------------------------------------------------------------
  // 5. EXAMINATION & GRADING CONNECTIVITY
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Examination & Evaluation Domain ---');
  try {
    const schedules = await db.getExamSchedules();
    assert(Array.isArray(schedules), 'Examinations: db.getExamSchedules() returns array');

    const results = await db.getExamResults();
    assert(Array.isArray(results), 'Examinations: db.getExamResults() returns array');

    const tickets = await db.getHallTickets();
    assert(Array.isArray(tickets), 'Examinations: db.getHallTickets() returns array');
  } catch (e: any) {
    assert(false, 'Examination Domain check exception', e.message);
  }

  // -------------------------------------------------------------------------
  // 6. LIBRARY & DIGITAL REPOSITORY CONNECTIVITY
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Library & Digital Resources Domain ---');
  try {
    const books = await db.getLibraryBooks();
    assert(Array.isArray(books), 'Library: db.getLibraryBooks() returns array');

    const issued = await db.getIssuedBooks();
    assert(Array.isArray(issued), 'Library: db.getIssuedBooks() returns array');

    const digital = await db.getDigitalLibraryResources();
    assert(Array.isArray(digital), 'Library: db.getDigitalLibraryResources() returns array');
  } catch (e: any) {
    assert(false, 'Library Domain check exception', e.message);
  }

  // -------------------------------------------------------------------------
  // 7. NAAC ACCREDITATION & QUALITY CONNECTIVITY
  // -------------------------------------------------------------------------
  console.log('\n--- 7. NAAC & Accreditation Domain ---');
  try {
    const progress = await db.getNAACCriterionProgress();
    assert(Array.isArray(progress), 'NAAC: db.getNAACCriterionProgress() executes successfully');

    const naacDocs = await db.getNAACDocuments();
    assert(Array.isArray(naacDocs), 'NAAC: db.getNAACDocuments() returns array');
  } catch (e: any) {
    assert(false, 'NAAC Domain check exception', e.message);
  }

  // -------------------------------------------------------------------------
  // 8. CAMPUS SERVICES (TRANSPORT, STORE, MEDICAL, SPORTS, DISCIPLINE, HR)
  // -------------------------------------------------------------------------
  console.log('\n--- 8. Campus Logistics & Welfare Domains ---');
  try {
    const vehicles = await db.getTransportVehicles();
    assert(Array.isArray(vehicles), 'Transport: db.getTransportVehicles() returns array');

    const storeProducts = await db.getStoreProducts();
    assert(Array.isArray(storeProducts), 'Store: db.getStoreProducts() returns array');

    const health = await db.getHealthRecords();
    assert(Array.isArray(health), 'Medical: db.getHealthRecords() returns array');

    const infirmary = await db.getInfirmaryVisits();
    assert(Array.isArray(infirmary), 'Medical: db.getInfirmaryVisits() returns array');

    const sportsEvents = await db.getSportsEvents();
    assert(Array.isArray(sportsEvents), 'Sports: db.getSportsEvents() returns array');

    const sportsTeams = await db.getSportsTeams();
    assert(Array.isArray(sportsTeams), 'Sports: db.getSportsTeams() returns array');

    const certificates = await db.getCertificates();
    assert(Array.isArray(certificates), 'Certificates: db.getCertificates() returns array');

    const incidents = await db.getDisciplinaryIncidents();
    assert(Array.isArray(incidents), 'Discipline: db.getDisciplinaryIncidents() returns array');

    const payrollRuns = await db.getStaffPayrollRuns();
    assert(Array.isArray(payrollRuns), 'HR: db.getStaffPayrollRuns() returns array');
  } catch (e: any) {
    assert(false, 'Campus Services exception', e.message);
  }

  // -------------------------------------------------------------------------
  // 9. LIVE DATA PERSISTENCE & MUTATION TEST
  // -------------------------------------------------------------------------
  console.log('\n--- 9. Live Database Mutation & Persistence Test ---');
  try {
    // 1. Insert a test row using admin service client
    const { data: inserted, error: insertError } = await sbAdmin
      .from('library_books')
      .insert({
        title: 'Supabase Real-Time Persistence Audit Book',
        author: 'Quality Assurance System',
        isbn: '978-0000000001',
        category: 'Diagnostic Reference',
        subject: 'Hematology',
        total_copies: 5,
        available_copies: 5,
        type: 'Physical',
        status: 'Available'
      })
      .select()
      .single();

    assert(!insertError && !!inserted && !!inserted.id, 'Mutation: Insert live test row into Supabase database');

    // 2. Query it back through db service
    const fetchedBooks = await db.getLibraryBooks();
    const found = fetchedBooks.find(b => b.id === inserted.id);
    assert(!!found && found.title === 'Supabase Real-Time Persistence Audit Book', 'Persistence: Row successfully queried via db.getLibraryBooks()');

    // 3. Clean up test record
    const { error: deleteError } = await sbAdmin.from('library_books').delete().eq('id', inserted.id);
    assert(!deleteError, 'Clean-up: Live test row purged cleanly from database');
  } catch (e: any) {
    assert(false, 'Mutation & Persistence test exception', e.message);
  }

  console.log('\n================================================================');
  console.log(`TOTAL AUDIT CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    throw new Error(`${failed} connectivity tests failed.`);
  }
}

verifyAllRolesAndModules().catch(err => {
  console.error(err);
  process.exit(1);
});
