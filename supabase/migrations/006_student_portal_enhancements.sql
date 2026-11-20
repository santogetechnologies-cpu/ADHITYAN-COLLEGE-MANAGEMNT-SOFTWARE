-- =============================================================================
-- Migration 006: Student Portal Enhancements, Atomic Store Orders & RLS Hardening
-- =============================================================================

-- 1. AI CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'ai', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_user_created ON public.ai_chat_messages(user_id, created_at ASC);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own ai chat messages" ON public.ai_chat_messages;
CREATE POLICY "Users can manage own ai chat messages"
    ON public.ai_chat_messages FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 2. WELLNESS CHECKINS UNIQUE CONSTRAINT FOR SAFE UPSERT
CREATE UNIQUE INDEX IF NOT EXISTS idx_wellness_user_date_type 
    ON public.wellness_checkins(user_id, date, checkin_type);

-- 3. ATOMIC STORE ORDER PLACEMENT WITH STOCK VALIDATION
CREATE OR REPLACE FUNCTION public.place_store_order(
    p_user_id UUID,
    p_user_name TEXT,
    p_items JSONB,
    p_total_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item RECORD;
    v_product_id UUID;
    v_qty INT;
    v_available_stock INT;
    v_product_name TEXT;
    v_order_id UUID;
    v_order_result JSONB;
BEGIN
    -- Verify caller matches user_id or is privileged
    IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND public.get_current_user_role() NOT IN ('admin', 'store_manager', 'storekeeper')) THEN
        RAISE EXCEPTION 'Unauthorized order placement';
    END IF;

    -- Validate stock for each item atomically
    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(id UUID, name TEXT, quantity INT, price NUMERIC)
    LOOP
        v_product_id := item.id;
        v_qty := item.quantity;

        SELECT stock, name INTO v_available_stock, v_product_name
        FROM public.store_products
        WHERE id = v_product_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product % not found in store catalog.', item.name;
        END IF;

        IF v_available_stock < v_qty THEN
            RAISE EXCEPTION 'Insufficient stock for "%": % requested, but only % available.', v_product_name, v_qty, v_available_stock;
        END IF;

        -- Deduct stock
        UPDATE public.store_products
        SET stock = stock - v_qty,
            updated_at = NOW()
        WHERE id = v_product_id;
    END LOOP;

    -- Create store order record
    INSERT INTO public.store_orders (
        user_id,
        user_name,
        items,
        total_amount,
        status,
        created_at
    ) VALUES (
        p_user_id,
        p_user_name,
        p_items,
        p_total_amount,
        'Pending',
        NOW()
    )
    RETURNING id INTO v_order_id;

    SELECT to_jsonb(o.*) INTO v_order_result
    FROM public.store_orders o
    WHERE o.id = v_order_id;

    RETURN v_order_result;
END;
$$;

-- 4. HARDEN RLS POLICIES FOR STUDENT DATA PRIVACY

-- ASSIGNMENTS: Students only view assignments matching their enrolled class (or school-wide assignments)
DROP POLICY IF EXISTS "Authenticated can view assignments" ON public.assignments;
DROP POLICY IF EXISTS "Students can view class assignments" ON public.assignments;
CREATE POLICY "Students can view class assignments"
    ON public.assignments FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('teacher', 'admin', 'principal')
        OR (SELECT class_name FROM public.profiles WHERE id = auth.uid()) = ANY(classes)
        OR classes = '{}'
        OR classes IS NULL
    );

-- EXAM SCHEDULES: Students only view exam schedules for their class or school-wide
DROP POLICY IF EXISTS "Authenticated can view exam schedules" ON public.exam_schedules;
DROP POLICY IF EXISTS "Students can view class exam schedules" ON public.exam_schedules;
CREATE POLICY "Students can view class exam schedules"
    ON public.exam_schedules FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('teacher', 'admin', 'principal')
        OR class_name = (SELECT class_name FROM public.profiles WHERE id = auth.uid())
        OR class_name IS NULL
    );

-- EXAM RESULTS: Students can ONLY view their own results
DROP POLICY IF EXISTS "Students can view own results and teachers can view all" ON public.exam_results;
DROP POLICY IF EXISTS "Students view own exam results" ON public.exam_results;
CREATE POLICY "Students view own exam results"
    ON public.exam_results FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.get_current_user_role() IN ('teacher', 'admin', 'principal')
    );

-- STUDENT TRANSPORT LOGS: Students only view their own transport logs
DROP POLICY IF EXISTS "Authenticated can view transport logs" ON public.student_transport_logs;
DROP POLICY IF EXISTS "Students view own transport logs" ON public.student_transport_logs;
CREATE POLICY "Students view own transport logs"
    ON public.student_transport_logs FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.get_current_user_role() IN ('driver', 'transport_driver', 'admin', 'principal')
    );

-- CONCERNS / COMPLAINTS: Restrict insertion to student's own ID
ALTER TABLE public.concerns ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Authenticated can submit concerns" ON public.concerns;
DROP POLICY IF EXISTS "Users can submit own concerns" ON public.concerns;
CREATE POLICY "Users can submit own concerns"
    ON public.concerns FOR INSERT TO authenticated
    WITH CHECK (
        (student_id IS NOT NULL AND student_id = auth.uid())
        OR (user_id IS NOT NULL AND user_id = auth.uid())
        OR is_anonymous = true
    );

DROP POLICY IF EXISTS "Users can view own concerns or admins can view all" ON public.concerns;
DROP POLICY IF EXISTS "Users view own concerns" ON public.concerns;
CREATE POLICY "Users view own concerns"
    ON public.concerns FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR user_id = auth.uid()
        OR public.get_current_user_role() IN ('admin', 'principal')
    );

-- NOTIFICATIONS: Students can only view their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- STUDENT FEES: Students can only view their own fee records
DROP POLICY IF EXISTS "Students view own fees" ON public.student_fees;
CREATE POLICY "Students view own fees"
    ON public.student_fees FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.get_current_user_role() IN ('admin', 'finance_manager', 'principal')
    );

-- ENABLE REALTIME PUBLICATION FOR STUDENT TABLES
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_chat_messages;
EXCEPTION WHEN duplicate_object THEN
    -- Table already in publication
    NULL;
END $$;

