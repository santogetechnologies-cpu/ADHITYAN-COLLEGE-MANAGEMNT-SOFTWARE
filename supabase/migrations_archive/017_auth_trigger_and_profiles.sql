-- =============================================================================
-- Migration: 017_auth_trigger_and_profiles.sql
-- Description: Automatic user profile sync trigger on auth.users, indexes,
--              updated_at triggers, and RLS policy alignment for 13 roles.
-- =============================================================================

-- 1. Automatic profile provisioning trigger from Supabase auth.users
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
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.profiles.name),
        role = COALESCE(EXCLUDED.role, public.profiles.role),
        avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), public.profiles.avatar_url),
        status = 'active',
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger cleanly on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Performance indexes across critical ERP foreign keys & query filters
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_timetables_dept_sem ON public.timetables(department_id, semester);
CREATE INDEX IF NOT EXISTS idx_timetables_day ON public.timetables(day_of_week);
CREATE INDEX IF NOT EXISTS idx_assignments_dept ON public.assignments(department_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_student ON public.student_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_status ON public.student_fees(status);
CREATE INDEX IF NOT EXISTS idx_store_orders_student ON public.store_orders(student_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_status ON public.store_orders(status);
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_status ON public.transport_vehicles(status);
CREATE INDEX IF NOT EXISTS idx_book_issues_student ON public.book_issues(student_id);

-- 3. Standard updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach updated_at triggers
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_departments_updated_at ON public.departments;
CREATE TRIGGER trg_departments_updated_at
    BEFORE UPDATE ON public.departments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_sections_updated_at ON public.sections;
CREATE TRIGGER trg_sections_updated_at
    BEFORE UPDATE ON public.sections
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_timetables_updated_at ON public.timetables;
CREATE TRIGGER trg_timetables_updated_at
    BEFORE UPDATE ON public.timetables
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_assignments_updated_at ON public.assignments;
CREATE TRIGGER trg_assignments_updated_at
    BEFORE UPDATE ON public.assignments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_student_fees_updated_at ON public.student_fees;
CREATE TRIGGER trg_student_fees_updated_at
    BEFORE UPDATE ON public.student_fees
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_store_orders_updated_at ON public.store_orders;
CREATE TRIGGER trg_store_orders_updated_at
    BEFORE UPDATE ON public.store_orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. RLS Policy Enhancements for the 13 Institutional Roles
-- Allow institutional staff (Admin, Principal, Teacher, Receptionist, Store, Finance, Transport) to view student profiles
DROP POLICY IF EXISTS "Allow users to view own profile or admins/staff" ON public.profiles;
CREATE POLICY "Allow users to view own profile or admins/staff"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        id = auth.uid() OR 
        public.get_current_user_role() IN (
            'admin', 'principal', 'teacher', 'receptionist',
            'finance_manager', 'financier', 'accountant',
            'store_manager', 'storekeeper',
            'transport_driver', 'driver',
            'hr_manager', 'librarian', 'hostel_warden', 'placement_officer'
        )
    );

-- Allow authenticated users to view active departments & sections
DROP POLICY IF EXISTS "Authenticated users view departments" ON public.departments;
CREATE POLICY "Authenticated users view departments"
    ON public.departments FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users view sections" ON public.sections;
CREATE POLICY "Authenticated users view sections"
    ON public.sections FOR SELECT
    TO authenticated
    USING (true);

-- Allow public and authenticated users to view store products
DROP POLICY IF EXISTS "Anyone can view store products" ON public.store_products;
CREATE POLICY "Anyone can view store products"
    ON public.store_products FOR SELECT
    TO authenticated, anon
    USING (true);

-- Allow students and guardians to view transport vehicles and stops
DROP POLICY IF EXISTS "Authenticated users view transport vehicles" ON public.transport_vehicles;
CREATE POLICY "Authenticated users view transport vehicles"
    ON public.transport_vehicles FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users view transport stops" ON public.transport_stops;
CREATE POLICY "Authenticated users view transport stops"
    ON public.transport_stops FOR SELECT
    TO authenticated
    USING (true);

