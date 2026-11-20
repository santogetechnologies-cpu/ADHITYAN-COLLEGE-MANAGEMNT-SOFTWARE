# Phase 1.1: SQL Security Defect Register & Vulnerability Analysis

> **Target System:** ADHITYAN College Management Software  
> **Deployment Architecture:** Single-Institution Dedicated Deployment (`ogbbyqxulhegwvrtinib.supabase.co`)  
> **Audit Mode:** SQL Correction Design and Static Architectural Verification Only  
> **Execution Status:** 100% Static Documentation (Zero SQL Execution / Zero Database Mutations)

---

## 1. Executive Summary

During the Phase 1 Pre-Implementation Gate Check, the five proposed migration scripts (`028_stage1_columns.sql` through `028_stage5_configs.sql`) were subjected to a rigorous second-pass architectural and engine-level security inspection. 

This inspection identified **12 critical technical, concurrency, and authorization defects** in the previous draft SQL. If those scripts had been executed without remediation, they would have introduced severe security vulnerabilities—including complete bypass of profile protection, application lockout on student attendance records, data leakage via un-dropped permissive RLS policies, audit log tampering, and clinical lab practical attendance collisions.

This document catalogs every identified defect, analyzes its root cause, and specifies the required mathematical and architectural correction.

---

## 2. Complete SQL Defect Register

| Defect ID | Severity | Target Domain | Component / Statement | Root Cause Summary | Required Correction |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **DEF-001** | **P0 (Critical)** | Profile Escalation | `protect_profile_sensitive_columns()` | `current_user` inside a `SECURITY DEFINER` function evaluates to function owner (`postgres`), permanently bypassing the trigger. | Distinguish `auth.uid()` vs `session_user` vs `current_setting('request.jwt.claim.role', true)`. Fail-closed if profile missing. |
| **DEF-002** | **P1 (High)** | HR Staff Leaves | `sync_staff_leave_balance_transition()` | Hardcoded `v_academic_year TEXT := '2024-2025'` permanently corrupts balances in subsequent academic years. | Dynamically resolve `academic_year` from `institutional_settings` or application record. |
| **DEF-003** | **P1 (High)** | HR Staff Leaves | `sync_staff_leave_balance_transition()` | `GREATEST(0, balance - days)` silently clips negative balances, hiding accounting leaks and quota fraud. | Remove silent clipping; raise structured exception if deduction results in mathematical inconsistency. |
| **DEF-004** | **P1 (High)** | HR Staff Leaves | `sync_staff_leave_balance_transition()` | Unhandled leave type changes on approved leaves; unhandled employee (`user_id`) reassignment; lack of `FOR UPDATE` row lock. | Implement exhaustive state matrix; acquire pessimistic row lock (`FOR UPDATE`) on balance record during transitions. |
| **DEF-005** | **P0 (Critical)** | Function Security | `ALTER FUNCTION public.is_parent_of(UUID, UUID)` | Signature mismatch: live database function is `is_parent_of(UUID)` (1 argument). Executing with 2 args fails with SQL 42883. | Correct signature to `public.is_parent_of(UUID)` and harden `search_path`. |
| **DEF-006** | **P1 (High)** | Function Security | System RPCs / Triggers | 8 additional `SECURITY DEFINER` functions in live database have `search_path = NONE`, allowing search_path hijacking. | Explicitly append `SET search_path = public` across all 10 live `SECURITY DEFINER` functions. |
| **DEF-007** | **P0 (Critical)** | RLS Bypass | `hall_tickets`, `fee_structures`, `broadcasts` | Legacy permissive policies (`Allow manage hall tickets`, `Allow read hall tickets`, `fee_structures_public_read`) not dropped. | Explicitly execute `DROP POLICY IF EXISTS` on all 6 legacy overlapping policies before applying new policies. |
| **DEF-008** | **P0 (Critical)** | Application Lockout | `student_attendance_records` | `att_records_all` dropped in Stage 4 without creating replacement policies, resulting in total denial of service for roll call. | Deploy granular role-based policies for `student_attendance_records` alongside session policies. |
| **DEF-009** | **P0 (Critical)** | Storage Security | `storage.objects` (`documents`) | `Authenticated users can upload/delete documents` allows any user to overwrite or delete any document. Path manipulation possible. | Enforce folder ownership: `(storage.foldername(name))[1] = auth.uid()::text` for non-administrative users. |
| **DEF-010** | **P1 (High)** | Audit Integrity | `super_admin_audit_logs` | RLS policy used `FOR ALL TO authenticated`, allowing admins to update or delete audit records. | Enforce append-only semantics: grant `SELECT` and `INSERT` only; zero policies for `UPDATE` or `DELETE`. |
| **DEF-011** | **P1 (High)** | Attendance Identity | `uq_class_attendance_session` | Natural key `(class, date, period, subject)` blocks concurrent lab practical batches taking the same subject in parallel. | Add explicit `batch` column (`DEFAULT 'All'`) in Stage 1 and incorporate into unique constraint. |
| **DEF-012** | **P2 (Medium)** | Data Constraints | `profiles.login_id` & Migration 015 | Empty string (`""`) login IDs collide in partial index; migration 015 constraint present in DB but missing from tracking table. | Add `CHECK (login_id IS NULL OR LENGTH(TRIM(login_id)) >= 3)`; document idempotent tracking synchronization. |

---

## 3. In-Depth Root Cause Analysis

### 3.1 DEF-001: The `current_user` Flaw in `SECURITY DEFINER`
- **Vulnerability:**
  In PostgreSQL, a function declared with `SECURITY DEFINER` executes with the privileges and role identity of the **user that created it** (the function owner, typically `postgres` in Supabase).
  Within the function body, the system variable `current_user` evaluates to the effective executing role (`postgres`), **NOT the caller** who initiated the query!
  Consequently, the draft code:
  ```sql
  IF current_user IN ('postgres', 'service_role') THEN
      RETURN NEW;
  END IF;
  ```
  evaluates to `TRUE` for **every single caller** (students, teachers, anonymous users)! The trigger would immediately return `NEW` without performing any checks, rendering `role`, `status`, and `student_id` completely editable by any user.
- **Architectural Solution:**
  1. Distinguish between physical database session connections and PostgREST API calls:
     - `session_user`: The physical role that authenticated to the PostgreSQL connection pool. For direct database administrator scripts and migrations, `session_user IN ('postgres', 'supabase_admin')`.
     - `current_setting('request.jwt.claim.role', true)`: The JWT role claim passed by PostgREST. When trusted administrative services call via the Supabase Service Role Key, this setting equals `'service_role'`.
     - `auth.uid()`: The authenticated end-user's UUID.
  2. If `current_setting('request.jwt.claim.role', true) = 'service_role'` OR (`auth.uid()` IS NULL AND `session_user IN ('postgres', 'supabase_admin')`): allow administrative backend provisioning to proceed.
  3. If `auth.uid()` IS NOT NULL: the request originates from an application user. The function must look up the caller's authoritative database profile:
     ```sql
     SELECT role, status INTO v_caller_role, v_caller_status FROM public.profiles WHERE id = auth.uid();
     ```
  4. If `v_caller_role` is NULL or `v_caller_status <> 'active'`, the function **fails closed** with an exception (`Security Violation: Inactive or unverified caller`).
  5. If `v_caller_role NOT IN ('admin', 'principal')`, any mutation of `role`, `status`, `student_id`, `roll_number`, or `login_id` raises an exception.

---

### 3.2 DEF-002, DEF-003 & DEF-004: Leave Balance Concurrency & Accounting Flaws
- **Vulnerabilities:**
  1. **Hardcoded Academic Year:** `v_academic_year TEXT := '2024-2025'` would cause all leaves submitted in 2025–2026 and beyond to be deducted from 2024–2025 quotas, leaving future year balances untouched.
  2. **Silent Negative Masking:** `GREATEST(0, casual_leave_taken - OLD.total_days)` masks accounting drift. If a leave is approved twice or refunded incorrectly, the balance is silently clamped at zero without alerting administrators.
  3. **Leave Type Transition Blindspot:** The draft trigger only adjusted balances when `NEW.leave_type = OLD.leave_type`. If an administrator changed an approved application from "Casual Leave (3 days)" to "Medical Leave (3 days)", neither branch fired; casual leave remained deducted and medical leave was never charged.
  4. **Pessimistic Row Locking:** Simultaneous approvals of leave applications by multiple managers could result in dirty reads / lost updates on `staff_leave_balances`.
- **Architectural Solution:**
  1. Dynamically resolve `academic_year` from `NEW.academic_year` if present, falling back to `SELECT academic_year FROM public.institutional_settings LIMIT 1`, and defaulting to ISO academic year formatting.
  2. Implement a complete 4-transition state machine with pessimistic row locking (`SELECT id FROM public.staff_leave_balances ... FOR UPDATE`).
  3. Support employee reassignments (`NEW.user_id <> OLD.user_id`) by refunding `OLD.user_id` and deducting from `NEW.user_id`.
  4. Support leave type reclassifications (`NEW.leave_type <> OLD.leave_type`) by decrementing the old category and incrementing the new category.

---

### 3.3 DEF-005 & DEF-006: Function Signatures & Unhardened `search_path`
- **Vulnerabilities:**
  1. `is_parent_of`: The live PostgreSQL catalog records `public.is_parent_of(p_student_id uuid)` taking exactly **1 argument**. The previous draft attempted `ALTER FUNCTION public.is_parent_of(UUID, UUID) SET search_path = public;`, which throws PostgreSQL error `42883 (undefined_function)`.
  2. The live database contains **8 additional `SECURITY DEFINER` notification and order processing functions** (`notify_certificate_status`, `notify_fee_payment`, `notify_new_admission`, `notify_new_assignment`, `notify_new_concern`, `notify_store_order`, `place_store_order`) that were created in migrations 001–011 with `search_path = NONE`. Because they run with `postgres` superuser privileges, a malicious user creating a temporary table or schema could hijack object resolution.
- **Architectural Solution:**
  Explicitly apply `ALTER FUNCTION ... SET search_path = public;` to all 10 verified `SECURITY DEFINER` functions using their exact catalog signatures.

---

### 3.4 DEF-007 & DEF-008: Overlapping Permissive Policies & Missing Attendance Records RLS
- **Vulnerabilities:**
  1. **PostgreSQL RLS Permissive Combination Rule:** In PostgreSQL, multiple permissive policies combine with boolean `OR`. The live database contains `Allow read hall tickets` (`FOR SELECT TO public USING (true)`) and `Allow manage hall tickets` (`FOR ALL TO authenticated USING (true)`). Dropping only `hall_tickets_all` would have left those two wide-open policies active!
  2. Similarly, `fee_structures` and `institutional_broadcasts` have `fee_structures_public_read` and `broadcasts_public_read` evaluating to `true`.
  3. **Attendance Records Lockout:** Stage 4 dropped `att_records_all` on `student_attendance_records` but failed to define new policies on that table. While `class_attendance_sessions` had role policies, `student_attendance_records` would have had RLS enabled with **zero policies**, completely blocking all students, teachers, and parents from viewing or recording roll call!
- **Architectural Solution:**
  1. Drop all 6 overlapping permissive policies across `hall_tickets`, `fee_structures`, and `institutional_broadcasts`.
  2. Deploy complete, granular role-based RLS policies on `student_attendance_records` matching the verified permissions matrix.

---

### 3.5 DEF-009: Document Storage Upload & Deletion Manipulation
- **Vulnerability:**
  The live policy `Authenticated users can upload documents` has `WITH CHECK (bucket_id = 'documents')`. Any authenticated user can upload a file with an arbitrary object path, such as `victim_user_id/confidential_transcript.pdf`, overwriting existing files or spoofing ownership.
  Furthermore, `Authenticated users can delete documents` allows any user to delete any file in the bucket.
- **Architectural Solution:**
  Enforce object folder prefix isolation:
  - Users can only upload and delete files whose first path component matches their own UUID: `(storage.foldername(name))[1] = auth.uid()::text`.
  - Administrative roles (`admin`, `principal`) are granted institutional oversight across all folders.

---

### 3.6 DEF-010: Super Admin Audit Log Immutability
- **Vulnerability:**
  The Stage 5 draft defined `CREATE POLICY "super_admin_audit_logs_admin_all" ... FOR ALL TO authenticated USING (get_current_user_role() = 'admin')`.
  `FOR ALL` grants `UPDATE` and `DELETE`. An administrator could alter or wipe audit trails of unauthorized activities, destroying forensic accountability.
- **Architectural Solution:**
  Convert `super_admin_audit_logs` into a strictly append-only ledger:
  - `SELECT` policy: granted to `admin`.
  - `INSERT` policy: granted to `admin` and `service_role`.
  - `UPDATE` policy: **NONE** (disallowed).
  - `DELETE` policy: **NONE** (disallowed).

---

### 3.7 DEF-011: Attendance Practical Batches & Lab Groups
- **Vulnerability:**
  Paramedical clinical programs split class sections into practical batches (e.g. Batch 1 taking Lab MLT102P in Room L1, Batch 2 taking Lab MLT102P in Room L2 during Period 3).
  If the constraint is `UNIQUE (class_name, session_date, period_number, subject_code)`, the second batch is rejected because all four columns are identical!
- **Architectural Solution:**
  Add an explicit `batch TEXT NOT NULL DEFAULT 'All'` column in Stage 1, and define the composite unique constraint over:
  $$\text{Natural Key} = (\text{class\_name}, \text{session\_date}, \text{period\_number}, \text{subject\_code}, \text{batch})$$
  This natively accommodates theory lectures (`batch = 'All'`), section divisions (`batch = 'Section A'`), and clinical practical lab groups (`batch = 'Batch 1'`).

---

## 4. Verification & Validation Protocol

Each corrected statement in the subsequent Stage 1–5 reviews has been designed to satisfy:
1. **Engine Compatibility:** Standard PostgreSQL 15+ syntax without unsupported constructs.
2. **Locking Safeguards:** Explicit session timeouts (`SET lock_timeout = '3s'; SET statement_timeout = '10s'`).
3. **Pessimistic Integrity:** Row-level locks on state transitions.
4. **Zero-Trust Access Control:** Multi-tier authorization checking PostgREST JWT claims, database profiles, and physical session roles.
