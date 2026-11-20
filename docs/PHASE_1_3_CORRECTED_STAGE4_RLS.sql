-- =============================================================================
-- Migration Script: 028_stage4_rls.sql (Phase 1.3 Corrected Release)
-- Description: Zero-trust RLS hardening, complete ERP coverage & storage isolation
-- Architecture: Single-Institution Dedicated Deployment (Adhityan College)
-- Target Database: PostgreSQL 15+ (Supabase Managed Instance: ogbbyqxulhegwvrtinib.supabase.co)
-- Defects Remediated: DEF-007 (legacy drops), DEF-008 (attendance RLS),
--                     DEF-009 (storage folder prefix), DEF-101 (8 ERP tables CRUD coverage),
--                     DEF-102 (storage documents bucket made private),
--                     DEF-104 (student enrollment validation & immutable session update)
-- Safety Safeguards: Strict lock_timeout (3s) and statement_timeout (10s)
-- Mode: Static Engineering Specification (Zero Live Execution)
-- =============================================================================

SET lock_timeout = '3s';
SET statement_timeout = '10s';

BEGIN;

-- =============================================================================
-- 0. DEF-102: STORAGE BUCKET PRIVACY REMEDIATION
-- Changes 'documents' bucket from public: true to public: false to prevent
-- unauthenticated URL scraping bypassing Row Level Security.
-- =============================================================================
UPDATE storage.buckets 
SET public = false 
WHERE id = 'documents';

-- =============================================================================
-- 1. DROP ALL 24 LEGACY PERMISSIVE POLICIES
-- In PostgreSQL, ANY policy evaluating to TRUE grants unconditional access.
-- All legacy blanket 'ALL TO authenticated (true)' and public read policies must be removed.
-- =============================================================================
-- Storage objects legacy policies
DROP POLICY IF EXISTS "Public read access for documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;

-- Core academic & operational tables
DROP POLICY IF EXISTS "att_sessions_all" ON public.class_attendance_sessions;
DROP POLICY IF EXISTS "att_records_all" ON public.student_attendance_records;
DROP POLICY IF EXISTS "staff_leaves_bal_all" ON public.staff_leave_balances;
DROP POLICY IF EXISTS "staff_leaves_app_all" ON public.staff_leave_applications;
DROP POLICY IF EXISTS "payroll_runs_all" ON public.staff_payroll_runs;
DROP POLICY IF EXISTS "payroll_items_all" ON public.staff_payroll_items;
DROP POLICY IF EXISTS "hall_tickets_all" ON public.hall_tickets;
DROP POLICY IF EXISTS "Allow manage hall tickets" ON public.hall_tickets;
DROP POLICY IF EXISTS "Allow read hall tickets" ON public.hall_tickets;
DROP POLICY IF EXISTS "fee_structures_all" ON public.fee_structures;
DROP POLICY IF EXISTS "fee_structures_public_read" ON public.fee_structures;
DROP POLICY IF EXISTS "broadcasts_all" ON public.institutional_broadcasts;
DROP POLICY IF EXISTS "broadcasts_public_read" ON public.institutional_broadcasts;

-- DEF-101: 8 ERP tables legacy policies
DROP POLICY IF EXISTS "fee_reminders_all" ON public.fee_payment_reminders;
DROP POLICY IF EXISTS "fee_receipts_all" ON public.fee_receipts;
DROP POLICY IF EXISTS "scholarship_apps_all" ON public.scholarship_applications;
DROP POLICY IF EXISTS "library_circ_all" ON public.library_circulation;
DROP POLICY IF EXISTS "hostel_rooms_all" ON public.hostel_rooms;
DROP POLICY IF EXISTS "hostel_out_passes_all" ON public.hostel_out_passes;
DROP POLICY IF EXISTS "placement_drives_all" ON public.placement_drives;
DROP POLICY IF EXISTS "placement_apps_all" ON public.placement_applications;

-- =============================================================================
-- 2. CLASS ATTENDANCE SESSIONS POLICIES (DEF-008 & DEF-104)
-- Enforces role-based permissions, teacher ownership, and immutable fields on UPDATE
-- =============================================================================
CREATE POLICY "att_sessions_select" ON public.class_attendance_sessions
    FOR SELECT TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'teacher', 'hod', 'coe'));

CREATE POLICY "att_sessions_insert" ON public.class_attendance_sessions
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() IN ('admin', 'principal', 'hod') 
        OR (public.get_current_user_role() = 'teacher' AND teacher_id = auth.uid())
    );

CREATE POLICY "att_sessions_update" ON public.class_attendance_sessions
    FOR UPDATE TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'hod') 
        OR (public.get_current_user_role() = 'teacher' AND teacher_id = auth.uid())
    )
    WITH CHECK (
        -- DEF-104: teacher_id cannot be spoofed to another teacher during session updates
        public.get_current_user_role() IN ('admin', 'principal', 'hod')
        OR (public.get_current_user_role() = 'teacher' AND teacher_id = auth.uid())
    );

CREATE POLICY "att_sessions_delete" ON public.class_attendance_sessions
    FOR DELETE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'hod'));

-- =============================================================================
-- 3. STUDENT ATTENDANCE RECORDS POLICIES (DEF-008 & DEF-104)
-- Enforces class enrollment validation and parent-student relationship verification
-- =============================================================================
CREATE POLICY "att_records_select" ON public.student_attendance_records
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'teacher', 'hod', 'coe')
        OR student_id = auth.uid()
        OR public.is_parent_of(student_id)
    );

CREATE POLICY "att_records_insert" ON public.student_attendance_records
    FOR INSERT TO authenticated
    WITH CHECK (
        (
            public.get_current_user_role() IN ('admin', 'principal', 'hod')
            OR (
                public.get_current_user_role() = 'teacher' 
                AND EXISTS (
                    SELECT 1 FROM public.class_attendance_sessions s 
                    WHERE s.id = session_id AND s.teacher_id = auth.uid()
                )
            )
        )
        -- DEF-104: Student enrollment validation (must belong to the session class/department)
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.class_attendance_sessions s ON s.id = session_id
            WHERE p.id = student_id 
              AND p.role = 'student'
              AND (p.class_name = s.class_name OR p.department = s.department)
        )
    );

CREATE POLICY "att_records_update" ON public.student_attendance_records
    FOR UPDATE TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'hod')
        OR (
            public.get_current_user_role() = 'teacher' 
            AND EXISTS (
                SELECT 1 FROM public.class_attendance_sessions s 
                WHERE s.id = session_id AND s.teacher_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        public.get_current_user_role() IN ('admin', 'principal', 'hod')
        OR (
            public.get_current_user_role() = 'teacher' 
            AND EXISTS (
                SELECT 1 FROM public.class_attendance_sessions s 
                WHERE s.id = session_id AND s.teacher_id = auth.uid()
            )
        )
    );

CREATE POLICY "att_records_delete" ON public.student_attendance_records
    FOR DELETE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'hod'));

-- =============================================================================
-- 4. STAFF PAYROLL RUNS & ITEMS POLICIES
-- Strict salary slip and disbursement privacy
-- =============================================================================
CREATE POLICY "payroll_runs_select" ON public.staff_payroll_runs
    FOR SELECT TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'hr_manager', 'finance_manager', 'accountant', 'financier'));

CREATE POLICY "payroll_runs_write" ON public.staff_payroll_runs
    FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'hr_manager', 'finance_manager'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'hr_manager', 'finance_manager'));

CREATE POLICY "payroll_items_select" ON public.staff_payroll_items
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'hr_manager', 'finance_manager', 'accountant', 'financier')
        OR user_id = auth.uid()
    );

CREATE POLICY "payroll_items_write" ON public.staff_payroll_items
    FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'hr_manager', 'finance_manager'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'hr_manager', 'finance_manager'));

-- =============================================================================
-- 5. STAFF LEAVE BALANCES & APPLICATIONS POLICIES
-- =============================================================================
CREATE POLICY "leave_balances_select" ON public.staff_leave_balances
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'hr_manager')
        OR user_id = auth.uid()
    );

CREATE POLICY "leave_balances_write" ON public.staff_leave_balances
    FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'hr_manager'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'hr_manager'));

CREATE POLICY "leave_apps_select" ON public.staff_leave_applications
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'hr_manager', 'hod')
        OR user_id = auth.uid()
    );

CREATE POLICY "leave_apps_insert" ON public.staff_leave_applications
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() IN ('admin', 'principal', 'hr_manager')
        OR user_id = auth.uid()
    );

CREATE POLICY "leave_apps_update" ON public.staff_leave_applications
    FOR UPDATE TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'hr_manager', 'hod')
        OR (user_id = auth.uid() AND status = 'Pending')
    )
    WITH CHECK (
        public.get_current_user_role() IN ('admin', 'principal', 'hr_manager', 'hod')
        OR (user_id = auth.uid() AND status = 'Pending')
    );

CREATE POLICY "leave_apps_delete" ON public.staff_leave_applications
    FOR DELETE TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'hr_manager')
        OR (user_id = auth.uid() AND status = 'Pending')
    );

-- =============================================================================
-- 6. HALL TICKETS, FEE STRUCTURES & BROADCASTS POLICIES
-- =============================================================================
CREATE POLICY "hall_tickets_select" ON public.hall_tickets
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'coe', 'teacher', 'hod')
        OR student_id = auth.uid()
        OR public.is_parent_of(student_id)
    );

CREATE POLICY "hall_tickets_write" ON public.hall_tickets
    FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'coe'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'coe'));

CREATE POLICY "fee_structures_select" ON public.fee_structures
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "fee_structures_write" ON public.fee_structures
    FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'finance_manager'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'finance_manager'));

CREATE POLICY "broadcasts_select" ON public.institutional_broadcasts
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "broadcasts_write" ON public.institutional_broadcasts
    FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal'));

-- =============================================================================
-- 7. DEF-101: COMPREHENSIVE RLS POLICIES FOR 8 ERP MODULE TABLES
-- Replaces dropped permissive policies with granular role & ownership policies
-- =============================================================================

-- Table 1: fee_payment_reminders
CREATE POLICY "fee_reminders_select" ON public.fee_payment_reminders
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'finance_manager', 'accountant')
        OR student_id = auth.uid()
        OR public.is_parent_of(student_id)
    );

CREATE POLICY "fee_reminders_write" ON public.fee_payment_reminders
    FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'finance_manager', 'accountant'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'finance_manager', 'accountant'));

-- Table 2: fee_receipts
CREATE POLICY "fee_receipts_select" ON public.fee_receipts
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'finance_manager', 'accountant', 'financier')
        OR student_id = auth.uid()
        OR public.is_parent_of(student_id)
    );

CREATE POLICY "fee_receipts_insert" ON public.fee_receipts
    FOR INSERT TO authenticated
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'finance_manager', 'accountant'));

CREATE POLICY "fee_receipts_update" ON public.fee_receipts
    FOR UPDATE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'finance_manager', 'accountant'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'finance_manager', 'accountant'));

CREATE POLICY "fee_receipts_delete" ON public.fee_receipts
    FOR DELETE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'finance_manager'));

-- Table 3: scholarship_applications
CREATE POLICY "scholarship_apps_select" ON public.scholarship_applications
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'finance_manager', 'accountant')
        OR student_id = auth.uid()
        OR public.is_parent_of(student_id)
    );

CREATE POLICY "scholarship_apps_insert" ON public.scholarship_applications
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() IN ('admin', 'principal', 'finance_manager')
        OR (public.get_current_user_role() = 'student' AND student_id = auth.uid())
    );

CREATE POLICY "scholarship_apps_update" ON public.scholarship_applications
    FOR UPDATE TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'finance_manager', 'accountant')
        OR (student_id = auth.uid() AND status IN ('Draft', 'Submitted'))
    )
    WITH CHECK (
        public.get_current_user_role() IN ('admin', 'principal', 'finance_manager', 'accountant')
        OR (student_id = auth.uid() AND status IN ('Draft', 'Submitted'))
    );

CREATE POLICY "scholarship_apps_delete" ON public.scholarship_applications
    FOR DELETE TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'finance_manager')
        OR (student_id = auth.uid() AND status = 'Draft')
    );

-- Table 4: library_circulation
CREATE POLICY "library_circ_select" ON public.library_circulation
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'librarian')
        OR user_id = auth.uid()
    );

CREATE POLICY "library_circ_write" ON public.library_circulation
    FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'librarian'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'librarian'));

-- Table 5: hostel_rooms
CREATE POLICY "hostel_rooms_select" ON public.hostel_rooms
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "hostel_rooms_write" ON public.hostel_rooms
    FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'hostel_warden'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'hostel_warden'));

-- Table 6: hostel_out_passes
CREATE POLICY "hostel_out_passes_select" ON public.hostel_out_passes
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'hostel_warden', 'receptionist', 'transport_driver', 'driver')
        OR student_id = auth.uid()
        OR public.is_parent_of(student_id)
    );

CREATE POLICY "hostel_out_passes_insert" ON public.hostel_out_passes
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() IN ('admin', 'principal', 'hostel_warden')
        OR (public.get_current_user_role() = 'student' AND student_id = auth.uid())
    );

CREATE POLICY "hostel_out_passes_update" ON public.hostel_out_passes
    FOR UPDATE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'hostel_warden'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'hostel_warden'));

CREATE POLICY "hostel_out_passes_delete" ON public.hostel_out_passes
    FOR DELETE TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'hostel_warden')
        OR (student_id = auth.uid() AND status = 'Pending')
    );

-- Table 7: placement_drives
CREATE POLICY "placement_drives_select" ON public.placement_drives
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "placement_drives_write" ON public.placement_drives
    FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'placement_officer'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'placement_officer'));

-- Table 8: placement_applications
CREATE POLICY "placement_apps_select" ON public.placement_applications
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'placement_officer')
        OR student_id = auth.uid()
    );

CREATE POLICY "placement_apps_insert" ON public.placement_applications
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() IN ('admin', 'principal', 'placement_officer')
        OR (public.get_current_user_role() = 'student' AND student_id = auth.uid())
    );

CREATE POLICY "placement_apps_update" ON public.placement_applications
    FOR UPDATE TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'placement_officer')
        OR (student_id = auth.uid() AND status = 'Applied')
    )
    WITH CHECK (
        public.get_current_user_role() IN ('admin', 'principal', 'placement_officer')
        OR (student_id = auth.uid() AND status = 'Applied')
    );

CREATE POLICY "placement_apps_delete" ON public.placement_applications
    FOR DELETE TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'placement_officer')
        OR (student_id = auth.uid() AND status = 'Applied')
    );

-- =============================================================================
-- 8. STORAGE OBJECTS POLICIES (DEF-009 & DEF-102)
-- Strict folder-prefix isolation ((storage.foldername(name))[1] = auth.uid()::text)
-- and administrative privilege boundaries.
-- =============================================================================
CREATE POLICY "storage_objects_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'attachments'
        OR (
            bucket_id = 'documents' 
            AND (
                public.get_current_user_role() IN ('admin', 'principal', 'hr_manager', 'finance_manager', 'accountant')
                OR (storage.foldername(name))[1] = auth.uid()::text
            )
        )
        OR (
            bucket_id = 'student_documents' 
            AND (
                public.get_current_user_role() IN ('admin', 'principal', 'teacher', 'hod', 'coe')
                OR (storage.foldername(name))[1] = auth.uid()::text
                OR public.is_parent_of(((storage.foldername(name))[1])::uuid)
            )
        )
        OR (
            bucket_id = 'staff_documents' 
            AND (
                public.get_current_user_role() IN ('admin', 'principal', 'hr_manager')
                OR (storage.foldername(name))[1] = auth.uid()::text
            )
        )
    );

CREATE POLICY "storage_objects_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'attachments'
        OR (
            bucket_id = 'documents' 
            AND (
                public.get_current_user_role() IN ('admin', 'principal', 'hr_manager', 'finance_manager')
                OR (storage.foldername(name))[1] = auth.uid()::text
            )
        )
        OR (
            bucket_id = 'student_documents' 
            AND (
                public.get_current_user_role() IN ('admin', 'principal')
                OR (storage.foldername(name))[1] = auth.uid()::text
            )
        )
        OR (
            bucket_id = 'staff_documents' 
            AND (
                public.get_current_user_role() IN ('admin', 'principal', 'hr_manager')
                OR (storage.foldername(name))[1] = auth.uid()::text
            )
        )
    );

CREATE POLICY "storage_objects_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.get_current_user_role() IN ('admin', 'principal')
    )
    WITH CHECK (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.get_current_user_role() IN ('admin', 'principal')
    );

CREATE POLICY "storage_objects_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.get_current_user_role() = 'admin'
    );

COMMIT;
