# Deployment runbook — migrations 028–037 + edge functions

Everything below is done **by you** on a staging project first (this repo never touches your Supabase). Nothing here is
destructive: every migration is additive/idempotent and wrapped in a transaction; the only data statements are
back-fills of NULLs and a de-duplication of `super_admin_releases` rows with the same version (keeps the earliest).

## 0. Before anything
1. Take a backup / note the PITR point (Dashboard → Database → Backups).
2. Run on **staging** (a restored copy of production if possible). Stage scripts contain pre-flight checks that
   `RAISE EXCEPTION` on bad data (NULL roles; duplicate attendance keys; unknown role values) — read the message,
   fix the data, re-run. They are safe to re-run.
3. `supabase migration list` must show 001–015 applied and **no** 016–027. If the remote history lists any of 016–027,
   do not push; run `supabase migration repair --status reverted <version>` for each, or tell me and I will adapt.
   (016–027 + `all_migrations.sql` were moved to `supabase/migrations_archive/` so `db push` cannot run them.)

## 1. Migrations (apply in order; `supabase db push`)
| File | What it does | Depends on |
|------|--------------|-----------|
| 028_reconcile_missing_core_objects.sql | `institutional_settings`, `students` (+ID generator, sync triggers, immutable id), `student_mood_checkins`, `fee_payments`; corrected RPCs `issue_library_book`, `return_library_book`, `checkout_store_order`, `decrement_book_copies`, `resolve_login_id`, `get_first_login_status` | 001–015 |
| 029_phase1_columns.sql | profile `status/login_id/student_id`, timetable/exam/reception columns, safe defaults (hostel passes start Pending) | 028 |
| 030_phase1_constraints.sql | 20-role whitelist, login-id uniqueness, attendance unique key, leave-balance checks | 029 |
| 031_phase1_triggers_and_functions.sql | profile-column protection (no self role change), attendance window, leave state machine, search_path lockdown | 030 |
| 032_phase1_rls_and_storage.sql | unbundled per-operation RLS on ERP tables, private storage buckets | 031 |
| 033_phase1_configs_and_audit.sql | `super_admin_configs/releases`, append-only `audit_logs` (no UPDATE/DELETE/TRUNCATE) | 032 |
| 034_auth_rate_limits.sql | `auth_rate_limits`, `check_rate_limit()` (service_role only) | — |
| 035_record_fee_payment.sql | transactional, idempotent `record_fee_payment()` + receipts (service_role only) | 028 |
| 037_admissions_lifecycle.sql | **closes RLS on `admission_document_verifications` / `admission_merit_lists`** (were open to the public key), typed application columns + backfill from the JSON workaround (originals kept), wider status set, `admission_set_status()` (validated transitions + audit), `admission_enroll()` (transactional, idempotent student record), student↔profile adoption | 028, 036 |
| 038_admission_deposit.sql | `record_admission_deposit()`: admission deposit + receipt + ledger row in one transaction, idempotent | 037 |
| 039_admission_tests_and_merit.sql | entrance tests per applicant (`admission_schedule_tests`, `admission_record_test_result`), server-side merit ranking (`admission_publish_merit`: qualifying × w% + entrance × (100−w)%, seats, tie-break by submission date then id) and `admission_apply_merit` (Approved/Waitlisted through `admission_set_status`) | 038 |
| 040_fee_engine.sql | configurable fee engine: `fee_heads`, `fee_plans` + frozen-when-published `fee_plan_items` (one_time / per_semester / per_year), `fee_runs`, `fee_adjustments`; `fee_generate` (preview/execute, idempotent per student+item+term), `fee_adjust`, `fee_cancel_run`, `fee_plan_clone`; fees attach to the student record (login optional); quota/admission type on applications+students; `record_fee_payment` reworked for it | 039 |
| 041_student_fee_code.sql | `student_fees.student_code` filled by trigger (the finance table showed a fake `AIP-VERIFIED` id) | 040 |
| 042_admission_configuration.sql | configurable admissions: routes (entrance / merit / direct / lateral…), quotas, seat matrix, form fields, required documents; `admission_validate_fields`; `admission_set_status` enforces route + required documents; merit ranking and apply take a quota and default seats from the matrix | 041 |
| 043_library_renew.sql | `renew_library_book` (the Renew button only showed a toast); **RLS fix: librarian could not see issued books or manage the catalog** (policies named admin/principal/teacher only) | 042 |
| 044_shared_app_settings.sql | shared, versioned settings: `app_settings` (live, readable by all signed-in users), append-only `app_setting_versions` (release log), `app_setting_drafts`; admin-only `app_settings_draft_merge/save`, `app_settings_publish`, `app_settings_rollback`. **Fixes:** Control Center config lived in each browser's localStorage and was read back from admin-only `audit_logs` (other roles got defaults, so disabled modules stayed open to them) | 043 |
| 045_exam_core.sql | **SECURITY: legacy permissive policies let students/parents read UNPUBLISHED marks and let any teacher edit any result — dropped**; teachers enter marks only for their classes while unpublished; one result per exam+student+subject; `exam_save_marks` (all-or-nothing, server grading), `exam_publish_results` (publish / withdraw with reason), `exam_analytics`; students see an exam once its timetable/hall tickets/results are published | 044 |
| 046_hall_tickets.sql | Hall tickets from real attendance and (optional) fee clearance: `exam_generate_hall_tickets`, audited `exam_release_hall_ticket`, `exam_set_hall_tickets_visible`, public `exam_verify_hall_ticket`; removed fabricated defaults (hall B-302, seat 14-B, attendance 88, signature); students see tickets only after publishing; `record_fee_payment`/`record_admission_deposit` search_path includes `extensions` | 045 |
| 047_alumni.sql | **SECURITY: alumni directory (e-mail/phone of former students) was readable by every signed-in user — now admin/principal/placement/HOD only**; donations get validated amount/status; new `alumni_mentorships` table with staff-only RLS | 046 |
| 048_certificates.sql | **SECURITY/INTEGRITY: certificates were created from the browser (typed name, made-up number) and showed as created even when saving failed.** Now `certificate_issue`, `certificate_request` (student), `certificate_decide` (reject needs a reason), public `certificate_verify`; server-generated number + hash; no direct writes; audited | 047 |
| 049_medical.sql | **PRIVACY: teachers could read every student's health record — now owner/admin/principal only**; infirmary log limited to admin/principal/hostel warden; new `medical_emergency_contacts` and `wellness_alerts` tables; unique student ID per health record | 048 |
| 050_naac.sql | **PRIVACY: NAAC evidence readable by every signed-in user (students, parents) and deletable by teachers — now staff-only, delete by coordinator/principal/admin**; new `naac_metrics`; progress % computed by trigger (no hand-typed %); evidence files go to a new PRIVATE bucket `naac-evidence` (signed links) instead of only saving the file name | 049 |
| 051_discipline.sql | **PRIVACY/INTEGRITY: every teacher could read all disciplinary incidents and resolve any of them** — now reporters see only their own; principal/admin decide through audited `discipline_update` (a resolution needs the action taken); no direct update/delete | 050 |
| 052_hostel_outpass_integrity.sql | **INTEGRITY: students/parents could set `parent_otp_verified` on their own out-pass**; trigger enforces who may set consent/gate fields, valid status flow Pending→Approved→Exited→Returned (Rejected), gate times stamped by the server; return time must be after departure | 032 |
| 053_payroll.sql | **CRITICAL PRIVACY: `staff_service_records` allowed every signed-in user to read AND edit all staff PAN/bank/salary** — now own record or HR/finance/principal/admin; HR/admin only can write. Payroll computed on the server (`payroll_run_create`) from service records + approved leave-without-pay, rules in `payroll_settings` (EPF %, ceiling, ESI, PT — **must be set by the institution before the first run**), Draft → Approved (not by the preparer) → Disbursed (bank reference required), cancel with reason; direct writes revoked; invented pay/bank defaults removed | 028 |
| 054_transport_access.sql | **PRIVACY/INTEGRITY: any driver could edit every vehicle, stop, rider log and maintenance record; every signed-in user could read all vehicles (driver phone, live location)** — drivers act only on their own bus (and may only report location/status/seats), riders/parents see only their own bus, seats cannot exceed capacity | 001 |
| 055_placement.sql | Students apply only through `placement_apply` (deadline, drive open, department and minimum-CGPA checks, one application per drive); applicants cannot edit CGPA/round/outcome (only withdraw); drive statuses validated; drives hidden from non-college roles. CGPA is self-declared until grade points are computed from results | 032 |
| 056_store_orders.sql | **INTEGRITY: store orders trusted the browser's prices/total/status** (student could insert a 'Delivered' order for ₹0; stock changed from the browser); managers' status changes never saved (no UPDATE policy). Now only `checkout_store_order` (server prices + row locks) creates orders, `store_order_set_status` moves them (Pending→Processing→Delivered/Cancelled; cancel restocks; student may cancel own pending); old `place_store_order` revoked | 028 |
| 057_notifications.sql | **Every cross-user alert was silently rejected by RLS** (users could only write notifications for themselves) — warden→student, store→admin, transport→riders, receptionist→admins etc. never arrived. Now `notify_users` / `notify_roles` (staff only, size-limited, validated type/priority); students/parents can only notify themselves | 001 |
| 058_assignments.sql | **INTEGRITY: a student could submit work already 'graded' with any score; any teacher could edit/grade any other teacher's assignments** — submissions forced to submitted/late with no score; teachers manage and grade only their own (`assignment_grade`, 0–100); one submission per student; graded work locked | 001 |
| 059_password_change_ack.sql | Lets a user clear their own "must change password" flag after choosing a new password (admin password resets now set the flag; the app blocks until the user changes it) | 028 |
| 060_open_policies.sql | **PRIVACY/INTEGRITY: `attendance_shortage_warnings` and `scholarships_master` were `ALL USING (true)`** — any signed-in user could read/rewrite warnings and edit scholarship schemes; now student/parent/staff scoped (parent may only acknowledge) and admin/principal/finance for schemes. Also revokes TRUNCATE/REFERENCES/TRIGGER (not governed by RLS) from `anon`/`authenticated` on all public tables | 001 |
| 061_hr_staff_directory.sql | HR can list non-student/non-parent profiles (the HR dashboard and leave manager saw nothing before) | 053 |
| 062_leave_decisions.sql | Staff leave decisions only through `staff_leave_decide`: HOD/principal/HR/admin, never your own leave, rejection needs a reason, over-quota approvals refused (the existing balance-ledger trigger does the deduction); leave days must fit the dates; balances can no longer be edited directly | 053 |
| 036_reconcile_legacy_columns.sql | `timetables.session_type`, `exam_schedules.day_of_week`, `student_attendance.*`, reception columns | 029 |

**Behaviour changes to expect after 032:** buckets `documents`, `attachments`, `student_documents`, `staff_documents`
become private → any UI showing uploaded files must use `createSignedUrl()`. `profiles` role/status can no longer be
changed by the user themselves. Per-operation RLS replaces the older permissive policies (an old permissive policy
that was missed would still apply — check `select * from pg_policies` on `profiles`, `exams`, `fee_*`).

Not carried over on purpose: multi-college tables (`colleges`, `college_*`, `platform_super_admin`), plaintext OTP columns.

### Verify
```bash
psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/smoke_028_037.sql   # synthetic data, rolls back
```
All lines must read PASS (282 checks). Edge-function checks: `scripts/test-edge-gate.sh` (type-check + authorization/validation cases; needs no database). Then in the SQL editor: `select count(*) from public.profiles where role is null;` (must be 0).

### Rollback
Each file is one transaction, so a failure leaves nothing half-applied. To undo a *successful* run use the backup/PITR from
step 0 (no down-migrations are provided — dropping RLS/privilege changes by script is riskier than restoring).
Note: `docs/DATABASE_DEPLOYMENT_AND_ROLLBACK_PLAN.md` references a `028_rollback.sql` that was never written.

## 2. Edge functions
Secrets (Dashboard → Edge Functions → Secrets, or `supabase secrets set`):
`ALLOWED_ORIGINS=https://your-erp-domain,http://localhost:8080`  ·  `GEMINI_API_KEY` (for ai-chat; already required).
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

```bash
supabase functions deploy admin-api admin-create-user ai-chat          # JWT verification ON
supabase functions deploy auth-resolve-login-id auth-first-login --no-verify-jwt   # pre-login, public by design
supabase functions delete admin-users                                  # superseded; was exploitable
```
First-login activation e-mails an OTP through **Supabase Auth**: configure SMTP (Auth → SMTP) and make the
"Magic Link" template include `{{ .Token }}`. Without SMTP students/parents cannot self-activate (an admin can still reset
passwords from User Management).

Also: Auth → Providers → Email → **disable "Allow new users to sign up"** (accounts are provisioned by staff).

Frontend: no change needed beyond this branch. In production builds `src/lib/apiBase.ts` sends `/api/*` calls to
`<VITE_SUPABASE_URL>/functions/v1/<function>`; `vite dev` keeps using the local dev plugin (`VITE_USE_EDGE_API=true` to test the
functions locally).

### Smoke-check the functions (staging)
```bash
curl -s -X POST "$SUPABASE_URL/functions/v1/admin-api" -H "Authorization: Bearer $STUDENT_JWT" -H 'Content-Type: application/json' -d '{"action":"list_users"}'   # expect 403 FORBIDDEN
curl -s -X POST "$SUPABASE_URL/functions/v1/admin-api" -H "Authorization: Bearer $ADMIN_JWT"   -H 'Content-Type: application/json' -d '{"action":"list_users"}'   # expect 200
curl -s -X POST "$SUPABASE_URL/functions/v1/admin-api" -H 'Content-Type: application/json' -d '{}'                                                               # expect 401
```
Also confirm a user who runs `supabase.auth.updateUser({ data: { role: 'admin' } })` is still refused.

### Behaviour changes from the admissions work (037/038 + app)
- New student/parent accounts created by `confirm_admission` and parent provisioning no longer use the shared
  password `Adithyan@<year>`; they get a random password and must activate through the e-mailed code
  (the old default was guessable by anyone knowing a student's id/e-mail).
- `confirm_admission` now takes the student id from the application (the manually entered one) and ends the application
  as **Enrolled** (linked to the student record) instead of leaving it "Approved".
- Applications: Submitted → Under Review → Approved → (Offered) → Enrolled; Approve can no longer skip review.

## 3. Known gaps after this deployment
See `docs/audit/01-Executive-Audit.md` ("High / medium") and `19-Implementation-Tracker.md`.
