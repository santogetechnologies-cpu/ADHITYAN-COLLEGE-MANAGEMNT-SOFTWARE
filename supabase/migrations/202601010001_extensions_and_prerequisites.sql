-- Step 1: extensions and prerequisites.
-- Run on an EMPTY Supabase database. Nothing here touches your data.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

SET search_path = public, extensions;

-- Fail loudly if this is not an empty database, so a half-wiped project is never built on top of.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    RAISE EXCEPTION 'public.profiles already exists. This migration set must run on an EMPTY database. Run supabase/maintenance/wipe_everything.sql first.';
  END IF;
END $$;
