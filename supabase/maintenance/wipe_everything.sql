-- ============================================================================================================
--  WIPE EVERYTHING  —  DESTRUCTIVE. Empties the Supabase project so the migrations can be applied from scratch.
--
--  Deletes: every table/function/policy in the public schema, ALL login accounts (auth.users and their sessions),
--           the storage rules and the migration history. Storage FILES are removed separately (see the runbook).
--  Keeps:   the Supabase platform itself (auth/storage/realtime services, extensions schema, your project settings).
--
--  It refuses to run unless you confirm in the SAME psql session first:
--      SET wipe.confirm = 'YES-DELETE-EVERYTHING';
--      \i supabase/maintenance/wipe_everything.sql
-- ============================================================================================================
DO $$
BEGIN
  IF current_setting('wipe.confirm', true) IS DISTINCT FROM 'YES-DELETE-EVERYTHING' THEN
    RAISE EXCEPTION 'Refusing to wipe. Run  SET wipe.confirm = ''YES-DELETE-EVERYTHING'';  first, in the same session.';
  END IF;
END $$;

SET client_min_messages = warning;
BEGIN;

-- 1. stop scheduled jobs created by the app (only if pg_cron is installed)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'erp-fee-reminders';
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pg_cron cleanup skipped: %', SQLERRM;
END $$;

-- 2. remove the sign-up trigger and all login accounts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DELETE FROM auth.users;

-- 3. remove EVERY access rule on storage.objects / storage.buckets (old projects carried permissive "public read" rules that
--    would expose private documents). The migrations create the correct rules again. Files are removed through the Storage API.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'storage' AND tablename IN ('objects', 'buckets')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 4. drop and recreate the public schema exactly as Supabase creates it
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES    TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;

-- 5. forget which migrations were applied, so `supabase db push` runs all of them again
DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    DELETE FROM supabase_migrations.schema_migrations;
  END IF;
END $$;

COMMIT;

SELECT 'WIPE DONE: public schema is empty, auth.users is empty, migration history cleared.' AS result,
       (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') AS public_tables,
       (SELECT count(*) FROM auth.users) AS auth_users;
