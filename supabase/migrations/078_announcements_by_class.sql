-- 078: Announcements can target one class (or department). Idempotent. Depends on 076.
-- Before: audience was only All / Students / Faculty / Parents. A notice for "BMLT-1 exam hall changed" reached the whole college.

ALTER TABLE public.institutional_broadcasts ADD COLUMN IF NOT EXISTS target_class TEXT;
ALTER TABLE public.institutional_broadcasts ADD COLUMN IF NOT EXISTS target_department TEXT;

CREATE OR REPLACE FUNCTION public._parent_has_child_in(p_class TEXT, p_department TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.parent_student_links l JOIN public.profiles st ON st.id = l.student_id
                  WHERE l.parent_id = auth.uid() AND (p_class IS NULL OR st.class_name = p_class) AND (p_department IS NULL OR st.department = p_department));
$$;
REVOKE ALL ON FUNCTION public._parent_has_child_in(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._parent_has_child_in(TEXT, TEXT) TO authenticated;

DROP POLICY IF EXISTS broadcasts_select ON public.institutional_broadcasts;
CREATE POLICY broadcasts_select ON public.institutional_broadcasts FOR SELECT TO authenticated USING (
  public.get_current_user_role() IN ('admin','principal')
  OR (published_at <= now() AND (
      (target_class IS NULL AND target_department IS NULL AND (
          target_audience = 'All'
          OR (target_audience = 'Students' AND public.get_current_user_role() = 'student')
          OR (target_audience = 'Parents' AND public.get_current_user_role() = 'parent')
          OR (target_audience = 'Faculty' AND public.get_current_user_role() IN ('teacher','hod'))))
      OR ((target_class IS NOT NULL OR target_department IS NOT NULL) AND (
          (public.get_current_user_role() = 'student' AND target_audience IN ('All','Students') AND EXISTS (
              SELECT 1 FROM public.profiles me WHERE me.id = auth.uid()
                AND (target_class IS NULL OR me.class_name = target_class) AND (target_department IS NULL OR me.department = target_department)))
          OR (public.get_current_user_role() = 'parent' AND target_audience IN ('All','Parents') AND public._parent_has_child_in(target_class, target_department))
          OR (public.get_current_user_role() IN ('teacher','hod') AND target_audience IN ('All','Faculty')
              AND (target_class IS NULL OR public.is_teacher_assigned_to_class(auth.uid(), target_class))))))));

DROP FUNCTION IF EXISTS public.announcement_publish(TEXT, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.announcement_publish(p_title TEXT, p_message TEXT, p_category TEXT DEFAULT 'Circular', p_priority TEXT DEFAULT 'Normal', p_audience TEXT DEFAULT 'All', p_class TEXT DEFAULT NULL, p_department TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role TEXT := public.get_current_user_role(); v_uid UUID := auth.uid(); v_id UUID; v_roles TEXT[]; v_name TEXT; v_ids UUID[]; v_n INT := 0;
        v_class TEXT := NULLIF(trim(COALESCE(p_class,'')),''); v_dept TEXT := NULLIF(trim(COALESCE(p_department,'')),''); v_prio TEXT; v_type TEXT;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin','principal') THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only admin or principal can publish announcements.'); END IF;
  IF length(trim(COALESCE(p_title,''))) < 3 OR length(trim(COALESCE(p_message,''))) < 3 THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'A title and a message are required.'); END IF;
  IF p_audience NOT IN ('All','Students','Faculty','Parents') THEN RETURN jsonb_build_object('success', false, 'code', 'INVALID', 'error', 'Choose who should see this.'); END IF;
  IF p_priority NOT IN ('Normal','High','Urgent') THEN p_priority := 'Normal'; END IF;
  v_prio := CASE WHEN p_priority = 'Normal' THEN 'medium' ELSE 'high' END; v_type := CASE WHEN p_priority = 'Urgent' THEN 'warning' ELSE 'info' END;
  IF (v_class IS NOT NULL OR v_dept IS NOT NULL) THEN
    v_ids := ARRAY(
      SELECT st.id FROM public.profiles st WHERE st.role = 'student' AND st.status = 'active' AND p_audience IN ('All','Students')
         AND (v_class IS NULL OR st.class_name = v_class) AND (v_dept IS NULL OR st.department = v_dept)
      UNION
      SELECT l.parent_id FROM public.parent_student_links l JOIN public.profiles st ON st.id = l.student_id
       WHERE p_audience IN ('All','Parents') AND (v_class IS NULL OR st.class_name = v_class) AND (v_dept IS NULL OR st.department = v_dept)
      UNION
      SELECT t.teacher_id FROM public.timetables t WHERE p_audience IN ('All','Faculty') AND t.teacher_id IS NOT NULL AND v_class IS NOT NULL AND lower(trim(t.class_name)) = lower(v_class));
    IF COALESCE(array_length(v_ids, 1), 0) = 0 THEN
      RETURN jsonb_build_object('success', false, 'code', 'NO_RECIPIENTS', 'error', 'Nobody matches that class or department and audience. Check the spelling.'); END IF;
  END IF;
  SELECT name INTO v_name FROM public.profiles WHERE id = v_uid;
  INSERT INTO public.institutional_broadcasts(title, message, category, priority, target_audience, author_name, author_id, target_class, target_department)
  VALUES (trim(p_title), trim(p_message), COALESCE(NULLIF(trim(p_category),''),'Circular'), p_priority, p_audience, COALESCE(v_name,'Office'), v_uid, v_class, v_dept) RETURNING id INTO v_id;
  IF v_ids IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, message, type, priority) SELECT x, left(trim(p_title), 200), left(trim(p_message), 2000), v_type, v_prio FROM unnest(v_ids) x;
    v_n := array_length(v_ids, 1);
  ELSE
    v_roles := CASE p_audience WHEN 'Students' THEN ARRAY['student'] WHEN 'Parents' THEN ARRAY['parent'] WHEN 'Faculty' THEN ARRAY['teacher','hod']
      ELSE ARRAY['student','parent','teacher','hod','coe','hr_manager','finance_manager','accountant','financier','librarian','hostel_warden','placement_officer','receptionist','store_manager','storekeeper','naac_coordinator','transport_driver','driver'] END;
    PERFORM public.notify_roles(v_roles, left(trim(p_title), 200), left(trim(p_message), 2000), v_type, v_prio);
  END IF;
  INSERT INTO public.audit_logs (user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (v_uid, v_role, 'announcement_published', 'institutional_broadcasts', v_id::text, jsonb_build_object('audience', p_audience, 'class', v_class, 'department', v_dept, 'title', trim(p_title)));
  RETURN jsonb_build_object('success', true, 'id', v_id, 'recipients', v_n);
END $$;
REVOKE ALL ON FUNCTION public.announcement_publish(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.announcement_publish(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;
