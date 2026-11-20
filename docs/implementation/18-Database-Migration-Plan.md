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
All lines must read PASS (33 checks). Edge-function checks: `scripts/test-edge-gate.sh` (type-check + 27 authorization/validation cases; needs no database). Then in the SQL editor: `select count(*) from public.profiles where role is null;` (must be 0).

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

## 3. Known gaps after this deployment
See `docs/audit/01-Executive-Audit.md` ("High / medium") and `19-Implementation-Tracker.md`.
