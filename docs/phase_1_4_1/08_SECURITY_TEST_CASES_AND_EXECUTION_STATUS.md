# Phase 1.4.1: Security Test Cases & Empirical Execution Status

> **Document Version:** 1.4.1 (Static Independent Review & Testing Protocol)  
> **Target Database:** Supabase Managed PostgreSQL (`ogbbyqxulhegwvrtinib.supabase.co`)  
> **Deployment Architecture:** Single-Institution Dedicated Deployment (Adhityan College)  
> **Verification Governance:** Strict Rule 7/8 Compliance (Only actually executed diagnostic tests marked as recorded; all runtime integration tests marked as Pending Deployment)

---

## 1. Governance & Execution Protocol

In strict compliance with independent review protocols:
1. **Empirical Static Catalog Tests:** Queries and schema inspections actually executed against the live database catalogs or migration baselines are marked as **`EXECUTED — RECORDED`**.
2. **Runtime Integration Security Tests:** Engine-level positive and negative test cases verifying active RLS policies, triggers, and state machines post-deployment are marked as **`SPECIFIED — PENDING DEPLOYMENT`**.

---

## 2. Empirical Static Catalog Tests (Actually Executed)

| Test ID | Target Domain | Execution Date & Evidence Source | Observed Empirical Result | Status |
| :--- | :--- | :---: | :--- | :---: |
| **TC-CAT-01** | Storage Bucket Privacy | 2026-11-19 (Live Supabase `storage.buckets`) | Bucket `documents` recorded with `public: true`. Stage 4 remediation `UPDATE storage.buckets SET public = false WHERE id IN ('documents', 'attachments', 'student_documents', 'staff_documents')` verified necessary. | **EXECUTED — RECORDED** |
| **TC-CAT-02** | Profiles Schema Inspection | 2026-11-19 (`information_schema.columns`) | `public.profiles` contains 14 columns; confirmed `student_id` is absent. Stage 1 addition verified necessary. | **EXECUTED — RECORDED** |
| **TC-CAT-03** | Exam Results Baseline | 2026-11-19 (`public.exam_results`) | Query recorded `count(*) = 0`. Safe defaults (`result_status 'PENDING'`, `is_published FALSE`) carry zero data loss risk. | **EXECUTED — RECORDED** |
| **TC-CAT-04** | Staff Leaves Schema | 2026-11-19 (`information_schema.columns`) | Confirmed `academic_year` is absent on `staff_leave_applications`. Dynamic calculation helper verified necessary. | **EXECUTED — RECORDED** |
| **TC-CAT-05** | Catalog Function Search Paths | 2026-11-19 (`pg_proc`) | 10 live `SECURITY DEFINER` functions in `public` lacked `search_path` (`proconfig IS NULL`). Stage 3 lockdowns verified necessary. | **EXECUTED — RECORDED** |
| **TC-CAT-06** | Attendance Column Nullability | 2026-11-19 (`openapi.json` / migration 011) | Confirmed `class_name`, `session_date`, `period_number`, `subject_code` are strictly `NOT NULL`. Key is non-nullable. | **EXECUTED — RECORDED** |
| **TC-CAT-07** | Frontend Role Alignment | 2026-11-19 (`src/config/roles.ts`, `AuthContext.tsx`)| Frontend defines 21 TypeScript roles (19 institutional + 1 alias `driver` + 1 platform role). DB whitelist covers all 20 valid roles. | **EXECUTED — RECORDED** |
| **TC-CAT-08** | Preflight Attendance Duplicates | 2026-11-19 (`class_attendance_sessions`) | Diagnostic check across 5 key columns on existing 2 live rows confirmed 0 duplicate groups. Single unique index is safe. | **EXECUTED — RECORDED** |
| **TC-CAT-09** | Staff Leave Balances Columns | 2026-11-19 (`supabase/migrations/011...`) | Confirmed table columns: `casual_leave_quota/taken`, `medical_leave_quota/taken`, `earned_leave_quota/taken`, `on_duty_taken`. Fixed invalid references to `sick_leave_total`. | **EXECUTED — RECORDED** |
| **TC-CAT-10** | Legacy Storage Policies | 2026-11-19 (`003_storage_setup.sql`) | Confirmed existence of 6 legacy policies on `storage.objects` including `"Public read access for attachments"`. Explicit drop statements verified necessary. | **EXECUTED — RECORDED** |

---

## 3. Runtime Engine Security Test Cases (Pending Deployment)

The following test suite specifies the exact operational assertions to be tested upon authorized deployment of migration 028:

### 3.1 Suite A: Storage Access Security (`DEF-115`, `DEF-116`, `DEF-124`)

#### TC-STOR-01: Unauthorized Student Reading Peer Attachments (Negative Test)
- **Actor:** Authenticated Student A (`student_a_uuid`).
- **SQL Action:** `SELECT * FROM storage.objects WHERE bucket_id = 'attachments' AND name LIKE 'student_b_uuid/%';`
- **Expected Engine Response:** Returns 0 rows. (DEF-115 blocks cross-student attachment reading).
- **Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

#### TC-STOR-02: Faculty Reading Student Documents Outside Assigned Class (Negative Test)
- **Actor:** Faculty Teacher X (assigned only to "B.Voc MLT 1st Year").
- **SQL Action:** `SELECT * FROM storage.objects WHERE bucket_id = 'student_documents' AND name LIKE 'student_dialysis_3rd_year_uuid/%';`
- **Expected Engine Response:** Returns 0 rows. (DEF-116 restricts faculty to assigned classes).
- **Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

#### TC-STOR-03: Faculty Reading Student Documents in Assigned Class (Positive Test)
- **Actor:** Faculty Teacher X (assigned to "B.Voc MLT 1st Year").
- **SQL Action:** `SELECT * FROM storage.objects WHERE bucket_id = 'student_documents' AND name LIKE 'student_mlt_1st_year_uuid/%';`
- **Expected Engine Response:** File metadata returned successfully.
- **Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

#### TC-STOR-04: Anonymous Public URL Access to Sensitive Buckets (Negative Test)
- **Actor:** Unauthenticated anonymous client via public HTTP CDN endpoint.
- **Action:** `GET https://ogbbyqxulhegwvrtinib.supabase.co/storage/v1/object/public/documents/sensitive_doc.pdf`
- **Expected Engine Response:** HTTP 400/404 or `{"statusCode": 404, "message": "Bucket is not public"}`. (DEF-124 enforces private buckets).
- **Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

---

### 3.2 Suite B: Staff Leave Balance Concurrency & State Machine (`DEF-117`)

#### TC-LEAVE-01: Leave Reassignment to Employee with Uninitialized Balance
- **Actor:** HR Manager updating approved application from Staff A to Staff B (who has no existing balance row for the academic year).
- **SQL Action:**
  ```sql
  UPDATE public.staff_leave_applications 
  SET user_id = 'staff-b-uuid', updated_at = NOW()
  WHERE id = 'approved-application-uuid';
  ```
- **Expected Engine Response:**
  - Status: **SUCCESS**
  - Balance for Staff A in old year: Deducted days refunded.
  - Balance for Staff B in target year: Balance row initialized automatically via `ON CONFLICT DO NOTHING`, locked, and days deducted.
- **Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

#### TC-LEAVE-02: Missing Old Balance Row During Reversal (Negative Test)
- **Actor:** Updating approved leave application where original employee has no balance row for the old year.
- **SQL Action:** `UPDATE public.staff_leave_applications SET status = 'Rejected' WHERE id = 'corrupt-application-uuid';`
- **Expected Engine Response:** `23514 - Ledger Integrity Failure: Cannot reverse leave. Historical balance row for user ... does not exist.`
- **Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

#### TC-LEAVE-03: Concurrent Approval Deadlock Prevention
- **Actor:** Concurrent execution of two approvals involving Staff A (2026-2027) and Staff B (2025-2026).
- **SQL Action:** Parallel transactions updating leave applications.
- **Expected Engine Response:** Deterministic lexicographical lock order `(user_id, academic_year)` eliminates deadlock; both transactions serialize cleanly.
- **Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

---

### 3.3 Suite C: Teacher Class, Subject Verification & 24h Window (`DEF-104`, `DEF-118`, `DEF-119`)

#### TC-ATT-01: Teacher Creating Session for Unassigned Subject (Negative Test)
- **Actor:** Teacher X assigned to teach "Clinical Pathology", attempting to take attendance for "Pharmacology".
- **SQL Action:**
  ```sql
  INSERT INTO public.class_attendance_sessions 
      (class_name, session_date, period_number, subject_code, batch, teacher_id, teacher_name, department, subject_title)
  VALUES ('B.Voc MLT 1st Year', CURRENT_DATE, 2, 'PHARM101', 'All', auth.uid(), 'Teacher X', 'MLT', 'Pharmacology');
  ```
- **Expected Engine Response:** `42501 - new row violates row-level security policy for table "class_attendance_sessions"`.
- **Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

#### TC-ATT-02: Teacher Updating Attendance Session Past 24-Hour Window (Negative Test)
- **Actor:** Teacher X attempting to update attendance session created 48 hours ago.
- **SQL Action:** `UPDATE public.class_attendance_sessions SET notes = 'late correction' WHERE id = 'old-session-uuid';`
- **Expected Engine Response:** `42501 - Security Violation: Attendance session modification window (24 hours) has expired.`
- **Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

#### TC-ATT-03: Non-Admin Probing Arbitrary Faculty Assignments (Negative Test)
- **Actor:** Authenticated Student or Teacher Y probing Teacher X's assignment.
- **SQL Action:** `SELECT public.is_teacher_assigned_to_class('teacher-x-uuid', 'B.Voc MLT 1st Year');`
- **Expected Engine Response:** Returns `FALSE` (DEF-119 authorization guard prevents information leakage).
- **Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

---

### 3.4 Suite D: Profile Self-Mutation, Disciplinary Barrier & Email Protection (`DEF-106`, `DEF-122`)

#### TC-PROF-01: User Attempting Self-Email Modification (Negative Test)
- **Actor:** Authenticated user attempting to change email on their own profile.
- **SQL Action:** `UPDATE public.profiles SET email = 'attacker@external.com' WHERE id = auth.uid();`
- **Expected Engine Response:** `42501 - Security Violation: Self-modification of profile email is strictly prohibited.`
- **Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

#### TC-PROF-02: Principal Attempting Disciplinary Suspension of Staff (Negative Test)
- **Actor:** Authenticated Principal (`principal_uuid`).
- **SQL Action:** `UPDATE public.profiles SET status = 'suspended' WHERE id = 'staff-uuid';`
- **Expected Engine Response:** `42501 - Security Violation: Account suspension is a disciplinary action reserved for System Administration.`
- **Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

---

### 3.5 Suite E: Audit Log Forensic Immutability & Append-Only Ledger (`DEF-108`, `DEF-113`, `DEF-120`)

#### TC-AUDIT-01: Attempted Audit Deletion or Row Modification (Negative Test)
- **Actor:** Authenticated User or Admin.
- **SQL Action:**
  ```sql
  DELETE FROM public.super_admin_audit_logs;
  UPDATE public.super_admin_audit_logs SET action = 'tampered';
  ```
- **Expected Engine Response:** `42501 - Security Violation: Audit logs are strictly append-only. UPDATE and DELETE operations are permanently prohibited.`
- **Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

#### TC-AUDIT-02: Attempted Audit Log Truncation (Negative Test)
- **Actor:** Database user attempting table truncation.
- **SQL Action:** `TRUNCATE public.super_admin_audit_logs;`
- **Expected Engine Response:** `42501 - Security Violation: Audit logs cannot be truncated. TRUNCATE operation is permanently prohibited.`
- **Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

#### TC-AUDIT-03: Attempted Deletion from Release Ledger (Negative Test)
- **Actor:** Admin attempting to delete release history.
- **SQL Action:** `DELETE FROM public.super_admin_releases WHERE version = 'v1.0.0-phase1';`
- **Expected Engine Response:** `42501 - permission denied for table super_admin_releases` (Privilege revoked at engine level).
- **Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

---

### 3.6 Suite F: Student Application Initial Status Enforcement (`DEF-125`)

#### TC-APP-01: Student Attempting Direct Scholarship Self-Approval (Negative Test)
- **Actor:** Authenticated Student (`student_uuid`).
- **SQL Action:**
  ```sql
  INSERT INTO public.scholarship_applications (student_id, scholarship_name, amount, status)
  VALUES (auth.uid(), 'Merit Scholarship', 50000, 'Approved');
  ```
- **Expected Engine Response:** `42501 - new row violates row-level security policy for table "scholarship_applications"`. (Student is restricted to Draft or Submitted).
- **Status:** **`SPECIFIED — PENDING DEPLOYMENT`**

#### TC-APP-02: Student Attempting Direct Hostel Out Pass Self-Approval (Negative Test)
- **Actor:** Authenticated Student (`student_uuid`).
- **SQL Action:**
  ```sql
  INSERT INTO public.hostel_out_passes (student_id, reason, out_date, status)
  VALUES (auth.uid(), 'Weekend Visit', CURRENT_DATE, 'Approved');
  ```
- **Expected Engine Response:** `42501 - new row violates row-level security policy for table "hostel_out_passes"`. (Student is restricted to Pending).
- **Status:** **`SPECIFIED — PENDING DEPLOYMENT`**
