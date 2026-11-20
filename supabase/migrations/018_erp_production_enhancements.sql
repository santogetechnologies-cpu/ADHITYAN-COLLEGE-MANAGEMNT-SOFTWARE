-- =============================================================================
-- Migration: 018_erp_production_enhancements.sql
-- Description: RPC functions for transactional operations (library issue/return,
--              store checkout stock decrement, exam publishing, aggregate stats),
--              and RLS hardening for sensitive medical and parent-student links.
-- =============================================================================

-- 1. PARENT-STUDENT LINKS TABLE (if not already existing)
CREATE TABLE IF NOT EXISTS public.parent_student_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL DEFAULT 'Parent',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_parent_student UNIQUE (parent_id, student_id)
);

ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents can view linked students" ON public.parent_student_links;
CREATE POLICY "Parents can view linked students"
    ON public.parent_student_links FOR SELECT
    TO authenticated
    USING (parent_id = auth.uid() OR public.get_current_user_role() IN ('admin', 'principal', 'teacher'));

DROP POLICY IF EXISTS "Admins can manage parent links" ON public.parent_student_links;
CREATE POLICY "Admins can manage parent links"
    ON public.parent_student_links FOR ALL
    TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal'));

-- 2. ATOMIC LIBRARY ISSUE BOOK TRANSACTION
CREATE OR REPLACE FUNCTION public.issue_library_book(
    p_book_id UUID,
    p_student_id UUID,
    p_due_date DATE
)
RETURNS JSONB AS $$
DECLARE
    v_available INTEGER;
    v_issue_id UUID;
BEGIN
    -- Check copy availability with row lock
    SELECT copies_available INTO v_available
    FROM public.library_books
    WHERE id = p_book_id
    FOR UPDATE;

    IF v_available IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Book not found.');
    END IF;

    IF v_available <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No copies currently available for issue.');
    END IF;

    -- Decrement available copy count
    UPDATE public.library_books
    SET copies_available = copies_available - 1,
        updated_at = NOW()
    WHERE id = p_book_id;

    -- Record issue entry
    INSERT INTO public.book_issues (
        book_id,
        student_id,
        issue_date,
        due_date,
        status
    )
    VALUES (
        p_book_id,
        p_student_id,
        CURRENT_DATE,
        p_due_date,
        'issued'
    )
    RETURNING id INTO v_issue_id;

    RETURN jsonb_build_object(
        'success', true,
        'issue_id', v_issue_id,
        'remaining_copies', v_available - 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ATOMIC LIBRARY RETURN BOOK TRANSACTION
CREATE OR REPLACE FUNCTION public.return_library_book(
    p_issue_id UUID,
    p_fine_amount NUMERIC DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_book_id UUID;
    v_status TEXT;
BEGIN
    SELECT book_id, status INTO v_book_id, v_status
    FROM public.book_issues
    WHERE id = p_issue_id
    FOR UPDATE;

    IF v_book_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Issue record not found.');
    END IF;

    IF v_status = 'returned' THEN
        RETURN jsonb_build_object('success', false, 'error', 'This book has already been returned.');
    END IF;

    -- Update issue status
    UPDATE public.book_issues
    SET return_date = CURRENT_DATE,
        fine_amount = COALESCE(p_fine_amount, 0),
        status = 'returned',
        updated_at = NOW()
    WHERE id = p_issue_id;

    -- Increment available copies in catalog
    UPDATE public.library_books
    SET copies_available = copies_available + 1,
        updated_at = NOW()
    WHERE id = v_book_id;

    RETURN jsonb_build_object('success', true, 'message', 'Book returned successfully.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ATOMIC CAMPUS STORE CHECKOUT & STOCK DECREMENT
CREATE OR REPLACE FUNCTION public.checkout_store_order(
    p_student_id UUID,
    p_items JSONB,
    p_total_amount NUMERIC
)
RETURNS JSONB AS $$
DECLARE
    v_order_id UUID;
    v_item RECORD;
    v_product_id UUID;
    v_qty INTEGER;
    v_current_stock INTEGER;
    v_product_name TEXT;
BEGIN
    -- Verify stock for every line item first
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER)
    LOOP
        v_product_id := v_item.product_id;
        v_qty := v_item.quantity;

        SELECT stock, name INTO v_current_stock, v_product_name
        FROM public.store_products
        WHERE id = v_product_id
        FOR UPDATE;

        IF v_current_stock IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Product ' || v_product_id || ' not found.');
        END IF;

        IF v_current_stock < v_qty THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Insufficient stock for "' || v_product_name || '". Available: ' || v_current_stock || ', Requested: ' || v_qty
            );
        END IF;
    END LOOP;

    -- Create order record
    INSERT INTO public.store_orders (
        student_id,
        total_amount,
        status,
        created_at,
        updated_at
    )
    VALUES (
        p_student_id,
        p_total_amount,
        'placed',
        NOW(),
        NOW()
    )
    RETURNING id INTO v_order_id;

    -- Decrement stock atomically
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER)
    LOOP
        UPDATE public.store_products
        SET stock = stock - v_item.quantity,
            updated_at = NOW()
        WHERE id = v_item.product_id;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'message', 'Order placed and stock reserved successfully.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ADMIN OVERVIEW REAL-TIME AGGREGATES RPC
CREATE OR REPLACE FUNCTION public.get_admin_overview_stats()
RETURNS JSONB AS $$
DECLARE
    v_total_users BIGINT;
    v_active_students BIGINT;
    v_parent_accounts BIGINT;
    v_total_teachers BIGINT;
    v_total_courses BIGINT;
    v_total_orders BIGINT;
    v_total_revenue NUMERIC;
    v_active_buses BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_total_users FROM public.profiles;
    SELECT COUNT(*) INTO v_active_students FROM public.profiles WHERE role = 'student' AND (status = 'active' OR status IS NULL);
    SELECT COUNT(*) INTO v_parent_accounts FROM public.profiles WHERE role = 'parent';
    SELECT COUNT(*) INTO v_total_teachers FROM public.profiles WHERE role = 'teacher';
    SELECT COUNT(*) INTO v_total_courses FROM public.departments;
    SELECT COUNT(*) INTO v_total_orders FROM public.store_orders;
    SELECT COALESCE(SUM(amount), 0) INTO v_total_revenue FROM public.finance_transactions WHERE transaction_type = 'income';
    SELECT COUNT(*) INTO v_active_buses FROM public.transport_vehicles WHERE status = 'active';

    RETURN jsonb_build_object(
        'totalUsers', v_total_users,
        'activeStudents', v_active_students,
        'parentAccounts', v_parent_accounts,
        'totalTeachers', v_total_teachers,
        'totalCourses', v_total_courses,
        'totalOrders', v_total_orders,
        'totalRevenue', v_total_revenue,
        'activeBuses', v_active_buses
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 6. MEDICAL RECORDS RLS HARDENING
-- Only healthcare staff, admins, and the student's own registered parent can view medical history
DROP POLICY IF EXISTS "Medical records privacy policy" ON public.health_records;
CREATE POLICY "Medical records privacy policy"
    ON public.health_records FOR SELECT
    TO authenticated
    USING (
        student_id = auth.uid() OR
        public.get_current_user_role() IN ('admin', 'principal') OR
        EXISTS (
            SELECT 1 FROM public.parent_student_links
            WHERE parent_id = auth.uid() AND student_id = public.health_records.student_id
        )
    );

DROP POLICY IF EXISTS "Infirmary visits privacy policy" ON public.infirmary_visits;
CREATE POLICY "Infirmary visits privacy policy"
    ON public.infirmary_visits FOR SELECT
    TO authenticated
    USING (
        student_id = auth.uid() OR
        public.get_current_user_role() IN ('admin', 'principal') OR
        EXISTS (
            SELECT 1 FROM public.parent_student_links
            WHERE parent_id = auth.uid() AND student_id = public.infirmary_visits.student_id
        )
    );

-- 7. EXAM RESULTS PUBLISHING RLS ENFORCEMENT
-- Students and parents see results only after exam is published
DROP POLICY IF EXISTS "Students can view own results and staff can view all" ON public.exam_results;
CREATE POLICY "Students can view own results and staff can view all"
    ON public.exam_results FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('admin', 'principal', 'teacher') OR
        (
            (student_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.parent_student_links
                WHERE parent_id = auth.uid() AND student_id = public.exam_results.student_id
            )) AND (
                EXISTS (
                    SELECT 1 FROM public.exams
                    WHERE id = public.exam_results.exam_id AND (status = 'published' OR is_published = true)
                )
            )
        )
    );

