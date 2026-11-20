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
| Smoke test in repo | ✅ | `supabase/tests/smoke_028_036.sql` | 13/13 PASS |
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
1. You: deploy 028–036 + functions to staging, run the smoke SQL and the curl checks in `18-Database-Migration-Plan.md`; report any failure.
2. Port the dev-only test token to a test-only guard, delete it from `src/server/adminBackend.ts`; add Deno tests for `admin-api`.
3. Student information system: enrollment + identifier + status-history tables, then admission→student conversion RPC (transactional/idempotent).
4. Fee engine (structures, versions, invoices, ledger) on top of `record_fee_payment`; then sidebar/app shell.
