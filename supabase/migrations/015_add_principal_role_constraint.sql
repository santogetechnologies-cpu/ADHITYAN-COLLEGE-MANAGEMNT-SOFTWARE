-- ============================================================================
-- MIGRATION 015: Add 'principal' and Institutional Roles to profiles Constraint
-- Adhithyan Group of Institutions
-- ============================================================================

DO $$
BEGIN
    -- 1. Safely remove existing check constraint on profiles.role
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

    -- 2. Add updated check constraint guaranteeing 'principal' and all official portal roles are valid
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN (
        'student',
        'parent',
        'teacher',
        'admin',
        'principal',
        'financier',
        'accountant',
        'storekeeper',
        'driver',
        'receptionist',
        'store_manager',
        'finance_manager',
        'transport_driver',
        'naac_coordinator',
        'hr_manager',
        'librarian',
        'hostel_warden',
        'placement_officer'
    ));
END $$;

