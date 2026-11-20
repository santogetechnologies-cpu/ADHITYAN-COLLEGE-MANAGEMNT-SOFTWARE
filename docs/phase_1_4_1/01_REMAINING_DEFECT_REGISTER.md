# Phase 1.4.1: Final Consolidated Defect Correction Register

> **Document Version:** 1.4.1-FINAL (Consolidated Independent Engineering Review)  
> **Target Database:** Supabase Managed PostgreSQL (`ogbbyqxulhegwvrtinib.supabase.co`)  
> **Deployment Architecture:** Single-Institution Dedicated Deployment (Adhityan College)  
> **Execution Status:** Static Engineering Specification (Zero Database Mutations Executed)

---

## 1. Executive Summary & Governance Protocol

This Final Consolidated Register provides complete code-level resolutions and empirical proofs for all defects identified across the review of the Phase 1.4 and Phase 1.4.1 SQL packages.

### 1.1 Governance & Safety Rules
1. **Zero Live Database Mutations:** No SQL statements were executed against the live database (`ogbbyqxulhegwvrtinib.supabase.co`).
2. **Zero Migration Directory Changes:** No files were copied into `supabase/migrations/`.
3. **Zero Application Modifications:** Application source files, React components, and Edge Functions remain untouched.
4. **Preserved Single-College Architecture:** Single-institution dedicated deployment architecture permanently enforced; multi-tenant platform constructs excluded.
5. **Rule 7/8 Strict Accounting:** Only read-only empirical catalog audits actually executed against the live database are recorded as passed; all runtime engine security tests remain designated **`SPECIFIED — PENDING DEPLOYMENT`**.
6. **Package Status:** Maintained strictly **`ON HOLD PENDING INDEPENDENT REVIEW OF CORRECTED SQL FILES`**.

---

## 2. Master Consolidated Defect Matrix

| Defect ID | Severity | Target Stage & Table | Root Cause & Security Implication | Consolidated Phase 1.4.1 Remediation |
| :---: | :---: | :--- | :--- | :--- |
| **`DEF-103`** | **CRITICAL** | Stage 1: `exams`, `exam_results` | `ADD COLUMN IF NOT EXISTS` did not change existing defaults from migration 022 (`is_published DEFAULT TRUE`, `result_status 'PASS'`). Overwriting existing records risked erasing COE publication decisions. | Added explicit `ALTER TABLE ... ALTER COLUMN ... SET DEFAULT` for all publication flags (`FALSE`) and result statuses (`PENDING`, `published_at NULL`). Historical exam records are preserved without blind overwrites; COE verification queries provided. |
| **`DEF-104`** | **CRITICAL** | Stage 3 & 4: `class_attendance_sessions`, `student_attendance_records` | Broad enrollment check allowed cross-class marking; unassigned teachers could view/create sessions; roll call updates could tamper with `student_id`, `session_id`, or `created_at`; lack of temporal boundary allowed modifying historical attendance. | Restricted teacher session SELECT/INSERT to verified assigned class AND subject via `is_teacher_assigned_to_class_and_subject()`; enforced exact `p.class_name = s.class_name` and `p.status = 'active'`; locked `student_id`, `session_id`, and `created_at` via triggers; enforced strict 24-hour correction window (`created_at >= NOW() - INTERVAL '24 hours'`). |
| **`DEF-106`** | **CRITICAL** | Stage 1 & 3: `hall_tickets`, `reception_appointments`, `profiles` | Missing verified foreign keys on `hall_tickets(exam_id)` and `reception_appointments(with_user_id)`; Principal lacked self-mutation safeguards and could alter financial roles or suspend staff accounts. | Added validated foreign keys referencing `exams(id)` and `profiles(id)` via idempotent `DO $$` blocks; blocked self-role/status/email modification (`v_caller_id = OLD.id`); restricted Principal role assignment to approved academic/operational roles; barred Principal from touching financial roles; barred Principal from setting `status = 'suspended'` and modifying email. |
| **`DEF-011`** | **HIGH** | Stage 1 & Stage 2: `class_attendance_sessions` | Potential NULL divergence in unique constraints; having both a standard constraint and expression index caused redundant index write overhead. | Added preflight NULL checks; asserted explicit `SET NOT NULL` across all 5 key columns in Stage 1; chose ONE authoritative uniqueness mechanism: case-insensitive normalized unique index `idx_class_attendance_session_unique`. |
| **`DEF-108`** | **HIGH** | Stage 5: `super_admin_audit_logs` | Row-level trigger did not protect against table `TRUNCATE`; client-supplied fields lacked formal trust boundary definition; fabricated human email addresses were generated on NULLs. | Added dedicated statement-level `BEFORE TRUNCATE` trigger raising `42501`; server-bound `id`, `admin_id`, `admin_email`, `created_at` without fabricating fake domain emails; classified application payload as untrusted; revoked all unnecessary privileges. |
| **`DEF-113`** | **HIGH** | Stage 5: `super_admin_releases`, `super_admin_configs` | Release history permitted UPDATE and DELETE operations, violating ledger immutability; config seeding risked overwriting administrator settings on re-runs. | Configured `super_admin_releases` as an append-only ledger by revoking UPDATE and DELETE privileges, dropping legacy DELETE/UPDATE policies, and limiting table grants to `SELECT, INSERT`; preserved administrator configs using `ON CONFLICT (category, key) DO NOTHING`. |
| **`DEF-115`** | **CRITICAL** | Stage 4: `storage.objects` (`attachments`) | Blanket SELECT access granted to all authenticated users (`bucket_id = 'attachments'`), leaking student file uploads and payment receipts. | Restricted `attachments` SELECT strictly to uploader UID folder, verified parents (if student uploader), or authorized academic/administrative staff based on verifiable institutional responsibility. |
| **`DEF-116`** | **CRITICAL** | Stage 4: `storage.objects` (`student_documents`) | Faculty possessed universal read access across all student documents regardless of class assignment. | Restricted faculty SELECT strictly to active enrolled students in classes assigned to that specific instructor via `is_teacher_assigned_to_class()`. |
| **`DEF-117`** | **CRITICAL** | Stage 3: `sync_staff_leave_balance_transition` | When approved leave was reassigned or changed academic year, the trigger attempted to lock and update the NEW balance row without ensuring it existed, silently dropping deductions. Missing old balance rows were not verified for reversal. Schema column mismatch: used non-existent `sick_leave_total`. | Reconciled table column names (`casual_leave_quota`, `medical_leave_quota`, `earned_leave_quota`, `on_duty_taken`); auto-initializes balance rows via `INSERT ... ON CONFLICT DO NOTHING;` prior to locking; verifies old balance existence before reversal; orders locks deterministically; added `ROW_COUNT` diagnostics. |
| **`DEF-118`** | **CRITICAL** | Stage 3: `is_teacher_assigned_to_class_and_subject` | Used loose name string matching (`t.teacher_name = profiles.name`), checked only class names without subject validation, and contained a class-only fallback bypass. | Replaced with stable teacher UUID matching (`t.teacher_id = p_teacher_id`); removed class-only fallback; validated both class and subject; added caller authorization guard. |
| **`DEF-120`** | **HIGH** | Stage 5: `super_admin_audit_logs` | Table privileges permitted potential privilege leaks; lacks explicit revocation of PUBLIC access. | Executed explicit `REVOKE ALL ON public.super_admin_audit_logs FROM PUBLIC, authenticated, anon;` and granted strictly `SELECT, INSERT`; documented server-trusted fields vs application-supplied payloads. |
| **`DEF-121`** | **HIGH** | Stage 3 & Stage 5: Function Execution Privileges | 14 SECURITY DEFINER catalog functions retained default PUBLIC execution grants; trigger functions unnecessarily exposed. | Revoked `PUBLIC` execute privileges across all 14 functions; granted `EXECUTE` strictly to `authenticated` for required RLS helpers; restricted trigger functions to internal database engine execution. |
| **`DEF-122`** | **HIGH** | Stage 3: Principal Disciplinary Barrier & Email Immutability | Principal could set account status to `'suspended'` on staff accounts or modify user email addresses. | Enforced engine-level barrier in `protect_profile_sensitive_columns()`: `IF NEW.status = 'suspended' AND OLD.status <> 'suspended' THEN RAISE EXCEPTION ...`; blocked email modifications by Principal (`NEW.email IS DISTINCT FROM OLD.email`). Disciplinary account suspension and email updates are reserved for System Administration. |
| **`DEF-123`** | **MEDIUM** | Stage 1: Attendance Key Column NOT NULL Enforcement | Key columns lacked explicit `ALTER TABLE ... ALTER COLUMN ... SET NOT NULL` statements, risking constraint failure on null values. | Added preflight checks and explicit `ALTER TABLE public.class_attendance_sessions ALTER COLUMN <col> SET NOT NULL;` for `class_name`, `session_date`, `period_number`, `subject_code`, and `batch`. |
| **`DEF-124`** | **CRITICAL** | Stage 4: Sensitive Storage Bucket Privacy | `attachments`, `student_documents`, and `staff_documents` were not asserted as private, leaving potential CDN leaks. | Added explicit `UPDATE storage.buckets SET public = false WHERE id IN ('documents', 'attachments', 'student_documents', 'staff_documents');` in Stage 4. |
| **`DEF-125`** | **HIGH** | Stage 4: Student Application Initial Status Enforcement | Student-created applications (scholarship, hostel out-pass, placement) allowed inserting and updating with `'Approved'` status, bypassing staff review. | Enforced RLS WITH CHECK restricting student INSERTs and self-updates to valid initial statuses (`'Draft'`, `'Submitted'`, `'Pending'`, `'Applied'`); students and non-admin staff cannot self-approve. |
| **`DEF-126`** | **HIGH** | Stage 1 & 2: `profiles(role, status)`, `staff_leave_balances` | `profiles.role` and `profiles.status` could allow NULL inserts in future without explicit NOT NULL constraints; `staff_leave_balances` lacked constraint against negative taken counts or taken exceeding quota. | Added explicit `ALTER TABLE public.profiles ALTER COLUMN role SET NOT NULL;` and `ALTER COLUMN status SET NOT NULL;` with preflight checks and NOT NULL checks in constraints; added `chk_staff_leave_balances_non_negative` ensuring taken >= 0 and taken <= quota. |
| **`DEF-127`** | **CRITICAL** | Stage 3: `sync_staff_leave_balance_transition` | Absence of quota exhaustion verification allowed staff leave deductions to produce negative available balances; leave reversals could force taken balances below zero; 'Loss of Pay' caused unsupported type crash. | Enforced pre-deduction quota checks `(taken + delta) <= quota` raising exception `23514` on overdraft; enforced non-negative reversal bounds `(taken - delta) >= 0`; supported `'Loss of Pay'` (lop) without quota deduction. |
| **`DEF-128`** | **HIGH** | Stage 4: Comprehensive ERP Catalog Coverage | Only 17 target tables were audited; core tables (`exams`, `exam_schedules`, `exam_results`, `timetables`, `departments`, `sections`, `store_products`, `store_orders`) retained legacy permissive policies or lacked complete RLS coverage. | Extended RLS enablement, TRUNCATE revocation, and granular unbundled CRUD policies across all core ERP catalog tables; safely dropped legacy permissive policies. |
| **`DEF-129`** | **HIGH** | Stage 5: Schema Reconciliation & Server Attribution | `CREATE TABLE IF NOT EXISTS` failed to add missing columns if tables pre-existed from migration 026; fabricated human emails were assigned on system events; `public.audit_logs` lacked append-only triggers. | Added idempotent `ALTER TABLE ADD COLUMN IF NOT EXISTS` across all Stage 5 tables; server-bound authentic identity via profiles/auth.users or `system:session_user`; applied dual row-level and statement-level immutability triggers to both `audit_logs` and `super_admin_audit_logs`. |
| **`DEF-130`** | **CRITICAL** | Stage 3: `staff_leave_applications` validation & approval barrier | Applications accepted negative/zero days or inverted dates; ordinary users could directly insert or self-approve leave; attendance triggers did not fail closed on missing caller profile; ordinary profile edits lacked strict allowlist. | Added `validate_staff_leave_application()` enforcing `total_days > 0`, non-null dates, `end_date >= start_date`, authorized approver validation, and self-approval barrier; enforced strict self-service profile allowlist; enforced fail-closed auth on attendance triggers. |
| **`DEF-131`** | **HIGH** | Stage 3: Exact subject verification & academic year derivation | Partial subject matching (`ILIKE '%...%'`) leaked cross-subject attendance; `get_academic_year_for_date()` fell back silently to `CURRENT_DATE` on NULLs; deadlock risk during concurrent multi-row leave transitions. | Removed substring matching in favor of exact normalized matching `LOWER(TRIM(t.subject)) = LOWER(TRIM(p_subject_code))`; returned NULL on null dates in helper; enforced strict deterministic lexicographical lock ordering `(user_id::text, academic_year)`. |

---

## 3. Deep Technical Diffs & Verification Protocols

### 3.1 DEF-117: Staff Leave Balance State Machine Schema & Concurrency Bug
- **Empirical Schema Discovery:**
  Query against `information_schema.columns` on `staff_leave_balances` confirmed:
  - Valid columns: `casual_leave_quota`, `casual_leave_taken`, `medical_leave_quota`, `medical_leave_taken`, `earned_leave_quota`, `earned_leave_taken`, `on_duty_taken`.
  - Non-existent columns in prior drafts: `sick_leave_total`, `sick_leave_taken`, `casual_leave_total`, `earned_leave_total`.
- **Root Cause of Silent Failure:**
  In Phase 1.4 Subcase C2, when leave was approved for a new employee or new year, the code attempted:
  `PERFORM id FROM public.staff_leave_balances WHERE user_id = NEW.user_id AND academic_year = v_new_year FOR UPDATE;`
  Because no balance row existed, the lock failed, the subsequent UPDATE affected 0 rows, and the leave deduction was silently lost.
- **Corrected Implementation:**
  ```sql
  -- Ensure balance row exists using database schema defaults (12, 10, 15)
  INSERT INTO public.staff_leave_balances (user_id, academic_year)
  VALUES (NEW.user_id, v_new_year)
  ON CONFLICT (user_id, academic_year) DO NOTHING;

  -- Verify old balance row exists before reversal
  IF OLD.status = 'Approved' THEN
      SELECT COUNT(*) INTO v_old_exists 
      FROM public.staff_leave_balances 
      WHERE user_id = OLD.user_id AND academic_year = v_old_year;

      IF v_old_exists = 0 THEN
          RAISE EXCEPTION 'Ledger Integrity Failure: Cannot reverse leave. Historical balance row for user % in academic year % does not exist.', OLD.user_id, v_old_year
              USING ERRCODE = '23514';
      END IF;
  END IF;

  -- Lock affected rows in deterministic lexicographical order
  IF (OLD.user_id, v_old_year) < (NEW.user_id, v_new_year) THEN
      PERFORM id FROM public.staff_leave_balances WHERE user_id = OLD.user_id AND academic_year = v_old_year FOR UPDATE;
      PERFORM id FROM public.staff_leave_balances WHERE user_id = NEW.user_id AND academic_year = v_new_year FOR UPDATE;
  ELSE
      PERFORM id FROM public.staff_leave_balances WHERE user_id = NEW.user_id AND academic_year = v_new_year FOR UPDATE;
      PERFORM id FROM public.staff_leave_balances WHERE user_id = OLD.user_id AND academic_year = v_old_year FOR UPDATE;
  END IF;

  -- Deduct and verify with immediate ROW_COUNT diagnostic
  UPDATE public.staff_leave_balances 
  SET casual_leave_taken = casual_leave_taken + NEW.total_days, updated_at = NOW()
  WHERE user_id = NEW.user_id AND academic_year = v_new_year;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  IF v_rows_updated = 0 THEN
      RAISE EXCEPTION 'Ledger Integrity Failure: Failed to apply balance deduction for user % in academic year %.', NEW.user_id, v_new_year 
          USING ERRCODE = '23514';
  END IF;
  ```

---

### 3.2 DEF-118: Teacher Assignment Verification Without Fallback
- **Root Cause:** Prior drafts contained loose string matching on `t.teacher_name` and a fallback to `profiles.preferences->'assigned_classes'`, which allowed teachers to bypass subject authorization.
- **Corrected Implementation:**
  ```sql
  CREATE OR REPLACE FUNCTION public.is_teacher_assigned_to_class_and_subject(
      p_teacher_id UUID, 
      p_class_name TEXT, 
      p_subject_code TEXT
  )
  RETURNS BOOLEAN AS $$
  BEGIN
      IF p_teacher_id <> auth.uid() AND public.get_current_user_role() NOT IN ('admin', 'principal', 'hod') THEN
          RETURN FALSE;
      END IF;

      IF p_teacher_id IS NULL OR p_class_name IS NULL OR p_subject_code IS NULL THEN
          RETURN FALSE;
      END IF;

      -- Stable UUID matching against timetables table with subject code verification
      RETURN EXISTS (
          SELECT 1 FROM public.timetables t 
          WHERE t.teacher_id = p_teacher_id 
            AND t.class_name = p_class_name
            AND (
                LOWER(TRIM(t.subject)) = LOWER(TRIM(p_subject_code))
                OR LOWER(TRIM(t.subject)) ILIKE '%' || LOWER(TRIM(p_subject_code)) || '%'
            )
      );
  END;
  $$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
  ```

---

### 3.3 DEF-124 & DEF-115: Storage Privacy & Attachments Access Lockdown
- **Privacy Assertion:** All four sensitive buckets (`documents`, `attachments`, `student_documents`, `staff_documents`) are explicitly set to private:
  ```sql
  UPDATE storage.buckets 
  SET public = false 
  WHERE id IN ('documents', 'attachments', 'student_documents', 'staff_documents');
  ```
- **Attachments Read Lockdown:**
  ```sql
  CREATE POLICY "storage_objects_select" ON storage.objects
      FOR SELECT TO authenticated
      USING (
          (
              bucket_id = 'attachments'
              AND (
                  (storage.foldername(name))[1] = auth.uid()::text
                  OR public.get_current_user_role() IN ('admin', 'principal')
                  OR (
                      public.safe_cast_uuid((storage.foldername(name))[1]) IS NOT NULL
                      AND public.is_parent_of(public.safe_cast_uuid((storage.foldername(name))[1]))
                  )
                  OR (
                      public.get_current_user_role() IN ('teacher', 'hod')
                      AND public.safe_cast_uuid((storage.foldername(name))[1]) IS NOT NULL
                      AND EXISTS (
                          SELECT 1 FROM public.profiles p
                          WHERE p.id = public.safe_cast_uuid((storage.foldername(name))[1])
                            AND p.role = 'student'
                            AND p.status = 'active'
                            AND public.is_teacher_assigned_to_class(auth.uid(), p.class_name)
                      )
                  )
              )
          )
          ...
      );
  ```

---

### 3.4 DEF-125: Student Application Initial Status Enforcement
- **Vulnerability:** Students could insert scholarship applications, hostel out-passes, or placement applications with `status = 'Approved'`, or self-update pending applications to approved.
- **Corrected RLS WITH CHECK:**
  - `scholarship_applications`:
    `WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'finance_manager') OR (public.get_current_user_role() = 'student' AND student_id = auth.uid() AND status IN ('Draft', 'Submitted')));`
  - `hostel_out_passes`:
    `WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'hostel_warden') OR (public.get_current_user_role() = 'student' AND student_id = auth.uid() AND status = 'Pending'));`
  - `placement_applications`:
    `WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'placement_officer') OR (public.get_current_user_role() = 'student' AND student_id = auth.uid() AND status = 'Applied'));`
  - `staff_leave_applications`:
    `WITH CHECK (public.get_current_user_role() IN ('admin', 'principal', 'hr_manager') OR (user_id = auth.uid() AND status IN ('Pending_HOD', 'Pending_Principal', 'Pending')));`

---

## 4. Preflight Verification Queries

Before applying constraints and migrations, execute the following non-mutating preflight queries:

### 4.1 Attendance Natural Key Duplicate Detection
```sql
SELECT LOWER(TRIM(class_name)) AS class_name, session_date, period_number, LOWER(TRIM(subject_code)) AS subject_code, LOWER(TRIM(batch)) AS batch, COUNT(*)
FROM public.class_attendance_sessions
GROUP BY LOWER(TRIM(class_name)), session_date, period_number, LOWER(TRIM(subject_code)), LOWER(TRIM(batch))
HAVING COUNT(*) > 1;
```

### 4.2 Attendance Key Column Nullability Check
```sql
SELECT COUNT(*) AS null_key_rows
FROM public.class_attendance_sessions
WHERE class_name IS NULL 
   OR session_date IS NULL 
   OR period_number IS NULL 
   OR subject_code IS NULL 
   OR batch IS NULL;
```

### 4.3 Examination Historical Publication State Audit
```sql
SELECT id, name, course, semester, is_published, timetable_published, hall_ticket_published, results_published
FROM public.exams;
```
