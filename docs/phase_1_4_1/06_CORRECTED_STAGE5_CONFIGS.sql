-- =============================================================================
-- Migration Script: 028_stage5_configs.sql (Phase 1.4.1 Final Consolidated Release)
-- Description: Institutional Super Admin configuration, append-only release ledger & forensic audit log
-- Architecture: Single-Institution Dedicated Deployment (Adhityan College)
-- Target Database: PostgreSQL 15+ (Supabase Managed Instance: ogbbyqxulhegwvrtinib.supabase.co)
-- Defects Remediated: 
--   DEF-010 & DEF-108: Append-only audit log, forced server actor binding, engine-level UPDATE/DELETE & TRUNCATE block, zero UPDATE/DELETE RLS policies
--   DEF-109: Client-side encryption disclosure header & transparent threat model
--   DEF-113: ON CONFLICT DO NOTHING seed data preservation & append-only release ledger (UPDATE and DELETE removed)
--   DEF-120: Explicit REVOKE of PUBLIC/authenticated privileges, strict SELECT/INSERT grants, audit field trust boundary
--   DEF-129: Existing table schema reconciliation, genuine server-resolved actor attribution, elimination of fabricated emails & multi-table audit hardening
-- Safety Safeguards: Strict lock_timeout (3s) and statement_timeout (10s)
-- Mode: Static Engineering Specification (Zero Live Execution)
-- =============================================================================

SET lock_timeout = '3s';
SET statement_timeout = '10s';

BEGIN;

-- =============================================================================
-- 1. PUBLIC.SUPER_ADMIN_CONFIGS (Institutional System Configurations)
-- DEF-109 TRANSPARENCY NOTICE:
-- The `is_encrypted` column is an application-layer envelope flag indicating that
-- sensitive credentials (e.g. third-party API keys) were encrypted client-side
-- before dispatch. PostgreSQL JSONB storage is unencrypted at rest unless pgcrypto is used.
--
-- Reconciles existing table structure rather than blindly relying on CREATE TABLE IF NOT EXISTS.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.super_admin_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL DEFAULT 'features',
    key TEXT NOT NULL DEFAULT 'default_key',
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reconcile columns if table pre-existed with legacy schema
ALTER TABLE public.super_admin_configs ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.super_admin_configs ADD COLUMN IF NOT EXISTS key TEXT;
ALTER TABLE public.super_admin_configs ADD COLUMN IF NOT EXISTS value JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.super_admin_configs ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.super_admin_configs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.super_admin_configs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure category check constraint
DO $$
BEGIN
    ALTER TABLE public.super_admin_configs DROP CONSTRAINT IF EXISTS super_admin_configs_category_check;
    ALTER TABLE public.super_admin_configs 
        ADD CONSTRAINT super_admin_configs_category_check 
        CHECK (category IS NULL OR category IN ('branding', 'features', 'roles', 'database', 'integrations'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Ensure unique constraint on (category, key)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_super_admin_configs_key'
    ) THEN
        -- Only add if no duplicate rows exist
        IF NOT EXISTS (
            SELECT 1 FROM public.super_admin_configs 
            WHERE category IS NOT NULL AND key IS NOT NULL 
            GROUP BY category, key HAVING COUNT(*) > 1
        ) THEN
            ALTER TABLE public.super_admin_configs 
                ADD CONSTRAINT uq_super_admin_configs_key UNIQUE (category, key);
        END IF;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_super_admin_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_super_admin_configs_updated_at ON public.super_admin_configs;
CREATE TRIGGER trg_super_admin_configs_updated_at
    BEFORE UPDATE ON public.super_admin_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_super_admin_configs_updated_at();

REVOKE ALL ON FUNCTION public.set_super_admin_configs_updated_at() FROM PUBLIC, authenticated, anon;

-- DEF-113: Explicit Table Grants & TRUNCATE Revocation
REVOKE ALL ON public.super_admin_configs FROM PUBLIC, authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.super_admin_configs TO authenticated;

-- Enable RLS
ALTER TABLE public.super_admin_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_configs_select" ON public.super_admin_configs;
CREATE POLICY "super_admin_configs_select" ON public.super_admin_configs
    FOR SELECT TO authenticated
    USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "super_admin_configs_insert" ON public.super_admin_configs;
CREATE POLICY "super_admin_configs_insert" ON public.super_admin_configs
    FOR INSERT TO authenticated
    WITH CHECK (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "super_admin_configs_update" ON public.super_admin_configs;
CREATE POLICY "super_admin_configs_update" ON public.super_admin_configs
    FOR UPDATE TO authenticated
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "super_admin_configs_delete" ON public.super_admin_configs;
CREATE POLICY "super_admin_configs_delete" ON public.super_admin_configs
    FOR DELETE TO authenticated
    USING (public.get_current_user_role() = 'admin');

-- =============================================================================
-- 2. PUBLIC.SUPER_ADMIN_RELEASES (Append-Only Software Release Ledger)
-- In accordance with append-only requirements: UPDATE and DELETE privileges and policies are removed.
-- Reconciles columns if table pre-existed from legacy migrations.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.super_admin_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL DEFAULT 'v1.0.0',
    release_date DATE NOT NULL DEFAULT CURRENT_DATE,
    channel TEXT NOT NULL DEFAULT 'stable' CHECK (channel IN ('stable', 'beta', 'lts')),
    is_deployed BOOLEAN NOT NULL DEFAULT FALSE,
    deployed_at TIMESTAMPTZ DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reconcile columns
ALTER TABLE public.super_admin_releases ADD COLUMN IF NOT EXISTS version TEXT;
ALTER TABLE public.super_admin_releases ADD COLUMN IF NOT EXISTS release_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.super_admin_releases ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'stable';
ALTER TABLE public.super_admin_releases ADD COLUMN IF NOT EXISTS is_deployed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.super_admin_releases ADD COLUMN IF NOT EXISTS deployed_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.super_admin_releases ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;
ALTER TABLE public.super_admin_releases ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- DEF-113 & DEF-120: Explicit Table Grants (strictly SELECT, INSERT - zero UPDATE, zero DELETE)
REVOKE ALL ON public.super_admin_releases FROM PUBLIC, authenticated, anon;
GRANT SELECT, INSERT ON public.super_admin_releases TO authenticated;

-- Enable RLS
ALTER TABLE public.super_admin_releases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_releases_select" ON public.super_admin_releases;
CREATE POLICY "super_admin_releases_select" ON public.super_admin_releases
    FOR SELECT TO authenticated
    USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "super_admin_releases_insert" ON public.super_admin_releases;
CREATE POLICY "super_admin_releases_insert" ON public.super_admin_releases
    FOR INSERT TO authenticated
    WITH CHECK (public.get_current_user_role() = 'admin');

-- Explicitly drop legacy UPDATE and DELETE policies to enforce strict append-only behavior
DROP POLICY IF EXISTS "super_admin_releases_update" ON public.super_admin_releases;
DROP POLICY IF EXISTS "super_admin_releases_delete" ON public.super_admin_releases;

-- =============================================================================
-- 3. AUDIT LOGGING SUBSYSTEM (FORENSIC IMMUTABILITY & SERVER ACTOR BINDING)
-- Reconciles both public.audit_logs (application standard) and public.super_admin_audit_logs.
-- 1. Server-forced identity attribution: client cannot spoof user_id, email, or timestamps.
-- 2. Row-level engine trigger permanently raising exception 42501 on UPDATE or DELETE.
-- 3. Statement-level engine trigger permanently raising exception 42501 on TRUNCATE.
-- 4. Explicit privilege lockdown: strictly SELECT, INSERT. Zero UPDATE and zero DELETE policies.
-- =============================================================================

-- 3A. Authoritative Application Audit Log (public.audit_logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID DEFAULT NULL,
    user_email TEXT NOT NULL,
    user_role TEXT DEFAULT NULL,
    action TEXT NOT NULL,
    entity_type TEXT DEFAULT NULL,
    entity_id TEXT DEFAULT NULL,
    old_values JSONB DEFAULT NULL,
    new_values JSONB DEFAULT NULL,
    ip_address TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reconcile columns on public.audit_logs
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_role TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS old_values JSONB;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS new_values JSONB;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Actor Binding Trigger for public.audit_logs
CREATE OR REPLACE FUNCTION public.bind_audit_log_actor()
RETURNS TRIGGER AS $$
DECLARE
    v_caller_email TEXT;
    v_caller_role TEXT;
BEGIN
    NEW.id := gen_random_uuid();
    NEW.created_at := NOW();

    IF auth.uid() IS NOT NULL THEN
        NEW.user_id := auth.uid();
        
        -- Resolve genuine email from profiles or auth.users (No fake human emails)
        SELECT email, role INTO v_caller_email, v_caller_role 
        FROM public.profiles 
        WHERE id = auth.uid();

        IF v_caller_email IS NULL THEN
            SELECT email INTO v_caller_email 
            FROM auth.users 
            WHERE id = auth.uid();
        END IF;

        NEW.user_email := COALESCE(v_caller_email, 'auth_user_' || auth.uid()::text);
        NEW.user_role := COALESCE(v_caller_role, 'authenticated');
    ELSE
        -- Fallback for direct database administrative sessions
        NEW.user_id := '00000000-0000-0000-0000-000000000000'::uuid;
        NEW.user_email := 'system:' || session_user;
        NEW.user_role := 'system';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trg_bind_audit_log_actor ON public.audit_logs;
CREATE TRIGGER trg_bind_audit_log_actor
    BEFORE INSERT ON public.audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.bind_audit_log_actor();

REVOKE ALL ON FUNCTION public.bind_audit_log_actor() FROM PUBLIC, authenticated, anon;

-- Engine-Level Audit Immutability Trigger (UPDATE & DELETE)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Security Violation: Audit logs are strictly append-only. UPDATE and DELETE operations are permanently prohibited.' 
        USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_modification ON public.audit_logs;
CREATE TRIGGER trg_prevent_audit_log_modification
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_audit_log_modification();

-- Engine-Level Statement Trigger (TRUNCATE Protection)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_truncate()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Security Violation: Audit logs cannot be truncated. TRUNCATE operation is permanently prohibited.' 
        USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_truncate ON public.audit_logs;
CREATE TRIGGER trg_prevent_audit_log_truncate
    BEFORE TRUNCATE ON public.audit_logs
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.prevent_audit_log_truncate();

-- Privilege Lockdown on public.audit_logs
REVOKE ALL ON public.audit_logs FROM PUBLIC, authenticated, anon;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;

-- Enable RLS on public.audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.get_current_user_role() = 'admin');

-- Authenticated callers can record audit actions; trigger binds actual actor identity
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can view and filter all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins have full access to audit_logs" ON public.audit_logs;

-- 3B. Dedicated Institutional Administrative Audit Log (public.super_admin_audit_logs)
CREATE TABLE IF NOT EXISTS public.super_admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL,
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    target_entity TEXT NOT NULL,
    target_id TEXT DEFAULT NULL,
    changes JSONB DEFAULT NULL,
    ip_address TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Actor Binding Trigger for super_admin_audit_logs
CREATE OR REPLACE FUNCTION public.bind_super_admin_audit_log_actor()
RETURNS TRIGGER AS $$
DECLARE
    v_caller_email TEXT;
BEGIN
    NEW.id := gen_random_uuid();
    NEW.created_at := NOW();

    IF auth.uid() IS NOT NULL THEN
        NEW.admin_id := auth.uid();
        SELECT email INTO v_caller_email 
        FROM public.profiles 
        WHERE id = auth.uid();

        IF v_caller_email IS NULL THEN
            SELECT email INTO v_caller_email
            FROM auth.users
            WHERE id = auth.uid();
        END IF;
        
        NEW.admin_email := COALESCE(v_caller_email, 'auth_user_' || auth.uid()::text);
    ELSE
        NEW.admin_id := '00000000-0000-0000-0000-000000000000'::uuid;
        NEW.admin_email := 'system:' || session_user;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trg_bind_super_admin_audit_log_actor ON public.super_admin_audit_logs;
CREATE TRIGGER trg_bind_super_admin_audit_log_actor
    BEFORE INSERT ON public.super_admin_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.bind_super_admin_audit_log_actor();

REVOKE ALL ON FUNCTION public.bind_super_admin_audit_log_actor() FROM PUBLIC, authenticated, anon;

DROP TRIGGER IF EXISTS trg_prevent_super_admin_audit_log_modification ON public.super_admin_audit_logs;
CREATE TRIGGER trg_prevent_super_admin_audit_log_modification
    BEFORE UPDATE OR DELETE ON public.super_admin_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_audit_log_modification();

DROP TRIGGER IF EXISTS trg_prevent_super_admin_audit_log_truncate ON public.super_admin_audit_logs;
CREATE TRIGGER trg_prevent_super_admin_audit_log_truncate
    BEFORE TRUNCATE ON public.super_admin_audit_logs
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.prevent_audit_log_truncate();

-- Privilege Lockdown on super_admin_audit_logs
REVOKE ALL ON public.super_admin_audit_logs FROM PUBLIC, authenticated, anon;
GRANT SELECT, INSERT ON public.super_admin_audit_logs TO authenticated;

ALTER TABLE public.super_admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_audit_logs_select" ON public.super_admin_audit_logs;
CREATE POLICY "super_admin_audit_logs_select" ON public.super_admin_audit_logs
    FOR SELECT TO authenticated
    USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "super_admin_audit_logs_insert" ON public.super_admin_audit_logs;
CREATE POLICY "super_admin_audit_logs_insert" ON public.super_admin_audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (public.get_current_user_role() = 'admin');

-- ZERO UPDATE AND ZERO DELETE POLICIES CREATED.

-- =============================================================================
-- 4. SEED DATA (DEF-113: Preserve Existing Institutional Configuration)
-- Uses ON CONFLICT DO NOTHING to prevent overwriting administrator customizations
-- =============================================================================
INSERT INTO public.super_admin_configs (category, key, value, is_encrypted)
VALUES 
    ('branding', 'institution_name', '{"name": "Adhityan College of Allied Health Sciences", "code": "ACAHS"}'::jsonb, false),
    ('branding', 'theme', '{"primary_color": "#0ea5e9", "accent_color": "#38bdf8", "logo_url": null}'::jsonb, false),
    ('features', 'portal_modules', '{"attendance": true, "examinations": true, "fee_management": true, "library": true, "hostel": true, "placements": true}'::jsonb, false),
    ('roles', 'role_hierarchy', '{"super_admin": "admin", "executive": "principal", "hod": "hod", "faculty": "teacher"}'::jsonb, false)
ON CONFLICT (category, key) DO NOTHING;

INSERT INTO public.super_admin_releases (version, release_date, channel, is_deployed, deployed_at, notes)
VALUES 
    ('v1.0.0-phase1', CURRENT_DATE, 'stable', true, NOW(), 'Phase 1 Security & Database Hardening Release')
ON CONFLICT (version) DO NOTHING;

COMMIT;
