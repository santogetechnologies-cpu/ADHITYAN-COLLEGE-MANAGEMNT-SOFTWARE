# Phase 1.3 to Phase 1.4: Comprehensive Change Comparison & Delta Analysis

> **Document Version:** 1.4.0 (Independent Static Review & Architectural Diff)  
> **Target Database:** Supabase Managed PostgreSQL (`ogbbyqxulhegwvrtinib.supabase.co`)  
> **Deployment Architecture:** Single-Institution Dedicated Deployment (Adhityan College)  
> **Scope:** Exact statement-by-statement delta across Stage 1, Stage 2, Stage 3, Stage 4, Stage 5, and Security Model

---

## 1. Executive Summary

This document details the exact engineering differences between the Phase 1.3 final SQL package and the corrected Phase 1.4 package. Every modification addresses an empirical vulnerability or operational defect identified during static review, ensuring zero regressions, complete zero-trust access control, and preservation of institutional configurations.

---

## 2. Stage-by-Stage Detailed Delta Analysis

### 2.1 Stage 1: Columns (`028_stage1_columns.sql`)

| Dimension | Phase 1.3 Implementation | Phase 1.4 Corrected Implementation | Security / Operational Justification |
| :--- | :--- | :--- | :--- |
| **Existing Column Defaults (`DEF-103`)** | Relied purely on `ADD COLUMN IF NOT EXISTS col BOOLEAN DEFAULT FALSE;`. | Added explicit `ALTER TABLE ... ALTER COLUMN ... SET DEFAULT` for all publication and result flags. | In PostgreSQL, `ADD COLUMN IF NOT EXISTS` is a no-op if the column was created by earlier migrations (e.g. migration 022 with `DEFAULT TRUE`). Phase 1.4 forces defaults to `FALSE` and `PENDING`. |
| **Backfill Determinism (`DEF-103`)** | No backfill statements included. | Added `UPDATE public.exams SET is_published = FALSE WHERE is_published IS NULL;` etc. | Ensures existing records with `NULL` publication flags are deterministically set to `FALSE`. |

---

### 2.2 Stage 2: Constraints (`028_stage2_constraints.sql`)

| Dimension | Phase 1.3 Implementation | Phase 1.4 Corrected Implementation | Security / Operational Justification |
| :--- | :--- | :--- | :--- |
| **Attendance Key Nullability (`DEF-011`)** | Composite unique constraint applied without explicit casing index. | Added case-insensitive unique index: `idx_class_attendance_session_unique ON public.class_attendance_sessions (LOWER(TRIM(class_name)), session_date, period_number, LOWER(TRIM(subject_code)), LOWER(TRIM(batch)))`. | Prevents duplicate sessions caused by differences in letter casing or trailing whitespace across practical lab groups. |
| **Column Nullability Proof** | Nullability assumed. | Proved from migration 011 and `openapi.json` that all 5 key columns are strictly `NOT NULL`. | Mathematical proof that standard PostgreSQL `UNIQUE` will not allow duplicates through NULL divergence. |

---

### 2.3 Stage 3: Triggers & Functions (`028_stage3_triggers.sql`)

| Dimension | Phase 1.3 Implementation | Phase 1.4 Corrected Implementation | Security / Operational Justification |
| :--- | :--- | :--- | :--- |
| **Self-Mutation Barrier (`DEF-106`)** | Permitted Principal or Admin to update own role or status. | Added explicit self-mutation block: `IF v_caller_id = OLD.id THEN ... RAISE EXCEPTION 'Self-modification of user role is strictly prohibited.'`. | Prevents privilege self-escalation or accidental self-lockout. |
| **Principal Privilege Boundaries (`DEF-106`)** | Principal could assign any non-admin role. | Whitelisted approved academic roles; strictly barred Principal from touching financial roles (`finance_manager`, `financier`, `accountant`). | Maintains executive separation of powers between academic leadership and financial accounts. |
| **Identifier Protection (`DEF-106`)** | Principal could overwrite any user's `login_id`, `student_id`, `roll_number`. | Principal can only set identifier if previously `NULL`; overwriting existing identifiers is blocked. | Prevents registrar identity tampering and account takeover. |
| **Attendance Session Immutability (`DEF-104`)** | Enforced partially in RLS `WITH CHECK`. | Added dedicated `BEFORE UPDATE` trigger `protect_attendance_session_immutable_columns()`. | Engine-level guarantee that `teacher_id` and `created_at` cannot be tampered with on attendance sessions. |
| **Attendance Record Immutability (`DEF-104`)** | Absent in triggers. | Added dedicated `BEFORE UPDATE` trigger `protect_attendance_record_immutable_columns()`. | Engine-level guarantee that `student_id`, `session_id`, and `created_at` cannot be swapped during roll call updates. |
| **Safe UUID Casting Helper (`DEF-111`)** | Absent. | Created `public.safe_cast_uuid(text)` using regex validation. | Eliminates fatal query syntax errors on non-UUID storage folder paths. |
| **Teacher Assignment Helper (`DEF-104`)** | Absent in SQL. | Created `public.is_teacher_assigned_to_class(teacher_id, class_name)`. | Validates timetable and profile allocations directly at the database engine level. |

---

### 2.4 Stage 4: RLS & Storage Hardening (`028_stage4_rls.sql`)

| Dimension | Phase 1.3 Implementation | Phase 1.4 Corrected Implementation | Security / Operational Justification |
| :--- | :--- | :--- | :--- |
| **Table-Level Privileges (`DEF-112`)** | No explicit `GRANT` statements. | Added explicit `GRANT SELECT, INSERT, UPDATE, DELETE ON ... TO authenticated;` across all ERP tables. | In PostgreSQL, without table-level GRANTs, RLS policies are never reached and engine raises error `42501`. |
| **Attendance Enrollment Validation (`DEF-104`)** | Used broad `OR (p.class_name = s.class_name OR p.department = s.department)`. | Enforced exact class matching: `p.class_name = s.class_name AND (s.department IS NULL OR p.department = s.department)`. | Prevents faculty from marking attendance for students enrolled in unrelated classes within the same department. |
| **Teacher Session SELECT (`DEF-104`)** | Teachers could view all sessions across the college. | Restricted teacher SELECT to assigned classes: `teacher_id = auth.uid() OR is_teacher_assigned_to_class(auth.uid(), class_name)`. | Enforces classroom privacy across academic departments. |
| **Granular CRUD Unbundling (`DEF-112`)** | Used bundled `FOR ALL` policies on payroll, leaves, fee structures, and broadcasts. | Decomposed into distinct, explicit `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies. | Provides transparent auditing, granular role isolation, and eliminates privilege bleeding across operations. |
| **Storage Bucket Isolation (`DEF-111`)** | `storage_objects_update` and `delete` lacked `bucket_id` filter. | Added explicit `bucket_id IN ('documents', 'student_documents', 'staff_documents', 'attachments')`. | Prevents authenticated users from mutating files in unmanaged or internal system buckets. |
| **Attachments Bucket Prefix (`DEF-111`)** | Unrestricted upload to `attachments`. | Enforced folder prefix `(storage.foldername(name))[1] = auth.uid()::text` for non-administrative uploads. | Eliminates anonymous path traversal and overwrite in attachments bucket. |
| **Safe Storage Parent Link (`DEF-111`)** | Direct cast `((storage.foldername(name))[1])::uuid`. | Wrapped with `safe_cast_uuid(...) IS NOT NULL`. | Prevents fatal PostgreSQL type conversion errors when browsing non-UUID file paths. |

---

### 2.5 Stage 5: Configs & Audit Immutability (`028_stage5_configs.sql`)

| Dimension | Phase 1.3 Implementation | Phase 1.4 Corrected Implementation | Security / Operational Justification |
| :--- | :--- | :--- | :--- |
| **Configuration Seed Preservation (`DEF-113`)** | `ON CONFLICT (category, key) DO UPDATE SET value = EXCLUDED.value`. | Changed to `ON CONFLICT (category, key) DO NOTHING;`. | Prevents migration re-execution from wiping out administrator custom branding, theme, or feature flag settings. |
| **Engine-Level Audit Immutability (`DEF-108`)** | Relied purely on omission of UPDATE/DELETE RLS policies. | Added engine-level trigger `prevent_audit_log_modification()` on `super_admin_audit_logs` rejecting UPDATE and DELETE. | Defense-in-depth: guarantees append-only immutability even if an RLS policy is mistakenly created in the future. |
| **Forced Actor Identity Binding (`DEF-108`)** | Trigger set `NEW.admin_id`, but did not overwrite client-supplied values. | Trigger unconditionally overwrites `NEW.admin_id := auth.uid(); NEW.admin_email := profiles.email; NEW.created_at := NOW();`. | Prevents spoofed client payloads from framing other administrators in the audit log. |
| **Table-Level Privileges (`DEF-113`)** | No explicit `GRANT` statements. | Added explicit `GRANT SELECT, INSERT, UPDATE, DELETE` on configs/releases, and strictly `GRANT SELECT, INSERT` on audit logs. | Ensures table privileges match RLS policy scope. |
