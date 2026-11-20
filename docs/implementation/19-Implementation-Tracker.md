# Implementation tracker (actual status — "done" means verified, not merely written)

Legend: ✅ done & verified as stated · 🟡 written, not runnable here · ⬜ not started

## Stage 1 — Discovery & audit
| Item | Status | Evidence |
|------|--------|----------|
| Code-vs-DB gap analysis (tables, RPCs, columns) | ✅ | scratch PG16 from 001–015; see audit doc |
| Security audit of server/edge code | ✅ (this layer only) | `docs/audit/01-Executive-Audit.md` |
| Full per-feature audit matrix (every page → table) | ⬜ | prior docs `COMPLETE_FEATURE_INVENTORY.md`, `FEATURE_MATRIX.md` exist but were not re-verified |
| ERD / target architecture docs | ⬜ | |

## Stage 2 — Data integrity & security (database)
| Item | Status | Files | Evidence |
|------|--------|-------|----------|
| Missing core tables/RPCs | ✅ | 028 | applied twice on scratch DB; RPC behaviour tested (authz, price check, stock, double-return) |
| Columns/constraints/triggers/RLS/audit hardening | ✅ | 029–033 | applied twice; self-promotion blocked, cross-student reads blocked, audit log immutable, buckets private |
| Rate limiting, transactional fee posting | ✅ | 034, 035 | idempotency, overpayment, service_role-only tested |
| Legacy column reconcile | ✅ | 036 | applied twice |
| Smoke test in repo | ✅ | `supabase/tests/smoke_028_037.sql` | 13/13 PASS |
| Run on real Supabase / staging | ⬜ (you) | | |
| Central student identity model (applications, enrollments, history, multi-identifier, config) | 🟡 minimal: `students` table + permanent id only | 028 | enrollment/history/identifiers not built |
| Configurable permission engine (beyond role names) | ⬜ | | |

## Stage 3+ (UI shell, config engine, admissions, fees, exams, workflow, reporting, AI…)
| Item | Status |
|------|--------|
| Sidebar/app-shell/design-system redesign | ⬜ |
| Institutional configuration engine, academic structure | ⬜ |
| Admissions lifecycle + form builder + admission→student conversion | ⬜ |
| Fee structures/versioning/invoices/ledger/accounting (double-entry) | 🟡 only single-payment posting with receipt (035) |
| Examination engine | ⬜ |
| Workflow/approval engine, Tasks & Approvals | ⬜ |
| HR/payroll, procurement, transport, hostel allocation, library fines→finance, clinical training | ⬜ |
| NAAC integration, analytics, AI governance | ⬜ |
| Automated tests (unit/integration/RLS/e2e/a11y) | 🟡 SQL smoke + gate tests only (gate tests live in scratch, not in repo yet) |

## Stage 3a — API layer (edge functions)
| Item | Status | Files | Evidence |
|------|--------|-------|----------|
| Trusted auth helper (role from `profiles`) | ✅ code | `_shared/auth.ts`, `http.ts` | type-checks vs supabase-js types |
| `admin-api` (47 actions ported, platform actions removed, IDORs closed, real fee/assignment/concern/store handlers) | 🟡 | `_shared/admin_backend.ts`, `admin-api/` | tsc 0 errors; 20 authorization-gate cases pass; **DB-touching branches not executed** |
| `auth-resolve-login-id`, `auth-first-login` | 🟡 | | tsc only; needs SMTP + staging test |
| `admin-create-user` fixed, `admin-users` disabled | 🟡 | | tsc only |
| Frontend → edge routing (`apiBase.ts`), AuthContext role hardening | ✅ build | | `vite build` passes; app not exercised in a browser |
| Remove `mock-test-role` + metadata-role trust from dev backend (`src/server/adminBackend.ts`) and migrate its tests | ⬜ | | tests depend on the bypass |
| Align backend `STU-` student-id format with DB generator | ⬜ | | |

## Next recommended increments
1. You: deploy 028–037 + functions to staging, run the smoke SQL and the curl checks in `18-Database-Migration-Plan.md`; report any failure.
2. Port the dev-only test token to a test-only guard, delete it from `src/server/adminBackend.ts`; add Deno tests for `admin-api`.
3. Student information system: enrollment + identifier + status-history tables, then admission→student conversion RPC (transactional/idempotent).
4. Fee engine (structures, versions, invoices, ledger) on top of `record_fee_payment`; then sidebar/app shell.

## Module 1 — Fee collection (UI → API → DB) — increment 2
| Item | Status | Notes |
|------|--------|-------|
| `record_fee_payment` aligned to app convention (`student_fees.total_due` = outstanding balance) + posts ledger row | ✅ SQL | smoke test 17/17 on scratch DB. (The first version assumed `total_due − paid_amount`; that was my error and is fixed) |
| `db.recordFeePayment` → single atomic server call (was 4 browser writes, `Math.random` receipt no., fake roll no. fallback, ledger insert on non-existent columns) | 🟡 code, builds | not run against a backend |
| Finance "Collect payment" dialog: invoice picker, outstanding shown + amount capped, valid payment modes, required reference, idempotency key, row "Collect" passes the invoice id | 🟡 code, builds | needs staging click-through |
| Parent/Student "Pay" were **simulated** (no gateway; marked fees paid from the browser, parent flow issued two receipts; would error after migration 032). Replaced by an honest "how to pay at the accounts desk" panel; parent totals bug (outstanding subtracted twice) fixed | 🟡 code, builds | **Online payment still needs a gateway (decision + keys + verified webhook function)** |
| `collegeDataService.recordFeePayment` / `FeesManagementView` (third implementation, admin console) | ⬜ | still the old path |
| Fee structures, versioned invoices, concessions/refunds through approval, installments, late fees | ⬜ | |

## Module 2 — Admissions → student (step 2: database + API)
| Item | Status | Evidence |
|------|--------|----------|
| Close open RLS on admission documents / merit tables | ✅ SQL | smoke: anon has no grants, student sees 0 rows, receptionist can read |
| Typed application columns, wider status set, backfill from JSON workaround | ✅ SQL | applied twice on scratch DB; valid legacy row migrated, malformed row skipped with a notice |
| `admission_set_status` (validated transitions, rejected-document gate, reason required, audit) | ✅ SQL | 9 smoke checks |
| `admission_enroll` (transactional, idempotent, creates/links `students`; later login adopts the record) | ✅ SQL | smoke: retry idempotent, exactly one student row, adoption works |
| API: `create_admission_application` (no JSON hack, no fake 85 score, duplicate-id checks), `update_admission_status`, new `enroll_admission` — edge fn + dev backend | 🟡 | tsc clean, 27 gate cases pass; DB-touching branches not run |
| **Step 3 (next):** admissions workspace UI (pipeline, Enroll button, real errors), client `db.updateAdmissionStatus` still swallows errors and writes directly, entrance-test & merit tabs rebuilt on applications, form's fake defaults (`|| 85`, `|| 88`) | ⬜ | |
| Legacy `confirm_admission` (non-transactional, creates login + parent + fee in ~10 writes) | ⬜ | to be reworked after step 3 |

## Module 2 — Admissions → student (step 3a: screens, verified by build/type-check only)
| Item | Status | Notes |
|------|--------|-------|
| Pipeline rules in one place (`src/lib/admissionWorkflow.ts`, mirrors 037) | 🟡 | |
| Applications page: status-aware primary action, Enroll button, reasons for reject/cancel, filter chips incl. Enrolled, honest counts, real load-error + Retry (no fake date) | 🟡 | |
| Review dialog: only valid actions, waits for the server, stays open on refusal (was: success toast before the save, then close) | 🟡 | |
| Client service: reads `admission_applications` only; create/status/enroll go through the API and **throw the server's message** (was: swallowed errors, silent fallback to direct inserts that skipped the duplicate-id check) | 🟡 | |
| Admission form: no invented marks (`\|\| 85/88`), deposit via server function with real receipt (was browser-built receipt, random number, shown even if the save failed), valid payment modes, reference required for non-cash | 🟡 | migration 038 |
| "Deposit" button on applications to retry/collect a deposit | 🟡 | |
| Predictable shared initial password removed (3 places) | ✅ code, 🟡 untested against auth | |
| `confirm_admission` aligned: uses application's student id, finishes via `admission_enroll` | 🟡 | still long and not transactional (auth user creation cannot be rolled back by SQL) |
| **Step 3b:** see below | | |

## Module 2 — step 3b: entrance tests and merit list
| Item | Status | Evidence |
|------|--------|----------|
| Entrance tests per applicant: schedule (single/bulk by course), reschedule pending, record score/absent, validation (score ≤ max) | ✅ SQL, 🟡 UI | smoke tests (17 new checks incl. skip closed applications, no reschedule after result) |
| Merit ranking on the server: weights, seats, exclusions with reasons, tie-break, replace-on-regenerate, hand-computed expected ranks (85 / 82.5 / 70) | ✅ SQL | smoke |
| Apply merit to applications through the status function (document gate + audit), idempotent | ✅ SQL | smoke |
| Entrance Test + Merit List screens rebuilt on applications; old hand-typed candidate forms removed; real load errors with Retry | 🟡 | build + type-check only |
| Gate tests for the new actions | ✅ | 39 cases pass (`scripts/test-edge-gate.sh`) |
| Known limits | | one test record per applicant (DB `UNIQUE(roll_no)`); scores assumed to be percentages (qualifying marks 0–100); old manual merit rows without an application stay in the table but are hidden |
| Not yet built | ⬜ | seat/quota categories (reservation), configurable formulas beyond two weights, applicant-facing portal, offer letters, admission-deposit → first-fee reconciliation at provisioning |

## Module 3 — Configurable fee engine (migration 040)
| Item | Status | Evidence |
|------|--------|----------|
| Fee heads (add any fee), plans per academic year / department / class / quota, items billed one-time / per semester (all or chosen) / per year | ✅ SQL | smoke |
| Frozen once published; cannot return to Draft; empty plan cannot publish; clone to revise | ✅ SQL | smoke |
| Bill a plan or ONE new fee mid-year to a student, class, department or everyone (+quota/semester filters); preview first; never billed twice; double-submit guard for ad-hoc | ✅ SQL | smoke with hand-computed totals (11 demands / ₹130,500) |
| Waiver / concession / cancellation (reason mandatory, append-only history, paid fees cannot be cancelled); cancel a whole run keeping paid items | ✅ SQL | smoke |
| Students without a portal login can be billed and can pay; fees link to the login when it is created | ✅ SQL | smoke |
| API actions `fee_generate` / `fee_adjust` / `fee_cancel_run` / `fee_plan_clone` (finance_manager + admin only) | 🟡 | tsc + 45 gate cases |
| Fee setup screens: fee types, plans + items (publish/clone/archive), billing wizard with mandatory preview, history with run cancel; per-fee Adjust (concession/waiver/cancel); Collect works for students without a login | 🟡 | build + type-check only (0 errors in new files) |
| Finance table: fake id `AIP-VERIFIED` removed; shows fee type + term; waived/cancelled statuses | 🟡 | migration 041 |
| Late-fee rules, installment schedules, scholarship auto-application, refunds | ⬜ | |
| Old `fee_structures` table and `FeeStructureManager` still exist (fixed columns); to be migrated into plans and retired | ⬜ | |

## Module 2b — configurable admissions (migration 042)
| Item | Status | Evidence |
|------|--------|----------|
| Admission routes: merit+entrance, marks-only, direct, lateral (+ your own); route decides entrance/merit requirement | ✅ SQL | smoke: direct approved without test; entrance route blocked until a completed test; merit route approved only via merit list |
| Quotas + seat matrix; merit ranked per quota, seats default from the matrix | ✅ SQL | smoke |
| Required documents per course (must be Verified before approval, names listed in the error) | ✅ SQL | smoke |
| Form fields defined in the database (shared by all staff), typed validation on the server (required, select options, number/date, unknown keys dropped); replaces the per-browser `localStorage` customizer on the admission form | ✅ SQL, 🟡 UI | smoke (4 checks) |
| Admission Setup screen (routes, quotas, seats, form fields, required documents) — admin/principal | 🟡 | build + type-check |
| Admission form: route + quota selectors, configured fields per section, configured document checklist, server field errors shown on the field | 🟡 | |
| Merit tab: quota selector, seats from matrix | 🟡 | |
| Not yet: per-course custom document upload labels in verification tab, reservation roster rules (e.g. % reservation), seat-overflow guard when approving by hand | ⬜ | |

## Module scan (roles, navigation, flows)
| Item | Status | Evidence |
|------|--------|----------|
| Every role's menu vs the routes (route exists, role may open it, roles.ts allows it, no empty menu) | ✅ | `node scripts/check-navigation.cjs` → 0 problems, 21 roles / 71 routes (was 5: finance menus bounced, empty receptionist menu) |
| API actions called by the frontend vs implemented | ✅ | no missing action (the earlier mismatches were audit-log labels) |
| Tables / RPCs used by code vs migrated database | ✅ | only the intentionally excluded multi-college tables remain |
| Library: issue / return / renew + librarian RLS | ✅ SQL (119 smoke checks), 🟡 UI | |
| 127 buttons with no handler (static scan) | ⬜ triage | `docs/audit/10-Dead-Buttons.md`, `scripts/find-dead-buttons.cjs` |
| Control Center configuration (roles, modules, features, dashboards, pages, navigation, permissions, forms, workflows, global settings, theme): shared in the database with draft → publish → rollback and real version numbers | ✅ SQL (17 smoke checks), 🟡 UI | migration 044; `superAdminService`, `workflowEngineService` rewritten; permission service refreshes every minute |
| `visualCustomizationService` (student complaints form fields) still per-browser; `multiCollegeService` (deprecated multi-college) still uses localStorage | ⬜ | |
| Remaining dashboards (HR, hostel, placement, transport, store, exam, certificates, alumni, medical, sports, NAAC) | ⬜ | not yet traced end to end |

## Module — Examinations (migration 045)
| Item | Status | Evidence |
|------|--------|----------|
| Access rules: unpublished marks/exams/timetable hidden from students and parents; teachers limited to their classes and unpublished marks; corrections after publication by COE/principal/admin only | ✅ SQL | 26 smoke checks (162 total), including the leak itself |
| Marks entry: all-or-nothing validation, server-side grade and pass/fail, absent, upsert, audit of changed marks | ✅ SQL, 🟡 UI | |
| Publish / withdraw (reason required), analytics from real data | ✅ SQL, 🟡 UI | |
| Create examination + papers with clash check; publish timetable; progress board | 🟡 | build + type-check |
| Hall tickets: eligibility from attendance/fees, bulk generation, audited release, publish to students, verification | ✅ SQL (17 checks, 179 total), 🟡 UI | migration 046; `HallTicketGeneration` rewritten; student view shows only issued tickets |
| Exam registration, seating/invigilation, revaluation, supplementary exams, grade sheets/transcripts, GPA/CGPA, configurable grading scales | ⬜ | master prompt §22–24 |

## Module — Alumni (migration 047)
| Item | Status | Evidence |
|------|--------|----------|
| Directory hidden from students/parents; donations and mentorships stored in the database, staff-only | ✅ SQL | 4 smoke checks (183 total) |
| Donations tab (record, status, export, real totals), Mentorship tab (pairings, status, real stats), directory filter + export, event status change; invented totals/rows and two fake dialogs removed | 🟡 UI | build + type-check; dead buttons 81 → 68 |

## Module — Certificates (migration 048)
| Item | Status | Evidence |
|------|--------|----------|
| Server-issued numbers/hash, student requests, staff decisions (reason on reject), public verification, audited | ✅ SQL | 11 smoke checks (194 total) |
| Certificate screen rebuilt (issue by student search, requests table with issue/reject/print/export/search, verify tab); fake templates, transcript and bulk-print tabs removed; Principal dashboard uses the same functions | 🟡 UI | build; dead buttons 68 → ~57 |
| Student-side "request a certificate" screen; transcripts from real results; certificate templates editor | ⬜ | API ready (`db.requestCertificate`) |

## Module — Medical (migration 049)
| Item | Status | Evidence |
|------|--------|----------|
| Health data private to owner/admin/principal; infirmary log staff-only; contacts and alerts stored in the database | ✅ SQL | 4 smoke checks (198 total) |
| Medical screen rebuilt (record create/edit/export/filter, infirmary log with status/search/range, contacts, alerts); invented counts, flu outbreak and phone numbers removed; two orphan fake dialogs deleted | 🟡 UI | build; dead buttons -15 |

## Module — NAAC (migration 050)
| Item | Status | Evidence |
|------|--------|----------|
| Staff-only access, computed progress, private evidence bucket | ✅ SQL | 4 smoke checks (202 total) |
| Criterion pages on real metrics (add/status/data entry/delete) and real file upload with view/download/delete; Repository uses the same; Reports generate real printable SSR/AQAR/compliance and criterion-wise CSV; fake recent-activity, invented metric list, fake "last generated", fake notification badge, toast-only Settings cards removed | 🟡 UI | build; dead buttons 41 → 25 |
| Storage policies for the `documents` bucket (admissions/certificates) are still public-read — move admission documents to a private bucket | ⬜ | noted in audit |

## Module — Sports (no migration; existing tables and RLS are adequate)
| Item | Status | Evidence |
|------|--------|----------|
| Events and teams: add/edit/delete/status persisted in the database; participation by sport from real rows; export | 🟡 UI | build; dead buttons 25 → ~21 |

## Module — Discipline (migration 051)
| Item | Status | Evidence |
|------|--------|----------|
| Own-reports-only visibility, principal/admin decisions with audit, resolve needs an action | ✅ SQL | 6 smoke checks (208 total) |
| Screen: failed reports/resolutions now show the error instead of success; fake defaults (ST001, B.VOC MLT class) removed; Edit button → "Start investigation"; unused service that wrote a non-existent column deleted | 🟡 UI | build |

## Module — Hostel out-pass (migration 052) and broken-call sweep
| Item | Status | Evidence |
|------|--------|----------|
| Consent/gate fields staff-only, status flow enforced, time check | ✅ SQL | 5 smoke checks (213 total) |
| Warden dashboard: loads (it called a non-existent `db.getProfiles()` so it never showed data), Approve/Reject/Exit/Arrival, honest errors, parent phone required, no invented bed counts or phone number, notifications only to the real student (was broadcast to everyone) | 🟡 UI | build |
| Same non-existent call fixed in Librarian dashboard and HR leave manager; `db.getTeachers()` (parent contact view) and `db.createStaffServiceRecord()` (HR add staff) pointed at real methods; `profile.full_name` (column is `name`) fixed in 6 places | 🟡 | TS errors 761 → 746 |
| Remaining dashboards: Transport, HR (payroll), Placement, Store, Receptionist, Teacher, Parent, Student | ⬜ | |

## Exam consumers (teacher marks, parent results, principal exams)
| Item | Status | Evidence |
|------|--------|----------|
| Teacher marks entry now uses the server-validated `exam_save_marks` (it wrote results directly, graded in the browser, force-published them and notified students, bypassing the COE) | 🟡 | build |
| `db.getExamResults` no longer invents pass (>=50) or grade labels; parent results and principal exam module use the server's `result_status`/grade, real exam names; invented fallbacks ('Clinical Course', 'Student Candidate') removed | 🟡 | build; TS errors 746 → 684 |
| Crash bugs found by the type-check fixed: `logout` undefined in LoginForm (role-mismatch path), `students` undefined in Admin dashboard (department chart, events), missing `Select` imports in Admissions management view, wrong service method names in user-account control (status toggle / password reset), `isUuidStr` out of scope in the dev admin backend | ✅ | tsc, build, edge gate tests |

## Module — HR & Payroll (migration 053)
| Item | Status | Evidence |
|------|--------|----------|
| Staff pay/bank data private; server-side payroll with configurable rules, LOP from approved leave, mid-month joiners, EPF ceiling, approval + separation of duties, bank-reference disbursement, audit | ✅ SQL | 16 smoke checks (229 total) incl. the LOP/EPF arithmetic |
| Payroll screen rebuilt on the server functions; bank advice built from real account data (was one hard-coded account/IFSC for everyone); payslip header from institution settings, no invented PAN/UAN/bank/reference; HR dashboard KPIs real (invented 89 faculty, 42 staff, ₹48.6 L, 3 on leave removed); TDS and other deductions per employee | 🟡 UI | build |
| Statutory rates (EPF/ESI/PT) are institution-specific and are NOT assumed: payroll refuses to run until HR sets them | ⚠️ action | HR must enter rules once |
| Leave balances deduct on approval; payroll for state-specific professional-tax slabs; Form 16 / statutory returns | ⬜ | |

## Module — Transport (migration 054)
| Item | Status | Evidence |
|------|--------|----------|
| Driver scoped to own vehicle; riders/parents see own bus only; guard trigger on vehicle edits | ✅ SQL | 6 smoke checks (235 total) |
| Driver dashboard: no fallback to "first bus" (a driver with no assignment saw and edited someone else's), GPS failure no longer fakes a live location ("simulator"), invented speed 32 km/h / ETA 15 min / 12 riders / 3 trips removed, manifest prints, "Notify parents" no longer claims an SMS was sent (sends in-app notices to waiting riders), reports export CSV | 🟡 UI | build |
| Route/stop/fleet administration screen for admin; student-to-route allocation linked to fees | ⬜ | |

## Module — Placement (migration 055)
| Item | Status | Evidence |
|------|--------|----------|
| Server-checked applications, applicant cannot tamper with CGPA/outcome | ✅ SQL | 8 smoke checks (243 total) |
| Officer dashboard: real KPIs (highest/average package from selected students, applications, recruiters; invented ₹7.8/4.8 LPA, 185, 94%, 84 removed), drive creation validates and no longer invents package/CGPA/venue/rounds or closes on failure, application deadline field, applicants list with status updates, close/reopen | 🟡 UI | build |
| New student "Placements" view (apply with eligibility checks, withdraw) — there was no student side at all | 🟡 UI | build, nav check |
| CGPA from computed grade points; backlog count; offer-letter upload | ⬜ | needs GPA engine |

## Store (056) and Notifications (057)
| Item | Status | Evidence |
|------|--------|----------|
| Server-priced orders, state machine with restock, no direct order writes | ✅ SQL | 8 smoke checks |
| Cross-role notifications delivered through `notify_users/notify_roles`; `db.createNotification` routes by recipient; `db.notifyMany` for bulk; receptionist and transport-emergency bulk inserts moved to it; invalid priority 'normal' and user ids 'admin'/'all' handled | ✅ SQL (7 checks, 258 total), 🟡 app | build |
| Browser-side fallback that decremented stock and wrote orders directly removed; manager order updates now persist | 🟡 UI | build |
| Inventory issue/return/purchase orders are still multi-step browser writes (storekeeper-only) — move to atomic functions; online payment for store orders | ⬜ | |

## Teacher / Parent / Student dashboards, assignments (058) and sign-in flags (059)
| Item | Status | Evidence |
|------|--------|----------|
| Assignments: server-forced submission state, owner-only grading with 0–100 check, locked after grading | ✅ SQL | 8 smoke checks |
| Teacher dashboard: grading used to say "Graded" even when rejected (now shows the real error), score pre-filled 85, unbounded; invented subject 'Paramedical Sciences'; attendance rate used its own formula (late = ½) and fixed 75% — now identical to the hall-ticket rule and the institution's minimum | 🟡 UI | build |
| Parent dashboard showed a made-up Parent ID 'PAR-2026-0001' because `login_id` was never loaded; `login_id`, `is_first_login`, `requires_password_change` now come from the profile | 🟡 | build |
| Admin password reset: min 8 characters, sets must-change flag; app blocks with a "choose a new password" dialog until done | ✅ SQL (2 checks), 🟡 UI | |
| Last-administrator protection read the role from user_metadata (untrusted, often empty) — now counts active admins in profiles | ✅ | edge gate tests |
| Super-admin header logout called a non-existent `signOut` | ✅ | tsc |

## Policy sweep (060, 061)
| Item | Status | Evidence |
|------|--------|----------|
| All remaining `USING (true)` write policies closed; API roles lose TRUNCATE/REFERENCES/TRIGGER | ✅ SQL | 6 smoke checks (274 total) |
| Staff lookups: warden/librarian now look students up in the central `students` table (profiles are not readable by those roles, so lookups silently returned nothing); HR can list staff | ✅ SQL, 🟡 UI | build |

## Dev backend, legacy admission paths, invented counters
| Item | Status | Evidence |
|------|--------|----------|
| Dev admin API (`src/server/adminBackend.ts`, run by the Vite dev server on all interfaces): identity tokens `mock-test-role:…` granted ADMIN to anyone who sent one, and the caller's role was read from user_metadata (editable by the user) — now the test token needs `ALLOW_MOCK_TEST_TOKENS=1` and the role comes from `profiles` (active accounts only). Browser code no longer carries a fallback token | ✅ | tsc, edge gate tests |
| Account-provisioning "Admission" section wrote merit-list rows directly (merit 88, rank 1, made-up e-mail domain, status Admitted without enrolment) — replaced by a read-only view of the real pipeline | 🟡 | build |
| Provisioning statistics counted legacy merit-list rows and status spellings — now count `students` and lifecycle statuses | 🟡 | build |
| Unused `admissionService` (marked applications 'accepted' on payment with a browser-made receipt number) deleted | ✅ | |
| Invented counters removed: library 342/23/156 and 45,820 volumes, admin '14 accounts', '13 roles / 100% in sync', default module/widget counts | 🟡 | build |

## Staff leave (062)
| Item | Status | Evidence |
|------|--------|----------|
| Decision function (no self-approval, reason on reject, ledger-checked quota), days-fit-dates constraint | ✅ SQL | 8 smoke checks (282 total) |
| HR leave manager: failed approvals used to be shown as done (local state set regardless); now real result + reload; rejection asks for a reason; recording leave validates days against dates | 🟡 UI | build |

## Scholarships (063) and principal approvals
| Item | Status | Evidence |
|------|--------|----------|
| Server-side scholarship decision through the fee ledger; student cannot self-sanction | ✅ SQL | 7 smoke checks (289 total) |
| Principal dashboard: scholarship approval/decline uses it (decline needs a reason); "approve admission" no longer calls the legacy non-atomic `confirm_admission` (which also invented the programme 'Paramedical Sciences' and class "Year 1") — it approves via the lifecycle and points to Admission Management for offer/enrolment | 🟡 UI | build |

## GPA / CGPA engine (064)
| Item | Status | Evidence |
|------|--------|----------|
| Grade scale, credits, SGPA/CGPA, arrears, class report, placement integration | ✅ SQL | 9 smoke checks (298 total) incl. the arithmetic (9×4 + 0×2)/6 = 6.00 |
| COE "Grades & GPA" tab (edit scale, SGPA report + CSV), credits field on papers, GPA card in student Performance and parent Results | 🟡 UI | build |
| Existing stored grades are not rewritten when the scale changes (new marks use the new scale) | note | |

## Exam registration, seating, invigilation (065)
| Item | Status | Evidence |
|------|--------|----------|
| Registration rules, rooms, seating generation, invigilators, hall-ticket integration | ✅ SQL | 13 smoke checks (311 total) incl. neighbour-class rule, no double seats, capacity refusal |
| COE "Seating" tab (registration controls, rooms, per-session generate/print/export, invigilation duty); student card to register/withdraw and see own seat | 🟡 UI | build |
| Revaluation / supplementary exam workflow; student photo on seating sheets | ⬜ | |
