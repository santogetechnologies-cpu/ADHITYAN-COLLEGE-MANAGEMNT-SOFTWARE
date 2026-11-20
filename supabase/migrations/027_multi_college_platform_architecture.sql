-- ============================================================================
-- MIGRATION 027: FULLY ISOLATED MULTI-COLLEGE PLATFORM ARCHITECTURE
-- Implements multi-tenant college isolation, Platform Super Admin governance,
-- college provisioning, dynamic configurations, and cross-college security.
-- ============================================================================

-- 1. COLLEGES TABLE (Independent College Tenants)
CREATE TABLE IF NOT EXISTS public.colleges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'archived')),
    institution_type TEXT NOT NULL DEFAULT 'Paramedical' CHECK (institution_type IN ('Paramedical', 'Medical', 'Engineering', 'Arts & Science', 'Multi-Disciplinary')),
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    address TEXT,
    website TEXT,
    academic_config JSONB NOT NULL DEFAULT '{
      "programs": ["B.Sc", "B.VOC", "Diploma"],
      "academicYears": ["2024-2025", "2025-2026", "2026-2027"],
      "semesterStructure": "Semester (1 to 8)",
      "departments": ["Cardiac Technology", "Dialysis Technology", "Radiology & Imaging", "Operation Theatre", "Medical Laboratory", "Physician Assistant", "Critical Care"]
    }'::jsonb,
    branding_config JSONB NOT NULL DEFAULT '{
      "palette": "blue",
      "primaryColor": "#2563eb",
      "fontScale": "md",
      "layoutDensity": "normal"
    }'::jsonb,
    admin_user_id UUID,
    current_version TEXT NOT NULL DEFAULT 'v1.0.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookup by status and code
CREATE INDEX IF NOT EXISTS idx_colleges_code ON public.colleges(code);
CREATE INDEX IF NOT EXISTS idx_colleges_status ON public.colleges(status);

-- 2. COLLEGE MEMBERSHIPS (Explicit College-User Binding)
CREATE TABLE IF NOT EXISTS public.college_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
    is_primary BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(college_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_college_memberships_user ON public.college_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_college_memberships_college ON public.college_memberships(college_id);

-- 3. COLLEGE DYNAMIC CONFIGURATIONS (Roles, Modules, Features, Navigation, Pages per College)
CREATE TABLE IF NOT EXISTS public.college_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
    config_type TEXT NOT NULL CHECK (config_type IN ('roles', 'modules', 'features', 'permissions', 'navigation', 'pages', 'dashboards', 'forms', 'workflows', 'settings', 'theme')),
    target_role TEXT NOT NULL DEFAULT 'global',
    is_published BOOLEAN NOT NULL DEFAULT true,
    version INT NOT NULL DEFAULT 1,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(college_id, config_type, target_role, is_published)
);

CREATE INDEX IF NOT EXISTS idx_college_configs_college ON public.college_configurations(college_id, config_type);

-- 4. REUSABLE CONFIGURATION TEMPLATES
CREATE TABLE IF NOT EXISTS public.college_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name TEXT NOT NULL UNIQUE,
    description TEXT,
    institution_type TEXT NOT NULL DEFAULT 'Paramedical',
    roles JSONB NOT NULL DEFAULT '[]'::jsonb,
    modules JSONB NOT NULL DEFAULT '[]'::jsonb,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    navigation JSONB NOT NULL DEFAULT '{}'::jsonb,
    dashboards JSONB NOT NULL DEFAULT '{}'::jsonb,
    forms JSONB NOT NULL DEFAULT '{}'::jsonb,
    workflows JSONB NOT NULL DEFAULT '{}'::jsonb,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_builtin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. PLATFORM AUDIT LOGS (Immutable Platform Super Admin Audit Trail)
CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    super_admin_email TEXT NOT NULL,
    super_admin_id UUID,
    college_id UUID REFERENCES public.colleges(id) ON DELETE SET NULL,
    college_code TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_college ON public.platform_audit_logs(college_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_action ON public.platform_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_platform_audit_created ON public.platform_audit_logs(created_at DESC);

-- 6. SEED PRIMARY INITIAL COLLEGE: Adithyan College of Allied Health Sciences
INSERT INTO public.colleges (
    id,
    name,
    code,
    logo_url,
    status,
    institution_type,
    contact_email,
    contact_phone,
    address,
    website,
    academic_config,
    branding_config
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Adithyan College of Allied Health Sciences',
    'ADH-COLLEGE',
    '/lovable-uploads/8ea95178-bb37-43e2-ae4d-595e31707954.png',
    'active',
    'Paramedical',
    'admin@adithyan.edu.in',
    '+91 (044) 2876-4100',
    'Adithyan Nagar, Coimbatore, Tamil Nadu, India',
    'https://adithyan.edu.in',
    '{
      "programs": ["B.Sc Allied Health", "B.VOC Healthcare", "Diploma Allied Health"],
      "academicYears": ["2024-2025", "2025-2026", "2026-2027"],
      "semesterStructure": "Semester (1 to 8)",
      "departments": [
        "Cardiac Technology",
        "Dialysis Technology",
        "Radiology & Imaging Technology",
        "Operation Theatre & Anaesthesia Technology",
        "Medical Laboratory Technology",
        "Physician Assistant",
        "Critical Care Technology"
      ]
    }'::jsonb,
    '{
      "palette": "blue",
      "primaryColor": "#1e40af",
      "fontScale": "md",
      "layoutDensity": "normal"
    }'::jsonb
) ON CONFLICT (code) DO NOTHING;

-- Seed built-in platform templates
INSERT INTO public.college_templates (
    template_name,
    description,
    institution_type,
    is_builtin,
    modules,
    features,
    roles
) VALUES (
    'Default Paramedical ERP Template',
    'Complete institutional configuration template for Paramedical and Allied Health Science colleges with clinical rotations and NAAC accreditation.',
    'Paramedical',
    true,
    '[
      {"id": "students", "name": "Student Management", "enabled": true},
      {"id": "faculty", "name": "Faculty & Staff Directory", "enabled": true},
      {"id": "academics", "name": "Academics & Timetables", "enabled": true},
      {"id": "attendance", "name": "Biometric & Class Attendance", "enabled": true},
      {"id": "examinations", "name": "Exam Cell & Gradebook", "enabled": true},
      {"id": "finance", "name": "Fee Collection & Accounts", "enabled": true},
      {"id": "admissions", "name": "Admissions & Verification", "enabled": true},
      {"id": "certificates", "name": "Bonafide & Document Generation", "enabled": true},
      {"id": "medical", "name": "Infirmary & Clinical Health", "enabled": true},
      {"id": "naac", "name": "NAAC Accreditation System", "enabled": true},
      {"id": "transport", "name": "Fleet & Bus Tracking", "enabled": true},
      {"id": "store", "name": "Inventory & Uniform Store", "enabled": true}
    ]'::jsonb,
    '[
      {"id": "student_admission_provisioning", "enabled": true},
      {"id": "fee_receipt_pdf_export", "enabled": true},
      {"id": "hall_ticket_download", "enabled": true},
      {"id": "parent_telemetry_access", "enabled": true},
      {"id": "naac_repository_evidence", "enabled": true}
    ]'::jsonb,
    '[
      {"role": "admin", "label": "College Administrator", "category": "Administration"},
      {"role": "principal", "label": "Principal", "category": "Administration"},
      {"role": "teacher", "label": "Faculty & Instructor", "category": "Academic"},
      {"role": "student", "label": "Enrolled Student", "category": "Student & Parent"},
      {"role": "parent", "label": "Parent / Guardian", "category": "Student & Parent"},
      {"role": "finance_manager", "label": "Finance Manager", "category": "Finance"},
      {"role": "store_manager", "label": "Store Keeper", "category": "Operations"},
      {"role": "transport_driver", "label": "Transport Driver", "category": "Operations"},
      {"role": "receptionist", "label": "Front Desk Receptionist", "category": "Operations"}
    ]'::jsonb
),
(
    'Minimal College Template',
    'Streamlined lightweight ERP template containing only essential core academic, attendance, and student registry modules.',
    'Paramedical',
    true,
    '[
      {"id": "students", "name": "Student Management", "enabled": true},
      {"id": "faculty", "name": "Faculty Directory", "enabled": true},
      {"id": "academics", "name": "Academics", "enabled": true},
      {"id": "attendance", "name": "Class Attendance", "enabled": true},
      {"id": "finance", "name": "Fee Management", "enabled": true}
    ]'::jsonb,
    '[
      {"id": "fee_receipt_pdf_export", "enabled": true}
    ]'::jsonb,
    '[
      {"role": "admin", "label": "College Administrator", "category": "Administration"},
      {"role": "teacher", "label": "Teacher", "category": "Academic"},
      {"role": "student", "label": "Student", "category": "Student & Parent"},
      {"role": "parent", "label": "Parent", "category": "Student & Parent"},
      {"role": "finance_manager", "label": "Finance Officer", "category": "Finance"}
    ]'::jsonb
),
(
    'Full Multi-Disciplinary ERP Template',
    'Comprehensive platform deployment for large institutional universities with all 17 user roles, hostel management, placement cells, and sports councils.',
    'Multi-Disciplinary',
    true,
    '[
      {"id": "students", "name": "Student Management", "enabled": true},
      {"id": "faculty", "name": "Faculty & Staff Directory", "enabled": true},
      {"id": "academics", "name": "Academics & Timetables", "enabled": true},
      {"id": "attendance", "name": "Biometric Attendance", "enabled": true},
      {"id": "examinations", "name": "Examination Cell", "enabled": true},
      {"id": "finance", "name": "Finance & Accounts", "enabled": true},
      {"id": "admissions", "name": "Admissions", "enabled": true},
      {"id": "certificates", "name": "Certificates", "enabled": true},
      {"id": "medical", "name": "Medical Center", "enabled": true},
      {"id": "naac", "name": "NAAC Review", "enabled": true},
      {"id": "transport", "name": "Transport Fleet", "enabled": true},
      {"id": "store", "name": "Campus Store", "enabled": true},
      {"id": "library", "name": "Digital Library", "enabled": true},
      {"id": "hostel", "name": "Hostel Management", "enabled": true},
      {"id": "placements", "name": "Placement Drives", "enabled": true},
      {"id": "alumni", "name": "Alumni Association", "enabled": true}
    ]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
) ON CONFLICT (template_name) DO NOTHING;

-- Enable Row Level Security (RLS) on newly created tables
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.college_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.college_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.college_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated read on colleges and templates
CREATE POLICY "Public or authenticated users can read active colleges" 
ON public.colleges FOR SELECT USING (status != 'archived');

CREATE POLICY "Authenticated users can read college templates" 
ON public.college_templates FOR SELECT USING (true);

-- College membership read policy: users can read their own memberships
CREATE POLICY "Users can read their own college memberships" 
ON public.college_memberships FOR SELECT 
USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'platform_super_admin');
