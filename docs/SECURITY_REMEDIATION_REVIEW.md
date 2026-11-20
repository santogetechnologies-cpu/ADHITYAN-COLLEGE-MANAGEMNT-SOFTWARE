# Comprehensive Security Remediation Review

> **Document Version:** 1.0.0 (Phase 0.1 Security Architecture Hardening)  
> **Deployment Architecture:** Single-Institution Dedicated Deployment  
> **Target System:** ADHITYAN College Management Software  
> **Status:** AUDIT & ARCHITECTURAL SPECIFICATION ONLY (Zero Changes Applied)

---

## Executive Summary

This document presents a comprehensive, production-grade security review of the entire ADHITYAN College Management Software. It scrutinizes the multi-tier security perimeter—from PostgreSQL triggers, Row Level Security (RLS) policies, and `SECURITY DEFINER` execution contexts, to Edge Function JWT verification, Supabase Storage bucket access controls, and client-side authentication lifecycles.

Ten critical security domains were evaluated:
1. **PostgreSQL `SECURITY DEFINER` Execution Context & `search_path` Vulnerability**
2. **Service-Role Operations & Trusted Administrative Provisioning**
3. **Audit of All Permissive RLS Policies (`USING (true)`) on Institutional Tables**
4. **Parent-Student Link Creation, Verification & Modification Controls**
5. **Column-Level Protection for Sensitive Profile Attributes**
6. **Edge Function Authorization & Role Verification Flaws**
7. **Storage Bucket Access & Deletion Policies**
8. **RPC Execution Permissions & Data Leakage**
9. **Authentication Failure Behavior & Missing Profile Escalation**
10. **Cross-Tier Role Consistency (Frontend, Types, Database, Functions)**

---

## 1. PostgreSQL `SECURITY DEFINER` Execution Context & `search_path` Vulnerability

### 1.1 Threat Assessment
PostgreSQL executes `SECURITY DEFINER` functions with the privileges of the user that created them (in Supabase, `postgres` superuser). If a function does not explicitly declare a fixed `search_path`, PostgreSQL evaluates object references against the caller's active schema search path.

A malicious authenticated user can create a shadow table or operator in a schema they control (e.g., `pg_temp` or a user-created schema) and invoke a `SECURITY DEFINER` function. The function may resolve the malicious object with superuser authority, resulting in arbitrary code execution or privilege hijacking.

### 1.2 Inventory of Unhardened Functions
An exhaustive audit of all migrations identified **21 `SECURITY DEFINER` functions**, **none of which declare `SET search_path = public`**:

| # | Function Name | Source Migration | Line Reference | Current Declared Search Path |
| :-: | :--- | :--- | :--- | :---: |
| 1 | `public.get_current_user_role()` | `002_row_level_security.sql` | Line 10 | **NONE (Vulnerable)** |
| 2 | `public.handle_new_user()` | `017_auth_trigger_and_profiles.sql` | Line 49 | **NONE (Vulnerable)** |
| 3 | `public.handle_new_user()` (updated) | `023_manual_parent_account_and_linking.sql` | Line 127 | **NONE (Vulnerable)** |
| 4 | `public.place_store_order(...)` | `006_student_portal_enhancements.sql` | Line 37 | **NONE (Vulnerable)** |
| 5 | `public.is_parent_of(...)` | `007_parent_portal_enhancements.sql` | Line 42 | **NONE (Vulnerable)** |
| 6 | `public.issue_library_book(...)` | `018_erp_production_enhancements.sql` | Line 86 | **NONE (Vulnerable)** |
| 7 | `public.return_library_book(...)` | `018_erp_production_enhancements.sql` | Line 127 | **NONE (Vulnerable)** |
| 8 | `public.checkout_store_order(...)` | `018_erp_production_enhancements.sql` | Line 199 | **NONE (Vulnerable)** |
| 9 | `public.get_admin_overview_stats()` | `018_erp_production_enhancements.sql` | Line 234 | **NONE (Vulnerable)** |
| 10 | `public.generate_student_id()` | `020_centralized_student_id_system.sql` | Line 273 | **NONE (Vulnerable)** |
| 11 | `public.generate_student_id()` (v2) | `024_student_parent_portal_complete_workflow.sql` | Line 101 | **NONE (Vulnerable)** |
| 12 | `public.generate_parent_id()` | `024_student_parent_portal_complete_workflow.sql` | Line 144 | **NONE (Vulnerable)** |
| 13 | `public.resolve_login_id(...)` | `023_manual_parent_account_and_linking.sql` | Line 78 | **NONE (Vulnerable)** |
| 14 | `public.sync_attendance_student_metadata()` | `021_student_attendance_and_mood_separation.sql` | Line 39 | **NONE (Vulnerable)** |
| 15 | `public.sync_mood_student_id()` | `021_student_attendance_and_mood_separation.sql` | Line 130 | **NONE (Vulnerable)** |
| 16 | `public.trg_notify_new_concern()` | `005_realtime_setup.sql` | Line 89 | **NONE (Vulnerable)** |
| 17 | `public.trg_notify_concern_status_update()`| `005_realtime_setup.sql` | Line 120 | **NONE (Vulnerable)** |
| 18 | `public.trg_notify_new_assignment()` | `005_realtime_setup.sql` | Line 153 | **NONE (Vulnerable)** |
| 19 | `public.trg_notify_new_feedback()` | `005_realtime_setup.sql` | Line 184 | **NONE (Vulnerable)** |
| 20 | `public.trg_notify_wellness_alert()` | `005_realtime_setup.sql` | Line 221 | **NONE (Vulnerable)** |
| 21 | `public.trg_notify_teaching_update()` | `005_realtime_setup.sql` | Line 254 | **NONE (Vulnerable)** |

### 1.3 Validated Remediation Standard
Every `SECURITY DEFINER` function must explicitly append `SET search_path = public` to its definition:
```sql
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
```

---

## 2. Service-Role Operations & Trusted Administrative Provisioning

### 2.1 Threat Assessment: Client-Side Fallback via `getAdminClient()`
In [src/services/supabase/database.ts](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/src/services/supabase/database.ts#L39-L45):
```typescript
async function getAdminClient() {
  if (typeof process === 'undefined') return null;
  const adminKey = process.env?.SUPABASE_SECRET_KEY || 'sb_secret_...';
  const url = process.env?.VITE_SUPABASE_URL || 'https://...';
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, adminKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
```
In browser environments, `typeof process === 'undefined'` prevents client instantiation. However, in build configurations or SSR contexts where `process` is polyfilled, bundling the service role key exposes master database authority to the browser client.

### 2.2 Validated Administrative Flow Standard
1. **Strict Key Separation:** `SUPABASE_SERVICE_ROLE_KEY` must **never** be referenced in any file inside `src/`. It must reside strictly in backend server environments (`src/server/adminBackend.ts`) and Supabase Edge Functions (`supabase/functions/`).
2. **Administrative Provisioning Boundary:** All account provisioning, role changes, and system configuration must route via authenticated POST calls to `src/server/adminBackend.ts` or Supabase Edge Functions, validating caller session and database-backed administrative permissions before performing service-role writes.

---

## 3. Audit of Permissive RLS Policies (`USING (true)`) on Institutional Tables

### 3.1 Confirmed Over-Permissive Policies
In [011_institutional_complete_erp.sql](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/supabase/migrations/011_institutional_complete_erp.sql#L408-L429), 14 ERP tables were granted unconditional read/write access to any authenticated user:

```sql
CREATE POLICY "staff_records_all" ON public.staff_service_records FOR ALL TO authenticated USING (true);
CREATE POLICY "staff_leaves_bal_all" ON public.staff_leave_balances FOR ALL TO authenticated USING (true);
CREATE POLICY "staff_leaves_app_all" ON public.staff_leave_applications FOR ALL TO authenticated USING (true);
CREATE POLICY "payroll_runs_all" ON public.staff_payroll_runs FOR ALL TO authenticated USING (true);
CREATE POLICY "payroll_items_all" ON public.staff_payroll_items FOR ALL TO authenticated USING (true);
CREATE POLICY "att_sessions_all" ON public.class_attendance_sessions FOR ALL TO authenticated USING (true);
CREATE POLICY "att_records_all" ON public.student_attendance_records FOR ALL TO authenticated USING (true);
CREATE POLICY "shortage_warnings_all" ON public.attendance_shortage_warnings FOR ALL TO authenticated USING (true);
CREATE POLICY "hall_tickets_all" ON public.hall_tickets FOR ALL TO authenticated USING (true);
CREATE POLICY "library_circ_all" ON public.library_circulation FOR ALL TO authenticated USING (true);
CREATE POLICY "hostel_rooms_all" ON public.hostel_rooms FOR ALL TO authenticated USING (true);
CREATE POLICY "hostel_out_passes_all" ON public.hostel_out_passes FOR ALL TO authenticated USING (true);
CREATE POLICY "placement_drives_all" ON public.placement_drives FOR ALL TO authenticated USING (true);
CREATE POLICY "placement_apps_all" ON public.placement_applications FOR ALL TO authenticated USING (true);
CREATE POLICY "broadcasts_all" ON public.institutional_broadcasts FOR ALL TO authenticated USING (true);
```

### 3.2 Impact
- **Attendance Tampering:** Students can edit attendance status and period conduct records.
- **Financial/Payroll Tampering:** Any employee or student can modify payroll runs and item disbursements.
- **Leave Manipulation:** Any user can mark their own leave applications as `'Approved'` and alter remaining leave balances.
- **Hall Ticket Tampering:** Students can alter exam eligibility, fee clearance flags, and seat allocations.

### 3.3 Validated Replacement Policies Matrix

| Table | SELECT Policy | INSERT Policy | UPDATE / DELETE Policy |
| :--- | :--- | :--- | :--- |
| `class_attendance_sessions` | `admin, principal, hod, coe`, assigned teachers, or students/parents matching `class_name` | `admin, principal`, or `teacher` where `teacher_id = auth.uid()` and class is assigned | `admin, principal`, or creator teacher within 24h |
| `student_attendance_records` | `student_id = auth.uid()`, linked parents, or assigned teachers / admins | `admin, principal`, or assigned teachers during session submission | `admin, principal`, or creator teacher |
| `staff_leave_balances` | `user_id = auth.uid()` or `admin, principal, hr_manager` | `admin, principal, hr_manager` | Database triggers only (direct updates blocked) |
| `staff_leave_applications` | `user_id = auth.uid()` or `admin, principal, hr_manager, hod` | `user_id = auth.uid()` | `admin, principal, hr_manager` (for approvals) or applicant (if status is pending) |
| `staff_payroll_runs` | `admin, principal, finance_manager, accountant, hr_manager` | `admin, principal, finance_manager` | `admin, principal` |
| `staff_payroll_items` | `user_id = auth.uid()` or `admin, principal, finance_manager, accountant, hr_manager` | `admin, principal, finance_manager` | `admin, principal, finance_manager` |
| `hall_tickets` | `student_id = auth.uid()`, linked parents, or `admin, principal, coe, teacher` | `admin, principal, coe` | `admin, principal, coe` |

---

## 4. Parent-Student Link Creation, Verification & Modification Controls

### 4.1 Verification Status
In [023_manual_parent_account_and_linking.sql](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/supabase/migrations/023_manual_parent_account_and_linking.sql#L45-L58):
```sql
CREATE POLICY "Admins and Receptionists can manage parent_student_links"
    ON public.parent_student_links FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal', 'receptionist'))
    WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'receptionist'));

CREATE POLICY "Parents and students can view verified links"
    ON public.parent_student_links FOR SELECT TO authenticated
    USING (
        parent_id = auth.uid()
        OR student_id = auth.uid()
        OR public.get_current_user_role() IN ('admin', 'principal', 'receptionist', 'teacher')
    );
```

### 4.2 Security Analysis & Hardening
- **Self-Linking Prevention:** Parents and students are strictly blocked from `INSERT`, `UPDATE`, or `DELETE` on `parent_student_links`. They have `SELECT` privileges only.
- **Empirical Check:** The live database contains exactly 2 links, both validly created by administrative accounts.
- **Verification Rule:** `verified` column is boolean defaulting to `true` when created by admins/receptionists. In future self-registration workflows, `verified` must default to `false` until administrative confirmation.

---

## 5. Column-Level Protection for Sensitive Profile Attributes

### 5.1 Threat Assessment
PostgreSQL Row Level Security governs row visibility and row-level modification, but does not provide column-level restrictions out of the box. 
Because `public.profiles` has:
```sql
CREATE POLICY "Allow users to update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid() OR public.get_current_user_role() = 'admin')
    WITH CHECK (id = auth.uid() OR public.get_current_user_role() = 'admin');
```
Any user can update any column in their own row: `role`, `status`, `student_id`, `roll_number`, `login_id`.

### 5.2 Validated Multi-Layer Defense

#### Layer 1: PostgreSQL `BEFORE UPDATE` Trigger
A dedicated trigger blocks non-administrative modification of critical columns:
```sql
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS TRIGGER AS $$
DECLARE
    v_caller_role TEXT;
BEGIN
    IF current_user IN ('postgres', 'service_role') THEN
        RETURN NEW;
    END IF;

    v_caller_role := public.get_current_user_role();

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
            RAISE EXCEPTION 'Security Violation: Login ID is immutable.';
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

#### Layer 2: PostgreSQL Column Grants
```sql
-- Revoke full update and grant only benign self-editable attributes
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (name, avatar_url, phone, bio, preferences) ON public.profiles TO authenticated;
```

---

## 6. Edge Function Authorization & Role Verification Flaws

### 6.1 Vulnerabilities in `admin-create-user` & `admin-users`
In [supabase/functions/admin-create-user/index.ts](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/supabase/functions/admin-create-user/index.ts#L43-L49):
```typescript
const callerRole = callerUser.user_metadata?.role;
if (callerRole !== "admin") {
  return new Response(
    JSON.stringify({ error: "Unauthorized: Administrator privileges required to provision accounts", code: "FORBIDDEN" }),
    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```
1. **Unverified Metadata Trust:** The function trusts `callerUser.user_metadata?.role`. A user who modified their client user metadata can bypass this check.
2. **Missing Roles:** In `admin-users/index.ts`, `ALLOWED_ROLES` lists only 13 roles, missing `coe`, `hod`, `accountant`, `financier`, `storekeeper`, and `naac_coordinator`.

### 6.2 Validated Remediation Standard for Edge Functions
```typescript
// 1. Initialize admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 2. Query database profiles table directly for verified caller role
const { data: callerProfile, error: profileError } = await supabaseAdmin
  .from('profiles')
  .select('role')
  .eq('id', callerUser.id)
  .single();

if (profileError || !callerProfile || !['admin', 'principal'].includes(callerProfile.role)) {
  return new Response(
    JSON.stringify({ error: "Forbidden: Verified administrative privileges required", code: "FORBIDDEN" }),
    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

---

## 7. Storage Bucket Access & Deletion Policies

### 7.1 Critical Vulnerability in `documents` Storage Bucket
In [003_storage_setup.sql](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/supabase/migrations/003_storage_setup.sql#L54-L58):
```sql
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');
```
**Impact:** Any authenticated user can issue a delete request to `storage.from('documents').remove([filePath])` and permanently delete any document in the bucket—including NAAC accreditation evidence, student admission records, and fee payment receipts.

### 7.2 Validated Remediation Specification
```sql
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;

-- Only institutional administrators and principals can delete official documents,
-- OR the authenticated user who uploaded the document into their personal folder prefix
CREATE POLICY "Strict document delete policy"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'documents' 
    AND (
        public.get_current_user_role() IN ('admin', 'principal')
        OR auth.uid()::text = (storage.foldername(name))[1]
    )
);
```

---

## 8. RPC Execution Permissions & Data Leakage

### 8.1 Vulnerability in `get_admin_overview_stats()`
In [018_erp_production_enhancements.sql](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/supabase/migrations/018_erp_production_enhancements.sql#L202-L234):
The RPC is declared `SECURITY DEFINER` and aggregates institutional finance transactions, total user count, teacher count, and store revenue. It lacks any internal caller role verification. 

Any authenticated student, parent, or external actor can execute:
```javascript
const { data } = await supabase.rpc('get_admin_overview_stats');
```
and extract the college's total revenue, order count, and personnel breakdown.

### 8.2 Validated Remediation Specification
```sql
CREATE OR REPLACE FUNCTION public.get_admin_overview_stats()
RETURNS JSONB AS $$
DECLARE
    v_caller_role TEXT;
    v_total_users BIGINT;
    v_active_students BIGINT;
    v_parent_accounts BIGINT;
    v_total_teachers BIGINT;
    v_total_courses BIGINT;
    v_total_orders BIGINT;
    v_total_revenue NUMERIC;
    v_active_buses BIGINT;
BEGIN
    -- Enforce administrative caller authority
    v_caller_role := public.get_current_user_role();
    IF v_caller_role NOT IN ('admin', 'principal') THEN
        RAISE EXCEPTION 'Unauthorized: Access restricted to institutional leadership.';
    END IF;

    SELECT COUNT(*) INTO v_total_users FROM public.profiles;
    SELECT COUNT(*) INTO v_active_students FROM public.profiles WHERE role = 'student';
    SELECT COUNT(*) INTO v_parent_accounts FROM public.profiles WHERE role = 'parent';
    SELECT COUNT(*) INTO v_total_teachers FROM public.profiles WHERE role = 'teacher';
    SELECT COUNT(*) INTO v_total_courses FROM public.departments;
    SELECT COUNT(*) INTO v_total_orders FROM public.store_orders;
    SELECT COALESCE(SUM(amount), 0) INTO v_total_revenue FROM public.finance_transactions WHERE transaction_type = 'income';
    SELECT COUNT(*) INTO v_active_buses FROM public.transport_vehicles WHERE status = 'active';

    RETURN jsonb_build_object(
        'totalUsers', v_total_users,
        'activeStudents', v_active_students,
        'parentAccounts', v_parent_accounts,
        'totalTeachers', v_total_teachers,
        'totalCourses', v_total_courses,
        'totalOrders', v_total_orders,
        'totalRevenue', v_total_revenue,
        'activeBuses', v_active_buses
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.get_admin_overview_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.get_admin_overview_stats() TO authenticated;
```

---

## 9. Authentication Failure Behavior & Missing Profile Escalation

### 9.1 Flawed Fallback in `AuthContext.tsx`
In `src/context/AuthContext.tsx`:
When a user logs in but does not yet have a record in `public.profiles`, `fetchProfileAndSetUser` catches the error and executes `mapAuthToUser(authUser)`:
```typescript
if (email.startsWith('admin') || email.includes('admin@')) {
  fallbackRole = 'admin';
}
```
This grants administrative frontend access purely on email naming conventions.

### 9.2 Validated Remediation Standard
1. **No Administrative Email Inferences:** Remove all email substring checks granting `admin`, `principal`, or `platform_super_admin`.
2. **Missing Profile Safe State:** If a user authenticated via Supabase Auth has no matching row in `public.profiles`:
   - Assign state `{ role: 'student', is_verified: false, pending_profile: true }`.
   - Prevent navigation to any operational dashboard.
   - Display an informational screen: *"Account authenticated, but your college institutional profile is pending administrative activation. Please contact the administrator."*

---

## 10. Cross-Tier Role Consistency

### 10.1 Authoritative 19-Role Reconciliation Matrix

| Institutional Role | TypeScript `UserRole` (`database.types.ts`) | TypeScript `UserRole` (`AuthContext.tsx`) | `src/config/roles.ts` | PostgreSQL `profiles_role_check` | Edge Function `ALLOWED_ROLES` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`admin`** | Yes | Yes | Yes | Yes | Yes |
| **`principal`** | Yes | Yes | Yes | Yes | Yes |
| **`teacher`** | Yes | Yes | Yes | Yes | Yes |
| **`hod`** | **Missing** | Yes | Needs alias | **Missing** | **Missing** |
| **`coe`** | **Missing** | Yes | Needs alias | **Missing** | **Missing** |
| **`student`** | Yes | Yes | Yes | Yes | Yes |
| **`parent`** | Yes | Yes | Yes | Yes | Yes |
| **`finance_manager`** | Yes | Yes | Yes | Yes | Yes |
| **`accountant`** | Yes | Yes | Yes | Yes | **Missing** |
| **`financier`** | Yes | Yes | Yes | Yes | **Missing** |
| **`store_manager`** | Yes | Yes | Yes | Yes | Yes |
| **`storekeeper`** | Yes | Yes | Yes | Yes | **Missing** |
| **`transport_driver`** | Yes | Yes | Yes | Yes | Yes |
| **`driver`** *(Alias)* | Yes | Yes | Alias | Yes | Alias |
| **`receptionist`** | Yes | Yes | Yes | Yes | Yes |
| **`naac_coordinator`**| Yes | Yes | Corrupted (`admin`) | Yes | **Missing** |
| **`hr_manager`** | **Missing** | Yes | Yes | Yes | Yes |
| **`librarian`** | **Missing** | Yes | Yes | Yes | Yes |
| **`hostel_warden`** | **Missing** | Yes | Yes | Yes | Yes |
| **`placement_officer`**| **Missing** | Yes | Yes | Yes | Yes |

### 10.2 Phase 1 Alignment Action
In Phase 1, update:
1. `src/types/database.types.ts`: Expand `UserRole` union to include all 19 roles.
2. `supabase/migrations/015_...`: Re-apply `profiles_role_check` with all 19 roles.
3. `supabase/functions/admin-users/index.ts`: Update `ALLOWED_ROLES` array with all 19 roles.
4. `src/config/roles.ts`: Set `naac_coordinator.role = 'naac_coordinator'` and ensure HOD/COE routes are properly mapped.
