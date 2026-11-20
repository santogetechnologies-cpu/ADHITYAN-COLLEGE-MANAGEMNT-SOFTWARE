-- 071: The afternoon wellness check-in could never be saved: the screen sends checkin_type 'afternoon' but the CHECK constraint
-- allowed only 'morning' and 'evening', so every afternoon submission was rejected. Allow it.
-- Idempotent.
ALTER TABLE public.wellness_checkins DROP CONSTRAINT IF EXISTS wellness_checkins_checkin_type_check;
ALTER TABLE public.wellness_checkins ADD CONSTRAINT wellness_checkins_checkin_type_check CHECK (checkin_type IN ('morning','afternoon','evening'));
