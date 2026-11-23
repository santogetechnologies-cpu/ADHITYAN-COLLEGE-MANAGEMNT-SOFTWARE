-- Step 32: starting configuration (settings every college needs on day one).
-- No people, no sample students, no demo fees. The administrator edits all of this in the app (Settings, Fee Setup, Admissions).
SET search_path = public, extensions;

-- Generic defaults; the administrator sets the real name, code and ID prefix under Admin -> Settings.
ALTER TABLE public.institutional_settings ALTER COLUMN institution_name SET DEFAULT 'My Institution';
ALTER TABLE public.institutional_settings ALTER COLUMN institution_code SET DEFAULT 'INST';
ALTER TABLE public.institutional_settings ALTER COLUMN student_id_prefix SET DEFAULT 'STU';
INSERT INTO public.institutional_settings (id, institution_name, institution_code, student_id_prefix, academic_year)
VALUES ('00000000-0000-0000-0000-000000000001', 'My Institution', 'INST', 'STU',
        to_char(CURRENT_DATE, 'YYYY') || '-' || to_char(CURRENT_DATE + interval '1 year', 'YYYY'))
ON CONFLICT (id) DO NOTHING;

-- NAAC criteria 1-7 start at zero; progress is computed from real evidence.
INSERT INTO public.naac_criterion_progress (criterion_number, completion_percentage, total_metrics, completed_metrics)
SELECT n, 0, 10, 0 FROM generate_series(1, 7) AS n
ON CONFLICT (criterion_number) DO NOTHING;

-- Standard fee heads, default grade scale, admission routes and quotas, payroll settings row (unconfigured).
INSERT INTO public.admission_quotas (code, name, active, sort_order, created_at) VALUES ('GENERAL', 'General / open merit', true, 1, '2026-11-21 03:56:18.36649+00') ON CONFLICT DO NOTHING;
INSERT INTO public.admission_quotas (code, name, active, sort_order, created_at) VALUES ('MANAGEMENT', 'Management quota', true, 2, '2026-11-21 03:56:18.36649+00') ON CONFLICT DO NOTHING;
INSERT INTO public.admission_quotas (code, name, active, sort_order, created_at) VALUES ('GOVERNMENT', 'Government quota', true, 3, '2026-11-21 03:56:18.36649+00') ON CONFLICT DO NOTHING;
INSERT INTO public.admission_quotas (code, name, active, sort_order, created_at) VALUES ('NRI', 'NRI quota', true, 4, '2026-11-21 03:56:18.36649+00') ON CONFLICT DO NOTHING;
INSERT INTO public.admission_quotas (code, name, active, sort_order, created_at) VALUES ('SPORTS', 'Sports quota', true, 5, '2026-11-21 03:56:18.36649+00') ON CONFLICT DO NOTHING;
INSERT INTO public.admission_routes (code, name, description, requires_entrance, requires_merit, active, sort_order, created_at) VALUES ('MERIT_ENTRANCE', 'Merit with entrance test', 'Ranked on qualifying marks and entrance-test score.', true, true, true, 1, '2026-11-21 03:56:18.36649+00') ON CONFLICT DO NOTHING;
INSERT INTO public.admission_routes (code, name, description, requires_entrance, requires_merit, active, sort_order, created_at) VALUES ('MERIT_MARKS', 'Merit on qualifying marks', 'Ranked on qualifying marks only; no entrance test.', false, true, true, 2, '2026-11-21 03:56:18.36649+00') ON CONFLICT DO NOTHING;
INSERT INTO public.admission_routes (code, name, description, requires_entrance, requires_merit, active, sort_order, created_at) VALUES ('DIRECT', 'Direct admission', 'Admitted directly by the approving authority; no entrance test or ranking.', false, false, true, 3, '2026-11-21 03:56:18.36649+00') ON CONFLICT DO NOTHING;
INSERT INTO public.admission_routes (code, name, description, requires_entrance, requires_merit, active, sort_order, created_at) VALUES ('LATERAL', 'Lateral entry', 'Joins a later year; no entrance test or ranking.', false, false, true, 4, '2026-11-21 03:56:18.36649+00') ON CONFLICT DO NOTHING;
INSERT INTO public.fee_heads (id, code, name, category, refundable, active, description, created_at, updated_at) VALUES ('342327e8-f4b6-4ae4-ad1a-a11480f02d58', 'TUITION', 'Tuition fee', 'tuition', false, true, NULL, '2026-11-21 03:56:18.258789+00', '2026-11-21 03:56:18.258789+00') ON CONFLICT DO NOTHING;
INSERT INTO public.fee_heads (id, code, name, category, refundable, active, description, created_at, updated_at) VALUES ('8bb28898-181a-4bae-a58d-ef25851b88ad', 'EXAM', 'Examination fee', 'exam', false, true, NULL, '2026-11-21 03:56:18.258789+00', '2026-11-21 03:56:18.258789+00') ON CONFLICT DO NOTHING;
INSERT INTO public.fee_heads (id, code, name, category, refundable, active, description, created_at, updated_at) VALUES ('7d8f5756-ec92-495c-beb4-eac7c7a1eec7', 'LAB', 'Laboratory fee', 'lab', false, true, NULL, '2026-11-21 03:56:18.258789+00', '2026-11-21 03:56:18.258789+00') ON CONFLICT DO NOTHING;
INSERT INTO public.fee_heads (id, code, name, category, refundable, active, description, created_at, updated_at) VALUES ('9b68f99d-094f-4624-b989-45285364fdcf', 'LIBRARY', 'Library fee', 'library', false, true, NULL, '2026-11-21 03:56:18.258789+00', '2026-11-21 03:56:18.258789+00') ON CONFLICT DO NOTHING;
INSERT INTO public.fee_heads (id, code, name, category, refundable, active, description, created_at, updated_at) VALUES ('d1ed8784-d2cb-4689-bf76-5da8b9ef81e7', 'SPORTS', 'Sports & activities fee', 'activity', false, true, NULL, '2026-11-21 03:56:18.258789+00', '2026-11-21 03:56:18.258789+00') ON CONFLICT DO NOTHING;
INSERT INTO public.fee_heads (id, code, name, category, refundable, active, description, created_at, updated_at) VALUES ('401c5215-8d85-4b99-b11d-2134aaa3964a', 'DEVELOPMENT', 'Development fund', 'other', false, true, NULL, '2026-11-21 03:56:18.258789+00', '2026-11-21 03:56:18.258789+00') ON CONFLICT DO NOTHING;
INSERT INTO public.fee_heads (id, code, name, category, refundable, active, description, created_at, updated_at) VALUES ('9764c710-3d51-42c3-adc2-7fa5cc0928fd', 'HOSTEL', 'Hostel fee', 'hostel', false, true, NULL, '2026-11-21 03:56:18.258789+00', '2026-11-21 03:56:18.258789+00') ON CONFLICT DO NOTHING;
INSERT INTO public.fee_heads (id, code, name, category, refundable, active, description, created_at, updated_at) VALUES ('a1050708-7bc2-4bcb-b0e3-d816dfdd9627', 'MESS', 'Mess fee', 'hostel', false, true, NULL, '2026-11-21 03:56:18.258789+00', '2026-11-21 03:56:18.258789+00') ON CONFLICT DO NOTHING;
INSERT INTO public.fee_heads (id, code, name, category, refundable, active, description, created_at, updated_at) VALUES ('877c9904-c97c-4063-988f-43fa096ce08b', 'TRANSPORT', 'Transport fee', 'transport', false, true, NULL, '2026-11-21 03:56:18.258789+00', '2026-11-21 03:56:18.258789+00') ON CONFLICT DO NOTHING;
INSERT INTO public.fee_heads (id, code, name, category, refundable, active, description, created_at, updated_at) VALUES ('18f70298-7dc8-41b3-9c23-4ba298c97f2f', 'UNIFORM', 'Uniform & books', 'other', false, true, NULL, '2026-11-21 03:56:18.258789+00', '2026-11-21 03:56:18.258789+00') ON CONFLICT DO NOTHING;
INSERT INTO public.fee_heads (id, code, name, category, refundable, active, description, created_at, updated_at) VALUES ('fd1974df-722c-47db-b14c-131b4148efb2', 'ADMISSION', 'Admission / registration fee', 'admission', false, true, NULL, '2026-11-21 03:56:18.258789+00', '2026-11-21 03:56:18.258789+00') ON CONFLICT DO NOTHING;
INSERT INTO public.fee_heads (id, code, name, category, refundable, active, description, created_at, updated_at) VALUES ('36a05da2-53a5-489a-84d6-8af394536abf', 'CAUTION', 'Caution deposit', 'deposit', true, true, NULL, '2026-11-21 03:56:18.258789+00', '2026-11-21 03:56:18.258789+00') ON CONFLICT DO NOTHING;
INSERT INTO public.fee_heads (id, code, name, category, refundable, active, description, created_at, updated_at) VALUES ('ddd832e7-67a3-4fbb-821d-949ecbba9d85', 'CLINICAL', 'Clinical training fee', 'other', false, true, NULL, '2026-11-21 03:56:18.258789+00', '2026-11-21 03:56:18.258789+00') ON CONFLICT DO NOTHING;
INSERT INTO public.fee_heads (id, code, name, category, refundable, active, description, created_at, updated_at) VALUES ('31a5f48e-1f69-4310-a4b4-18f5845481da', 'FINE', 'Fine / late fee', 'other', false, true, NULL, '2026-11-21 03:56:18.258789+00', '2026-11-21 03:56:18.258789+00') ON CONFLICT DO NOTHING;
INSERT INTO public.grade_scales (id, name, is_default, max_points, created_at) VALUES ('7711705c-79f6-4b2b-8a45-4f7e8917e311', 'Default 10-point scale', true, 10.0, '2026-11-21 03:56:19.235279+00') ON CONFLICT DO NOTHING;
INSERT INTO public.grade_scale_bands (id, scale_id, min_pct, grade, grade_point) VALUES ('29ccc8a1-117b-4d10-b6c4-9dc187213fe0', '7711705c-79f6-4b2b-8a45-4f7e8917e311', 90.00, 'A+', 10.00) ON CONFLICT DO NOTHING;
INSERT INTO public.grade_scale_bands (id, scale_id, min_pct, grade, grade_point) VALUES ('7a937178-05ab-4e1b-bf5d-551d15c29531', '7711705c-79f6-4b2b-8a45-4f7e8917e311', 80.00, 'A', 9.00) ON CONFLICT DO NOTHING;
INSERT INTO public.grade_scale_bands (id, scale_id, min_pct, grade, grade_point) VALUES ('d031b511-1d87-41b0-98b8-d6050ee023b9', '7711705c-79f6-4b2b-8a45-4f7e8917e311', 70.00, 'B+', 8.00) ON CONFLICT DO NOTHING;
INSERT INTO public.grade_scale_bands (id, scale_id, min_pct, grade, grade_point) VALUES ('b33f4f89-72fa-40d3-acca-e53377b118be', '7711705c-79f6-4b2b-8a45-4f7e8917e311', 60.00, 'B', 7.00) ON CONFLICT DO NOTHING;
INSERT INTO public.grade_scale_bands (id, scale_id, min_pct, grade, grade_point) VALUES ('3b6f6e38-9b16-47af-8509-97f04a1612a2', '7711705c-79f6-4b2b-8a45-4f7e8917e311', 50.00, 'C', 6.00) ON CONFLICT DO NOTHING;
INSERT INTO public.grade_scale_bands (id, scale_id, min_pct, grade, grade_point) VALUES ('fc3d3e9b-8e85-4c53-8ab4-48b67cac9cc2', '7711705c-79f6-4b2b-8a45-4f7e8917e311', 0.00, 'D', 5.00) ON CONFLICT DO NOTHING;
INSERT INTO public.payroll_settings (id, configured, epf_rate_pct, epf_wage_ceiling, esi_rate_pct, esi_gross_limit, professional_tax_monthly, lop_leave_types, updated_by, updated_at) VALUES (true, false, 0.00, NULL, 0.00, NULL, 0.00, '{"Loss of Pay",LOP,Unpaid}', NULL, '2026-11-21 03:56:18.83277+00') ON CONFLICT DO NOTHING;
