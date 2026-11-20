# Phase 1.4: Defect Correction Register & Technical Analysis

> **Document Version:** 1.4.0 (Independent Static Review & Remediation)  
> **Target Database:** Supabase Managed PostgreSQL (`ogbbyqxulhegwvrtinib.supabase.co`)  
> **Deployment Architecture:** Single-Institution Dedicated Deployment (Adhityan College)  
> **Execution Status:** Static Engineering Specification (Zero Mutations Executed)

---

## 1. Executive Summary

This Defect Correction Register provides the technical analysis and exact code-level resolutions for all findings identified during the independent review of the Phase 1.3 SQL package. In strict adherence to deployment governance rules, zero SQL statements were executed against the live Supabase instance, zero files were placed into `supabase/migrations/`, and no application source code was modified.

---

## 2. Master Defect Correction Matrix

| Defect ID | Severity | Affected Stage & Domain | Core Defect Summary | Phase 1.4 Resolution |
| :--- | :---: | :--- | :--- | :--- |
| **`DEF-103`** | **CRITICAL** | Stage 1: Columns (`exams`, `exam_results`) | `ADD COLUMN IF NOT EXISTS` failed to modify existing defaults on columns created in migration 022 (`is_published DEFAULT TRUE`, `result_status DEFAULT 'PASS'`). | Added explicit `ALTER TABLE ... ALTER COLUMN ... SET DEFAULT` statements and backfill updates for NULL values. |
| **`DEF-104`** | **CRITICAL** | Stage 4 & Stage 3: Attendance Authorization | Broad `OR` enrollment check allowed cross-class marking; sessions lacked teacher-to-class validation; `student_id` & `session_id` lacked immutability guards on UPDATE. | Added `is_teacher_assigned_to_class()` check on session creation; restricted teacher SELECT to assigned classes; enforced exact `p.class_name = s.class_name`; locked `student_id`, `session_id`, and `created_at` via triggers. |
| **`DEF-106`** | **CRITICAL** | Stage 3: Triggers (`profiles`) | Principal privilege boundary allowed potential self-escalation, self-status change, and lacked explicit whitelist of assignable institutional roles. | Implemented self-mutation block (`v_caller_id = OLD.id`), restricted Principal to approved academic/support roles, barred touch of financial roles, and protected `login_id`, `student_id`, `roll_number`. |
| **`DEF-011`** | **HIGH** | Stage 2: Constraints (`class_attendance_sessions`) | Standard PostgreSQL `UNIQUE` treats NULLs as distinct; potential casing and whitespace collisions in session identity. | Proved non-nullability across all 5 columns (`class_name`, `session_date`, `period_number`, `subject_code`, `batch`); added composite unique constraint and case-insensitive unique index. |
| **`DEF-108`** | **HIGH** | Stage 5: Audit Log Integrity | Threat model lacked formal boundary definition; client could attempt to supply fabricated `admin_id`; lacks explicit engine-level UPDATE/DELETE trigger. | Formalized threat model; trigger forcibly overwrites client `admin_id` with `auth.uid()`; added `prevent_audit_log_modification()` trigger rejecting all UPDATE/DELETE. |
| **`DEF-111`** | **HIGH** | Stage 4: Storage Objects Security | `storage_objects_update` and `delete` lacked `bucket_id` filter; `attachments` had blanket upload; UUID folder parsing crashed on non-UUID paths. | Restricted UPDATE/DELETE to approved buckets; enforced folder-prefix on `attachments`; created `safe_cast_uuid()` preventing type cast crashes. |
| **`DEF-112`** | **MEDIUM** | Stage 4: RLS Matrix Reconciliation | `payroll_runs_write` bundled INSERT/UPDATE/DELETE; table privileges (`GRANT`) were missing for `authenticated` role. | Decomposed bundled policies into explicit SELECT, INSERT, UPDATE, DELETE policies; added explicit table-level `GRANT` statements for all ERP tables. |
| **`DEF-113`** | **MEDIUM** | Stage 5: Configurations Overwrite | `ON CONFLICT DO UPDATE` in seed data overwrote administrator custom portal settings on migration reruns; missing table grants. | Changed to `ON CONFLICT (category, key) DO NOTHING` to preserve existing administrator settings; added explicit `GRANT` statements. |
| **`DEF-114`** | **LOW** | Role Compatibility | Mismatch between frontend 21 TypeScript roles and database 20-role whitelist needed formal reconciliation. | Formally reconciled: database whitelists all 19 institutional roles + 1 operational alias (`driver`); platform-level multi-tenant role excluded by single-institution architecture. |

---

## 3. Deep Technical Analysis & Verification Queries

### 3.1 DEF-103: Existing Column Defaults (`028_stage1_columns.sql`)
- **Original Defect:** In PostgreSQL, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS col BOOLEAN DEFAULT FALSE;` is a no-op if `col` already exists. In migration `022_academic_examination_system.sql`, `is_published` was added with `DEFAULT TRUE` and `result_status` with `DEFAULT 'PASS'`.
- **Original SQL:**
  ```sql
  ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;
  ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS result_status TEXT DEFAULT 'PENDING';
  ```
- **Corrected SQL:**
  ```sql
  ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;
  ALTER TABLE public.exams ALTER COLUMN is_published SET DEFAULT FALSE;
  ALTER TABLE public.exams ALTER COLUMN timetable_published SET DEFAULT FALSE;
  ALTER TABLE public.exams ALTER COLUMN hall_ticket_published SET DEFAULT FALSE;
  ALTER TABLE public.exams ALTER COLUMN results_published SET DEFAULT FALSE;

  ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS result_status TEXT DEFAULT 'PENDING';
  ALTER TABLE public.exam_results ALTER COLUMN result_status SET DEFAULT 'PENDING';
  ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;
  ALTER TABLE public.exam_results ALTER COLUMN is_published SET DEFAULT FALSE;
  ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT NULL;
  ALTER TABLE public.exam_results ALTER COLUMN published_at SET DEFAULT NULL;
  ```
- **Verification Query:**
  ```sql
  SELECT table_name, column_name, column_default, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND (
        (table_name = 'exams' AND column_name IN ('is_published', 'timetable_published', 'hall_ticket_published', 'results_published'))
        OR (table_name = 'exam_results' AND column_name IN ('result_status', 'is_published', 'published_at'))
    );
  ```

---

### 3.2 DEF-104: Attendance Authorization & Enrollment Validation
- **Original Defect:**
  1. `att_records_insert` used `(p.class_name = s.class_name OR p.department = s.department)`, which allowed marking a student in a completely different year/class if they shared a department.
  2. Any teacher could view all attendance sessions in the institution.
  3. `att_records_update` did not prevent modifying `student_id` or `session_id`.
  4. Ordinary teachers could modify `created_at` or reassign `teacher_id` on attendance sessions.
- **Corrected SQL Mechanisms:**
  1. Strict class matching helper & RLS check:
     ```sql
     AND p.class_name = s.class_name
     AND (s.department IS NULL OR s.department = '' OR p.department = s.department)
     ```
  2. Teacher assignment helper `public.is_teacher_assigned_to_class(teacher_id, class_name)` verifying `timetables` and `profiles.preferences->'assigned_classes'`.
  3. Trigger `protect_attendance_record_immutable_columns()` enforcing:
     ```sql
     IF NEW.student_id IS DISTINCT FROM OLD.student_id THEN
         RAISE EXCEPTION 'Security Violation: student_id cannot be modified on attendance records.' USING ERRCODE = '42501';
     END IF;
     IF NEW.session_id IS DISTINCT FROM OLD.session_id THEN
         RAISE EXCEPTION 'Security Violation: session_id cannot be modified on attendance records.' USING ERRCODE = '42501';
     END IF;
     ```
  4. Trigger `protect_attendance_session_immutable_columns()` enforcing immutable `teacher_id` and `created_at` for non-administrative users.

---

### 3.3 DEF-106: Principal Privilege Boundaries
- **Original Defect:** The trigger in Phase 1.3 checked `IF v_caller_role = 'principal'` and only blocked `admin` role mutations, allowing Principals to potentially assign financial administrative roles, modify their own account status/role, or overwrite student registration identifiers.
- **Corrected SQL Mechanism:**
  1. Self-mutation barrier:
     ```sql
     IF v_caller_id = OLD.id THEN
         IF NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status THEN
             RAISE EXCEPTION 'Security Violation: Self-modification of role or status is strictly prohibited.' USING ERRCODE = '42501';
         END IF;
     END IF;
     ```
  2. Whitelist of assignable roles for Principal:
     ```sql
     IF NEW.role NOT IN ('teacher', 'hod', 'student', 'parent', 'coe', 'librarian', 'receptionist', 'hostel_warden', 'placement_officer', 'transport_driver', 'driver', 'hr_manager', 'store_manager', 'storekeeper') THEN
         RAISE EXCEPTION 'Security Violation: Role % cannot be assigned by Principal.', NEW.role USING ERRCODE = '42501';
     END IF;
     ```
  3. Preservation of existing identifiers:
     ```sql
     IF NEW.login_id IS DISTINCT FROM OLD.login_id AND OLD.login_id IS NOT NULL THEN
         RAISE EXCEPTION 'Security Violation: Principal cannot overwrite an existing login_id.' USING ERRCODE = '42501';
     END IF;
     ```

---

### 3.4 DEF-011: Attendance Session Natural Key Analysis
- **Original Defect:** Concern regarding nullability in composite unique keys in PostgreSQL, where `NULL <> NULL`.
- **Empirical Analysis of the 5 Columns:**
  1. `class_name`: Defined as `TEXT NOT NULL` in migration `011_institutional_complete_erp.sql:211`.
  2. `session_date`: Defined as `DATE DEFAULT CURRENT_DATE NOT NULL` (`011:216`).
  3. `period_number`: Defined as `INTEGER NOT NULL DEFAULT 1` (`011:217`).
  4. `subject_code`: Defined as `TEXT NOT NULL` (`011:214`).
  5. `batch`: Added in Stage 1 as `TEXT NOT NULL DEFAULT 'All'`.
- **Verdict:** All five columns are strictly `NOT NULL`. PostgreSQL standard `UNIQUE (class_name, session_date, period_number, subject_code, batch)` is deterministic and mathematically bulletproof.
- **Duplicate Verification Query:**
  ```sql
  SELECT LOWER(TRIM(class_name)), session_date, period_number, LOWER(TRIM(subject_code)), LOWER(TRIM(batch)), COUNT(*)
  FROM public.class_attendance_sessions
  GROUP BY LOWER(TRIM(class_name)), session_date, period_number, LOWER(TRIM(subject_code)), LOWER(TRIM(batch))
  HAVING COUNT(*) > 1;
  ```

---

### 3.5 DEF-108: Audit Log Integrity Threat Model
- **Threat Model & Boundaries:**
  - **Authenticated API Clients:** Governed by PostgreSQL RLS. RLS allows only `SELECT` and `INSERT` to active `admin` users. `UPDATE` and `DELETE` have zero policies (unconditional DENY).
  - **Malicious Payload Injection:** Client passes spoofed `admin_id` or backdated `created_at`.
    - *Defense:* `bind_super_admin_audit_log_actor()` trigger executes `BEFORE INSERT` and forcibly overwrites `NEW.admin_id := auth.uid()`, `NEW.admin_email := profiles.email`, `NEW.created_at := NOW()`.
  - **PostgreSQL Trigger Guard:** Trigger `prevent_audit_log_modification()` raises exception `42501` on any attempted `UPDATE` or `DELETE`, ensuring append-only behavior even if RLS is modified.
  - **Service-Role & Superuser Boundary:** Documented as an infrastructure-level trust boundary governed by database secrets and Supabase IAM.

---

### 3.6 DEF-111: Storage Security Hardening
- **Original Defect:**
  1. `storage_objects_update` and `delete` did not verify `bucket_id`.
  2. `attachments` bucket allowed universal read and write to arbitrary paths.
  3. Direct cast `((storage.foldername(name))[1])::uuid` caused fatal query errors on non-UUID paths.
- **Corrected SQL Mechanism:**
  1. Restrict all policies to `bucket_id IN ('documents', 'student_documents', 'staff_documents', 'attachments')`.
  2. Restrict `attachments` uploads to user's folder prefix `(storage.foldername(name))[1] = auth.uid()::text`.
  3. Created `public.safe_cast_uuid(text)` using regex check to avoid syntax errors on malformed paths.

---

### 3.7 DEF-113: Stage 5 Seed Data Overwrite Prevention
- **Original Defect:** `ON CONFLICT (category, key) DO UPDATE SET value = EXCLUDED.value` in `028_stage5_configs.sql` wiped out administrator customizations on migration re-execution.
- **Corrected SQL:**
  ```sql
  INSERT INTO public.super_admin_configs (category, key, value, is_encrypted)
  VALUES (...)
  ON CONFLICT (category, key) DO NOTHING;
  ```
  Preserves existing settings without destructive overwrites.
