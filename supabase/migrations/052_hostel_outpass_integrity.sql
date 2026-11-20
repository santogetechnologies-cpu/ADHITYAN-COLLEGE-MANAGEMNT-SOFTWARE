-- 052: Hostel out-pass integrity.
-- Before: a student could set `parent_otp_verified = true` on their own pending pass (the warden then saw "Verified");
-- any status could be written to any pass; nothing stopped a return time before the departure time.
-- Idempotent. Depends on 001/032.

DO $$ BEGIN
  ALTER TABLE public.hostel_out_passes ADD CONSTRAINT hostel_out_passes_times_chk CHECK (expected_return_time IS NULL OR departure_time IS NULL OR expected_return_time > departure_time) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.hostel_out_passes ADD CONSTRAINT hostel_out_passes_status_chk CHECK (warden_status IN ('Pending','Approved','Rejected','Exited','Returned')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.hostel_outpass_guard() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_staff BOOLEAN := v_role IN ('admin','principal','hostel_warden');
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT v_staff THEN
      NEW.parent_otp_verified := FALSE; NEW.guard_exit_time := NULL; NEW.guard_entry_time := NULL; NEW.actual_return_time := NULL;
    END IF;
    RETURN NEW;
  END IF;
  -- UPDATE
  IF NOT v_staff THEN
    -- students/parents may not touch consent, status or gate fields on a pending pass
    NEW.parent_otp_verified := OLD.parent_otp_verified; NEW.warden_status := OLD.warden_status;
    NEW.guard_exit_time := OLD.guard_exit_time; NEW.guard_entry_time := OLD.guard_entry_time; NEW.actual_return_time := OLD.actual_return_time;
    RETURN NEW;
  END IF;
  IF NEW.warden_status IS DISTINCT FROM OLD.warden_status AND NOT (
       (OLD.warden_status = 'Pending'  AND NEW.warden_status IN ('Approved','Rejected'))
    OR (OLD.warden_status = 'Approved' AND NEW.warden_status IN ('Exited','Rejected'))
    OR (OLD.warden_status = 'Exited'   AND NEW.warden_status = 'Returned')) THEN
    RAISE EXCEPTION 'Invalid out-pass status change % -> %', OLD.warden_status, NEW.warden_status USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.warden_status = 'Exited'   AND OLD.warden_status <> 'Exited'   THEN NEW.guard_exit_time := COALESCE(NEW.guard_exit_time, now()); END IF;
  IF NEW.warden_status = 'Returned' AND OLD.warden_status <> 'Returned' THEN NEW.guard_entry_time := COALESCE(NEW.guard_entry_time, now()); NEW.actual_return_time := COALESCE(NEW.actual_return_time, now()); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hostel_outpass_guard ON public.hostel_out_passes;
CREATE TRIGGER hostel_outpass_guard BEFORE INSERT OR UPDATE ON public.hostel_out_passes FOR EACH ROW EXECUTE FUNCTION public.hostel_outpass_guard();
