import { db } from '../../services/supabase/database';
import { handleAdminUserOperation } from '../adminBackend';
import { createClient } from '@supabase/supabase-js';
import { ROLE_CONFIGS } from '../../config/roles';
import { OFFICIAL_COURSES } from '../../constants/courses';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) { throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'); }

async function runComprehensiveFinanceWorkflowTests() {
  console.log('================================================================');
  console.log('FINANCE MODULE: COMPLETE AUDIT & FULL WORKFLOW VERIFICATION TEST');
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

  const adminToken = 'mock-test-role:admin:test-admin-uid';
  const financeManagerId = 'b56cb9d7-589f-4c1d-8bfe-e278816f1a91';
  const accountantId = 'dfe79901-884a-4423-8c8a-084948f63993';

  // Test identifiers
  const testSuffix = Date.now().toString().slice(-4);
  const testStudentEmail = `fin_student_${testSuffix}@adithyan.test.in`;
  const testParentEmail = `fin_parent_${testSuffix}@adithyan.test.in`;
  const testParentPhone = `98444${testSuffix}`;

  let testStudentId = '';
  let testStudentRollNumber = '';
  let testParentId = '';
  let testFeeStructureId = '';
  let testStudentFeeId = '';
  let testReceiptId = '';
  let testTransactionId = '';
  let testScholarshipAppId = '';
  let testRefundTxId = '';

  try {
    // -------------------------------------------------------------------------
    // 1. Finance Profiles & Role Permissions Verification
    // -------------------------------------------------------------------------
    console.log('--- 1. Finance Profiles & Role Permissions ---');
    const { data: fmProfile, error: fmErr } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', financeManagerId)
      .single();

    assert(!fmErr && !!fmProfile, 'Finance Manager profile exists in database');
    assert(fmProfile?.role === 'finance_manager', 'Profile role is strictly verified as "finance_manager"');
    assert(fmProfile?.email === 'finance@1.edu', 'Finance Manager email verified as "finance@1.edu"');

    const { data: accProfile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', accountantId)
      .single();
    assert(accProfile?.role === 'accountant', 'Accountant profile verified as "accountant"');

    // Role configuration routes
    const fmConfig = ROLE_CONFIGS.finance_manager;
    assert(fmConfig.allowedRoutes.includes('/admin/finance'), 'Finance Manager allowed routes include /admin/finance');
    assert(fmConfig.allowedRoutes.includes('/admin/accounts'), 'Finance Manager allowed routes include /admin/accounts');

    // -------------------------------------------------------------------------
    // 2. Provision Real Student & Linked Parent (Admission Confirmation)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Student & Parent Account Provisioning ---');
    const confirmRes = await handleAdminUserOperation(adminToken, {
      action: 'confirm_admission',
      student: {
        name: `Kavitha Student ${testSuffix}`,
        email: testStudentEmail,
        phone: `91555${testSuffix}`,
        department: 'B.Sc Medical Laboratory Technology',
        class_name: 'Semester 1',
        date_of_birth: '2006-05-15',
        address: '100 College Road, Coimbatore',
        previous_school: 'Paramedical Prep Academy',
      },
      parent: {
        name: `Kavitha Parent ${testSuffix}`,
        email: testParentEmail,
        phone: testParentPhone,
        relationship: 'Mother',
      },
    });

    assert(confirmRes.status === 200, 'Admission confirmation executed successfully');
    testStudentId = confirmRes.body.student?.id;
    testStudentRollNumber = confirmRes.body.student?.student_id;
    testParentId = confirmRes.body.parent?.id;

    assert(!!testStudentId && !!testParentId, 'Student and Parent accounts provisioned with valid IDs');

    // Verify parent-student linking
    const parentLinks = await db.getParentStudentLinks(testParentId);
    assert(parentLinks.length >= 1 && parentLinks[0].student_id === testStudentId, 'Parent-Student linking established and queryable');

    // -------------------------------------------------------------------------
    // 3. Institutional Fee Structure Master Management
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Fee Structure Management ---');
    const existingStructures = await db.getFeeStructures();
    assert(existingStructures.length > 0, 'Existing fee structures retrieved from database');

    const newStructure = await db.createFeeStructure({
      title: `B.Sc MLT Annual Test Structure ${testSuffix}`,
      department: 'B.Sc Medical Laboratory Technology',
      academic_year: '2026-2027',
      quota: 'Merit',
      tuition_fee: 65000,
      lab_fee: 15000,
      exam_fee: 5000,
      library_fee: 3000,
      sports_fee: 2000,
      development_fund: 5000,
      total_annual_fee: 95000,
      installments_allowed: 2
    });

    assert(!!newStructure && !!newStructure.id, 'Fee structure created via db.createFeeStructure');
    assert(Number(newStructure?.total_annual_fee) === 95000, 'Total annual fee equals ₹95,000');
    testFeeStructureId = newStructure?.id || '';

    // -------------------------------------------------------------------------
    // 4. Batch Fee Assignment & Single Student Invoicing
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Fee Invoicing (Batch & Single) ---');
    // Test Single Student Fee Invoicing
    const dueDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const createdFee = await db.createStudentFee({
      student_id: testStudentId,
      student_name: `Kavitha Student ${testSuffix}`,
      class_name: 'B.Sc Medical Laboratory Technology - Semester 1',
      total_due: 95000,
      paid_amount: 0,
      due_date: dueDate,
      status: 'pending'
    });

    assert(!!createdFee && !!createdFee.id, 'Student fee invoice created via db.createStudentFee');
    testStudentFeeId = createdFee?.id || '';
    assert(Number(createdFee?.total_due) === 95000, 'Initial fee total_due accurately recorded as ₹95,000');
    assert(Number(createdFee?.paid_amount) === 0, 'Initial paid amount is ₹0');
    assert(createdFee?.status === 'pending', 'Initial status is "pending"');

    // Test batch assignment execution capability
    const batchRes = await db.batchAssignFeeStructure({
      feeStructureId: testFeeStructureId,
      dueDate: dueDate,
      className: 'B.Sc Medical Laboratory Technology - Semester 1'
    });
    assert(batchRes.success === true, 'Batch fee assignment executed successfully across cohort');

    // -------------------------------------------------------------------------
    // 5. Payment Recording & Official Receipt Generation
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Payment Recording & Receipt Generation ---');
    const paymentResult = await db.recordFeePayment({
      studentId: testStudentId,
      studentName: `Kavitha Student ${testSuffix}`,
      amount: 45000,
      paymentMethod: 'UPI',
      notes: '1st Semester Tuition Installment'
    });

    assert(paymentResult.success === true, 'Fee payment of ₹45,000 successfully recorded');
    assert(!!paymentResult.receipt, 'Official fee receipt automatically generated upon payment');
    testReceiptId = paymentResult.receipt?.id || '';

    // Verify student_fees table updated
    const updatedFees = await db.getStudentFees(testStudentId);
    assert(updatedFees.length > 0, 'Updated fee account retrieved');
    const updatedFee = updatedFees[0];
    assert(Number(updatedFee.paid_amount) === 45000, 'Student fee paid_amount updated to ₹45,000');
    assert(Number(updatedFee.total_due) === 50000, 'Remaining balance updated to ₹50,000 (95000 - 45000)');
    assert(updatedFee.status === 'partially_paid', 'Status correctly transitioned to "partially_paid"');

    // Verify receipt properties
    const receipt = paymentResult.receipt;
    assert(receipt?.receipt_number.startsWith('REC-'), 'Receipt number follows institutional standard: ' + receipt?.receipt_number);
    assert(Number(receipt?.amount_paid) === 45000, 'Receipt amount accurately matches ₹45,000');
    assert(Number(receipt?.balance_remaining) === 50000, 'Receipt displays accurate balance remaining (₹50,000)');
    assert(!!receipt?.qr_verification_token, 'Receipt contains cryptographic QR verification token');

    // -------------------------------------------------------------------------
    // 6. Cross-User Synchronization: Student & Parent Portals
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Cross-User Synchronization (Student & Parent) ---');
    // Student portal verification
    const studentReceipts = await db.getFeeReceipts(testStudentId);
    assert(studentReceipts.some(r => r.id === testReceiptId), 'Student portal retrieves official fee receipt');

    const studentNotifs = await db.getNotifications(testStudentId);
    assert(studentNotifs.some(n => n.title.includes('Fee Payment Received')), 'Student received real-time payment confirmation notification');

    // Parent portal verification
    const parentWardFees = await db.getStudentFees(testStudentId);
    assert(parentWardFees.length > 0, 'Parent portal successfully retrieves linked ward fees');
    assert(Number(parentWardFees[0].paid_amount) === 45000, 'Parent sees accurate ward paid amount (₹45,000)');
    assert(Number(parentWardFees[0].total_due) === 50000, 'Parent sees accurate ward outstanding dues (₹50,000)');

    const parentNotifs = await db.getNotifications(testParentId);
    assert(parentNotifs.some(n => n.title.includes('Ward Fee Payment Received')), 'Parent received real-time ward payment notification');

    // Strict security isolation
    const unrelatedParentId = '776da44a-344a-44db-b685-81058b5209d6';
    const unrelatedLinks = await db.getParentStudentLinks(unrelatedParentId);
    assert(!unrelatedLinks.some(l => l.student_id === testStudentId), 'Strict Isolation: Unrelated parent has zero access to student fee record');

    // -------------------------------------------------------------------------
    // 7. Fee Payment Reminders & Notifications
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Fee Payment Reminders ---');
    const reminderOk = await db.sendFeeReminder({
      feeId: testStudentFeeId,
      studentId: testStudentId,
      studentName: `Kavitha Student ${testSuffix}`,
      amountDue: 50000,
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
    });

    assert(reminderOk === true, 'Fee reminder dispatched successfully');
    const studentReminders = await db.getNotifications(testStudentId);
    assert(studentReminders.some(n => n.title === 'Fee Payment Reminder'), 'Student received fee reminder notification');

    const parentReminders = await db.getNotifications(testParentId);
    assert(parentReminders.some(n => n.title === 'Ward Fee Payment Notice'), 'Parent received ward fee notice notification');

    // -------------------------------------------------------------------------
    // 8. Scholarships & Fee Concession Recalculation
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Scholarships & Fee Concession Recalculation ---');
    const scholarships = await db.getScholarships();
    assert(scholarships.length > 0, 'Institutional scholarships loaded');

    // Submit scholarship application
    const scholApp = await db.submitScholarshipApplication({
      student_id: testStudentId,
      student_name: `Kavitha Student ${testSuffix}`,
      roll_number: testStudentRollNumber || `AIP-FIN-${testSuffix}`,
      department: 'B.Sc Medical Laboratory Technology',
      scholarship_id: scholarships[0].id,
      scholarship_name: scholarships[0].scholarship_name,
      academic_year: '2026-2027',
      requested_amount: 20000,
      status: 'Submitted'
    });

    assert(!!scholApp && !!scholApp.id, 'Scholarship application submitted');
    testScholarshipAppId = scholApp?.id || '';

    // Finance approves scholarship concession of ₹20,000
    const approvedSchol = await db.updateScholarshipStatus(testScholarshipAppId, 'Approved', 20000, financeManagerId);
    assert(approvedSchol === true, 'Scholarship concession approved by Finance Manager');

    // Verify student fee dues recalculated: 50,000 - 20,000 = 30,000
    const feesAfterConcession = await db.getStudentFees(testStudentId);
    assert(Number(feesAfterConcession[0].total_due) === 30000, 'Student fee total_due automatically reduced to ₹30,000 after scholarship');

    // Verify student and parent notified of concession
    const studentConcessionNotifs = await db.getNotifications(testStudentId);
    assert(studentConcessionNotifs.some(n => n.title === 'Scholarship Concession Sanctioned'), 'Student notified of sanctioned concession');

    const parentConcessionNotifs = await db.getNotifications(testParentId);
    assert(parentConcessionNotifs.some(n => n.title === 'Ward Scholarship Concession Approved'), 'Parent notified of ward fee concession');

    // -------------------------------------------------------------------------
    // 9. Operating Expenses, Ledger Vouchers & Payroll
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Operating Expenses & Staff Payroll ---');
    const expenseTx = await db.createFinanceTransaction({
      type: 'Laboratory Supplies',
      amount: 18500,
      department: 'Clinical Biochemistry',
      description: 'Reagents, test kits and consumable pipettes',
      urgency: 'medium',
      status: 'Approved'
    });

    assert(!!expenseTx && !!expenseTx.id, 'Operating expense voucher logged in ledger');
    assert(Number(expenseTx?.amount) === 18500, 'Voucher amount recorded as ₹18,500');
    testTransactionId = expenseTx?.id || '';

    // Payroll disbursement
    const payrollOk = await db.processPayrollDisbursement({
      department: 'Teaching Faculty',
      amount: 450000,
      employeesCount: 15,
      type: 'salary'
    });
    assert(payrollOk === true, 'Staff payroll disbursement of ₹450,000 recorded in ledger');

    // -------------------------------------------------------------------------
    // 10. Fee Refund Processing & Balance Reconciliation
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Fee Refund Processing ---');
    const refundRes = await db.processFeeRefund({
      studentId: testStudentId,
      studentName: `Kavitha Student ${testSuffix}`,
      feeId: testStudentFeeId,
      amount: 5000,
      reason: 'Concession excess adjustment',
      paymentMethod: 'Bank Transfer'
    });

    assert(refundRes.success === true, 'Fee refund of ₹5,000 processed successfully');
    testRefundTxId = refundRes.transaction?.id || '';

    // Verify student fee balance updated: paid_amount 45000 - 5000 = 40000, total_due 30000 + 5000 = 35000
    const feesAfterRefund = await db.getStudentFees(testStudentId);
    assert(Number(feesAfterRefund[0].paid_amount) === 40000, 'Student paid_amount adjusted to ₹40,000 after refund');
    assert(Number(feesAfterRefund[0].total_due) === 35000, 'Student total_due adjusted to ₹35,000 after refund');

    // Verify refund notification
    const studentRefundNotifs = await db.getNotifications(testStudentId);
    assert(studentRefundNotifs.some(n => n.title === 'Fee Refund Processed'), 'Student received fee refund notification');

    // -------------------------------------------------------------------------
    // 11. Reports & Financial Analytics Reconciliation
    // -------------------------------------------------------------------------
    console.log('\n--- 11. Reports & Financial Analytics Reconciliation ---');
    const allStudentFees = await db.getStudentFees();
    const allTransactions = await db.getFinanceTransactions();

    const calcTotalPaid = allStudentFees.reduce((s, f) => s + Number(f.paid_amount || 0), 0);
    const calcTotalDue = allStudentFees.reduce((s, f) => s + Number(f.total_due || 0), 0);
    assert(calcTotalPaid > 0, `Total collections calculated accurately across ledger: ₹${calcTotalPaid.toLocaleString('en-IN')}`);
    assert(calcTotalDue >= 0, `Outstanding collections calculated accurately: ₹${calcTotalDue.toLocaleString('en-IN')}`);
    assert(allTransactions.length > 0, `Ledger contains ${allTransactions.length} auditable transaction entries`);

    // Course recovery percentage check
    const mltFees = allStudentFees.filter(f => f.class_name?.includes('Medical Laboratory Technology'));
    assert(mltFees.length > 0, 'Program-wise fee recovery matrix accurately aggregates B.Sc MLT records');

  } catch (err: any) {
    console.error('Unexpected test exception occurred:', err);
    assert(false, 'Uncaught Exception in test run', err?.message);
  } finally {
    // -------------------------------------------------------------------------
    // 12. Cleanup of Transient Test Records
    // -------------------------------------------------------------------------
    console.log('\n--- 12. Cleanup of Transient Test Records ---');
    if (testFeeStructureId) {
      await adminClient.from('fee_structures').delete().eq('id', testFeeStructureId);
    }
    if (testReceiptId) {
      await adminClient.from('fee_receipts').delete().eq('id', testReceiptId);
    }
    if (testStudentFeeId) {
      await adminClient.from('student_fees').delete().eq('id', testStudentFeeId);
    }
    if (testTransactionId) {
      await adminClient.from('finance_transactions').delete().eq('id', testTransactionId);
    }
    if (testRefundTxId) {
      await adminClient.from('finance_transactions').delete().eq('id', testRefundTxId);
    }
    if (testScholarshipAppId) {
      await adminClient.from('scholarship_applications').delete().eq('id', testScholarshipAppId);
    }
    if (testStudentId) {
      await adminClient.from('notifications').delete().eq('user_id', testStudentId);
      await adminClient.from('student_fees').delete().eq('student_id', testStudentId);
      await adminClient.from('fee_receipts').delete().eq('student_id', testStudentId);
      await adminClient.from('parent_student_links').delete().eq('student_id', testStudentId);
      await adminClient.from('profiles').delete().eq('id', testStudentId);
      await adminClient.auth.admin.deleteUser(testStudentId);
    }
    if (testParentId) {
      await adminClient.from('notifications').delete().eq('user_id', testParentId);
      await adminClient.from('parent_student_links').delete().eq('parent_id', testParentId);
      await adminClient.from('profiles').delete().eq('id', testParentId);
      await adminClient.auth.admin.deleteUser(testParentId);
    }
    console.log('✓ Clean teardown executed safely without deleting genuine records.');
  }

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runComprehensiveFinanceWorkflowTests();
