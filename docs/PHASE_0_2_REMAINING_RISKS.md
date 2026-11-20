# Active Security & System Risks Register (Phase 0.2)

> **Document Version:** 1.0.0 (Phase 0.2 Post-Verification Risk Register)  
> **Deployment Architecture:** Single-Institution Dedicated Deployment  
> **Verification Date:** 2026-11-19  
> **Operational Context:** Because no code or database changes were deployed during Phase 0 or Phase 0.1, **all 16 verified bugs remain fully active** in the running software and live database.

---

## 1. Executive Summary

Because the Phase 0 and Phase 0.1 passes strictly operated in an **audit-and-document** mode, the active software system and the live Supabase PostgreSQL database have not yet been modified.

This document catalogs the exact **active risks**, their concrete business impact, their failure scenarios, and the **mandatory tests** required during Phase 1 to verify each vulnerability and prove its successful remediation.

---

## 2. Active Critical Security Risks (P0)

### 2.1 RISK-SEC-001: Direct Privilege Escalation to Institutional Administrator
- **Related Bug ID:** `BUG-SEC-001`
- **Location:** `supabase/migrations/002_row_level_security.sql#L76-L81`
- **Active Vulnerability:** The active RLS policy on `public.profiles` (`"Allow users to update own profile"`) specifies `WITH CHECK (id = auth.uid() OR public.get_current_user_role() = 'admin')`. It lacks column-level restrictions. Furthermore, no `BEFORE UPDATE` trigger exists on `public.profiles`.
- **Failure Scenario & Impact:** An enrolled student or parent logs in, inspects the network console, and issues an HTTP PATCH request to `/rest/v1/profiles?id=eq.<user_id>` with payload `{"role": "admin"}`. PostgREST evaluates `id = auth.uid()` as `true` and commits the change. The caller becomes an institutional administrator in the database.
- **Required Verification Test in Phase 1:**
  1. Authenticate as student `student1@adhityan.edu`.
  2. Send PATCH request attempting to update `role` to `'admin'`.
  3. **Pass Criteria:** Request fails with PostgreSQL trigger exception: *"Security Violation: Modifying user role is restricted to administrators."*
  4. Verify that student's role in `public.profiles` remains `'student'`.

---

### 2.2 RISK-SEC-002: Client-Side Auth Role Precedence & Email-Based Admin Escalation
- **Related Bug ID:** `BUG-SEC-002`
- **Location:** `src/context/AuthContext.tsx#L63-L75`
- **Active Vulnerability:** `mapAuthToUser` prioritizes `meta.role` above `profileData.role`. If a profile is missing or during network fetch errors, `mapAuthToUser` inspects the email address: if it starts with `'admin'`, `'principal'`, or `'superadmin'`, it assigns administrative privileges on the client.
- **Failure Scenario & Impact:** A student or external attacker registers with an email like `admin.testing@college.edu` or injects `role: "admin"` into their auth user metadata. The client application renders the Admin Dashboard, Super Admin Control Center, and management sidebars.
- **Required Verification Test in Phase 1:**
  1. Sign in with an account having user metadata `{ "role": "admin" }` but database profile `role: "student"`.
  2. **Pass Criteria:** `user.role` in `AuthContext` evaluates strictly to `'student'`.
  3. Sign in with an account with email `admin.temp@test.com` with no database profile row.
  4. **Pass Criteria:** `user.role` evaluates to `'student'` with status `'pending_profile'`; administrative navigation is blocked.

---

### 2.3 RISK-SEC-003: Unrestricted Arbitrary Deletion of Institutional Documents
- **Related Bug ID:** `BUG-SEC-003`
- **Location:** `supabase/migrations/003_storage_setup.sql#L54-L58`
- **Active Vulnerability:** Active storage policy `"Authenticated users can delete documents"` on `storage.objects` has `USING (bucket_id = 'documents')` with no owner or role check.
- **Failure Scenario & Impact:** Any authenticated student, parent, or faculty member can invoke `supabase.storage.from('documents').remove(['naac/criteria_1_evidence.pdf'])` or delete uploaded admission certificates and fee receipts.
- **Required Verification Test in Phase 1:**
  1. Authenticate as a student.
  2. Attempt to delete a file uploaded by an administrator in `documents/naac/`.
  3. **Pass Criteria:** Storage service returns HTTP `403 Forbidden` / RLS policy violation.
  4. Authenticate as administrator and attempt the same delete.
  5. **Pass Criteria:** Delete succeeds.

---

### 2.4 RISK-SEC-004: Edge Function Spoofed Authorization & Missing Roles
- **Related Bug ID:** `BUG-SEC-004`
- **Location:** `supabase/functions/admin-create-user/index.ts#L43` & `admin-users/index.ts#L10-L24`
- **Active Vulnerability:** Edge Functions authorize administrative requests by checking `callerUser.user_metadata?.role === 'admin'`. They do not query the database `profiles` table. Furthermore, `admin-users` whitelist only contains 13 roles.
- **Failure Scenario & Impact:**
  1. A user who manipulated their client metadata can trigger account provisioning.
  2. A legitimate administrator attempting to provision a Controller of Examinations (`coe`) or HOD (`hod`) account via the Edge Function receives HTTP `400 Bad Request` ("Invalid role").
- **Required Verification Test in Phase 1:**
  1. Invoke `admin-create-user` using a bearer token of a student whose metadata was modified to `{ role: "admin" }`.
  2. **Pass Criteria:** Edge Function returns HTTP `403 Forbidden` after database verification.
  3. Invoke `admin-users` as a verified admin to create an account with `role: "coe"`.
  4. **Pass Criteria:** Account created successfully.

---

### 2.5 RISK-RLS-001: Blanket Permissive RLS Policies on 14 Institutional Tables
- **Related Bug ID:** `BUG-RLS-001`
- **Location:** `supabase/migrations/011_institutional_complete_erp.sql#L408-L429`
- **Active Vulnerability:** 14 tables in the live database have active policies `FOR ALL TO authenticated USING (true)`.
- **Failure Scenario & Impact:**
  - Students can modify rows in `class_attendance_sessions` and `student_attendance_records`.
  - Employees can approve their own leave in `staff_leave_applications` and alter `staff_leave_balances`.
  - Anyone can edit `staff_payroll_runs`, `staff_payroll_items`, and `hall_tickets`.
- **Required Verification Test in Phase 1:**
  1. Authenticate as a student.
  2. Attempt to send an `UPDATE` request modifying `status` in `class_attendance_sessions` or `hall_tickets`.
  3. **Pass Criteria:** Update returns 0 affected rows or fails with RLS violation.

---

## 3. Active High & Medium Integrity Risks (P1 / P2)

### 3.1 RISK-ROLE-001: Database Check Constraint Blocking COE & HOD Account Creation
- **Related Bug ID:** `BUG-ROLE-001`
- **Location:** `supabase/migrations/015_add_principal_role_constraint.sql#L12-L31`
- **Active Vulnerability:** `profiles_role_check` constraint in the live database allows 18 roles, omitting `'coe'` and `'hod'`.
- **Failure Scenario & Impact:** Inserting a profile with `role = 'coe'` or `'hod'` raises PostgreSQL error `23514 (check_violation)`. The college cannot operationalize the COE Examination Portal or HOD Departmental Oversight.
- **Required Verification Test in Phase 1:**
  1. As admin, execute `INSERT INTO public.profiles (id, email, name, role) VALUES (gen_random_uuid(), 'coe@test.com', 'COE Head', 'coe')`.
  2. **Pass Criteria:** Insert succeeds without constraint error.

---

### 3.2 RISK-ROLE-002: NAAC Coordinator Mapped to Institutional Administrator
- **Related Bug ID:** `BUG-ROLE-002`
- **Location:** `src/config/roles.ts#L178`
- **Active Vulnerability:** `ROLE_CONFIGS['naac_coordinator'].role` is hardcoded to `'admin'`.
- **Failure Scenario & Impact:** NAAC Coordinator account is treated as institutional administrator by frontend permission checks, giving them access to fee ledger modification, user deletion, and academic restructuring.
- **Required Verification Test in Phase 1:**
  1. Log in as `naac_coordinator`.
  2. Inspect available routes and navigation items.
  3. **Pass Criteria:** Restricted strictly to `/admin/naac` and criteria management; administrative tabs (`/admin/users`, `/admin/fees`) are hidden and inaccessible.

---

### 3.3 RISK-ATT-001: Attendance Session Duplication & Concurrency Race Condition
- **Related Bug ID:** `BUG-ATT-001`
- **Location:** `supabase/migrations/011_institutional_complete_erp.sql#L208-L223`
- **Active Vulnerability:** No composite unique constraint on `class_attendance_sessions`.
- **Failure Scenario & Impact:** If two teachers submit attendance simultaneously for the same class and period, two sessions are recorded. This doubles total conducted sessions, corrupts student attendance percentages, and falsely triggers shortage warnings.
- **Required Verification Test in Phase 1:**
  1. Attempt to insert two rows into `class_attendance_sessions` with identical `(class_name, session_date, period_number, subject_code)`.
  2. **Pass Criteria:** Second insert fails with PostgreSQL unique constraint violation `uq_class_attendance_session`.

---

### 3.4 RISK-EXAM-001: Marks Entry Crash on Missing Student Name
- **Related Bug ID:** `BUG-EXAM-001`
- **Location:** `supabase/migrations/001_initial_schema.sql#L560-L572`
- **Active Vulnerability:** `student_name TEXT NOT NULL` without default or trigger.
- **Failure Scenario & Impact:** External marks import or API script supplying only `student_id` crashes with `23502 (not_null_violation)`.
- **Required Verification Test in Phase 1:**
  1. Execute insert into `exam_results` specifying `student_id`, `exam_id`, `class_name`, `subject`, `marks_obtained`, omitting `student_name`.
  2. **Pass Criteria:** Insert succeeds; trigger `set_exam_result_student_name` auto-populates `student_name` from `public.profiles`.

---

### 3.5 RISK-HR-001: Staff Leave Balance Non-Idempotent Deductions & Missing Restorations
- **Related Bug ID:** `BUG-HR-001`
- **Location:** `src/components/hr/StaffLeaveManager.tsx#L71-L130`
- **Active Vulnerability:** Approving leave does not update `staff_leave_balances` at database level; no trigger exists.
- **Failure Scenario & Impact:** Leave balances on employee records remain disconnected from approved applications. If client-side update scripts run repeatedly, balances double-deduct. Cancellations do not restore quota.
- **Required Verification Test in Phase 1:**
  1. Insert leave application with `status = 'Pending_Principal'` for 3 days Casual Leave.
  2. Update status to `'Approved'`.
  3. **Pass Criteria:** `staff_leave_balances.casual_leave_taken` increments by exactly 3.
  4. Update status to `'Cancelled'`.
  5. **Pass Criteria:** `casual_leave_taken` decrements by exactly 3.

---

## 4. Priority Risk Summary & Phase 1 Execution Gates

| Risk Code | Target Area | Severity | Current Status | Mandatory Phase 1 Test |
| :--- | :--- | :---: | :---: | :--- |
| **`RISK-SEC-001`** | `public.profiles` RLS & Trigger | **P0** | **ACTIVE** | Block student self-role update via PostgREST PATCH |
| **`RISK-SEC-002`** | `AuthContext.tsx` Role Resolution | **P0** | **ACTIVE** | Verify DB role precedence over metadata & email |
| **`RISK-SEC-003`** | `documents` Storage Bucket Deletion | **P0** | **ACTIVE** | Block non-owner/non-admin file deletion |
| **`RISK-SEC-004`** | Edge Functions Authorization | **P0** | **ACTIVE** | Enforce DB profile verification & 19-role whitelist |
| **`RISK-RLS-001`** | 14 ERP Tables Permissive RLS | **P0** | **ACTIVE** | Block student write on attendance, payroll, leaves |
| **`RISK-ROLE-001`** | `profiles_role_check` Constraint | **P1** | **ACTIVE** | Verify successful provisioning of `coe` and `hod` |
| **`RISK-ROLE-002`** | `roles.ts` NAAC Mapping | **P1** | **ACTIVE** | Verify NAAC Coordinator restricted to NAAC routes |
| **`RISK-ATT-001`** | Attendance Duplicate Prevention | **P1** | **ACTIVE** | Enforce composite UNIQUE constraint rejection |
| **`RISK-EXAM-001`** | `exam_results` Auto-Name Trigger | **P2** | **ACTIVE** | Verify auto-population of student name on insert |
| **`RISK-HR-001`** | Staff Leave State Machine Trigger | **P2** | **ACTIVE** | Verify idempotent deduction & cancellation restore |

---

## 5. Conclusion

This risk register establishes the exact technical baseline for Phase 1. Every risk is actionable, measurable, and tied to a concrete automated test.
