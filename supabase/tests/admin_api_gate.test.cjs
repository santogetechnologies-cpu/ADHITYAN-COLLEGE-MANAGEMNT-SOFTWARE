// Authorization-gate tests for supabase/functions/_shared/admin_backend.ts (no database needed).
// Run via scripts/test-edge-gate.sh
globalThis.Deno = { env: { get: (k) => ({SUPABASE_URL:'http://127.0.0.1:1',SUPABASE_ANON_KEY:'a',SUPABASE_SERVICE_ROLE_KEY:'s'})[k] } };
const { handleAdminUserOperation } = require(process.argv[2] || './out/_shared/admin_backend.js');
const c = (role, id='11111111-1111-1111-1111-111111111111') => ({ id, role, email: role+'@x' });
let fail = 0;
async function expect(name, caller, body, status, code) {
  const r = await handleAdminUserOperation(caller, body, 'tok');
  const ok = r.status === status && (!code || r.body.code === code);
  if (!ok) fail++;
  console.log((ok ? 'PASS' : 'FAIL'), name, '->', r.status, r.body.code ?? '');
}
(async () => {
  await expect('no action', c('admin'), {}, 400);
  await expect('student list_users', c('student'), { action: 'list_users' }, 403, 'FORBIDDEN');
  await expect('teacher create_user', c('teacher'), { action: 'create_user' }, 403);
  await expect('receptionist delete_user', c('receptionist'), { action: 'delete_user' }, 403);
  await expect('principal restore_system_backup (admin only)', c('principal'), { action: 'restore_system_backup' }, 403);
  await expect('student collect_fee_payment', c('student'), { action: 'collect_fee_payment', payment: {} }, 403);
  await expect('teacher collect_fee_payment', c('teacher'), { action: 'collect_fee_payment', payment: {} }, 403);
  await expect('accountant collect_fee_payment (not a collector)', c('accountant'), { action: 'collect_fee_payment', payment: {} }, 403);
  await expect('financier collect w/o fee id -> validation', c('financier'), { action: 'collect_fee_payment', payment: { amount: 5 } }, 400, 'VALIDATION_ERROR');
  await expect('financier collect negative', c('financier'), { action: 'collect_fee_payment', payment: { student_fee_id: '11111111-1111-1111-1111-111111111111', amount: -5 } }, 400, 'VALIDATION_ERROR');
  await expect('student reads other student telemetry', c('student'), { action: 'get_child_telemetry', studentId: '22222222-2222-2222-2222-222222222222' }, 403, 'FORBIDDEN');
  await expect('driver get_child_telemetry', c('driver'), { action: 'get_child_telemetry', studentId: 'x' }, 403);
  await expect('student get_parent_student_links', c('student'), { action: 'get_parent_student_links' }, 403);
  await expect('teacher submit_assignment (student only)', c('teacher'), { action: 'submit_assignment', submission: {} }, 403);
  await expect('student create_assignment', c('student'), { action: 'create_assignment', assignment: {} }, 403);
  await expect('teacher record_attendance -> 501 not faked', c('teacher'), { action: 'record_attendance' }, 501, 'NOT_IMPLEMENTED');
  await expect('platform action removed (admin)', c('admin'), { action: 'platform_provision_college' }, 400, 'UNKNOWN_ACTION');
  await expect('verify_tenant_isolation removed', c('admin'), { action: 'verify_tenant_isolation' }, 400, 'UNKNOWN_ACTION');
  await expect('unknown action', c('admin'), { action: 'drop_everything' }, 400, 'UNKNOWN_ACTION');
  await expect('hr_manager unlisted action -> default admin/principal only', c('hr_manager'), { action: 'update_user' }, 403);
  await expect('student enroll_admission', c('student'), { action: 'enroll_admission', id: 'x' }, 403, 'FORBIDDEN');
  await expect('teacher update_admission_status', c('teacher'), { action: 'update_admission_status', id: 'x', status: 'Approved' }, 403);
  await expect('receptionist enroll w/o id -> validation', c('receptionist'), { action: 'enroll_admission' }, 400, 'VALIDATION_ERROR');
  await expect('receptionist status w/o status -> validation', c('receptionist'), { action: 'update_admission_status', id: 'x' }, 400, 'VALIDATION_ERROR');
  await expect('create application w/o student id', c('receptionist'), { action: 'create_admission_application', application: { name: 'A' } }, 400, 'STUDENT_ID_REQUIRED');
  await expect('create application bad e-mail', c('receptionist'), { action: 'create_admission_application', application: { student_id: 'S1', name: 'A', email: 'nope' } }, 400, 'VALIDATION_ERROR');
  await expect('create application w/o course', c('receptionist'), { action: 'create_admission_application', application: { student_id: 'S1', name: 'A', email: '' } }, 400, 'VALIDATION_ERROR');
  await expect('student schedule tests', c('student'), { action: 'schedule_admission_tests', application_ids: ['x'], test_date: '2026-06-01' }, 403, 'FORBIDDEN');
  await expect('teacher publish merit', c('teacher'), { action: 'publish_merit_list', course: 'X', seats: 1, weight_qualifying: 50 }, 403);
  await expect('schedule: bad ids', c('receptionist'), { action: 'schedule_admission_tests', application_ids: ['nope'], test_date: '2026-06-01' }, 400, 'VALIDATION_ERROR');
  await expect('schedule: no date', c('receptionist'), { action: 'schedule_admission_tests', application_ids: ['11111111-1111-1111-1111-111111111111'] }, 400, 'VALIDATION_ERROR');
  await expect('result: bad test id', c('receptionist'), { action: 'record_entrance_result', test_id: 'x', status: 'Completed', score: 5 }, 400, 'VALIDATION_ERROR');
  await expect('merit: fractional seats refused', c('receptionist'), { action: 'publish_merit_list', course: 'X', seats: 1.5, weight_qualifying: 50 }, 400, 'VALIDATION_ERROR');
  await expect('merit: no course', c('receptionist'), { action: 'publish_merit_list', seats: 5, weight_qualifying: 50 }, 400, 'VALIDATION_ERROR');
  await expect('apply merit: no course', c('principal'), { action: 'apply_merit_decisions' }, 400, 'VALIDATION_ERROR');
  await expect('deposit: bad id', c('receptionist'), { action: 'record_admission_deposit', deposit: { application_id: 'x', amount: 5 } }, 400, 'VALIDATION_ERROR');
  await expect('deposit: negative amount', c('receptionist'), { action: 'record_admission_deposit', deposit: { application_id: '11111111-1111-1111-1111-111111111111', amount: -5 } }, 400, 'VALIDATION_ERROR');
  await expect('student deposit', c('student'), { action: 'record_admission_deposit', deposit: {} }, 403);
  await expect('student fee_generate', c('student'), { action: 'fee_generate', execute: true, generate: {} }, 403);
  await expect('financier cannot configure fees', c('financier'), { action: 'fee_generate', generate: {} }, 403);
  await expect('accountant cannot waive fees', c('accountant'), { action: 'fee_adjust', adjustment: {} }, 403);
  await expect('principal cannot cancel a fee run', c('principal'), { action: 'fee_cancel_run', run_id: 'x', reason: 'r' }, 403);
  await expect('fee_generate needs a plan or a head', c('finance_manager'), { action: 'fee_generate', generate: { scope_type: 'all' } }, 400, 'VALIDATION_ERROR');
  await expect('fee_generate rejects a malformed plan id', c('finance_manager'), { action: 'fee_generate', generate: { plan_id: 'nope', scope_type: 'all' } }, 400, 'VALIDATION_ERROR');
  console.log(fail ? `\n${fail} FAILED` : '\nALL GATE TESTS PASSED'); process.exit(fail ? 1 : 0);
})();
