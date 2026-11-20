-- =============================================================================
-- Migration 041: student_fees.student_code - the human-readable student id on each fee row.
-- The finance screen showed the placeholder 'AIP-VERIFIED' when it could not find the student, and
-- cannot look up students that have no portal login. The code is filled automatically on insert
-- (BEFORE INSERT trigger) from the student record, or from the profile for legacy rows.
-- Idempotent. Run after 040.
-- =============================================================================
BEGIN;
ALTER TABLE public.student_fees ADD COLUMN IF NOT EXISTS student_code TEXT;

CREATE OR REPLACE FUNCTION public.student_fees_fill_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF NEW.student_code IS NULL THEN
        IF NEW.student_record_id IS NOT NULL THEN
            SELECT student_id INTO NEW.student_code FROM public.students WHERE id = NEW.student_record_id;
        END IF;
        IF NEW.student_code IS NULL AND NEW.student_id IS NOT NULL THEN
            SELECT COALESCE(student_id, roll_number) INTO NEW.student_code FROM public.profiles WHERE id = NEW.student_id;
        END IF;
    END IF;
    RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_student_fees_fill_code ON public.student_fees;
CREATE TRIGGER trg_student_fees_fill_code BEFORE INSERT ON public.student_fees
    FOR EACH ROW EXECUTE FUNCTION public.student_fees_fill_code();

UPDATE public.student_fees f SET student_code = COALESCE(
        (SELECT s.student_id FROM public.students s WHERE s.id = f.student_record_id),
        (SELECT COALESCE(p.student_id, p.roll_number) FROM public.profiles p WHERE p.id = f.student_id))
 WHERE f.student_code IS NULL;
COMMIT;
