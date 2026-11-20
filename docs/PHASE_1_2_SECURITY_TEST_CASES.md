# Phase 1.2: Security Test Cases & Reproducible Verification Suite

> **Target System:** ADHITYAN College Management Software  
> **Deployment Architecture:** Single-Institution Dedicated Deployment (`ogbbyqxulhegwvrtinib.supabase.co`)  
> **Audit Mode:** Read-Only Forensic Catalog Inspection & Static Validation  
> **Execution Status:** Read-Only Catalog Tests Executed; Post-Deployment Tests Specified

---

## 1. Executive Summary

This document establishes the official security verification suite for Phase 1. In strict compliance with the **Phase 1.2 Execution Instructions**:
- Section 2 records tests **actually executed** against the live read-only database catalog.
- Section 3 provides the **reproducible post-deployment test suite** that will be executed immediately following the application of Migration 028.

---

## 2. Tests Actually Executed Against Live Baseline (Read-Only)

All tests in this section were executed directly against the live Supabase PostgreSQL instance (`ogbbyqxulhegwvrtinib.supabase.co`) using `npx supabase db query --remote --read-only`:

| Test Code | Target Object | Query Executed | Observed Result | Status |
| :---: | :--- | :--- | :--- | :---: |
| **EX-01** | `public.profiles` | `SELECT DISTINCT role, count(*) FROM public.profiles GROUP BY role;` | 16 total rows; exactly 9 distinct roles; all 16 rows belong strictly to the 19-role institutional taxonomy. Zero invalid roles. | **PASS** |
| **EX-02** | `public.profiles` | `SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name IN ('status', 'login_id', 'student_id');` | 0 rows returned. Confirms `status`, `login_id`, and `student_id` are absent. Safe for additive schema expansion in Stage 1. | **PASS** |
| **EX-03** | `class_attendance_sessions`| `SELECT class_name, session_date, period_number, subject_code, count(*) FROM public.class_attendance_sessions GROUP BY 1,2,3,4 HAVING count(*) > 1;` | 0 duplicate rows returned. Exactly 2 rows exist, both with unique keys across `(class_name, session_date, period_number, subject_code)`. | **PASS** |
| **EX-04** | `pg_proc` | `SELECT proname, prosecdef, COALESCE(array_to_string(proconfig, ', '), 'NONE') FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND prosecdef = true;` | Found exactly 10 `SECURITY DEFINER` functions; 9 had `search_path = NONE`, 1 had `search_path = pg_catalog`. Confirms need for Stage 3 lockdown. | **PASS** |
| **EX-05** | `pg_policies` | `SELECT tablename, policyname, qual FROM pg_policies WHERE schemaname = 'public' AND tablename = 'hall_tickets';` | Found 3 policies: `Allow read hall tickets` (`true`), `Allow manage hall tickets` (`true`), and `hall_tickets_all` (`true`). Confirms DEF-007 overlap. | **PASS** |
| **EX-06** | `storage.objects` | `SELECT policyname, roles, qual FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read access for documents';` | Policy confirmed active (`cmd = SELECT, roles = {public}, qual = (bucket_id = 'documents')`). Confirms ISSUE-03 unauthenticated leak. | **PASS** |

---

## 3. Reproducible Post-Deployment Security Test Suite

The following 10 test cases must be executed following the staged deployment of Migration 028 to formally verify engine-level defenses:

---

### Test Case 1: Student Role Self-Escalation Block (`BUG-SEC-001` / `DEF-001`)
- **Objective:** Verify that an authenticated student cannot modify their own `role` or `status`.
- **Preconditions:** Authenticated as a student (`role = 'student'`, UUID `stu-uuid`).
- **Execution Script:**
  ```sql
  -- Simulate authenticated PostgREST session as student
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = '3c847d0e-927d-4df0-94e8-422479e39486';
  SET LOCAL "request.jwt.claim.role" = 'authenticated';

  -- Attempt privilege escalation to admin
  UPDATE public.profiles 
  SET role = 'admin' 
  WHERE id = '3c847d0e-927d-4df0-94e8-422479e39486';
  ```
- **Expected Outcome:**
  - Transaction ABORTS with error: `ERROR: Security Violation: Modifying user role is restricted to administrators.`
  - Profile role remains `'student'`.

---

### Test Case 2: Inactive / Suspended User Fail-Closed Block (`ISSUE-04`)
- **Objective:** Verify that an administrator or staff member whose account is suspended is blocked from administrative actions.
- **Preconditions:** User `admin-uuid` has `role = 'admin'` but `status = 'suspended'`.
- **Execution Script:**
  ```sql
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = 'suspended-admin-uuid';
  SET LOCAL "request.jwt.claim.role" = 'authenticated';

  -- Attempt to read super_admin_configs
  SELECT * FROM public.super_admin_configs;
  ```
- **Expected Outcome:**
  - `public.get_current_user_role()` evaluates to `NULL` because `status <> 'active'`.
  - Zero rows returned (Access Denied by RLS).

---

### Test Case 3: Teacher Unassigned Class Attendance Block (`FEAT-031`)
- **Objective:** Verify that a teacher cannot insert an attendance session for a class they are not assigned to teach.
- **Preconditions:** Teacher `T1` is assigned to `"MLT Year 1"`.
- **Execution Script:**
  ```sql
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = 'teacher-1-uuid';
  SET LOCAL "request.jwt.claim.role" = 'authenticated';

  -- Attempt to insert attendance session for unassigned class with different teacher_id
  INSERT INTO public.class_attendance_sessions (
      teacher_id, teacher_name, class_name, department, subject_code, subject_title, session_date, period_number, batch
  ) VALUES (
      'other-teacher-uuid', 'Dr. Smith', 'Cardiac Care Year 2', 'Cardiology', 'CCT201', 'Advanced ECG', CURRENT_DATE, 1, 'All'
  );
  ```
- **Expected Outcome:**
  - Query rejected by policy `"att_sessions_insert"` with `ERROR: new row violates row-level security policy for table "class_attendance_sessions"`.

---

### Test Case 4: Parent Unverified Child Access Block (`BUG-PAR-001`)
- **Objective:** Verify that a parent cannot view records of a child where `verified = false`.
- **Preconditions:** Parent `P1` has a link to Student `S1` with `verified = false`.
- **Execution Script:**
  ```sql
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = 'parent-1-uuid';
  SET LOCAL "request.jwt.claim.role" = 'authenticated';

  -- Attempt to query attendance records of unverified child
  SELECT * FROM public.student_attendance_records 
  WHERE student_id = 'unverified-student-uuid';
  ```
- **Expected Outcome:**
  - `public.is_parent_of('unverified-student-uuid')` returns `FALSE`.
  - Zero rows returned.

---

### Test Case 5: Staff Leave Approval & Cancellation Idempotency (`BUG-HR-001`)
- **Objective:** Verify that approving a leave deducts days exactly once, and cancelling refunds days exactly once.
- **Preconditions:** Staff `faculty-uuid` has `casual_leave_taken = 0`.
- **Execution Script:**
  ```sql
  -- Step 1: Create application
  INSERT INTO public.staff_leave_applications (
      id, user_id, staff_name, department, leave_type, start_date, end_date, total_days, reason, status
  ) VALUES (
      'app-test-uuid', 'faculty-uuid', 'Prof. Kumar', 'MLT', 'Casual Leave', '2026-11-25', '2026-11-27', 3, 'Personal', 'Pending_Principal'
  );
  -- Verify balance unchanged (0)

  -- Step 2: Approve application
  UPDATE public.staff_leave_applications 
  SET status = 'Approved' 
  WHERE id = 'app-test-uuid';
  -- Verify balance is now 3

  -- Step 3: Re-save without modifications (Idempotency test)
  UPDATE public.staff_leave_applications 
  SET reason = 'Personal (Updated remarks)' 
  WHERE id = 'app-test-uuid';
  -- Verify balance is STILL 3 (No double-deduction)

  -- Step 4: Cancel application
  UPDATE public.staff_leave_applications 
  SET status = 'Cancelled' 
  WHERE id = 'app-test-uuid';
  -- Verify balance is now 0 (Full refund)
  ```
- **Expected Outcome:**
  - Step 1: `casual_leave_taken = 0`.
  - Step 2: `casual_leave_taken = 3`.
  - Step 3: `casual_leave_taken = 3`.
  - Step 4: `casual_leave_taken = 0`.

---

### Test Case 6: Concurrent Leave Approvals Row Locking (`BUG-HR-001`)
- **Objective:** Verify that concurrent approvals for the same employee do not produce lost updates.
- **Execution Script:**
  Two separate database sessions approve two independent 2-day leave applications for the same employee concurrently:
  - Session A: `UPDATE staff_leave_applications SET status = 'Approved' WHERE id = 'app-1';` (2 days)
  - Session B: `UPDATE staff_leave_applications SET status = 'Approved' WHERE id = 'app-2';` (2 days)
- **Expected Outcome:**
  - One session acquires row lock on `staff_leave_balances`; the second session waits on the lock.
  - Final `casual_leave_taken = 4`. Zero lost updates.

---

### Test Case 7: Storage Cross-User Folder Manipulation Block (`BUG-SEC-003` / `DEF-009`)
- **Objective:** Verify that Student A cannot upload or delete files in Student B's folder.
- **Preconditions:** Authenticated as Student A (`uuid-A`).
- **Execution Script:**
  ```sql
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = 'uuid-A';
  SET LOCAL "request.jwt.claim.role" = 'authenticated';

  -- Attempt to delete Student B's document
  DELETE FROM storage.objects 
  WHERE bucket_id = 'documents' AND name = 'uuid-B/medical_certificate.pdf';
  ```
- **Expected Outcome:**
  - Zero rows deleted (Denied by `"Strict document delete policy"` where `(storage.foldername(name))[1] = 'uuid-B'` does not match `auth.uid()`).

---

### Test Case 8: Super Admin Audit Log Immutability (`DEF-010`)
- **Objective:** Verify that even the Super Admin cannot modify or delete audit log records.
- **Preconditions:** Authenticated as `admin`.
- **Execution Script:**
  ```sql
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = 'admin-uuid';
  SET LOCAL "request.jwt.claim.role" = 'authenticated';

  -- Attempt to update an audit log record
  UPDATE public.super_admin_audit_logs 
  SET action = 'TAMPERED' 
  WHERE id = 'audit-log-uuid';

  -- Attempt to delete an audit log record
  DELETE FROM public.super_admin_audit_logs 
  WHERE id = 'audit-log-uuid';
  ```
- **Expected Outcome:**
  - Both queries fail with `ERROR: 42501: new row violates row-level security policy` or 0 rows affected. RLS denies `UPDATE` and `DELETE` by default.

---

### Test Case 9: Parallel Practical Lab Batch Coexistence (`DEF-011`)
- **Objective:** Verify that Batch A and Batch B for the same practical subject and period can coexist without key violation.
- **Execution Script:**
  ```sql
  -- Insert Batch A session
  INSERT INTO public.class_attendance_sessions (
      teacher_id, teacher_name, class_name, department, subject_code, subject_title, session_date, period_number, batch
  ) VALUES (
      'teacher-A-uuid', 'Dr. Adams', 'MLT Year 1', 'MLT', 'MLT102P', 'Clinical Lab', CURRENT_DATE, 3, 'Batch A'
  );

  -- Insert Batch B session (Same class, date, period, and subject!)
  INSERT INTO public.class_attendance_sessions (
      teacher_id, teacher_name, class_name, department, subject_code, subject_title, session_date, period_number, batch
  ) VALUES (
      'teacher-B-uuid', 'Dr. Baker', 'MLT Year 1', 'MLT', 'MLT102P', 'Clinical Lab', CURRENT_DATE, 3, 'Batch B'
  );
  ```
- **Expected Outcome:**
  - Both sessions insert successfully.
  - Attempting to insert a duplicate `'Batch A'` session fails with `ERROR: 23505: duplicate key value violates unique constraint "uq_class_attendance_session"`.

---

### Test Case 10: Existing Valid Workflows Regression Verification
- **Objective:** Verify that existing student portal, teacher roll call, and parent overview queries execute without runtime errors.
- **Execution Script:**
  Execute frontend queries against `profiles`, `timetables`, `exams`, `class_attendance_sessions`, and `student_attendance_records`.
- **Expected Outcome:**
  - All queries return valid JSON data. Zero TypeScript compilation errors (`npx tsc --noEmit` clean).
