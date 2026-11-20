-- 047: Alumni module — real donations and mentorship, directory no longer readable by students/parents.
-- Idempotent. Depends on 001/002 (alumni tables) and get_current_user_role().

-- The alumni directory held e-mail/phone of former students and was readable by EVERY signed-in user.
DROP POLICY IF EXISTS "Authenticated can view alumni directory" ON public.alumni_profiles;
DROP POLICY IF EXISTS alumni_profiles_select_staff ON public.alumni_profiles;
CREATE POLICY alumni_profiles_select_staff ON public.alumni_profiles FOR SELECT TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal','placement_officer','hod'));

-- Events stay visible to staff and students (they are announcements), unchanged.

ALTER TABLE public.alumni_donations ADD COLUMN IF NOT EXISTS payment_mode TEXT;
ALTER TABLE public.alumni_donations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Received';
ALTER TABLE public.alumni_donations ADD COLUMN IF NOT EXISTS recorded_by UUID;
DO $$ BEGIN
  ALTER TABLE public.alumni_donations ADD CONSTRAINT alumni_donations_amount_pos CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.alumni_donations ADD CONSTRAINT alumni_donations_status_chk CHECK (status IN ('Pledged','Processing','Received','Cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.alumni_mentorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.alumni_profiles(id) ON DELETE CASCADE,
  mentee_name TEXT NOT NULL,
  mentee_student_id UUID,
  domain TEXT NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_months INTEGER CHECK (duration_months IS NULL OR duration_months > 0),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Completed','Cancelled')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alumni_mentorships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS alumni_mentorships_staff ON public.alumni_mentorships;
CREATE POLICY alumni_mentorships_staff ON public.alumni_mentorships FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal','placement_officer'))
  WITH CHECK (public.get_current_user_role() IN ('admin','principal','placement_officer'));
