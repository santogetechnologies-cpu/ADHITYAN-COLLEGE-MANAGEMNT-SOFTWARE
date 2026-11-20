# Executive Audit — Supabase layer (migrations + edge functions)

Scope of this pass: the database migrations and the server/edge code. UI redesign, the Student-360 / admission /
fee-engine / exam-engine / workflow-engine re-engineering and the other phases of the master prompt are **not started**
(see `docs/implementation/19-Implementation-Tracker.md`). Nothing in this pass touched the live Supabase project.

## How it was verified
A scratch PostgreSQL 16 database was built from migrations 001–015 (the state the earlier audits
say is live), then 028–037 were applied twice (idempotency) with Supabase-style stubs (`auth`, `storage`,
`anon/authenticated/service_role`). `supabase/tests/smoke_028_037.sql` (13 checks) passes. The edge functions
type-check against the real `@supabase/supabase-js` types, and the authorization gate of `admin-api`
was exercised by 20 cases. **Not verified:** execution on real Supabase, Deno runtime, email delivery, anything
needing real auth users. Test on staging first.

## Findings (confirmed in source/DB, not inferred from file names)

### Critical
| ID | Finding | Where | Status |
|----|---------|-------|--------|
| SEC-1 | Caller role taken from `user_metadata.role`, which every signed-in user can edit → any user can become "admin" | old `admin-users`, `admin-create-user` edge fns; `src/server/adminBackend.ts` | **Fixed** in new functions (role from `profiles`); `admin-users` disabled (410) |
| SEC-2 | `mock-test-role:<role>:<id>` bearer token is accepted as a real admin/any role with the service-role key | `src/server/adminBackend.ts:43` | **Not ported.** Still present in dev-only file (tests use it) — remove when tests are migrated |
| SEC-3 | First-login challenge returns the verification code in the HTTP response; "complete" never checks the account is in first-login state or is a student/parent → anyone knowing an id/phone/email can reset **any** account's password (admins too). Code from `Math.random`, stored in `profiles.preferences` | `handleFirstLoginChallenge/CompleteFirstLogin` | **Replaced** by `auth-first-login` (Supabase email OTP, eligibility check, rate limit). Needs SMTP |
| SEC-4 | `get_child_telemetry` / `get_parent_student_links` usable by any role: full profile, fees, **unpublished** results of any student via service role (IDOR) | adminBackend | **Fixed** in `admin-api` |
| SEC-5 | `.or(\`...ilike.${userInput}\`)` filter strings built from raw input (filter injection / wildcard matching) | first-login + resolve handlers, client fallbacks | Removed from edge functions; client fallbacks in `studentParentAuthService.ts` still exist |
| SEC-6 | Handlers returning `success:true` without persisting (`record_attendance`, `submit_marks`, `collect_fee_payment` on insert failure, `create_assignment`) — a payment could look collected but not exist | adminBackend | **Fixed**: real transactional fee RPC; attendance/marks return 501 instead of faking |
| DB-1 | `institutional_settings`, `fee_payments`, `students`, `student_mood_checkins`, `audit_logs` used by code, absent in live DB; RPCs `issue_library_book`, `return_library_book`, `checkout_store_order`, `decrement_book_copies`, `resolve_login_id` absent | code vs baseline diff | **Fixed** by migrations 028/029–033 |
| DB-2 | Migrations 016–027 never ran on live and contradict each other (3 statement errors in 017/018, syntax errors in 023, competing ID generators, 026 needs `audit_logs`, 027 = multi-tenant). 018's RPCs wrote to non-existent columns/values (`copies_available`, `book_issues.student_id`, status `'issued'` violating CHECK) so would have failed at runtime | `supabase/migrations/016–027` | Archived to `supabase/migrations_archive/` so `db push` can't run them; needed parts re-implemented in 028/036 |
| DB-3 | `hostel_out_passes.warden_status` defaulted to `'Approved'` and `parent_otp_verified` to `true` → new passes pre-approved | 001–015 | Default fixed in 029 (existing rows untouched) |
| DB-4 | The reviewed 028 "stage" scripts in `docs/phase_1_4_1/` did not apply: `uuid = text` ambiguity (`profiles.student_id` shadows the outer column), `staff_id` vs real `user_id`, `status` vs `warden_status`, `hostel_rooms.student_id` does not exist, missing unique key for `ON CONFLICT (version)` | phase_1_4_1 SQL | Fixed in 029–033 |

### High / medium (not fixed here)
- `resolve_login_id` is callable by anon and returns an email for a valid id (needed by the login screen). Mitigated by rate-limited edge function; the RPC itself is not rate-limited. Consider routing login only through the function and revoking anon EXECUTE.
- **Fixed in this pass:** `AuthContext.tsx` resolved the role as `user_metadata.role || profiles.preferences.role || profiles.role || (guess from e-mail prefix `admin…`/`principal…`/`superadmin…`)`. The first two are user-editable, so a user could present an admin UI (data stayed protected by RLS, which reads `profiles.role`). The role now comes only from `profiles.role`; no profile → `student`. **Behaviour change:** accounts whose profile row is missing no longer get admin by e-mail prefix.
- `naac_coordinator` mapped to role `admin` in `src/config/roles.ts:178`; `receptionist` has an empty `navItems`. (`/admin/finance` exists at `App.tsx:288` — the earlier search-agent claim that it was missing was wrong.)
- Public sign-ups: `signUp()` exists client-side. With no auth→profile trigger an anonymous sign-up cannot act (no profile → fails closed), but disable "Allow new users to sign up" in Supabase Auth settings anyway.
- `save_system_config_draft` / `publish_system_config` / `rollback_system_config` / backup actions only write an audit-log row — nothing is persisted or restored ("Draft saved" is cosmetic). Feature = UI-only.
- Student id format split: backend generates `STU-YYYY-NNNN`, DB generator `AIP-YYYY-NNNN` (prefix now configurable via `institutional_settings.student_id_prefix`, backend not yet aligned).
- `013_official_college_courses_and_erp_fix.sql` seeds fake students/merit data and fails on a from-scratch build (references `institutional_settings` before it exists). Already applied live; not edited. On a **fresh** database run 001–015 ignoring 013's errors, then 028+.
- No bed-allocation table for hostel; `hostel_rooms` is inventory only. Many master-prompt modules are UI shells (see tracker).
- Client "direct Supabase fallback" paths in `studentParentAuthService.ts` should be deleted once the functions are deployed.
