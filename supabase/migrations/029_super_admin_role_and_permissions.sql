-- =============================================================================
-- Migration Script: 029_super_admin_role_and_permissions.sql
-- Description: Super Admin Top-Level Role Model, Dynamic Role Permissions,
--              Module Switches, Approvals Queue, View-As Audit, and RLS Helpers
-- Architecture: Single-Institution Dedicated Deployment (Adhityan College)
-- Target Database: PostgreSQL 15+ (Supabase Managed Instance)
-- Safety: Non-destructive, transactional DDL with strict statement timeout
-- =============================================================================

SET statement_timeout = '15s';
SET lock_timeout = '5s';

BEGIN;

-- =============================================================================
-- 1. UPDATE PROFILES ROLE WHITELIST CHECK CONSTRAINT
-- =============================================================================
DO $$
BEGIN
  -- Drop existing role check constraint if present
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_role_check' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
  END IF;

  -- Add comprehensive institutional role whitelist with super_admin as top role
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check CHECK (
      role IN (
        'super_admin',
        'admin',
        'principal',
        'student',
        'parent',
        'teacher',
        'receptionist',
        'store_manager',
        'finance_manager',
        'transport_driver',
        'hr_manager',
        'librarian',
        'hostel_warden',
        'placement_officer',
        'naac_coordinator',
        'hod',
        'coe',
        'financier',
        'accountant',
        'storekeeper',
        'driver'
      )
    );
END $$;

-- =============================================================================
-- 2. CREATE ROLE_PERMISSIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_role_permissions UNIQUE (role, module, action)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_lookup 
  ON public.role_permissions (role, module, action);

-- =============================================================================
-- 3. CREATE MODULE_SWITCHES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.module_switches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL UNIQUE,
  module_name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 4. CREATE APPROVALS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_table TEXT NOT NULL,
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  decided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_approvals_status ON public.approvals (status);
CREATE INDEX IF NOT EXISTS idx_approvals_type ON public.approvals (type);

-- =============================================================================
-- 5. CREATE VIEW_AS_SESSIONS AUDIT TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.view_as_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_role TEXT NOT NULL,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_view_as_active 
  ON public.view_as_sessions (super_admin_id, expires_at) 
  WHERE revoked = false;

-- =============================================================================
-- 6. SQL SECURITY HELPER FUNCTIONS (SECURITY DEFINER, FIXED SEARCH_PATH)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
      AND role = 'super_admin' 
      AND (status IS NULL OR status = 'active')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin') 
      AND (status IS NULL OR status = 'active')
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(p_module TEXT, p_action TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT CASE 
    -- Super admin implicitly has all permissions across every module
    WHEN public.is_super_admin() THEN TRUE
    ELSE EXISTS (
      SELECT 1 
      FROM public.role_permissions rp
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE rp.role = p.role
        AND rp.module = p_module
        AND rp.action = p_action
        AND rp.allowed = TRUE
        AND (p.status IS NULL OR p.status = 'active')
    )
  END;
$$;

-- Revoke default public execution; grant only to authenticated roles
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_permission(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(TEXT, TEXT) TO authenticated, service_role;

-- =============================================================================
-- 7. PROFILES BEFORE-UPDATE IMMUTABILITY TRIGGER (PREVENTS PRIVILEGE ESCALATION)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.protect_profile_security_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_is_super BOOLEAN;
BEGIN
  -- Service role / replication bypass
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Resolve caller role
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  v_caller_is_super := (v_caller_role = 'super_admin');

  -- 1. Only super_admin can create or assign super_admin or admin roles
  IF (NEW.role IN ('super_admin', 'admin') OR OLD.role IN ('super_admin', 'admin')) AND NOT v_caller_is_super THEN
    RAISE EXCEPTION 'Privilege Violation: Only a Super Administrator can assign or modify Administrator roles.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Non-admin users cannot alter their own role, status, student_id, roll_number, or login_id
  IF v_caller_role NOT IN ('super_admin', 'admin') THEN
    IF NEW.role <> OLD.role THEN
      RAISE EXCEPTION 'Privilege Violation: Self-modification of account role is strictly prohibited.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Privilege Violation: Self-modification of account status is strictly prohibited.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.student_id IS DISTINCT FROM OLD.student_id THEN
      RAISE EXCEPTION 'Privilege Violation: Modification of institutional Student ID is prohibited.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.roll_number IS DISTINCT FROM OLD.roll_number THEN
      RAISE EXCEPTION 'Privilege Violation: Modification of institutional Roll Number is prohibited.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.login_id IS DISTINCT FROM OLD.login_id THEN
      RAISE EXCEPTION 'Privilege Violation: Modification of institutional Login ID is prohibited.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_security_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_security_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_security_fields();

-- =============================================================================
-- 8. ROW LEVEL SECURITY (RLS) FOR NEW SUPER ADMIN TABLES
-- =============================================================================
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_switches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.view_as_sessions ENABLE ROW LEVEL SECURITY;

-- role_permissions: Everyone authenticated can read; only super_admin can write
DROP POLICY IF EXISTS "role_permissions_read_all" ON public.role_permissions;
CREATE POLICY "role_permissions_read_all"
  ON public.role_permissions
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "role_permissions_write_super_admin" ON public.role_permissions;
CREATE POLICY "role_permissions_write_super_admin"
  ON public.role_permissions
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- module_switches: Everyone authenticated can read; only super_admin can write
DROP POLICY IF EXISTS "module_switches_read_all" ON public.module_switches;
CREATE POLICY "module_switches_read_all"
  ON public.module_switches
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "module_switches_write_super_admin" ON public.module_switches;
CREATE POLICY "module_switches_write_super_admin"
  ON public.module_switches
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- approvals: Admin and Super Admin can manage; requesters can read own
DROP POLICY IF EXISTS "approvals_select" ON public.approvals;
CREATE POLICY "approvals_select"
  ON public.approvals
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin() 
    OR requested_by = auth.uid()
  );

DROP POLICY IF EXISTS "approvals_write_admin" ON public.approvals;
CREATE POLICY "approvals_write_admin"
  ON public.approvals
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- view_as_sessions: Strictly super_admin
DROP POLICY IF EXISTS "view_as_sessions_super_admin" ON public.view_as_sessions;
CREATE POLICY "view_as_sessions_super_admin"
  ON public.view_as_sessions
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- =============================================================================
-- 9. SEED INITIAL MODULE SWITCHES AND CORE ROLE PERMISSIONS
-- =============================================================================
INSERT INTO public.module_switches (module_key, module_name, is_enabled, description)
VALUES
  ('admissions', 'Student Admissions', true, 'Online application intake, document verification, and merit lists'),
  ('academics', 'Academic Management', true, 'Departments, courses, sections, and syllabus tracking'),
  ('timetable', 'Timetable Matrix', true, 'Class schedules, teacher assignments, and period clash checking'),
  ('attendance', 'Attendance System', true, 'Daily student attendance roll, session logs, and shortage warnings'),
  ('examinations', 'Examinations & Marks', true, 'Exam schedules, hall tickets, marks entry, and result publishing'),
  ('finance', 'Fees & Finance', true, 'Fee structures, student fees ledger, receipts, and income/expense transactions'),
  ('library', 'Library Management', true, 'Book catalog, circulation, digital library, and overdue fines'),
  ('store', 'Campus Store & Inventory', true, 'Student supplies, uniforms, books, stock levels, and order fulfillment'),
  ('transport', 'Transport & Fleet', true, 'Buses, routes, pickup stops, and student transport logs'),
  ('hostel', 'Hostel & Residential', true, 'Room allocations, occupancy, and gate out-pass management'),
  ('hr_payroll', 'Staff HR & Payroll', true, 'Leave applications, leave quotas, and monthly salary disbursement'),
  ('naac', 'NAAC Accreditation', true, 'Criteria progress, documentation repository, and SSR reports')
ON CONFLICT (module_key) DO NOTHING;

-- Seed default role permissions (Admin baseline)
INSERT INTO public.role_permissions (role, module, action, allowed)
VALUES
  ('admin', 'admissions', 'view', true),
  ('admin', 'admissions', 'create', true),
  ('admin', 'admissions', 'edit', true),
  ('admin', 'admissions', 'delete', false),
  ('admin', 'admissions', 'approve', true),
  ('admin', 'academics', 'view', true),
  ('admin', 'academics', 'create', true),
  ('admin', 'academics', 'edit', true),
  ('admin', 'academics', 'delete', false),
  ('admin', 'timetable', 'view', true),
  ('admin', 'timetable', 'create', true),
  ('admin', 'timetable', 'edit', true),
  ('admin', 'timetable', 'delete', true),
  ('admin', 'attendance', 'view', true),
  ('admin', 'attendance', 'create', true),
  ('admin', 'attendance', 'edit', true),
  ('admin', 'attendance', 'delete', false),
  ('admin', 'examinations', 'view', true),
  ('admin', 'examinations', 'create', true),
  ('admin', 'examinations', 'edit', true),
  ('admin', 'examinations', 'delete', false),
  ('admin', 'examinations', 'approve', true),
  ('admin', 'finance', 'view', true),
  ('admin', 'finance', 'create', false),
  ('admin', 'finance', 'edit', false),
  ('admin', 'finance', 'delete', false),
  ('admin', 'library', 'view', true),
  ('admin', 'store', 'view', true),
  ('admin', 'transport', 'view', true),
  ('admin', 'hostel', 'view', true),
  ('admin', 'hr_payroll', 'view', true)
ON CONFLICT (role, module, action) DO NOTHING;

COMMIT;
