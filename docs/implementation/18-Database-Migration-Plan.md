# Database & edge-function deployment

**Superseded.** The old chain of 79 incremental migrations (and the archived ones) was removed. The database is now rebuilt from a
fresh, generated set of 35 migrations in `supabase/migrations/`, applied one by one onto an EMPTY Supabase project.

**Everything an operator (or an AI IDE) needs is in one paste-ready file at the repository root:**
[`SUPABASE_FRESH_SETUP_FOR_IDE.md`](../../SUPABASE_FRESH_SETUP_FOR_IDE.md)

It covers: wiping the project (files, edge functions, SQL), applying each migration with an expected-result check, creating the first
Super Admin, deploying the 11 edge functions, secrets, the web-app `.env`, and troubleshooting.

## Key rules
* **First Super Admin**: any account created *directly* in Supabase Auth becomes role `admin` (trigger `on_auth_user_created`,
  migration 33). Every other account is created by that Super Admin inside the app; server code marks them
  `app_metadata.erp_provisioned = true`, so the trigger never promotes them. `scripts/check-provisioning-flag.cjs` enforces this in CI.
* **Public sign-up must be OFF** (`supabase/config.toml` and the dashboard), otherwise a visitor could register as Super Admin.
* **Never edit the generated migration files.** To change the schema later, add a new migration file with a later timestamp.

## Verifying locally (no Supabase needed)
`bash supabase/tests/run_all.sh` builds a scratch Postgres database, applies all 35 migrations with ON_ERROR_STOP, and runs
`supabase/tests/smoke_all.sql` (526 checks). `bash scripts/test-edge-gate.sh` type-checks and tests the edge functions.

## Maintenance tools (`supabase/maintenance/`)
`wipe_everything.sql` (guarded by a confirmation setting), `empty_storage.mjs` (files), `apply_one_by_one.sh` (migrations).
