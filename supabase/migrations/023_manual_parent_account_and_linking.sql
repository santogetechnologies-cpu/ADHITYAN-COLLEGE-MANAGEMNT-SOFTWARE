-- =============================================================================
-- Migration: 023_manual_parent_account_and_linking.sql
-- Description: Manual Parent Account Creation, Login ID Architecture,
--              Multi-Child Student Linking, and RLS Permissions
-- =============================================================================

-- 1. ADD login_id COLUMN TO public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS login_id TEXT;

-- Enforce case-insensitive uniqueness on login_id (sparse index for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_login_id_unique 
    ON public.profiles(LOWER(TRIM(login_id))) 
    WHERE login_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_login_id ON public.profiles(login_id);

-- 2. PARENT STUDENT LINKS TABLE & CONSTRAINTS
CREATE TABLE IF NOT EXISTS public.parent_student_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL DEFAULT 'Parent',
    verified BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Ensure unique (parent_id, student_id) constraint to prevent duplicate links
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_parent_student_link'
    ) THEN
        ALTER TABLE public.parent_student_links
        ADD CONSTRAINT unique_parent_student_link UNIQUE (parent_id, student_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_parent_student_links_parent_id ON public.parent_student_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_links_student_id ON public.parent_student_links(student_id);

-- 3. ROW LEVEL SECURITY ON parent_student_links
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and Receptionists can manage parent_student_links" ON public.parent_student_links;
CREATE POLICY "Admins and Receptionists can manage parent_student_links"
    ON public.parent_student_links FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'receptionist'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'receptionist'));

DROP POLICY IF EXISTS "Parents and students can view verified links" ON public.parent_student_links;
CREATE POLICY "Parents and students can view verified links"
    ON public.parent_student_links FOR SELECT TO authenticated
    USING (
        parent_id = auth.uid()
        OR student_id = auth.uid()
        OR public.get_current_user_role() IN ('admin', 'principal', 'receptionist', 'teacher')
    );

-- 4. SECURE LOGIN ID RESOLUTION RPC (No password exposure)
CREATE OR REPLACE FUNCTION public.resolve_login_id(p_login_id text)
RETURNS text AS $$
DECLARE
    v_email text;
BEGIN
    IF p_login_id IS NULL OR TRIM(p_login_id) = '' THEN
        RETURN NULL;
    END IF;

    SELECT email INTO v_email
    FROM public.profiles
    WHERE LOWER(TRIM(login_id)) = LOWER(TRIM(p_login_id))
       OR LOWER(TRIM(email)) = LOWER(TRIM(p_login_id))
    LIMIT 1;

    RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.resolve_login_id(text) TO anon, authenticated;

-- 5. UPDATE AUTH TRIGGER TO PRESERVE login_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        name,
        role,
        avatar_url,
        status,
        login_id,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'full_name',
            split_part(NEW.email, '@', 1)
        ),
        COALESCE(
            NEW.raw_user_meta_data->>'role',
            'student'
        ),
        COALESCE(NEW.raw_user_meta_data->>'avatar', NEW.raw_user_meta_data->>'avatar_url', ''),
        'active',
        NEW.raw_user_meta_data->>'login_id',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.profiles.name),
        role = COALESCE(EXCLUDED.role, public.profiles.role),
        avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), public.profiles.avatar_url),
        login_id = COALESCE(EXCLUDED.login_id, public.profiles.login_id),
        status = 'active',
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-enable realtime publication if needed
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.parent_student_links;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END;

