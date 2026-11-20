# Phase 1.2: Independent SQL Issue Register & Forensic Findings

> **Target System:** ADHITYAN College Management Software  
> **Deployment Architecture:** Single-Institution Dedicated Deployment (`ogbbyqxulhegwvrtinib.supabase.co`)  
> **Audit Mode:** Read-Only Forensic Catalog Inspection & Static Validation  
> **Execution Status:** 100% Read-Only (Zero Database Mutations)

---

## 1. Executive Summary

During the Phase 1.2 independent verification pass, every statement, column reference, function definition, and RLS policy from the Phase 1.1 approval package was cross-referenced against the **actual live PostgreSQL catalog** (`ogbbyqxulhegwvrtinib.supabase.co`).

This forensic audit revealed **4 critical runtime and security defects** that would have caused runtime transaction aborts or left security loopholes if deployed without remediation:
1. **ISSUE-01:** `public.profiles` lacks a `student_id` column, causing the Stage 3 trigger to crash on every profile update with PostgreSQL error `42703 (undefined_column)`.
2. **ISSUE-02:** `public.staff_leave_applications` lacks an `academic_year` column, causing the Stage 3 leave balance trigger to crash with PostgreSQL error `42703 (undefined_column)`.
3. **ISSUE-03:** The legacy permissive policy `Public read access for documents` was not dropped from `storage.objects`, leaving all documents publicly downloadable without authentication.
4. **ISSUE-04:** The core authorization function `public.get_current_user_role()` does not check `status = 'active'`, allowing suspended or inactive staff and administrators to retain elevated RLS privileges.

---

## 2. Forensic Issue Register

| Issue ID | Severity | Target Script & Line | Component / Statement | Forensic Root Cause | Systemic Impact | Required Remediation |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **ISSUE-01** | **P0 (Critical)** | `028_stage3_triggers.sql` (Line 48) | `IF NEW.student_id IS DISTINCT FROM OLD.student_id THEN` | `information_schema.columns` confirms `public.profiles` does NOT contain a `student_id` column in the live database. | **Total Profile Breakage:** Any UPDATE on `public.profiles` throws `ERROR 42703: record "new" has no field "student_id"`, crashing user logins, settings updates, and bio edits. | Add `student_id TEXT` to `public.profiles` in `028_stage1_columns.sql`. |
| **ISSUE-02** | **P0 (Critical)** | `028_stage3_triggers.sql` (Lines 77–81) | `v_academic_year := NEW.academic_year;` | `information_schema.columns` confirms `public.staff_leave_applications` does NOT contain an `academic_year` column (only `start_date` and `end_date` exist). | **Leave Application Failure:** Any INSERT, UPDATE, or DELETE on `staff_leave_applications` throws `ERROR 42703: record "new" has no field "academic_year"`. | Derive `v_academic_year` dynamically from `start_date` and `institutional_settings`. |
| **ISSUE-03** | **P0 (Critical)** | `028_stage4_rls.sql` (Section 1) | Policy Drop List on `storage.objects` | `pg_policies` query confirms `Public read access for documents` (`cmd = SELECT, roles = {public}, qual = (bucket_id = 'documents')`) exists in the live database and was NOT dropped. | **Confidential Document Leakage:** PostgreSQL combines permissive policies with `OR`. All student records, medical files, and ID cards in `documents` remain completely public to unauthenticated web crawlers. | Add `DROP POLICY IF EXISTS "Public read access for documents" ON storage.objects;` to Stage 4. |
| **ISSUE-04** | **P1 (High)** | `028_stage3_triggers.sql` (Section 4) | `ALTER FUNCTION public.get_current_user_role() SET search_path = public;` | `get_current_user_role()` in `pg_proc` performs `SELECT role FROM public.profiles WHERE id = auth.uid();` without checking `status = 'active'`. | **Suspended User Bypass:** A suspended or fired administrator, teacher, or finance manager (`status = 'suspended'`) continues to evaluate as their role, retaining full access to all RLS-protected tables. | Redefine `get_current_user_role()` to `SELECT role FROM public.profiles WHERE id = auth.uid() AND status = 'active';`. |

---

## 3. In-Depth Root Cause Analysis & Evidence

### 3.1 ISSUE-01: Missing `student_id` Column on `public.profiles`
- **Catalog Evidence:**
  A direct query against `information_schema.columns` for `table_name = 'profiles'` in the live Supabase instance returned 14 columns:
  `id`, `email`, `name`, `role`, `avatar_url`, `phone`, `department`, `class_name`, `roll_number`, `bio`, `preferences`, `created_at`, `updated_at`, `course`.
  The column `student_id` is **completely absent**.
- **The Defect:**
  In `028_stage3_triggers.sql`, the trigger function executes:
  ```sql
  IF NEW.student_id IS DISTINCT FROM OLD.student_id THEN
      RAISE EXCEPTION 'Security Violation: Student ID is immutable.';
  END IF;
  ```
  In PL/pgSQL, referencing a non-existent field on a record variable (`NEW.student_id`) causes a compilation or execution-time failure: `ERROR: 42703: record "new" has no field "student_id"`.
- **The Solution:**
  Stage 1 must explicitly declare:
  ```sql
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_id TEXT;
  ```
  This is fully backwards-compatible (nullable), matches `src/types/database.types.ts:28` (`student_id?: string;`), and allows the trigger in Stage 3 to evaluate without error.

---

### 3.2 ISSUE-02: Missing `academic_year` Column on `public.staff_leave_applications`
- **Catalog Evidence:**
  Querying `information_schema.columns` for `table_name = 'staff_leave_applications'` returned:
  `id`, `user_id`, `staff_name`, `department`, `leave_type`, `start_date`, `end_date`, `total_days`, `reason`, `substitute_teacher_id`, `substitute_teacher_name`, `status`, `approved_by`, `rejection_reason`, `created_at`, `updated_at`.
  There is **no** `academic_year` column on `staff_leave_applications`! (The `academic_year` column exists only on `staff_leave_balances`).
- **The Defect:**
  In `028_stage3_triggers.sql`, lines 77–81 execute:
  ```sql
  IF TG_OP = 'DELETE' THEN
      v_academic_year := OLD.academic_year;
  ELSE
      v_academic_year := NEW.academic_year;
  END IF;
  ```
  Executing an INSERT or UPDATE on `staff_leave_applications` immediately crashes with `ERROR: 42703: record "new" has no field "academic_year"`.
- **The Solution:**
  Derive the academic year dynamically from `start_date`:
  ```sql
  -- Determine academic year dynamically from application start_date
  IF TG_OP = 'DELETE' THEN
      v_app_date := OLD.start_date;
  ELSE
      v_app_date := NEW.start_date;
  END IF;

  IF v_app_date IS NOT NULL THEN
      -- In Indian higher education, academic term spans June to May
      IF EXTRACT(MONTH FROM v_app_date) >= 6 THEN
          v_academic_year := EXTRACT(YEAR FROM v_app_date)::TEXT || '-' || (EXTRACT(YEAR FROM v_app_date) + 1)::TEXT;
      ELSE
          v_academic_year := (EXTRACT(YEAR FROM v_app_date) - 1)::TEXT || '-' || EXTRACT(YEAR FROM v_app_date)::TEXT;
      END IF;
  ELSE
      SELECT academic_year INTO v_academic_year FROM public.institutional_settings LIMIT 1;
  END IF;
  ```

---

### 3.3 ISSUE-03: Undropped Permissive Policy `Public read access for documents`
- **Catalog Evidence:**
  Querying `pg_policies` on `storage.objects` returned:
  ```json
  {
    "cmd": "SELECT",
    "permissive": "PERMISSIVE",
    "policyname": "Public read access for documents",
    "qual": "(bucket_id = 'documents'::text)",
    "roles": "{public}",
    "tablename": "objects"
  }
  ```
- **The Defect:**
  In `028_stage4_rls.sql`, the drop list contained only:
  - `"Authenticated users can delete documents"`
  - `"Authenticated users can upload documents"`
  - `"Strict document delete policy"`
  It omitted `"Public read access for documents"`.
  Under PostgreSQL RLS:
  $$\text{Access} = \text{Strict Policy} \lor \text{"Public read access for documents"} (\text{true}) \equiv \text{true}$$
  Any anonymous web request to `GET /storage/v1/object/public/documents/...` succeeds unrestricted.
- **The Solution:**
  Add to Stage 4:
  ```sql
  DROP POLICY IF EXISTS "Public read access for documents" ON storage.objects;
  ```

---

### 3.4 ISSUE-04: Inactive / Suspended Role Leakage in `get_current_user_role()`
- **Catalog Evidence:**
  The definition in `pg_proc` is:
  ```sql
  SELECT role FROM public.profiles WHERE id = auth.uid();
  ```
- **The Defect:**
  If an employee or administrator is marked `status = 'suspended'` or `status = 'inactive'`, `get_current_user_role()` continues returning their role string (e.g. `'admin'`). Consequently, every RLS policy checking `public.get_current_user_role() IN ('admin', ...)` continues granting access!
- **The Solution:**
  Redefine `get_current_user_role()` in Stage 3:
  ```sql
  CREATE OR REPLACE FUNCTION public.get_current_user_role()
  RETURNS text
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path = public
  AS $function$
      SELECT role FROM public.profiles WHERE id = auth.uid() AND status = 'active';
  $function$;
  ```
  If `status` is `'suspended'`, `'inactive'`, or missing, the function returns `NULL`, instantly revoking access across all RLS policies throughout the database.
