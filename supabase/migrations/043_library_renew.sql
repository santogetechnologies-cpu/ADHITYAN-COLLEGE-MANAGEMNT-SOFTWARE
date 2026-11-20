-- =============================================================================
-- Migration 043: Library renewal (the "Renew" button only showed a success toast and saved nothing).
-- renew_library_book(): extends the due date of an issued book, atomically, with a renewal limit.
--   * librarian / admin / principal only (same rule as issue/return)
--   * only books that are Issued/Overdue and not yet returned
--   * at most p_max_renewals renewals per issue (default 2)
--   * new due date = later of (current due date, today) + p_days
--
-- Also fixes RLS: the policies on book_issues and library_books named admin / principal / teacher but NOT
-- librarian, so the librarian could neither see issued books nor manage the catalog. Parents can see their
-- ward's issues. (library_circulation is a second, parallel model of the same thing; not used by this screen.)
-- Idempotent. Run after 042.
-- =============================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.renew_library_book(p_issue_id UUID, p_days INTEGER DEFAULT 14, p_max_renewals INTEGER DEFAULT 2)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v public.book_issues%ROWTYPE; v_due DATE;
BEGIN
    IF public.get_current_user_role() NOT IN ('admin', 'principal', 'librarian') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authorized to renew books.');
    END IF;
    IF p_days IS NULL OR p_days < 1 OR p_days > 60 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Renewal period must be between 1 and 60 days.');
    END IF;
    SELECT * INTO v FROM public.book_issues WHERE id = p_issue_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Issue record not found.');
    END IF;
    IF v.status = 'Returned' THEN
        RETURN jsonb_build_object('success', false, 'error', 'This book has already been returned.');
    END IF;
    IF COALESCE(v.renew_count, 0) >= p_max_renewals THEN
        RETURN jsonb_build_object('success', false, 'error', format('This book has already been renewed %s time(s), the maximum.', p_max_renewals));
    END IF;
    v_due := GREATEST(v.due_date, CURRENT_DATE) + p_days;
    UPDATE public.book_issues
       SET due_date = v_due, renew_count = COALESCE(renew_count, 0) + 1, status = 'Issued', updated_at = NOW()
     WHERE id = p_issue_id;
    RETURN jsonb_build_object('success', true, 'due_date', v_due, 'renew_count', COALESCE(v.renew_count, 0) + 1);
END;
$$;
REVOKE ALL ON FUNCTION public.renew_library_book(UUID, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.renew_library_book(UUID, INTEGER, INTEGER) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS: include the librarian
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can view book issues" ON public.book_issues;
CREATE POLICY "Authenticated can view book issues" ON public.book_issues FOR SELECT TO authenticated
    USING (user_id = auth.uid()
           OR public.get_current_user_role() IN ('admin', 'principal', 'teacher', 'librarian')
           OR (public.get_current_user_role() = 'parent' AND public.is_parent_of(user_id)));
DROP POLICY IF EXISTS "Staff can manage book issues" ON public.book_issues;
CREATE POLICY "Staff can manage book issues" ON public.book_issues FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'teacher', 'librarian'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'teacher', 'librarian'));
DROP POLICY IF EXISTS "Staff can manage books" ON public.library_books;
CREATE POLICY "Staff can manage books" ON public.library_books FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'teacher', 'librarian'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'teacher', 'librarian'));

COMMIT;
