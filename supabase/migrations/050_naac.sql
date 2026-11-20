-- 050: NAAC — real metrics, computed progress, staff-only evidence.
-- Before: the criterion pages showed three invented metrics with invented dates and "recent activity"; completion %
-- was typed by hand; uploading evidence saved only the file NAME (the file itself went nowhere); any signed-in user
-- (students, parents) could read NAAC evidence; teachers could delete it.
-- Idempotent. Depends on 001/002.

CREATE TABLE IF NOT EXISTS public.naac_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criterion_number INTEGER NOT NULL REFERENCES public.naac_criterion_progress(criterion_number) ON DELETE CASCADE,
  metric_code TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','In progress','Completed')),
  academic_year TEXT,
  quantitative_value NUMERIC,
  description TEXT,
  remarks TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (metric_code)
);
ALTER TABLE public.naac_metrics ENABLE ROW LEVEL SECURITY;

-- Seed the seven criteria rows so progress can be computed (idempotent).
INSERT INTO public.naac_criterion_progress (criterion_number) SELECT g FROM generate_series(1,7) g ON CONFLICT DO NOTHING;

-- Progress is derived from the metrics, never typed in.
CREATE OR REPLACE FUNCTION public.naac_recompute_progress(p_criterion INT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_total INT; v_done INT;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE status = 'Completed') INTO v_total, v_done FROM public.naac_metrics WHERE criterion_number = p_criterion;
  UPDATE public.naac_criterion_progress SET total_metrics = v_total, completed_metrics = v_done,
         completion_percentage = CASE WHEN v_total = 0 THEN 0 ELSE round(100.0 * v_done / v_total)::int END, last_updated = now()
   WHERE criterion_number = p_criterion;
END $$;
REVOKE ALL ON FUNCTION public.naac_recompute_progress(INT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.naac_metrics_after() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN PERFORM public.naac_recompute_progress(OLD.criterion_number); END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN PERFORM public.naac_recompute_progress(NEW.criterion_number); END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS naac_metrics_progress ON public.naac_metrics;
CREATE TRIGGER naac_metrics_progress AFTER INSERT OR UPDATE OR DELETE ON public.naac_metrics FOR EACH ROW EXECUTE FUNCTION public.naac_metrics_after();

-- Access: staff who work on accreditation read; coordinators/principal/admin write. Students and parents see nothing.
DROP POLICY IF EXISTS "Authenticated can view NAAC progress" ON public.naac_criterion_progress;
DROP POLICY IF EXISTS "NAAC coordinators and admins can update NAAC progress" ON public.naac_criterion_progress;
DROP POLICY IF EXISTS "Authenticated can view NAAC documents" ON public.naac_documents;
DROP POLICY IF EXISTS "NAAC coordinators and staff can manage NAAC documents" ON public.naac_documents;
DROP POLICY IF EXISTS naac_progress_read ON public.naac_criterion_progress;
DROP POLICY IF EXISTS naac_documents_read ON public.naac_documents;
DROP POLICY IF EXISTS naac_documents_insert ON public.naac_documents;
DROP POLICY IF EXISTS naac_documents_delete ON public.naac_documents;
DROP POLICY IF EXISTS naac_metrics_read ON public.naac_metrics;
DROP POLICY IF EXISTS naac_metrics_write ON public.naac_metrics;

CREATE POLICY naac_progress_read ON public.naac_criterion_progress FOR SELECT TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal','naac_coordinator','hod','teacher'));
CREATE POLICY naac_documents_read ON public.naac_documents FOR SELECT TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal','naac_coordinator','hod','teacher'));
CREATE POLICY naac_documents_insert ON public.naac_documents FOR INSERT TO authenticated
  WITH CHECK (public.get_current_user_role() IN ('admin','principal','naac_coordinator','hod','teacher'));
CREATE POLICY naac_documents_delete ON public.naac_documents FOR DELETE TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal','naac_coordinator'));
CREATE POLICY naac_metrics_read ON public.naac_metrics FOR SELECT TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal','naac_coordinator','hod','teacher'));
CREATE POLICY naac_metrics_write ON public.naac_metrics FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('admin','principal','naac_coordinator'))
  WITH CHECK (public.get_current_user_role() IN ('admin','principal','naac_coordinator'));
-- Progress rows change only through the trigger above.
REVOKE INSERT, UPDATE, DELETE ON public.naac_criterion_progress FROM authenticated, anon;

-- Evidence files go to a PRIVATE bucket (the shared `documents` bucket is publicly readable by URL).
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('naac-evidence', 'naac-evidence', false, 52428800)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS naac_evidence_read ON storage.objects;
DROP POLICY IF EXISTS naac_evidence_insert ON storage.objects;
DROP POLICY IF EXISTS naac_evidence_delete ON storage.objects;
CREATE POLICY naac_evidence_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'naac-evidence' AND public.get_current_user_role() IN ('admin','principal','naac_coordinator','hod','teacher'));
CREATE POLICY naac_evidence_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'naac-evidence' AND public.get_current_user_role() IN ('admin','principal','naac_coordinator','hod','teacher'));
CREATE POLICY naac_evidence_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'naac-evidence' AND public.get_current_user_role() IN ('admin','principal','naac_coordinator'));
