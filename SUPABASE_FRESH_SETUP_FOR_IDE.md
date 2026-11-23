# Supabase fresh setup — paste this whole file into your IDE's AI

> **You are an AI coding assistant. Follow this file top to bottom, one step at a time. Do the steps in order. After every step, run the check and compare with the expected result. If a check does not match, STOP and tell the human what you saw. Do not guess, do not improvise.**

## What is being done (read once)
The database of this college ERP is being rebuilt **from scratch**:
1. **Wipe**: the whole Supabase project is emptied (tables, logins, files, old edge functions).
2. **Rebuild**: 35 migration files in `supabase/migrations/` are applied **one by one**.
3. **Functions**: 11 edge functions are deployed one by one.
4. **First Super Admin**: a human creates ONE account directly in the Supabase dashboard. That account automatically becomes the **Super Admin** (role `admin`). The Super Admin then creates every other login (principal, teacher, student, parent, finance, …) **inside the app**.

## Hard rules for the AI
1. **NEVER edit, rename, reorder, merge, or "fix" any file in `supabase/migrations/` or `supabase/functions/`.** They are generated and tested. If one fails, stop and report the exact error.
2. **Ask the human to type `YES` before Part A (it deletes everything).** Do not continue without it.
3. Use only the project the human names. Never run these commands against any other project or any local database.
4. Never print or paste secrets (database password, service role key) into files, commits, or chat logs.
5. Run each command exactly as written. One command at a time. Wait for it to finish. Read the output.
6. Do not run `supabase db reset`, `supabase db push` or `supabase db pull` — the scripts below do the job and are safer.

---

## Step 0 — Collect these from the human (write them down; they are needed below)
| Name | Where to find it | Example |
|---|---|---|
| `PROJECT_REF` | Supabase dashboard → Project Settings → General → Reference ID | `abcdwxyzabcdwxyz` |
| `DB_PASSWORD` | The database password chosen at project creation (Project Settings → Database → *Reset database password* if forgotten) | `********` |
| `SUPABASE_URL` | Project Settings → API → Project URL | `https://abcdwxyzabcdwxyz.supabase.co` |
| `PUBLISHABLE_KEY` | Project Settings → API Keys → *Publishable key* (or legacy `anon` key) | `sb_publishable_…` |
| `SERVICE_ROLE_KEY` | Project Settings → API Keys → *Secret key* (or legacy `service_role`) — **secret** | `sb_secret_…` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Chosen by the human for the first Super Admin | |
| `SITE_URL` | Where the web app runs | `https://erp.yourcollege.edu` or `http://localhost:8080` |

Confirm with the human, in these words: *"I am about to ERASE project `PROJECT_REF`: all tables, all logins, all uploaded files and all edge functions. Type YES to continue."* **Stop if the answer is not YES.**

## Step 0b — Check the tools
Run each; all must print a version:
```bash
supabase --version     # Supabase CLI 2.x or newer
psql --version         # PostgreSQL client 15 or newer
node --version         # Node 18 or newer
```
Missing tool? Install it (https://supabase.com/docs/guides/cli, `apt install postgresql-client`, https://nodejs.org) and re-run. Then, from the repository root:
```bash
supabase login
supabase link --project-ref PROJECT_REF
```
Set the database address (use the exact text, replace the two placeholders). If the connection later fails with an "IPv6" or "network unreachable" error, use the **Session pooler** string from Dashboard → Connect → *Session pooler* instead.
```bash
export SUPABASE_DB_URL='postgresql://postgres:DB_PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres'
psql "$SUPABASE_DB_URL" -c "select current_database(), version();"
```
Expected: one row showing `postgres` and a PostgreSQL version. If a password contains `@` or `#`, URL-encode it (`@` → `%40`, `#` → `%23`).

---

# PART A — WIPE EVERYTHING

### A1. Delete all uploaded files (SQL cannot do this)
```bash
export SUPABASE_URL='SUPABASE_URL'
export SUPABASE_SERVICE_ROLE_KEY='SERVICE_ROLE_KEY'
npm install --no-save @supabase/supabase-js
node supabase/maintenance/empty_storage.mjs
```
Expected: one line per bucket (`… file(s) deleted, bucket removed`) and finally `Storage is empty.` A fresh project with no files prints only the last line.

### A2. Delete every edge function that exists in the project
```bash
supabase functions list --project-ref PROJECT_REF
```
For **each name printed in the list**, run (replace `NAME`):
```bash
supabase functions delete NAME --project-ref PROJECT_REF
```
Known old names, in case the list is hard to read: `admin-api`, `admin-create-user`, `admin-users`, `ai-chat`, `auth-first-login`, `auth-resolve-login-id`, `integrations-admin`, `notifications-dispatch`, `payments-create-order`, `payments-refund`, `payments-verify`, `payments-webhook`. "Function not found" is fine. Check:
```bash
supabase functions list --project-ref PROJECT_REF
```
Expected: an empty list.

### A3. Empty the database
```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
SET wipe.confirm = 'YES-DELETE-EVERYTHING';
\i supabase/maintenance/wipe_everything.sql
SQL
```
Expected last lines: `WIPE DONE: public schema is empty, auth.users is empty, migration history cleared.` with `public_tables = 0` and `auth_users = 0`.

### A4. Double-check it is empty
```bash
psql "$SUPABASE_DB_URL" -At -c "select count(*) from information_schema.tables where table_schema='public'; select count(*) from auth.users; select count(*) from pg_policies where schemaname='storage';"
```
Expected: three lines: `0`, `0`, `0`.

---

# PART B — BUILD THE DATABASE, ONE MIGRATION AT A TIME

### B1. Run the one-by-one script (recommended)
It applies the 35 files below in order. Each file runs in its own transaction, so a failing file leaves nothing half-done. It stops at the first failure. After every success it records the file in Supabase's migration history.
```bash
bash supabase/maintenance/apply_one_by_one.sh
```
Expected: lines `[1/35] …` up to `[35/35] …` and `All 35 migrations applied.` (A `NOTICE` about `pg_cron` or about the trigger `on_auth_user_created` not existing is **normal**.)

If it prints `STOPPED`, do not retry blindly: copy the error text for the human, then go to *Troubleshooting*.

### B2. (Alternative to B1 — only if the script cannot run) the same thing by hand
Run these 35 commands one at a time, in this order. Stop at the first error.
```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010001_extensions_and_prerequisites.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010002_tables_part_1.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010003_tables_part_2.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010004_tables_part_3.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010005_tables_part_4.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010006_tables_part_5.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010007_tables_part_6.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010008_tables_part_7.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010009_keys_part_1.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010010_keys_part_2.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010011_checks.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010012_foreign_keys_part_1.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010013_foreign_keys_part_2.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010014_indexes.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010015_functions_part_1.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010016_functions_part_2.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010017_functions_part_3.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010018_functions_part_4.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010019_functions_part_5.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010020_functions_part_6.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010021_triggers.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010022_row_level_security_enable.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010023_policies_part_1.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010024_policies_part_2.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010025_policies_part_3.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010026_privileges_part_1.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010027_privileges_part_2.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010028_privileges_part_3.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010029_privileges_part_4.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010030_realtime_publication.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010031_storage_buckets_and_policies.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010032_seed_starting_configuration.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010033_auth_bootstrap_super_admin.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010034_schedule_daily_jobs.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/202601010035_harden_anonymous_access.sql
```
Then record them in the migration history (so a later `supabase db push` does not repeat them):
```bash
supabase migration repair --status applied 202601010001 202601010002 202601010003 202601010004 202601010005 202601010006 202601010007 202601010008 202601010009 202601010010 202601010011 202601010012 202601010013 202601010014 202601010015 202601010016 202601010017 202601010018 202601010019 202601010020 202601010021 202601010022 202601010023 202601010024 202601010025 202601010026 202601010027 202601010028 202601010029 202601010030 202601010031 202601010032 202601010033 202601010034 202601010035
```

### What each file does, and how to check it
After a file, you may run this single check query and compare with the table:
```bash
psql "$SUPABASE_DB_URL" -At -c "select (select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE') as tables, (select count(*) from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public') as constraints, (select count(*) from pg_indexes where schemaname='public') as indexes, (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f') as functions, (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal) as triggers, (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity) as rls_tables, (select count(*) from pg_policies where schemaname='public') as policies, (select count(*) from pg_publication_tables where pubname='supabase_realtime') as realtime_tables;"
```
| # | File | What it does | After it, expect (tables / constraints / indexes / functions / triggers / RLS tables / policies / realtime tables) |
|---|------|--------------|----|
| 1 | `202601010001_extensions_and_prerequisites.sql` | Installs the two helper extensions. Refuses to run if the database is not empty. | 0 / 0 / 0 / 0 / 0 / 0 / 0 / 0 |
| 2 | `202601010002_tables_part_1.sql` | Creates tables (1st batch) and the 4 counters (sequences). | 18 / 27 / 0 / 0 / 0 / 0 / 0 / 0 |
| 3 | `202601010003_tables_part_2.sql` | Creates tables (2nd batch). | 36 / 43 / 0 / 0 / 0 / 0 / 0 / 0 |
| 4 | `202601010004_tables_part_3.sql` | Creates tables (3rd batch). | 54 / 69 / 0 / 0 / 0 / 0 / 0 / 0 |
| 5 | `202601010005_tables_part_4.sql` | Creates tables (4th batch). | 72 / 88 / 0 / 0 / 0 / 0 / 0 / 0 |
| 6 | `202601010006_tables_part_5.sql` | Creates tables (5th batch). | 90 / 112 / 0 / 0 / 0 / 0 / 0 / 0 |
| 7 | `202601010007_tables_part_6.sql` | Creates tables (6th batch). | 108 / 125 / 0 / 0 / 0 / 0 / 0 / 0 |
| 8 | `202601010008_tables_part_7.sql` | Creates tables (last batch). All 123 tables now exist. | 123 / 139 / 0 / 0 / 0 / 0 / 0 / 0 |
| 9 | `202601010009_keys_part_1.sql` | Primary and unique keys (1st half). | 123 / 224 / 85 / 0 / 0 / 0 / 0 / 0 |
| 10 | `202601010010_keys_part_2.sql` | Primary and unique keys (2nd half). | 123 / 308 / 169 / 0 / 0 / 0 / 0 / 0 |
| 11 | `202601010011_checks.sql` | Value rules (check constraints). | 123 / 320 / 169 / 0 / 0 / 0 / 0 / 0 |
| 12 | `202601010012_foreign_keys_part_1.sql` | Links between tables (1st half). | 123 / 389 / 169 / 0 / 0 / 0 / 0 / 0 |
| 13 | `202601010013_foreign_keys_part_2.sql` | Links between tables (2nd half). | 123 / 457 / 169 / 0 / 0 / 0 / 0 / 0 |
| 14 | `202601010014_indexes.sql` | Search indexes. | 123 / 457 / 244 / 0 / 0 / 0 / 0 / 0 |
| 15 | `202601010015_functions_part_1.sql` | Server functions (RPCs), 1 of 6. | 123 / 457 / 244 / 30 / 0 / 0 / 0 / 0 |
| 16 | `202601010016_functions_part_2.sql` | Server functions, 2 of 6. | 123 / 457 / 244 / 60 / 0 / 0 / 0 / 0 |
| 17 | `202601010017_functions_part_3.sql` | Server functions, 3 of 6. | 123 / 457 / 244 / 90 / 0 / 0 / 0 / 0 |
| 18 | `202601010018_functions_part_4.sql` | Server functions, 4 of 6. | 123 / 457 / 244 / 120 / 0 / 0 / 0 / 0 |
| 19 | `202601010019_functions_part_5.sql` | Server functions, 5 of 6. | 123 / 457 / 244 / 150 / 0 / 0 / 0 / 0 |
| 20 | `202601010020_functions_part_6.sql` | Server functions, 6 of 6. | 123 / 457 / 244 / 177 / 0 / 0 / 0 / 0 |
| 21 | `202601010021_triggers.sql` | Automatic rules that fire on insert/update. | 123 / 457 / 244 / 177 / 39 / 0 / 0 / 0 |
| 22 | `202601010022_row_level_security_enable.sql` | Switches row level security ON for every table. | 123 / 457 / 244 / 177 / 39 / 123 / 0 / 0 |
| 23 | `202601010023_policies_part_1.sql` | Who may read/write what (1 of 3). | 123 / 457 / 244 / 177 / 39 / 123 / 83 / 0 |
| 24 | `202601010024_policies_part_2.sql` | Who may read/write what (2 of 3). | 123 / 457 / 244 / 177 / 39 / 123 / 166 / 0 |
| 25 | `202601010025_policies_part_3.sql` | Who may read/write what (3 of 3). | 123 / 457 / 244 / 177 / 39 / 123 / 249 / 0 |
| 26 | `202601010026_privileges_part_1.sql` | Resets all grants, then applies exact privileges (1 of 4). | 123 / 457 / 244 / 177 / 39 / 123 / 249 / 0 |
| 27 | `202601010027_privileges_part_2.sql` | Privileges (2 of 4). | 123 / 457 / 244 / 177 / 39 / 123 / 249 / 0 |
| 28 | `202601010028_privileges_part_3.sql` | Privileges (3 of 4). | 123 / 457 / 244 / 177 / 39 / 123 / 249 / 0 |
| 29 | `202601010029_privileges_part_4.sql` | Privileges (4 of 4). | 123 / 457 / 244 / 177 / 39 / 123 / 249 / 0 |
| 30 | `202601010030_realtime_publication.sql` | Turns on live updates for the 66 tables screens listen to. | 123 / 457 / 244 / 177 / 39 / 123 / 249 / 66 |
| 31 | `202601010031_storage_buckets_and_policies.sql` | Creates the 7 file buckets and the 10 file access rules. | 123 / 457 / 244 / 177 / 39 / 123 / 249 / 66 |
| 32 | `202601010032_seed_starting_configuration.sql` | Loads starting settings: institution row, 14 fee heads, grade scale, admission routes/quotas, payroll row, NAAC criteria. | 123 / 457 / 244 / 177 / 39 / 123 / 249 / 66 |
| 33 | `202601010033_auth_bootstrap_super_admin.sql` | Makes any account created directly in Supabase Auth a Super Admin; app-created accounts keep the role chosen in the app. | 123 / 457 / 244 / 178 / 39 / 123 / 249 / 66 |
| 34 | `202601010034_schedule_daily_jobs.sql` | Optional: daily fee-reminder job if pg_cron exists (a NOTICE is normal if it does not). | 123 / 457 / 244 / 178 / 39 / 123 / 249 / 66 |
| 35 | `202601010035_harden_anonymous_access.sql` | Removes table privileges from not-signed-in visitors (except the 3 deliberately public tables). | 123 / 457 / 244 / 178 / 39 / 123 / 249 / 66 |

### B3. Final database checks (must all match)
```bash
psql "$SUPABASE_DB_URL" -At <<'SQL'
select 'tables=' || count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE';
select 'rls_off_tables=' || count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity;
select 'policies=' || count(*) from pg_policies where schemaname='public';
select 'storage_policies=' || count(*) from pg_policies where schemaname='storage';
select 'buckets=' || count(*) from storage.buckets;
select 'signup_trigger=' || count(*) from pg_trigger where tgrelid='auth.users'::regclass and tgname='on_auth_user_created';
select 'fee_heads=' || count(*) from public.fee_heads;
select 'grade_scales=' || count(*) from public.grade_scales;
select 'settings_rows=' || count(*) from public.institutional_settings;
select 'profiles=' || count(*) from public.profiles;
select 'anon_can_read_profiles=' || has_table_privilege('anon','public.profiles','SELECT');
select 'tables_open_to_anon=' || count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and has_table_privilege('anon', c.oid, 'SELECT');
SQL
```
**Expected exactly:** `tables=123`, `rls_off_tables=0`, `policies=249`, `storage_policies=10`, `buckets=7`, `signup_trigger=1`, `fee_heads=14`, `grade_scales=1`, `settings_rows=1`, `profiles=0`, `anon_can_read_profiles=false`, `tables_open_to_anon=3`.

### B4. (Optional) sample academic structure
Only if the human wants the sample (9 paramedical courses with departments and sections, 5 scholarship schemes). Otherwise skip; the Super Admin creates their own in the app.
```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/optional_seed/sample_paramedical_structure.sql
```

---

# PART C — AUTH SETTINGS AND THE FIRST SUPER ADMIN

### C1. Turn OFF public sign-up (the human does this in the dashboard — do not skip)
Dashboard → **Authentication → Sign In / Providers → Email**:
* **Allow new users to sign up** → **OFF**   ← important: with it ON, a stranger could register and become Super Admin
* **Confirm email** → OFF (accounts are created by the Super Admin, not by e-mail sign-up)
* Minimum password length → 8

Dashboard → **Authentication → URL Configuration**: *Site URL* = `SITE_URL`; add the same address (and `http://localhost:8080` for local work) to *Redirect URLs*.

Tell the human: *"Sign-up is the only door a stranger could use to become Super Admin. Please confirm it is OFF."* Wait for confirmation.

### C2. Create the first Super Admin (the human does this in the dashboard)
Dashboard → **Authentication → Users → Add user → Create new user**: enter `ADMIN_EMAIL` and `ADMIN_PASSWORD`, tick **Auto Confirm User**, press **Create user**.
Optional: after creating, open the user → *User Metadata* → add `{"name": "Your Full Name"}` (otherwise the name is taken from the e-mail address).

### C3. Check the account became Super Admin
```bash
psql "$SUPABASE_DB_URL" -At -c "select email, role, status from public.profiles;"
psql "$SUPABASE_DB_URL" -At -c "select action, user_email from public.audit_logs where action='super_admin_bootstrapped';"
```
Expected: one profile row `ADMIN_EMAIL|admin|active` and one audit row `super_admin_bootstrapped|…`. If `profiles` is empty, the trigger did not run — see *Troubleshooting*.

**The rule from now on:** every account created *directly* in the Supabase dashboard becomes a Super Admin. Everyone else is created by a Super Admin inside the app (Part F).

---

# PART D — EDGE FUNCTIONS (deploy one by one)

### D1. Secrets (one command; keep the values)
```bash
supabase secrets set --project-ref PROJECT_REF \
  INTEGRATION_ENC_KEY="$(openssl rand -base64 32)" \
  DISPATCH_SECRET="$(openssl rand -hex 24)" \
  ALLOWED_ORIGINS="SITE_URL,http://localhost:8080"
supabase secrets list --project-ref PROJECT_REF
```
Expected: the list shows `INTEGRATION_ENC_KEY`, `DISPATCH_SECRET`, `ALLOWED_ORIGINS` (values are hidden). **Tell the human to save the value of `INTEGRATION_ENC_KEY` in a password manager** (if it is lost, API keys saved in the app must be typed again). `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are added by Supabase automatically.
Optional (only if the human wants the AI study assistant): `supabase secrets set --project-ref PROJECT_REF GEMINI_API_KEY=… ` (or `OPENAI_API_KEY=…`).

### D2. Deploy the 11 functions — run these one at a time
`supabase/config.toml` already contains the right settings for each function (they check the caller themselves).
```bash
supabase functions deploy admin-api              --project-ref PROJECT_REF
supabase functions deploy admin-create-user      --project-ref PROJECT_REF
supabase functions deploy auth-resolve-login-id  --project-ref PROJECT_REF
supabase functions deploy auth-first-login       --project-ref PROJECT_REF
supabase functions deploy ai-chat                --project-ref PROJECT_REF
supabase functions deploy integrations-admin     --project-ref PROJECT_REF
supabase functions deploy notifications-dispatch --project-ref PROJECT_REF --no-verify-jwt
supabase functions deploy payments-create-order  --project-ref PROJECT_REF
supabase functions deploy payments-verify        --project-ref PROJECT_REF
supabase functions deploy payments-refund        --project-ref PROJECT_REF
supabase functions deploy payments-webhook       --project-ref PROJECT_REF --no-verify-jwt
```
Each must end with `Deployed Functions on project …`. Then:
```bash
supabase functions list --project-ref PROJECT_REF
```
Expected: exactly 11 functions, all `ACTIVE`.

| Function | What it is for |
|---|---|
| `admin-api` | The Super Admin's user management (create, edit, reset password, disable, delete), parent linking, bulk imports. |
| `admin-create-user` | Quick create of one account (used first by the user screen). |
| `auth-resolve-login-id` | Lets people sign in with a login ID instead of an e-mail. |
| `auth-first-login` | First-sign-in password change. |
| `ai-chat` | AI study assistant (needs an AI key; harmless without). |
| `integrations-admin` | Saves payment/e-mail/SMS/WhatsApp keys from Admin → Integrations (encrypted). |
| `notifications-dispatch` | Sends queued e-mail/SMS/WhatsApp; also runs daily reminders. Call it every 5 minutes (D3). |
| `payments-create-order` / `payments-verify` / `payments-refund` | Online fee payment, verification, refunds. |
| `payments-webhook` | Receives the payment gateway's confirmation. |

### D3. Schedule the message sender (the human does this once)
Dashboard → **Edge Functions → notifications-dispatch → Schedule** (or any cron service): every **5 minutes**, `POST`, header `x-dispatch-secret: <the DISPATCH_SECRET value>`. Without this, e-mail/SMS/WhatsApp are queued but not sent (in-app notices still work). For daily fee reminders also schedule one call per day with body `{"task":"reminders"}` (not needed if migration 34 reported the job as scheduled).

---

# PART E — CONNECT THE WEB APP AND SIGN IN

Create `.env` in the repository root (never commit it):
```bash
cat > .env <<'ENV'
VITE_SUPABASE_URL=SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=PUBLISHABLE_KEY
ENV
npm install
npm run dev
```
Open the printed address (usually http://localhost:8080). Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
Expected: you land on the **Admin** console (the Super Admin home). If you land on a different dashboard or see "No institutional profile", re-run check C3.

Optional proof the whole thing works end to end (needs Chromium; uses a fake backend, touches nothing real): `npm run e2e`.

---

# PART F — WHAT THE SUPER ADMIN DOES NEXT (inside the app; the AI can stop here)
1. **Admin → Settings**: institution name, code, ID prefix, academic year, contact details, attendance and pass rules.
2. **Admin → Departments / Timetable**: courses, departments, sections (or run B4 for the sample).
3. **Admin → User Accounts** (or *Account Provisioning*): create every other login and choose its role: `principal`, `hod`, `teacher`, `student`, `parent`, `coe`, `finance_manager`, `accountant`, `financier`, `receptionist`, `store_manager`, `storekeeper`, `transport_driver`, `driver`, `hr_manager`, `librarian`, `hostel_warden`, `placement_officer`, `naac_coordinator`, and more `admin`s. People created here get a one-time password and must change it at first sign-in.
4. **Admin → Integrations**: payment gateway (Razorpay), e-mail (Resend / SendGrid / Brevo), SMS (Twilio), WhatsApp. Press each *Test* button. Add the webhook address shown on the payments card to the Razorpay dashboard.
5. **Finance → Fee Setup**: fee heads, plans, instalments, discounts. **Finance → Payment settings**: switch online payments on.
6. **Announcements → Delivery channels**: switch e-mail / SMS / WhatsApp / automatic reminders on.

---

# Troubleshooting (for the AI: match the message, then follow the line; if nothing matches, stop and report)
| Message contains | Meaning | Do this |
|---|---|---|
| `public.profiles already exists` (file 1) | The database was not wiped. | Redo Part A, then B1. |
| `password authentication failed` | Wrong `DB_PASSWORD`. | Ask the human to reset it in Project Settings → Database, then redo the `export SUPABASE_DB_URL` line. |
| `could not translate host name` / `Network is unreachable` | Your network has no IPv6. | Use the *Session pooler* connection string from Dashboard → Connect. |
| `permission denied for …` on `auth.users` or `storage` | Wrong database user. | The URL must start with `postgresql://postgres:` (not `anon`). |
| `must be owner of …` | A previous attempt left objects owned by another role. | Redo Part A completely, then B1. |
| `relation "…" does not exist` in file N | An earlier file did not run. | Redo Part A, then B1 from the start (never skip files). |
| Part C3 shows no profile | The sign-up trigger is missing or the user was made with the app marker. | Run `psql "$SUPABASE_DB_URL" -At -c "select tgname from pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal;"` — it must list `on_auth_user_created`. If it does, delete the user in the dashboard and create it again. |
| `Function not found` during deploy | Deploying from the wrong folder. | `cd` to the repository root (the folder containing `supabase/`). |
| Login works but the page says "No institutional profile" | The profile row is missing. | Same as the C3 row. |
| `supabase migration repair` complains | The history table differs. | Harmless: ignore. The database itself is correct if B3 matches. |

---

# Inventory — what was removed and what is new
**Wiped from Supabase (Part A):** every table, function, trigger and policy in `public`; all rows in `auth.users` (and their sessions); every storage file and bucket; all storage access rules (including old permissive "public read" ones); the migration history; the 12 old edge functions (including the retired `admin-users`).

**Removed from this repository:** the 67 old migrations (`001…079`) and the 13 archived ones (`supabase/migrations_archive/`); the old edge function `admin-users`; the old test file name `smoke_028_037.sql`.

**New in this repository:**
* `supabase/migrations/` — the 35 files above, generated from the fully tested schema (123 tables, 178 functions, 249 policies, 39 triggers).
* `supabase/maintenance/wipe_everything.sql`, `empty_storage.mjs`, `apply_one_by_one.sh` — the tools used in Parts A and B.
* `supabase/optional_seed/sample_paramedical_structure.sql` — optional sample data (B4).
* `supabase/config.toml` — sign-up off, function settings.
* `supabase/tests/run_all.sh`, `smoke_all.sql`, `stub/` — rebuilds the database in a scratch local Postgres and runs 526 checks (for developers).

**Behaviour differences from the old setup (all intentional):**
* The first Super Admin is created in the Supabase dashboard; there is no more default or demo login, and no demo data (no fake students, fees, exams, vehicles).
* The institution starts as "My Institution" and is renamed in Admin → Settings.
* Live updates now work for 18 more tables that earlier versions forgot to publish.
* A storage rule bug was fixed: teachers could not open their own students' uploaded files.
* All accounts created by the app carry a server-side marker, so the sign-up trigger never promotes them.
