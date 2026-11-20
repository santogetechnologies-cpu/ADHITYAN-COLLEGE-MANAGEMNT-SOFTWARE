-- =============================================================================
-- Migration Script: 028_stage5_configs.sql (Phase 1.4 Corrected Release)
-- Description: Institutional Super Admin configuration, release ledger & immutable audit log
-- Architecture: Single-Institution Dedicated Deployment (Adhityan College)
-- Target Database: PostgreSQL 15+ (Supabase Managed Instance: ogbbyqxulhegwvrtinib.supabase.co)
-- Defects Remediated: DEF-010 & DEF-108 (strictly append-only audit log, forced actor binding trigger,
--                     engine-level prevent_audit_log_modification trigger, zero UPDATE/DELETE grants & policies),
--                     DEF-109 (client-side encryption disclosure header),
--                     DEF-113 (ON CONFLICT DO NOTHING seed data preservation & explicit table grants)
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
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.super_admin_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN ('branding', 'features', 'roles', 'database', 'integrations')),
    key TEXT NOT NULL,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_super_admin_configs_key UNIQUE (category, key)
);

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

-- DEF-113: Explicit Table Grants
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
-- 2. PUBLIC.SUPER_ADMIN_RELEASES (Release & Software Version Ledger)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.super_admin_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL UNIQUE,
    release_date DATE NOT NULL DEFAULT CURRENT_DATE,
    channel TEXT NOT NULL DEFAULT 'stable' CHECK (channel IN ('stable', 'beta', 'lts')),
    is_deployed BOOLEAN NOT NULL DEFAULT FALSE,
    deployed_at TIMESTAMPTZ DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DEF-113: Explicit Table Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.super_admin_releases TO authenticated;

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

DROP POLICY IF EXISTS "super_admin_releases_update" ON public.super_admin_releases;
CREATE POLICY "super_admin_releases_update" ON public.super_admin_releases
    FOR UPDATE TO authenticated
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "super_admin_releases_delete" ON public.super_admin_releases;
CREATE POLICY "super_admin_releases_delete" ON public.super_admin_releases
    FOR DELETE TO authenticated
    USING (public.get_current_user_role() = 'admin');

-- =============================================================================
-- 3. PUBLIC.SUPER_ADMIN_AUDIT_LOGS (DEF-010 & DEF-108: FORENSIC IMMUTABILITY)
-- 1. Non-nullable actor columns (admin_id, admin_email).
-- 2. Forced actor binding via BEFORE INSERT trigger.
-- 3. Engine-level trigger blocking all UPDATE and DELETE attempts.
-- 4. Strictly zero UPDATE/DELETE RLS policies and table grants.
-- =============================================================================
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

-- Actor Binding Trigger: Forcibly overwrites client-supplied values with server auth
CREATE OR REPLACE FUNCTION public.bind_super_admin_audit_log_actor()
RETURNS TRIGGER AS $$
DECLARE
    v_caller_email TEXT;
BEGIN
    IF auth.uid() IS NOT NULL THEN
        NEW.admin_id := auth.uid();
        SELECT email INTO v_caller_email 
        FROM public.profiles 
        WHERE id = auth.uid();
        
        NEW.admin_email := COALESCE(v_caller_email, 'system_admin@institution.local');
    ELSE
        NEW.admin_id := '00000000-0000-0000-0000-000000000000'::uuid;
        NEW.admin_email := session_user || '@postgres.local';
    END IF;

    -- Enforce deterministic server-side timestamp
    NEW.created_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trg_bind_super_admin_audit_log_actor ON public.super_admin_audit_logs;
CREATE TRIGGER trg_bind_super_admin_audit_log_actor
    BEFORE INSERT ON public.super_admin_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.bind_super_admin_audit_log_actor();

-- DEF-108: Engine-Level Audit Immutability Trigger
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Security Violation: Audit logs are strictly append-only. UPDATE and DELETE operations are permanently prohibited.' 
        USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_modification ON public.super_admin_audit_logs;
CREATE TRIGGER trg_prevent_audit_log_modification
    BEFORE UPDATE OR DELETE ON public.super_admin_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_audit_log_modification();

-- DEF-113: Explicit Table Grants (SELECT and INSERT only)
GRANT SELECT, INSERT ON public.super_admin_audit_logs TO authenticated;

-- Enable RLS
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
