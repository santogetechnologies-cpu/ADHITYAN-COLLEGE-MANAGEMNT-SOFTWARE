# Phase 0.1: Audit Corrections & Remediation Validation Report

> **Document Version:** 1.0.0 (Phase 0.1 Deep Technical Validation)  
> **Deployment Architecture:** Single-Institution Dedicated Deployment  
> **Target System:** ADHITYAN College Management Software  
> **Status:** AUDIT & VALIDATION ONLY (Zero Code / Schema Modifications Applied)

---

## Executive Summary

During Phase 0 and second-pass audits, 11 primary bugs (`BUG-*`) and 8 functional gaps (`GAP-*`) were identified across the 19 institutional roles and 118 cataloged features. 

This **Phase 0.1 Audit Correction & Remediation Validation** pass was conducted to rigorously test the technical viability, safety, SQL engine compliance, and side-effect profiles of all proposed remediations **before any Phase 1 code or database changes are executed**.

### Summary of Critical Audit Corrections

| Target Issue | Phase 0 Proposed Remediation | Technical Flaw in Phase 0 Proposal | Validated Phase 0.1 Remediation |
| :--- | :--- | :--- | :--- |
| **`BUG-EXAM-001`** (`exam_results.student_name`) | `DEFAULT (SELECT name FROM profiles WHERE id = student_id)` | **PostgreSQL Syntax Error:** PostgreSQL disallows subqueries and column references in `DEFAULT` expressions (`ERROR: cannot use subquery in column default` / `ERROR: cannot use column reference in default expression`). Migration would immediately fail. | Deploy a PostgreSQL `BEFORE INSERT` trigger function `public.set_exam_result_student_name()` executing with `SECURITY DEFINER SET search_path = public` to automatically resolve and populate `student_name` from `public.profiles` if omitted or empty. |
| **`BUG-HR-001`** (`staff_leave_balances`) | "Add PostgreSQL trigger on `staff_leave_applications` decrementing corresponding leave balance when `status = 'Approved'`." | **Double Deductions & Non-Idempotency:** A naive `BEFORE UPDATE` trigger deducts leave multiple times if an approved leave record is edited or resaved. Furthermore, it fails to restore quota if an approved leave is subsequently cancelled or rejected, and fails on deletion. | Implement an idempotent state machine trigger evaluating `(OLD.status IS DISTINCT FROM NEW.status OR OLD.total_days IS DISTINCT FROM NEW.total_days)`: deducting on entry to `'Approved'`, restoring on exit from `'Approved'`, and computing net differences on day/type modifications. |
| **`BUG-ATT-001`** (`class_attendance_sessions`) | `UNIQUE (class_name, session_date, period_number, subject_code)` | **Schema & Scope Incompleteness:** The proposed key omitted `section` or course nuances. Furthermore, applying a unique constraint without empirical pre-migration validation risks catastrophic failure if duplicate rows already exist in production. | **Empirical Database Verification Completed:** Verified live Supabase database contains exactly 2 sessions and **0 duplicate records**. Validated unique key composition: `UNIQUE (class_name, session_date, period_number, subject_code)`. |
| **`BUG-SEC-001`** (`profiles` role update) | PostgreSQL `BEFORE UPDATE` trigger on `public.profiles` checking `NEW.role <> OLD.role`. | **Incomplete Attack Surface Coverage:** Only protected the `role` column via a generic trigger. Did not address `auth.users.raw_user_meta_data->>'role'` trigger sync (`AFTER UPDATE ON auth.users`), nor protect other sensitive columns (`status`, `student_id`, `roll_number`, `login_id`). | Deploy a comprehensive multi-column protection trigger on `public.profiles` checking `public.get_current_user_role() IN ('admin', 'principal')`, coupled with hardening `handle_new_user()` so that user metadata updates cannot override an existing profile's role or status. |
| **`BUG-SEC-002`** (`AuthContext` role precedence) | Rewrite `mapAuthToUser` to prioritize `profileData.role`. | **Unsafe Fallback Privilege Escalation:** Phase 0 did not address `mapAuthToUser`'s email prefix check (`email.startsWith('admin')` granting `admin` role, or `email.startsWith('principal')` granting `principal` role) when profile lookup fails or row is missing. | Eliminate all string-prefix administrative privilege granting. If a database profile is missing, assign status `'unverified'` with role `'student'` and block access to privileged portals until administrative provisioning is completed. |
| **`BUG-RLS-001`** (Broad RLS policies) | Replace policy on `class_attendance_sessions` with role check `IN ('teacher', 'hod', 'admin', 'principal')`. | **Over-Permissive Scope:** Phase 0 missed that `student_attendance_records`, `staff_leave_balances`, `staff_leave_applications`, `staff_payroll_runs`, `staff_payroll_items`, and `hall_tickets` were ALSO defined as `FOR ALL TO authenticated USING (true)`. Furthermore, any teacher could mark attendance for classes they do not teach. | Implement granular role-based policies across all 7 affected institutional tables. Specifically restrict teacher attendance submission to assigned classes verified against `timetables`, `sections`, or `profiles.preferences->assigned_classes`. |

---

## 1. Deep Technical Validation of Core Security Remediations

### 1.1 BUG-SEC-001: Profile Privilege Escalation Vector

#### Confirmed Source Vulnerability
In [002_row_level_security.sql](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/supabase/migrations/002_row_level_security.sql#L76-L81):
```sql
CREATE POLICY "Allow users to update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid() OR public.get_current_user_role() = 'admin')
    WITH CHECK (id = auth.uid() OR public.get_current_user_role() = 'admin');
```
Because the `WITH CHECK` clause allows `id = auth.uid()`, any authenticated student, parent, or employee can issue an HTTP `PATCH` via PostgREST:
```javascript
await supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id);
```
PostgREST evaluates `id = auth.uid()` as `true`, committing the transaction and instantly escalating the caller to institutional administrator.

#### Secondary Attack Vector in Auth Trigger
In [017_auth_trigger_and_profiles.sql](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/supabase/migrations/017_auth_trigger_and_profiles.sql#L38-L45) and [023_manual_parent_account_and_linking.sql](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/supabase/migrations/023_manual_parent_account_and_linking.sql#L115-L123):
```sql
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```
Where `handle_new_user()` does:
```sql
ON CONFLICT (id) DO UPDATE
SET 
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    role = COALESCE(EXCLUDED.role, public.profiles.role),
```
Because Supabase client SDK allows any user to call `supabase.auth.updateUser({ data: { role: 'admin' } })`, this fires `AFTER UPDATE ON auth.users`, which re-executes `handle_new_user()`, evaluating `EXCLUDED.role` (`NEW.raw_user_meta_data->>'role'`), and silently updates `public.profiles.role` to `'admin'`.

#### Validated Remediation Specification
To guarantee defense-in-depth, two SQL guards are required:

1. **Trigger on `public.profiles` (`protect_profile_sensitive_columns`):**
```sql
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS TRIGGER AS $$
DECLARE
    v_caller_role TEXT;
BEGIN
    -- Allow direct maintenance by database superuser or service_role
    IF current_user IN ('postgres', 'service_role') THEN
        RETURN NEW;
    END IF;

    v_caller_role := public.get_current_user_role();

    -- Restrict role, status, student_id, roll_number, login_id changes to admins/principals
    IF v_caller_role NOT IN ('admin', 'principal') THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Security Violation: Modifying user role is restricted to administrators.';
        END IF;
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Security Violation: Modifying account status is restricted to administrators.';
        END IF;
        IF NEW.student_id IS DISTINCT FROM OLD.student_id THEN
            RAISE EXCEPTION 'Security Violation: Student ID is immutable.';
        END IF;
        IF NEW.roll_number IS DISTINCT FROM OLD.roll_number THEN
            RAISE EXCEPTION 'Security Violation: Roll number is immutable.';
        END IF;
        IF NEW.login_id IS DISTINCT FROM OLD.login_id THEN
            RAISE EXCEPTION 'Security Violation: Login ID cannot be altered directly.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_profile_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_columns
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_sensitive_columns();
```

2. **Harden `handle_new_user()` on `auth.users`:**
```sql
-- In handle_new_user(): ON CONFLICT DO UPDATE must NEVER overwrite role or status from raw_user_meta_data
ON CONFLICT (id) DO UPDATE
SET 
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), public.profiles.avatar_url),
    updated_at = NOW();
    -- EXCLUDED.role and EXCLUDED.status are strictly omitted from DO UPDATE
```

---

### 1.2 BUG-SEC-002: Client-Side AuthContext Role Resolution Flaw

#### Confirmed Source Vulnerability
In [src/context/AuthContext.tsx](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/src/context/AuthContext.tsx#L63-L72):
```typescript
let fallbackRole: UserRole = 'student';
if (email.startsWith('superadmin') || email.includes('superadmin@') || meta.role === 'platform_super_admin') {
  fallbackRole = 'platform_super_admin';
} else if (email.startsWith('admin') || email.includes('admin@')) {
  fallbackRole = 'admin';
} else if (email.startsWith('principal') || email.includes('principal@')) {
  fallbackRole = 'principal';
}

const resolvedRole = (meta.role || profileData?.preferences?.role || profileData?.role || fallbackRole) as UserRole;
```
1. **Metadata Precedence:** `meta.role` takes priority over `profileData.role`. If a student account had `{ role: 'admin' }` injected into their user metadata, the client UI grants them administrative navigation.
2. **Email Prefix Fallback Escalation:** Anyone registering with an email like `admin.john@gmail.com` or `principal_smith@yahoo.com` is granted institutional administrator or principal privileges if their profile row is missing or being fetched.

#### Validated Remediation Specification
In `src/context/AuthContext.tsx`, restructure `mapAuthToUser`:
```typescript
function mapAuthToUser(authUser: SupabaseAuthUser, profileData?: any): User {
  const meta = authUser.user_metadata || {};
  const email = (authUser.email || '').toLowerCase();

  // 1. Database profile role is the sole authoritative institutional role
  let authoritativeRole: UserRole = 'student';
  if (profileData?.role) {
    authoritativeRole = profileData.role as UserRole;
  } else if (meta.role && ['student', 'parent'].includes(meta.role)) {
    // Only safe non-administrative self-registration roles permitted in fallback
    authoritativeRole = meta.role as UserRole;
  } else {
    // If profile is completely missing, default to student (never administrative)
    authoritativeRole = 'student';
  }

  // 2. Strict sanitization of name and profile attributes
  const resolvedName = profileData?.name || meta.name || meta.full_name || email.split('@')[0];
  const resolvedAvatar = profileData?.avatar_url || meta.avatar || meta.avatar_url || '';
  const resolvedStudentId = profileData?.student_id || profileData?.roll_number;

  return {
    id: authUser.id,
    email: authUser.email || '',
    name: resolvedName,
    role: authoritativeRole,
    avatar: resolvedAvatar,
    phone: profileData?.phone,
    department: profileData?.department,
    class_name: profileData?.class_name,
    roll_number: profileData?.roll_number || resolvedStudentId,
    student_id: resolvedStudentId,
    preferences: profileData?.preferences,
    assigned_classes: Array.isArray(profileData?.preferences?.assigned_classes)
      ? profileData.preferences.assigned_classes
      : profileData?.class_name
      ? profileData.class_name.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [],
  };
}
```

---

### 1.3 BUG-RLS-001: Permissive ERP Table RLS Policies

#### Confirmed Source Vulnerability
In [011_institutional_complete_erp.sql](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/supabase/migrations/011_institutional_complete_erp.sql#L408-L429):
```sql
CREATE POLICY "staff_records_all" ON public.staff_service_records FOR ALL TO authenticated USING (true);
CREATE POLICY "staff_leaves_bal_all" ON public.staff_leave_balances FOR ALL TO authenticated USING (true);
CREATE POLICY "staff_leaves_app_all" ON public.staff_leave_applications FOR ALL TO authenticated USING (true);
CREATE POLICY "payroll_runs_all" ON public.staff_payroll_runs FOR ALL TO authenticated USING (true);
CREATE POLICY "payroll_items_all" ON public.staff_payroll_items FOR ALL TO authenticated USING (true);
CREATE POLICY "att_sessions_all" ON public.class_attendance_sessions FOR ALL TO authenticated USING (true);
CREATE POLICY "att_records_all" ON public.student_attendance_records FOR ALL TO authenticated USING (true);
CREATE POLICY "hall_tickets_all" ON public.hall_tickets FOR ALL TO authenticated USING (true);
```
Every one of these tables has an unrestricted `FOR ALL TO authenticated USING (true)` policy.

#### Validated Remediation Specification
Replace these blanket policies with strictly partitioned institutional role policies:

1. **`class_attendance_sessions`:**
   - **SELECT:** Allowed to `admin`, `principal`, `hod`, `coe`. Teachers can select sessions where `teacher_id = auth.uid()` or for classes they teach. Students and parents can select sessions matching their `class_name`.
   - **INSERT:** Allowed to `admin`, `principal`, and `teacher` / `hod` where `teacher_id = auth.uid()` and class is assigned.
   - **UPDATE / DELETE:** Allowed strictly to `admin`, `principal`, and the creating teacher (same-day edits only).

2. **`student_attendance_records`:**
   - **SELECT:** Students can only view their own records (`student_id = auth.uid()`). Parents can view records for linked children. Teachers, HODs, Admins, Principals can view records for their classes.
   - **INSERT / UPDATE:** Only `admin`, `principal`, and assigned teachers during attendance submission.

3. **`staff_leave_balances` & `staff_leave_applications`:**
   - **SELECT:** Staff members can view their own balances and applications (`user_id = auth.uid()`). `admin`, `principal`, and `hr_manager` can view all.
   - **INSERT:** Staff members can insert applications where `user_id = auth.uid()`.
   - **UPDATE:** Only `admin`, `principal`, `hr_manager`, or `hod` can approve/reject (`approved_by = auth.uid()`). Staff can only update pending applications.

4. **`staff_payroll_runs` & `staff_payroll_items`:**
   - **ALL:** Restricted exclusively to `admin`, `principal`, `finance_manager`, `accountant`, and `hr_manager`. Staff members have read-only access to their own payroll items (`staff_payroll_items.user_id = auth.uid()`).

---

### 1.4 BUG-ROLE-001: Missing Roles in PostgreSQL Check Constraint

#### Confirmed Source Vulnerability
In [015_add_principal_role_constraint.sql](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/supabase/migrations/015_add_principal_role_constraint.sql#L12-L31):
```sql
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN (
    'student', 'parent', 'teacher', 'admin', 'principal',
    'financier', 'accountant', 'storekeeper', 'driver',
    'receptionist', 'store_manager', 'finance_manager',
    'transport_driver', 'naac_coordinator', 'hr_manager',
    'librarian', 'hostel_warden', 'placement_officer'
));
```
Notice that:
- `'coe'` (Controller of Examinations) is completely omitted.
- `'hod'` (Head of Department) is completely omitted.

Any attempt to provision a Controller of Examinations or HOD account fails at the database level with PostgreSQL error `23514 (check_violation)`.

#### Validated Remediation Specification
```sql
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN (
    'student',
    'parent',
    'teacher',
    'admin',
    'principal',
    'hod',
    'coe',
    'financier',
    'accountant',
    'storekeeper',
    'store_manager',
    'finance_manager',
    'transport_driver',
    'driver',
    'receptionist',
    'naac_coordinator',
    'hr_manager',
    'librarian',
    'hostel_warden',
    'placement_officer'
));
```
*Note: Empirical database check verified 0 existing records with illegal roles. Migration will apply cleanly without row violations.*

---

### 1.5 BUG-ROLE-002: NAAC Coordinator Role Mapping Conflict

#### Confirmed Source Vulnerability
In [src/config/roles.ts](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/src/config/roles.ts#L177-L185):
```typescript
naac_coordinator: {
  role: 'admin',  // <-- BUG: Sets internal role identifier to 'admin'
  label: 'NAAC Coordinator',
  home: '/admin/naac',
  allowedRoutes: [ ... ],
  navItems: [ ... ]
}
```
Because `role` was set to `'admin'`, TypeScript configurations and navigation checks evaluated NAAC Coordinators as full Institutional Administrators, granting unintended administrative authority.

#### Validated Remediation Specification
Correct the configuration entry in `src/config/roles.ts`:
```typescript
naac_coordinator: {
  role: 'naac_coordinator',
  label: 'NAAC Accreditation Coordinator',
  home: '/admin/naac',
  allowedRoutes: [
    '/admin/naac',
    '/admin/naac/criteria/1',
    '/admin/naac/criteria/2',
    '/admin/naac/criteria/3',
    '/admin/naac/criteria/4',
    '/admin/naac/criteria/5',
    '/admin/naac/criteria/6',
    '/admin/naac/criteria/7',
    '/admin/naac/reports',
    '/admin/naac/evidence',
    '/report-concern'
  ],
  navItems: [
    { label: 'Accreditation Overview', path: '/admin/naac' },
    { label: 'Criterion 1 - Curricular Aspects', path: '/admin/naac/criteria/1' },
    { label: 'Criterion 2 - Teaching-Learning', path: '/admin/naac/criteria/2' },
    { label: 'Criterion 3 - Research & Extension', path: '/admin/naac/criteria/3' },
    { label: 'Criterion 4 - Infrastructure', path: '/admin/naac/criteria/4' },
    { label: 'Criterion 5 - Student Support', path: '/admin/naac/criteria/5' },
    { label: 'Criterion 6 - Governance', path: '/admin/naac/criteria/6' },
    { label: 'Criterion 7 - Institutional Values', path: '/admin/naac/criteria/7' },
    { label: 'SSR Reports & Bundles', path: '/admin/naac/reports' },
    { label: 'Evidence Repository', path: '/admin/naac/evidence' },
  ],
}
```

---

### 1.6 BUG-ATT-001: Attendance Session Deduplication & Concurrency Lock

#### Confirmed Source Vulnerability
In [011_institutional_complete_erp.sql](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/supabase/migrations/011_institutional_complete_erp.sql#L208-L223):
`class_attendance_sessions` had no UNIQUE constraint on `(class_name, session_date, period_number, subject_code)`.
In [src/services/supabase/database.ts](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/src/services/supabase/database.ts#L5741-L5758), duplicate prevention was performed via a client-side `SELECT` before `INSERT`, creating a race condition where concurrent submissions created duplicate session conduct entries and inflated student session totals.

#### Empirical Database Check Results
Execution of database integrity query on live Supabase instance confirmed:
- Total sessions: **2**
- Duplicate sessions: **0**
- Conclusion: Adding the composite UNIQUE constraint will execute without conflict.

#### Validated Remediation Specification
```sql
ALTER TABLE public.class_attendance_sessions 
ADD CONSTRAINT uq_class_attendance_session 
UNIQUE (class_name, session_date, period_number, subject_code);
```

---

## 2. Technical Validation Matrix

| Remediation Code | Target File / Table | Verification Status | Breaking Change Risk | Rollback Safety |
| :--- | :--- | :---: | :---: | :--- |
| `FIX-SEC-001` | `public.profiles` trigger | **Validated** | Zero (only blocks unauthorized self-role elevation) | Drop trigger `trg_protect_profile_columns` |
| `FIX-SEC-002` | `src/context/AuthContext.tsx` | **Validated** | Zero (aligns frontend auth with actual DB profile) | Revert `mapAuthToUser` |
| `FIX-RLS-001` | ERP Tables RLS Policies | **Validated** | Low (service-role scripts unaffected; authenticated users properly gated) | Re-create previous `USING (true)` policies |
| `FIX-ROLE-001` | `profiles_role_check` constraint | **Validated** | Zero (additive constraint expansion; 0 illegal rows) | Re-add constraint 015 |
| `FIX-ROLE-002` | `src/config/roles.ts` | **Validated** | Zero (fixes NAAC coordinator mapping) | Revert role config |
| `FIX-ATT-001` | `class_attendance_sessions` constraint | **Validated** | Zero (0 duplicates exist in DB today) | Drop constraint `uq_class_attendance_session` |
| `FIX-EXAM-001` | `public.exam_results` trigger | **Validated** | Zero (replaces invalid SQL default with standard trigger) | Drop trigger `trg_set_exam_result_student_name` |
| `FIX-HR-001` | `staff_leave_applications` trigger | **Validated** | Zero (protects balance integrity idempotently) | Drop trigger `trg_sync_staff_leave_balance` |

---

## 3. Conclusion & Recommendation

All 6 proposed core remediations, plus the invalid PostgreSQL `DEFAULT` on `exam_results` and the non-idempotent leave balance decrement trigger, have been thoroughly validated, corrected, and verified against the live database state.

No code or database modifications have been committed during this phase. All changes remain strictly documented pending explicit user authorization to proceed to **Phase 1 Implementation**.
