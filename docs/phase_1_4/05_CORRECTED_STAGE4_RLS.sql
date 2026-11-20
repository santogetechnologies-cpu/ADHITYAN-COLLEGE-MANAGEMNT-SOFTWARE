-- =============================================================================
-- Migration Script: 028_stage4_rls.sql (Phase 1.4 Corrected Release)
-- Description: Zero-trust RLS hardening, complete ERP coverage & storage isolation
-- Architecture: Single-Institution Dedicated Deployment (Adhityan College)
-- Target Database: PostgreSQL 15+ (Supabase Managed Instance: ogbbyqxulhegwvrtinib.supabase.co)
-- Defects Remediated: DEF-007 (legacy drops), DEF-008 (attendance RLS),
--                     DEF-009 & DEF-111 (storage bucket filter, safe UUID cast, attachments prefix),
--                     DEF-101 (complete granular ERP CRUD), DEF-102 (documents bucket private),
--                     DEF-104 (teacher-class assignment check & exact class enrollment check),
--                     DEF-112 (explicit table-level GRANT statements & unbundled CRUD policies)
-- Safety Safeguards: Strict lock_timeout (3s) and statement_timeout (10s)
-- Mode: Static Engineering Specification (Zero Live Execution)
-- =============================================================================

SET lock_timeout = '3s';
SET statement_timeout = '10s';

BEGIN;

-- =============================================================================
-- 0. DEF-102: STORAGE BUCKET PRIVACY REMEDIATION
-- =============================================================================
UPDATE storage.buckets 
SET public = false 
WHERE id = 'documents';

-- =============================================================================
-- 1. DEF-112: EXPLICIT TABLE-LEVEL GRANTS FOR AUTHENTICATED USERS
-- PostgreSQL requires table-level privilege grants before RLS evaluation can proceed
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_attendance_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_attendance_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_payroll_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_payroll_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_leave_balances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_leave_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hall_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_structures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.institutional_broadcasts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_payment_reminders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_receipts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scholarship_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_circulation TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hostel_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hostel_out_passes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.placement_drives TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.placement_applications TO authenticated;

-- =============================================================================
-- 2. DROP ALL 24 LEGACY PERMISSIVE POLICIES
-- =============================================================================
DROP POLICY IF EXISTS "Public read access for documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;

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

DROP POLICY IF EXISTS "fee_reminders_all" ON public.fee_payment_reminders;
DROP POLICY IF EXISTS "fee_receipts_all" ON public.fee_receipts;
DROP POLICY IF EXISTS "scholarship_apps_all" ON public.scholarship_applications;
DROP POLICY IF EXISTS "library_circ_all" ON public.library_circulation;
DROP POLICY IF EXISTS "hostel_rooms_all" ON public.hostel_rooms;
DROP POLICY IF EXISTS "hostel_out_passes_all" ON public.hostel_out_passes;
DROP POLICY IF EXISTS "placement_drives_all" ON public.placement_drives;
DROP POLICY IF EXISTS "placement_apps_all" ON public.placement_applications;

-- =============================================================================
-- 3. CLASS ATTENDANCE SESSIONS POLICIES (DEF-104)
-- =============================================================================
DROP POLICY IF EXISTS "att_sessions_select" ON public.class_attendance_sessions;
CREATE POLICY "att_sessions_select" ON public.class_attendance_sessions
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'hod', 'coe')
        OR (
            public.get_current_user_role() = 'teacher'
            AND (
                teacher_id = auth.uid()
                OR public.is_teacher_assigned_to_class(auth.uid(), class_name)
            )
        )
    );

DROP POLICY IF EXISTS "att_sessions_insert" ON public.class_attendance_sessions;
CREATE POLICY "att_sessions_insert" ON public.class_attendance_sessions
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() IN ('admin', 'principal', 'hod') 
        OR (
            public.get_current_user_role() = 'teacher' 
            AND teacher_id = auth.uid()
            AND public.is_teacher_assigned_to_class(auth.uid(), class_name)
        )
    );

DROP POLICY IF EXISTS "att_sessions_update" ON public.class_attendance_sessions;
CREATE POLICY "att_sessions_update" ON public.class_attendance_sessions
    FOR UPDATE TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'hod') 
        OR (
            public.get_current_user_role() = 'teacher' 
            AND teacher_id = auth.uid()
            AND public.is_teacher_assigned_to_class(auth.uid(), class_name)
        )
    )
    WITH CHECK (
        public.get_current_user_role() IN ('admin', 'principal', 'hod')
        OR (
            public.get_current_user_role() = 'teacher' 
            AND teacher_id = auth.uid()
            AND public.is_teacher_assigned_to_class(auth.uid(), class_name)
        )
    );

DROP POLICY IF EXISTS "att_sessions_delete" ON public.class_attendance_sessions;
CREATE POLICY "att_sessions_delete" ON public.class_attendance_sessions
    FOR DELETE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'hod'));

-- =============================================================================
-- 4. STUDENT ATTENDANCE RECORDS POLICIES (DEF-104)
-- =============================================================================
DROP POLICY IF EXISTS "att_records_select" ON public.student_attendance_records;
CREATE POLICY "att_records_select" ON public.student_attendance_records
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'hod', 'coe')
        OR (
            public.get_current_user_role() = 'teacher'
            AND EXISTS (
                SELECT 1 FROM public.class_attendance_sessions s 
                WHERE s.id = session_id 
                  AND (s.teacher_id = auth.uid() OR public.is_teacher_assigned_to_class(auth.uid(), s.class_name))
            )
        )
        OR student_id = auth.uid()
        OR public.is_parent_of(student_id)
    );

DROP POLICY IF EXISTS "att_records_insert" ON public.student_attendance_records;
CREATE POLICY "att_records_insert" ON public.student_attendance_records
    FOR INSERT TO authenticated
    WITH CHECK (
        (
            public.get_current_user_role() IN ('admin', 'principal', 'hod')
            OR (
                public.get_current_user_role() = 'teacher' 
                AND EXISTS (
                    SELECT 1 FROM public.class_attendance_sessions s 
                    WHERE s.id = session_id 
                      AND s.teacher_id = auth.uid()
                      AND public.is_teacher_assigned_to_class(auth.uid(), s.class_name)
                )
            )
        )
        -- DEF-104: Strict exact class enrollment verification (eliminates broad OR)
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.class_attendance_sessions s ON s.id = session_id
            WHERE p.id = student_id 
              AND p.role = 'student'
              AND p.class_name = s.class_name
              AND (s.department IS NULL OR s.department = '' OR p.department = s.department)
        )
    );

DROP POLICY IF EXISTS "att_records_update" ON public.student_attendance_records;
CREATE POLICY "att_records_update" ON public.student_attendance_records
    FOR UPDATE TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'hod')
        OR (
            public.get_current_user_role() = 'teacher' 
            AND EXISTS (
                SELECT 1 FROM public.class_attendance_sessions s 
                WHERE s.id = session_id 
                  AND s.teacher_id = auth.uid()
                  AND public.is_teacher_assigned_to_class(auth.uid(), s.class_name)
            )
        )
    )
    WITH CHECK (
        (
            public.get_current_user_role() IN ('admin', 'principal', 'hod')
            OR (
                public.get_current_user_role() = 'teacher' 
                AND EXISTS (
                    SELECT 1 FROM public.class_attendance_sessions s 
                    WHERE s.id = session_id 
                      AND s.teacher_id = auth.uid()
                      AND public.is_teacher_assigned_to_class(auth.uid(), s.class_name)
                )
            )
        )
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.class_attendance_sessions s ON s.id = session_id
            WHERE p.id = student_id 
              AND p.role = 'student'
              AND p.class_name = s.class_name
              AND (s.department IS NULL OR s.department = '' OR p.department = s.department)
        )
    );

DROP POLICY IF EXISTS "att_records_delete" ON public.student_attendance_records;
CREATE POLICY "att_records_delete" ON public.student_attendance_records
    FOR DELETE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'hod'));

-- =============================================================================
-- 5. STAFF PAYROLL RUNS & ITEMS (DEF-112: Unbundled Granular CRUD)
-- =============================================================================
DROP POLICY IF EXISTS "payroll_runs_select" ON public.staff_payroll_runs;
CREATE POLICY "payroll_runs_select" ON public.staff_payroll_runs
    FOR SELECT TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'hr_manager', 'finance_manager', 'accountant', 'financier'));

DROP POLICY IF EXISTS "payroll_runs_insert" ON public.staff_payroll_runs;
CREATE POLICY "payroll_runs_insert" ON public.staff_payroll_runs
    FOR INSERT TO authenticated
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'hr_manager', 'finance_manager'));

DROP POLICY IF EXISTS "payroll_runs_update" ON public.staff_payroll_runs;
CREATE POLICY "payroll_runs_update" ON public.staff_payroll_runs
    FOR UPDATE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'hr_manager', 'finance_manager'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'hr_manager', 'finance_manager'));

DROP POLICY IF EXISTS "payroll_runs_delete" ON public.staff_payroll_runs;
CREATE POLICY "payroll_runs_delete" ON public.staff_payroll_runs
    FOR DELETE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'finance_manager'));

-- Payroll Items
DROP POLICY IF EXISTS "payroll_items_select" ON public.staff_payroll_items;
CREATE POLICY "payroll_items_select" ON public.staff_payroll_items
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'hr_manager', 'finance_manager', 'accountant', 'financier')
        OR user_id = auth.uid()
    );

DROP POLICY IF EXISTS "payroll_items_insert" ON public.staff_payroll_items;
CREATE POLICY "payroll_items_insert" ON public.staff_payroll_items
    FOR INSERT TO authenticated
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'hr_manager', 'finance_manager'));

DROP POLICY IF EXISTS "payroll_items_update" ON public.staff_payroll_items;
CREATE POLICY "payroll_items_update" ON public.staff_payroll_items
    FOR UPDATE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'hr_manager', 'finance_manager'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'hr_manager', 'finance_manager'));

DROP POLICY IF EXISTS "payroll_items_delete" ON public.staff_payroll_items;
CREATE POLICY "payroll_items_delete" ON public.staff_payroll_items
    FOR DELETE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'finance_manager'));

-- =============================================================================
-- 6. STAFF LEAVE BALANCES & APPLICATIONS (Unbundled Granular CRUD)
-- =============================================================================
DROP POLICY IF EXISTS "leave_balances_select" ON public.staff_leave_balances;
CREATE POLICY "leave_balances_select" ON public.staff_leave_balances
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'hr_manager')
        OR user_id = auth.uid()
    );

DROP POLICY IF EXISTS "leave_balances_insert" ON public.staff_leave_balances;
CREATE POLICY "leave_balances_insert" ON public.staff_leave_balances
    FOR INSERT TO authenticated
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'hr_manager'));

DROP POLICY IF EXISTS "leave_balances_update" ON public.staff_leave_balances;
CREATE POLICY "leave_balances_update" ON public.staff_leave_balances
    FOR UPDATE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'hr_manager'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'hr_manager'));

DROP POLICY IF EXISTS "leave_balances_delete" ON public.staff_leave_balances;
CREATE POLICY "leave_balances_delete" ON public.staff_leave_balances
    FOR DELETE TO authenticated
    USING (public.get_current_user_role() = 'admin');

-- Applications
DROP POLICY IF EXISTS "leave_apps_select" ON public.staff_leave_applications;
CREATE POLICY "leave_apps_select" ON public.staff_leave_applications
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'hr_manager', 'hod')
        OR user_id = auth.uid()
    );

DROP POLICY IF EXISTS "leave_apps_insert" ON public.staff_leave_applications;
CREATE POLICY "leave_apps_insert" ON public.staff_leave_applications
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() IN ('admin', 'principal', 'hr_manager')
        OR user_id = auth.uid()
    );

DROP POLICY IF EXISTS "leave_apps_update" ON public.staff_leave_applications;
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

DROP POLICY IF EXISTS "leave_apps_delete" ON public.staff_leave_applications;
CREATE POLICY "leave_apps_delete" ON public.staff_leave_applications
    FOR DELETE TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'hr_manager')
        OR (user_id = auth.uid() AND status = 'Pending')
    );

-- =============================================================================
-- 7. HALL TICKETS, FEE STRUCTURES & BROADCASTS
-- =============================================================================
DROP POLICY IF EXISTS "hall_tickets_select" ON public.hall_tickets;
CREATE POLICY "hall_tickets_select" ON public.hall_tickets
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'coe', 'teacher', 'hod')
        OR student_id = auth.uid()
        OR public.is_parent_of(student_id)
    );

DROP POLICY IF EXISTS "hall_tickets_insert" ON public.hall_tickets;
CREATE POLICY "hall_tickets_insert" ON public.hall_tickets
    FOR INSERT TO authenticated
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'coe'));

DROP POLICY IF EXISTS "hall_tickets_update" ON public.hall_tickets;
CREATE POLICY "hall_tickets_update" ON public.hall_tickets
    FOR UPDATE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'coe'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'coe'));

DROP POLICY IF EXISTS "hall_tickets_delete" ON public.hall_tickets;
CREATE POLICY "hall_tickets_delete" ON public.hall_tickets
    FOR DELETE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'coe'));

-- Fee structures
DROP POLICY IF EXISTS "fee_structures_select" ON public.fee_structures;
CREATE POLICY "fee_structures_select" ON public.fee_structures
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "fee_structures_insert" ON public.fee_structures;
CREATE POLICY "fee_structures_insert" ON public.fee_structures
    FOR INSERT TO authenticated
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'finance_manager'));

DROP POLICY IF EXISTS "fee_structures_update" ON public.fee_structures;
CREATE POLICY "fee_structures_update" ON public.fee_structures
    FOR UPDATE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'finance_manager'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'finance_manager'));

DROP POLICY IF EXISTS "fee_structures_delete" ON public.fee_structures;
CREATE POLICY "fee_structures_delete" ON public.fee_structures
    FOR DELETE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'finance_manager'));

-- Broadcasts
DROP POLICY IF EXISTS "broadcasts_select" ON public.institutional_broadcasts;
CREATE POLICY "broadcasts_select" ON public.institutional_broadcasts
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "broadcasts_insert" ON public.institutional_broadcasts;
CREATE POLICY "broadcasts_insert" ON public.institutional_broadcasts
    FOR INSERT TO authenticated
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal'));

DROP POLICY IF EXISTS "broadcasts_update" ON public.institutional_broadcasts;
CREATE POLICY "broadcasts_update" ON public.institutional_broadcasts
    FOR UPDATE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal'));

DROP POLICY IF EXISTS "broadcasts_delete" ON public.institutional_broadcasts;
CREATE POLICY "broadcasts_delete" ON public.institutional_broadcasts
    FOR DELETE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal'));

-- =============================================================================
-- 8. DEF-101: 8 ERP MODULE TABLES (Unbundled Granular CRUD)
-- =============================================================================

-- Table 1: fee_payment_reminders
DROP POLICY IF EXISTS "fee_reminders_select" ON public.fee_payment_reminders;
CREATE POLICY "fee_reminders_select" ON public.fee_payment_reminders
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'finance_manager', 'accountant')
        OR student_id = auth.uid()
        OR public.is_parent_of(student_id)
    );

DROP POLICY IF EXISTS "fee_reminders_insert" ON public.fee_payment_reminders;
CREATE POLICY "fee_reminders_insert" ON public.fee_payment_reminders
    FOR INSERT TO authenticated
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'finance_manager', 'accountant'));

DROP POLICY IF EXISTS "fee_reminders_update" ON public.fee_payment_reminders;
CREATE POLICY "fee_reminders_update" ON public.fee_payment_reminders
    FOR UPDATE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'finance_manager', 'accountant'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'finance_manager', 'accountant'));

DROP POLICY IF EXISTS "fee_reminders_delete" ON public.fee_payment_reminders;
CREATE POLICY "fee_reminders_delete" ON public.fee_payment_reminders
    FOR DELETE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'finance_manager'));

-- Table 2: fee_receipts
DROP POLICY IF EXISTS "fee_receipts_select" ON public.fee_receipts;
CREATE POLICY "fee_receipts_select" ON public.fee_receipts
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'finance_manager', 'accountant', 'financier')
        OR student_id = auth.uid()
        OR public.is_parent_of(student_id)
    );

DROP POLICY IF EXISTS "fee_receipts_insert" ON public.fee_receipts;
CREATE POLICY "fee_receipts_insert" ON public.fee_receipts
    FOR INSERT TO authenticated
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'finance_manager', 'accountant'));

DROP POLICY IF EXISTS "fee_receipts_update" ON public.fee_receipts;
CREATE POLICY "fee_receipts_update" ON public.fee_receipts
    FOR UPDATE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'finance_manager', 'accountant'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'finance_manager', 'accountant'));

DROP POLICY IF EXISTS "fee_receipts_delete" ON public.fee_receipts;
CREATE POLICY "fee_receipts_delete" ON public.fee_receipts
    FOR DELETE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'finance_manager'));

-- Table 3: scholarship_applications
DROP POLICY IF EXISTS "scholarship_apps_select" ON public.scholarship_applications;
CREATE POLICY "scholarship_apps_select" ON public.scholarship_applications
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'finance_manager', 'accountant')
        OR student_id = auth.uid()
        OR public.is_parent_of(student_id)
    );

DROP POLICY IF EXISTS "scholarship_apps_insert" ON public.scholarship_applications;
CREATE POLICY "scholarship_apps_insert" ON public.scholarship_applications
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() IN ('admin', 'principal', 'finance_manager')
        OR (public.get_current_user_role() = 'student' AND student_id = auth.uid())
    );

DROP POLICY IF EXISTS "scholarship_apps_update" ON public.scholarship_applications;
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

DROP POLICY IF EXISTS "scholarship_apps_delete" ON public.scholarship_applications;
CREATE POLICY "scholarship_apps_delete" ON public.scholarship_applications
    FOR DELETE TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'finance_manager')
        OR (student_id = auth.uid() AND status = 'Draft')
    );

-- Table 4: library_circulation
DROP POLICY IF EXISTS "library_circ_select" ON public.library_circulation;
CREATE POLICY "library_circ_select" ON public.library_circulation
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'librarian')
        OR user_id = auth.uid()
    );

DROP POLICY IF EXISTS "library_circ_insert" ON public.library_circulation;
CREATE POLICY "library_circ_insert" ON public.library_circulation
    FOR INSERT TO authenticated
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'librarian'));

DROP POLICY IF EXISTS "library_circ_update" ON public.library_circulation;
CREATE POLICY "library_circ_update" ON public.library_circulation
    FOR UPDATE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'librarian'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'librarian'));

DROP POLICY IF EXISTS "library_circ_delete" ON public.library_circulation;
CREATE POLICY "library_circ_delete" ON public.library_circulation
    FOR DELETE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'librarian'));

-- Table 5: hostel_rooms
DROP POLICY IF EXISTS "hostel_rooms_select" ON public.hostel_rooms;
CREATE POLICY "hostel_rooms_select" ON public.hostel_rooms
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "hostel_rooms_insert" ON public.hostel_rooms;
CREATE POLICY "hostel_rooms_insert" ON public.hostel_rooms
    FOR INSERT TO authenticated
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'hostel_warden'));

DROP POLICY IF EXISTS "hostel_rooms_update" ON public.hostel_rooms;
CREATE POLICY "hostel_rooms_update" ON public.hostel_rooms
    FOR UPDATE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'hostel_warden'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'hostel_warden'));

DROP POLICY IF EXISTS "hostel_rooms_delete" ON public.hostel_rooms;
CREATE POLICY "hostel_rooms_delete" ON public.hostel_rooms
    FOR DELETE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'hostel_warden'));

-- Table 6: hostel_out_passes
DROP POLICY IF EXISTS "hostel_out_passes_select" ON public.hostel_out_passes;
CREATE POLICY "hostel_out_passes_select" ON public.hostel_out_passes
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'hostel_warden', 'receptionist', 'transport_driver', 'driver')
        OR student_id = auth.uid()
        OR public.is_parent_of(student_id)
    );

DROP POLICY IF EXISTS "hostel_out_passes_insert" ON public.hostel_out_passes;
CREATE POLICY "hostel_out_passes_insert" ON public.hostel_out_passes
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() IN ('admin', 'principal', 'hostel_warden')
        OR (public.get_current_user_role() = 'student' AND student_id = auth.uid())
    );

DROP POLICY IF EXISTS "hostel_out_passes_update" ON public.hostel_out_passes;
CREATE POLICY "hostel_out_passes_update" ON public.hostel_out_passes
    FOR UPDATE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'hostel_warden'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'hostel_warden'));

DROP POLICY IF EXISTS "hostel_out_passes_delete" ON public.hostel_out_passes;
CREATE POLICY "hostel_out_passes_delete" ON public.hostel_out_passes
    FOR DELETE TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'hostel_warden')
        OR (student_id = auth.uid() AND status = 'Pending')
    );

-- Table 7: placement_drives
DROP POLICY IF EXISTS "placement_drives_select" ON public.placement_drives;
CREATE POLICY "placement_drives_select" ON public.placement_drives
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "placement_drives_insert" ON public.placement_drives;
CREATE POLICY "placement_drives_insert" ON public.placement_drives
    FOR INSERT TO authenticated
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'placement_officer'));

DROP POLICY IF EXISTS "placement_drives_update" ON public.placement_drives;
CREATE POLICY "placement_drives_update" ON public.placement_drives
    FOR UPDATE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'placement_officer'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'placement_officer'));

DROP POLICY IF EXISTS "placement_drives_delete" ON public.placement_drives;
CREATE POLICY "placement_drives_delete" ON public.placement_drives
    FOR DELETE TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'placement_officer'));

-- Table 8: placement_applications
DROP POLICY IF EXISTS "placement_apps_select" ON public.placement_applications;
CREATE POLICY "placement_apps_select" ON public.placement_applications
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'placement_officer')
        OR student_id = auth.uid()
    );

DROP POLICY IF EXISTS "placement_apps_insert" ON public.placement_applications;
CREATE POLICY "placement_apps_insert" ON public.placement_applications
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() IN ('admin', 'principal', 'placement_officer')
        OR (public.get_current_user_role() = 'student' AND student_id = auth.uid())
    );

DROP POLICY IF EXISTS "placement_apps_update" ON public.placement_applications;
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

DROP POLICY IF EXISTS "placement_apps_delete" ON public.placement_applications;
CREATE POLICY "placement_apps_delete" ON public.placement_applications
    FOR DELETE TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'placement_officer')
        OR (student_id = auth.uid() AND status = 'Applied')
    );

-- =============================================================================
-- 9. STORAGE OBJECTS POLICIES (DEF-009 & DEF-111)
-- Restricts UPDATE & DELETE to approved bucket IDs, prevents syntax error crashes
-- via safe_cast_uuid, and enforces folder prefix on attachments.
-- =============================================================================
DROP POLICY IF EXISTS "storage_objects_select" ON storage.objects;
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
                OR (
                    public.safe_cast_uuid((storage.foldername(name))[1]) IS NOT NULL 
                    AND public.is_parent_of(public.safe_cast_uuid((storage.foldername(name))[1]))
                )
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

DROP POLICY IF EXISTS "storage_objects_insert" ON storage.objects;
CREATE POLICY "storage_objects_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        (
            bucket_id = 'attachments'
            AND (
                (storage.foldername(name))[1] = auth.uid()::text
                OR public.get_current_user_role() IN ('admin', 'principal', 'teacher')
            )
        )
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

DROP POLICY IF EXISTS "storage_objects_update" ON storage.objects;
CREATE POLICY "storage_objects_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id IN ('documents', 'student_documents', 'staff_documents', 'attachments')
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.get_current_user_role() IN ('admin', 'principal')
        )
    )
    WITH CHECK (
        bucket_id IN ('documents', 'student_documents', 'staff_documents', 'attachments')
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.get_current_user_role() IN ('admin', 'principal')
        )
    );

DROP POLICY IF EXISTS "storage_objects_delete" ON storage.objects;
CREATE POLICY "storage_objects_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id IN ('documents', 'student_documents', 'staff_documents', 'attachments')
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.get_current_user_role() = 'admin'
        )
    );

COMMIT;
