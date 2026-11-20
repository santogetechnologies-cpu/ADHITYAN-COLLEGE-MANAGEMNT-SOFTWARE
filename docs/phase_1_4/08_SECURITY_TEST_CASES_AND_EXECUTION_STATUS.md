# Phase 1.4: Security Test Cases & Empirical Execution Status

> **Document Version:** 1.4.0 (Independent Static Review & Testing Protocol)  
> **Target Database:** Supabase Managed PostgreSQL (`ogbbyqxulhegwvrtinib.supabase.co`)  
> **Deployment Architecture:** Single-Institution Dedicated Deployment (Adhityan College)  
> **Verification Governance:** Strict Rule 8 Compliance (Only actually executed tests marked as passed; all runtime engine tests marked as Pending Deployment)

---

## 1. Governance & Execution Protocol

To prevent premature readiness declarations, test verification is partitioned into two distinct categories:
1. **Empirical Static Catalog Audit Tests:** Read-only diagnostic queries and OpenAPI schema audits actually executed against the live project. These are marked as **`EXECUTED — RECORDED`**.
2. **Runtime Integration Security Test Cases:** Formal positive and negative test cases designed to validate the PostgreSQL engine post-deployment. In strict compliance with the **Zero Execution Policy**, these are marked as **`SPECIFIED — PENDING DEPLOYMENT`**.

---

## 2. Empirical Static Catalog Tests (Actually Executed)

| Test ID | Target Domain | Execution Date & Source | Observed Empirical Result | Status |
| :--- | :--- | :---: | :--- | :---: |
| **TC-CAT-01** | Storage Bucket Privacy | 2026-11-19 (Supabase `storage.buckets`) | Query recorded `documents` bucket configured with `public: true`. Verified need for `UPDATE storage.buckets SET public = false`. | **EXECUTED — RECORDED** |
| **TC-CAT-02** | Profiles Schema Inspection | 2026-11-19 (`information_schema.columns`) | `public.profiles` contains 14 columns; confirmed `student_id` is completely absent. Stage 1 addition verified necessary. | **EXECUTED — RECORDED** |
| **TC-CAT-03** | Exam Results Baseline | 2026-11-19 (`public.exam_results`) | Query recorded `count(*) = 0`. Safe defaults and strict student identity trigger introduce zero data loss risk. | **EXECUTED — RECORDED** |
| **TC-CAT-04** | Staff Leaves Schema | 2026-11-19 (`information_schema.columns`) | Query confirmed `academic_year` is absent on `staff_leave_applications`. Dynamic calculation helper verified necessary. | **EXECUTED — RECORDED** |
| **TC-CAT-05** | Catalog Function Search Paths | 2026-11-19 (`pg_proc`) | 10 live `SECURITY DEFINER` functions in `public` lacked `search_path` (`proconfig IS NULL`). Stage 3 lockdowns verified necessary. | **EXECUTED — RECORDED** |
| **TC-CAT-06** | Attendance Column Nullability | 2026-11-19 (`openapi.json` / migration 011) | Confirmed `class_name`, `session_date`, `period_number`, `subject_code` are strictly `NOT NULL`. Natural key is non-nullable. | **EXECUTED — RECORDED** |
| **TC-CAT-07** | Frontend Role Alignment | 2026-11-19 (`src/config/roles.ts`, `AuthContext.tsx`)| Frontend defines 21 TypeScript roles (19 institutional + 1 alias `driver` + 1 platform role). DB whitelist covers all 20 valid roles. | **EXECUTED — RECORDED** |

---

## 3. Runtime Engine Security Test Cases (Pending Deployment)

The following integration test cases represent the formal verification suite to be executed immediately upon authorized deployment of migration 028:

### 3.1 Suite A: Profile Protection & Privilege Ceilings (`DEF-001`, `DEF-106`)

#### TC-SEC-01: Unauthorized Role Escalation by Student
- **Actor:** Authenticated Student (`student_uuid`, role `'student'`).
- **SQL Action:** `UPDATE public.profiles SET role = 'admin' WHERE id = auth.uid();`
- **Expected Error:** `42501 (insufficient_privilege) - Security Violation: Self-modification of user role is strictly prohibited.`
- **Execution Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

#### TC-SEC-02: Self-Status Mutation by Principal
- **Actor:** Authenticated Principal (`principal_uuid`, role `'principal'`).
- **SQL Action:** `UPDATE public.profiles SET status = 'inactive' WHERE id = auth.uid();`
- **Expected Error:** `42501 (insufficient_privilege) - Security Violation: Self-modification of account status is strictly prohibited.`
- **Execution Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

#### TC-SEC-03: Principal Granting Admin Privileges
- **Actor:** Authenticated Principal (`principal_uuid`).
- **SQL Action:** `UPDATE public.profiles SET role = 'admin' WHERE id = 'target-staff-uuid';`
- **Expected Error:** `42501 (insufficient_privilege) - Security Violation: Principal cannot grant or revoke administrative privileges.`
- **Execution Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

#### TC-SEC-04: Principal Appointing Financial Manager
- **Actor:** Authenticated Principal (`principal_uuid`).
- **SQL Action:** `UPDATE public.profiles SET role = 'finance_manager' WHERE id = 'target-staff-uuid';`
- **Expected Error:** `42501 (insufficient_privilege) - Security Violation: Principal cannot manage financial administration roles.`
- **Execution Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

---

### 3.2 Suite B: Attendance Authorization & Integrity (`DEF-011`, `DEF-104`)

#### TC-ATT-01: Unassigned Teacher Creating Session
- **Actor:** Faculty Teacher X not assigned to "B.Voc MLT 3rd Year".
- **SQL Action:**
  ```sql
  INSERT INTO public.class_attendance_sessions 
      (teacher_id, teacher_name, class_name, department, subject_code, subject_title, batch)
  VALUES (auth.uid(), 'Teacher X', 'B.Voc MLT 3rd Year', 'MLT', 'MLT301', 'Hematology III', 'All');
  ```
- **Expected Error:** `42501 - new row violates row-level security policy for table "class_attendance_sessions"`
- **Execution Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

#### TC-ATT-02: Teacher Marking Cross-Class Student
- **Actor:** Authorized Teacher X recording attendance for session in "B.Voc MLT 1st Year".
- **SQL Action:**
  ```sql
  -- Attempt to mark Student Y who is enrolled in "B.Voc MLT 2nd Year" (same department, different class)
  INSERT INTO public.student_attendance_records 
      (session_id, student_id, student_name, roll_number, status)
  VALUES ('session-1st-year-uuid', 'student-2nd-year-uuid', 'Student Y', 'MLT-2024-05', 'Present');
  ```
- **Expected Error:** `42501 - new row violates row-level security policy for table "student_attendance_records"` (Exact class enrollment check failed).
- **Execution Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

#### TC-ATT-03: Immutability of student_id and session_id on Roll Call Update
- **Actor:** Authorized Teacher X updating remarks or attendance status.
- **SQL Action:**
  ```sql
  UPDATE public.student_attendance_records 
  SET student_id = 'different-student-uuid' 
  WHERE id = 'record-uuid';
  ```
- **Expected Error:** `42501 - Security Violation: student_id cannot be modified on attendance records.`
- **Execution Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

#### TC-ATT-04: Concurrent Practical Lab Batches in Same Period
- **Actor:** Teacher A (Batch A) and Teacher B (Batch B).
- **SQL Action:**
  ```sql
  -- Session 1: Batch A
  INSERT INTO public.class_attendance_sessions (class_name, session_date, period_number, subject_code, batch, teacher_id, teacher_name, department, subject_title)
  VALUES ('B.Voc MLT 1st Year', CURRENT_DATE, 3, 'MLT102P', 'Batch A', 'teacher-a-uuid', 'Teacher A', 'MLT', 'Biochemistry Lab');

  -- Session 2: Batch B
  INSERT INTO public.class_attendance_sessions (class_name, session_date, period_number, subject_code, batch, teacher_id, teacher_name, department, subject_title)
  VALUES ('B.Voc MLT 1st Year', CURRENT_DATE, 3, 'MLT102P', 'Batch B', 'teacher-b-uuid', 'Teacher B', 'MLT', 'Pathology Lab');
  ```
- **Expected Result:** Both sessions inserted successfully without constraint violation.
- **Execution Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

---

### 3.3 Suite C: Audit Log Threat Model & Immutability (`DEF-108`)

#### TC-AUDIT-01: Admin Attempting Audit Trail Deletion
- **Actor:** Compromised Institutional Administrator (`admin_uuid`).
- **SQL Action:** `DELETE FROM public.super_admin_audit_logs WHERE action = 'ROLE_CONFIG_UPDATE';`
- **Expected Error:** `42501 - Security Violation: Audit logs are strictly append-only. UPDATE and DELETE operations are permanently prohibited.`
- **Execution Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

#### TC-AUDIT-02: Spoofed Client Actor Payload Override
- **Actor:** Institutional Administrator inserting audit event with fake actor UUID.
- **SQL Action:**
  ```sql
  INSERT INTO public.super_admin_audit_logs 
      (admin_id, admin_email, action, target_entity, target_id, changes)
  VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'fake@external.com', 'CONFIG_EDIT', 'super_admin_configs', 'theme', '{}'::jsonb);

  SELECT admin_id, admin_email FROM public.super_admin_audit_logs WHERE action = 'CONFIG_EDIT';
  ```
- **Expected Result:** `admin_id` equals `auth.uid()`; `admin_email` equals caller's real profile email. Client spoofing ignored.
- **Execution Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

---

### 3.4 Suite D: Storage Objects Isolation (`DEF-111`)

#### TC-STOR-01: Malformed Non-UUID Path Upload/Download
- **Actor:** Authenticated Student accessing path with non-UUID prefix `temp/notes.pdf`.
- **SQL Action:** `SELECT * FROM storage.objects WHERE bucket_id = 'student_documents' AND name = 'temp/notes.pdf';`
- **Expected Result:** Query executes cleanly without PostgreSQL UUID syntax errors (`safe_cast_uuid` handles non-UUID strings returning NULL).
- **Execution Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

#### TC-STOR-02: Storage Modification on Unapproved Bucket
- **Actor:** Authenticated User attempting update on unmanaged bucket.
- **SQL Action:** `UPDATE storage.objects SET metadata = '{}'::jsonb WHERE bucket_id = 'system_internal';`
- **Expected Error:** `42501 - violates row-level security policy for table "objects"` (Explicit bucket filter denies operation).
- **Execution Status:** **`SPECIFIED — PENDING DEPLOYMENT`**
