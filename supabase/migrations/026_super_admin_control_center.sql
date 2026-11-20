-- =============================================================================
-- Migration: 026_super_admin_control_center.sql
-- Description: Centralized Super Admin Configuration Architecture,
--              Role Customization, Dashboard Widgets, Navigation, Modules,
--              Features, Forms, Workflows, Theme, Versioning, and Audit Logs.
-- =============================================================================

-- 1. CENTRALIZED SYSTEM CONFIGURATION REPOSITORY
CREATE TABLE IF NOT EXISTS public.super_admin_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_type TEXT NOT NULL, -- 'role', 'dashboard', 'navigation', 'module', 'feature', 'permission', 'form', 'workflow', 'notification', 'global', 'theme'
    target_role TEXT DEFAULT 'global', -- 'admin', 'principal', 'teacher', 'student', 'parent', 'finance_manager', etc., or 'global'
    is_published BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    checksum TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint: for any config_type and target_role, exactly one draft (is_published = false) and one active published (is_published = true)
CREATE UNIQUE INDEX IF NOT EXISTS idx_super_admin_configs_unique_active 
    ON public.super_admin_configs (config_type, target_role, is_published) 
    WHERE is_published = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_super_admin_configs_unique_draft 
    ON public.super_admin_configs (config_type, target_role, is_published) 
    WHERE is_published = false;

CREATE INDEX IF NOT EXISTS idx_super_admin_configs_type_role 
    ON public.super_admin_configs (config_type, target_role);

-- 2. CONFIGURATION RELEASES / VERSION HISTORY
CREATE TABLE IF NOT EXISTS public.super_admin_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    release_version TEXT NOT NULL, -- e.g. 'v1.0.0', 'v1.1.0'
    version_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    change_summary TEXT,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_email TEXT,
    snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_super_admin_releases_version 
    ON public.super_admin_releases (version_number DESC);

-- 3. CONFIGURATION BACKUPS
CREATE TABLE IF NOT EXISTS public.super_admin_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_name TEXT NOT NULL,
    backup_type TEXT DEFAULT 'manual', -- 'manual', 'pre_publish', 'scheduled'
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by_email TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.super_admin_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admin_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admin_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to prevent conflicts
DROP POLICY IF EXISTS "Admins have full access to super_admin_configs" ON public.super_admin_configs;
DROP POLICY IF EXISTS "Authenticated users can read published configs" ON public.super_admin_configs;
DROP POLICY IF EXISTS "Admins have full access to super_admin_releases" ON public.super_admin_releases;
DROP POLICY IF EXISTS "Admins have full access to super_admin_backups" ON public.super_admin_backups;
DROP POLICY IF EXISTS "Admins have full access to audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit_logs" ON public.audit_logs;

-- Policies for super_admin_configs
CREATE POLICY "Admins have full access to super_admin_configs"
    ON public.super_admin_configs FOR ALL TO authenticated
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Authenticated users can read published configs"
    ON public.super_admin_configs FOR SELECT TO authenticated
    USING (is_published = true);

-- Policies for super_admin_releases
CREATE POLICY "Admins have full access to super_admin_releases"
    ON public.super_admin_releases FOR ALL TO authenticated
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Authenticated users can read active release"
    ON public.super_admin_releases FOR SELECT TO authenticated
    USING (is_active = true);

-- Policies for super_admin_backups
CREATE POLICY "Admins have full access to super_admin_backups"
    ON public.super_admin_backups FOR ALL TO authenticated
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');

-- Policies for audit_logs
CREATE POLICY "Admins can view and filter all audit logs"
    ON public.audit_logs FOR SELECT TO authenticated
    USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Authenticated users can insert audit logs"
    ON public.audit_logs FOR INSERT TO authenticated
    WITH CHECK (true);
