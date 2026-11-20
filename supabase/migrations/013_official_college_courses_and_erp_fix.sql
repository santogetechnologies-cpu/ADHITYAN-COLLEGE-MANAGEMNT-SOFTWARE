-- ============================================================================
-- MIGRATION 013: Official College Courses Configuration & Production ERP Fix
-- Adhithyan Group of Institutions
-- ============================================================================

-- 1. COURSES TABLE
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT UNIQUE NOT NULL,
    duration_years INTEGER NOT NULL DEFAULT 3,
    type TEXT NOT NULL DEFAULT 'Degree', -- Degree, Diploma, Certificate
    department TEXT NOT NULL,
    tuition_fee NUMERIC(10,2) NOT NULL DEFAULT 45000.00,
    description TEXT,
    eligibility TEXT DEFAULT '10+2 / Higher Secondary with Science / Relevant Stream',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. INSTITUTIONAL SETTINGS TABLE (Ensures columns exist)
ALTER TABLE IF EXISTS public.institutional_settings 
    ADD COLUMN IF NOT EXISTS min_attendance_percentage NUMERIC(5,2) DEFAULT 75.0,
    ADD COLUMN IF NOT EXISTS passing_marks_percentage NUMERIC(5,2) DEFAULT 40.0;

-- 3. ADMISSION DOCUMENT VERIFICATION TABLE
CREATE TABLE IF NOT EXISTS public.admission_document_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES public.admission_applications(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    document_type TEXT NOT NULL, -- 10th Marksheet, 12th Marksheet, Transfer Certificate, Community Certificate, Medical Fitness
    document_url TEXT,
    status TEXT NOT NULL DEFAULT 'Pending', -- Pending, Verified, Rejected
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    submission_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. ADMISSION MERIT LIST TABLE
CREATE TABLE IF NOT EXISTS public.admission_merit_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES public.admission_applications(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    course_name TEXT NOT NULL,
    merit_score NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    rank INTEGER NOT NULL DEFAULT 1,
    category TEXT DEFAULT 'General',
    status TEXT NOT NULL DEFAULT 'Selected', -- Selected, Waitlist, Admitted, Declined
    academic_year TEXT NOT NULL DEFAULT '2025-2026',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. HALL TICKETS (Ensure status & exam_title columns exist)
ALTER TABLE IF EXISTS public.hall_tickets
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Generated',
    ADD COLUMN IF NOT EXISTS exam_title TEXT DEFAULT 'End Semester Examination';

-- Enable RLS on all newly created tables
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutional_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_document_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_merit_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hall_tickets ENABLE ROW LEVEL SECURITY;

-- Permissive policies for institutional data
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read courses to all authenticated and anon') THEN
        CREATE POLICY "Allow read courses to all authenticated and anon" ON public.courses FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow admin write courses') THEN
        CREATE POLICY "Allow admin write courses" ON public.courses FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read settings') THEN
        CREATE POLICY "Allow read settings" ON public.institutional_settings FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow admin write settings') THEN
        CREATE POLICY "Allow admin write settings" ON public.institutional_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read doc verifications') THEN
        CREATE POLICY "Allow read doc verifications" ON public.admission_document_verifications FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow manage doc verifications') THEN
        CREATE POLICY "Allow manage doc verifications" ON public.admission_document_verifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read merit lists') THEN
        CREATE POLICY "Allow read merit lists" ON public.admission_merit_lists FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow manage merit lists') THEN
        CREATE POLICY "Allow manage merit lists" ON public.admission_merit_lists FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read hall tickets') THEN
        CREATE POLICY "Allow read hall tickets" ON public.hall_tickets FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow manage hall tickets') THEN
        CREATE POLICY "Allow manage hall tickets" ON public.hall_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 6. ENSURE course COLUMN ON profiles AND MAP EXISTING STUDENT PROFILES SAFELY
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS course TEXT;

UPDATE public.profiles
SET department = 'B.VOC Medical Lab Technology (MLT)',
    course = 'B.VOC Medical Lab Technology (MLT)'
WHERE department IS NULL 
   OR department IN ('Computer Science & Engineering', 'Computer Science', 'Mechanical Engineering', 'Civil Engineering', 'Electrical Engineering', 'Mathematics', 'Physics', 'Chemistry');

-- 7. SEED THE 9 OFFICIAL COURSES IN courses TABLE
INSERT INTO public.courses (code, name, duration_years, type, department, tuition_fee, description)
VALUES
    ('BVOC-MLT', 'B.VOC Medical Lab Technology (MLT)', 3, 'Degree', 'B.VOC Medical Lab Technology (MLT)', 65000.00, '3-Year Bachelor of Vocation in Medical Laboratory Technology'),
    ('BVOC-DT', 'B.VOC Dialysis Technology', 3, 'Degree', 'B.VOC Dialysis Technology', 70000.00, '3-Year Bachelor of Vocation in Renal Replacement and Dialysis Technology'),
    ('BVOC-RMIT', 'B.VOC Radiology & Medical Imaging Technology', 3, 'Degree', 'B.VOC Radiology & Medical Imaging Technology', 75000.00, '3-Year Bachelor of Vocation in Medical Imaging and Radiography'),
    ('BVOC-CCT', 'B.VOC Cardiac Care Technology', 3, 'Degree', 'B.VOC Cardiac Care Technology', 80000.00, '3-Year Bachelor of Vocation in Cardiovascular Technology'),
    ('BVOC-OTT', 'B.VOC Operation Theatre Technology', 3, 'Degree', 'B.VOC Operation Theatre Technology', 70000.00, '3-Year Bachelor of Vocation in Surgical and Operation Theatre Technology'),
    ('BVOC-HA3', 'B.VOC Hospital Administration (3 Years)', 3, 'Degree', 'B.VOC Hospital Administration (3 Years)', 60000.00, '3-Year Bachelor of Vocation in Healthcare & Hospital Administration'),
    ('DIP-LSCM', 'Logistics & Supply Chain Management (1 Year)', 1, 'Diploma', 'Logistics & Supply Chain Management (1 Year)', 45000.00, '1-Year Professional Diploma in Logistics & Global Supply Chain Management'),
    ('DIP-HM', 'Hospitality Management (1 Year)', 1, 'Diploma', 'Hospitality Management (1 Year)', 45000.00, '1-Year Diploma in International Hospitality & Hotel Operations'),
    ('DIP-HA1', 'Hospital Administration (1 Year)', 1, 'Diploma', 'Hospital Administration (1 Year)', 45000.00, '1-Year Executive Diploma in Healthcare & Clinic Administration')
ON CONFLICT (name) DO UPDATE SET
    code = EXCLUDED.code,
    duration_years = EXCLUDED.duration_years,
    type = EXCLUDED.type,
    department = EXCLUDED.department,
    tuition_fee = EXCLUDED.tuition_fee,
    description = EXCLUDED.description,
    status = 'active',
    updated_at = NOW();

-- 8. SEED THE 9 OFFICIAL COURSES INTO departments TABLE
INSERT INTO public.departments (name, duration, code)
VALUES
    ('B.VOC Medical Lab Technology (MLT)', 3, 'BVOC-MLT'),
    ('B.VOC Dialysis Technology', 3, 'BVOC-DT'),
    ('B.VOC Radiology & Medical Imaging Technology', 3, 'BVOC-RMIT'),
    ('B.VOC Cardiac Care Technology', 3, 'BVOC-CCT'),
    ('B.VOC Operation Theatre Technology', 3, 'BVOC-OTT'),
    ('B.VOC Hospital Administration (3 Years)', 3, 'BVOC-HA3'),
    ('Logistics & Supply Chain Management (1 Year)', 1, 'DIP-LSCM'),
    ('Hospitality Management (1 Year)', 1, 'DIP-HM'),
    ('Hospital Administration (1 Year)', 1, 'DIP-HA1')
ON CONFLICT (name) DO UPDATE SET
    duration = EXCLUDED.duration,
    code = EXCLUDED.code,
    updated_at = NOW();

-- 9. SEED DEFAULT SECTIONS FOR EACH DEPARTMENT IF NOT ALREADY PRESENT
INSERT INTO public.sections (department_id, name, capacity, current_students)
SELECT d.id, 'A', 50, 0
FROM public.departments d
WHERE NOT EXISTS (
    SELECT 1 FROM public.sections s WHERE s.department_id = d.id AND s.name = 'A'
);

-- 10. REMOVE LEGACY UNRELATED SAMPLE DEPARTMENTS
DELETE FROM public.departments
WHERE name NOT IN (
    'B.VOC Medical Lab Technology (MLT)',
    'B.VOC Dialysis Technology',
    'B.VOC Radiology & Medical Imaging Technology',
    'B.VOC Cardiac Care Technology',
    'B.VOC Operation Theatre Technology',
    'B.VOC Hospital Administration (3 Years)',
    'Logistics & Supply Chain Management (1 Year)',
    'Hospitality Management (1 Year)',
    'Hospital Administration (1 Year)'
);

-- 11. UPDATE DEFAULT INSTITUTIONAL SETTINGS
UPDATE public.institutional_settings
SET institution_name = 'Adhithyan Group of Institutions',
    institution_code = 'ADH-AGI-2025',
    academic_year = '2025-2026',
    contact_email = 'admin@adhithyan.edu',
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 12. SEED INITIAL SAMPLE DATA FOR ADMISSION WORKFLOW SO DASHBOARD IS OPERATIONAL
-- Document verification sample queue if empty
INSERT INTO public.admission_document_verifications (student_name, document_type, status, submission_date)
SELECT * FROM (VALUES
    ('Aarav Krishnan', '12th Marksheet & Medical Fitness', 'Verified', CURRENT_DATE - INTERVAL '2 days'),
    ('Sneha Ramesh', '10th & 12th Marksheets', 'Pending', CURRENT_DATE - INTERVAL '1 day'),
    ('Kavitha Sundaram', 'Transfer Certificate & Conduct', 'Verified', CURRENT_DATE),
    ('Mohammed Riyas', 'Community & Identity Certificate', 'Pending', CURRENT_DATE)
) AS t(student_name, document_type, status, submission_date)
WHERE NOT EXISTS (SELECT 1 FROM public.admission_document_verifications LIMIT 1);

-- Merit list sample if empty
INSERT INTO public.admission_merit_lists (student_name, course_name, merit_score, rank, category, status)
SELECT * FROM (VALUES
    ('Aarav Krishnan', 'B.VOC Medical Lab Technology (MLT)', 96.5, 1, 'General', 'Selected'),
    ('Sneha Ramesh', 'B.VOC Dialysis Technology', 94.0, 2, 'OBC', 'Selected'),
    ('Kavitha Sundaram', 'B.VOC Radiology & Medical Imaging Technology', 91.5, 3, 'General', 'Selected'),
    ('Mohammed Riyas', 'B.VOC Cardiac Care Technology', 88.0, 4, 'OBC', 'Waitlist'),
    ('Divya Prakash', 'B.VOC Operation Theatre Technology', 86.5, 5, 'SC/ST', 'Waitlist'),
    ('Rohit Verma', 'B.VOC Hospital Administration (3 Years)', 85.0, 6, 'General', 'Selected')
) AS t(student_name, course_name, merit_score, rank, category, status)
WHERE NOT EXISTS (SELECT 1 FROM public.admission_merit_lists LIMIT 1);

-- Hall tickets sample if empty
INSERT INTO public.hall_tickets (roll_number, register_number, student_name, department, class_name, exam_center, qr_code_token, status, attendance_pct)
SELECT * FROM (VALUES
    ('ADH-24-MLT01', 'REG24MLT01', 'Aarav Krishnan', 'B.VOC Medical Lab Technology (MLT)', 'Year 1', 'Main Exam Hall 1', 'QR-TKN-001', 'Generated', 92.0),
    ('ADH-24-DT02', 'REG24DT02', 'Sneha Ramesh', 'B.VOC Dialysis Technology', 'Year 1', 'Main Exam Hall 1', 'QR-TKN-002', 'Generated', 89.5),
    ('ADH-24-RMIT03', 'REG24RMIT03', 'Kavitha Sundaram', 'B.VOC Radiology & Medical Imaging Technology', 'Year 1', 'Main Exam Hall 2', 'QR-TKN-003', 'Pending', 78.0),
    ('ADH-24-CCT04', 'REG24CCT04', 'Mohammed Riyas', 'B.VOC Cardiac Care Technology', 'Year 1', 'Main Exam Hall 2', 'QR-TKN-004', 'Generated', 94.0)
) AS t(roll_number, register_number, student_name, department, class_name, exam_center, qr_code_token, status, attendance_pct)
WHERE NOT EXISTS (SELECT 1 FROM public.hall_tickets LIMIT 1);

-- 13. ENABLE REALTIME ON NEW TABLES
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.institutional_settings;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admission_document_verifications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admission_merit_lists;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.hall_tickets;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
