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
| Fee setup screens (heads, plans, billing wizard with preview, history) | ⬜ → next | |
| Late-fee rules, installment schedules, scholarship auto-application, refunds | ⬜ | |
| Old `fee_structures` table and `FeeStructureManager` still exist (fixed columns); to be migrated into plans and retired | ⬜ | |
