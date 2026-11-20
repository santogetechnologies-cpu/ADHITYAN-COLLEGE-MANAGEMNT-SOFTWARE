-- MIGRATION 019: Safe addition of status column on public.profiles
-- Run this in the Supabase SQL Editor if you want database-level status column support.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'inactive', 'suspended'));
        CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
    END IF;
END $$;

