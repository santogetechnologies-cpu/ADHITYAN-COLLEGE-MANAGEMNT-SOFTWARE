# Phase 1.4 to Phase 1.4.1: Comprehensive Change Comparison & Delta Analysis

> **Document Version:** 1.4.1 (Static Independent Review & Architectural Diff)  
> **Target Database:** Supabase Managed PostgreSQL (`ogbbyqxulhegwvrtinib.supabase.co`)  
> **Deployment Architecture:** Single-Institution Dedicated Deployment (Adhityan College)  
> **Scope:** Statement-by-statement delta across Stage 1, Stage 2, Stage 3, Stage 4, Stage 5, and Security Model

---

## 1. Executive Summary

This document details the exact modifications applied between Phase 1.4 and Phase 1.4.1. Each change addresses a critical vulnerability or edge-case gap identified during the independent review, establishing true zero-trust boundaries for storage access, leave transitions, teacher authorization, catalog function privileges, student application self-approval prevention, attendance temporal modification boundaries, and audit log immutability.

---

## 2. Stage-by-Stage Detailed Delta Matrix

### 2.1 Stage 1: Columns (`028_stage1_columns.sql`)

| Dimension | Phase 1.4 Implementation | Phase 1.4.1 Corrected Implementation | Security / Operational Justification |
| :--- | :--- | :--- | :--- |
| **Attendance Key NOT NULL Enforcement (`DEF-123`)** | Added `batch TEXT NOT NULL DEFAULT 'All'`, but did not explicitly assert `SET NOT NULL` on the other 4 existing columns. | Added explicit `ALTER TABLE public.class_attendance_sessions ALTER COLUMN <col> SET NOT NULL;` across all 5 key columns (`class_name`, `session_date`, `period_number`, `subject_code`, `batch`) with preflight checks. | Guarantees that no natural key column can contain NULLs, ensuring unique constraints never diverge or allow duplicates. |
| **Exam & Result Column Defaults (`DEF-103`)** | Handled in generic DDL block. | Explicitly altered existing column defaults (`is_published DEFAULT FALSE`, `result_status DEFAULT 'PENDING'`) and executed safe preflight backfill. Preserved historical exam states pending COE sign-off. | Prevents unpublished drafts from accidentally becoming visible to students or parents. |
| **Receptionist & Exam Foreign Keys (`DEF-106`)** | Partial FK definitions. | Added validated foreign keys on `reception_appointments(with_user_id)` referencing `profiles(id)` and `hall_tickets(exam_id)` referencing `exams(id)` with preflight orphan cleansing. | Enforces relational integrity across appointments and exam ticketing without data corruption. |
| **Profiles NOT NULL Role & Status (`DEF-126`)** | Relied on check constraints without explicit NOT NULL column assertions. | Preflight checks verify zero NULLs, followed by `ALTER TABLE public.profiles ALTER COLUMN role SET NOT NULL;` and `ALTER COLUMN status SET NOT NULL;`. | Prevents future insertion of accounts with unassigned roles or lifecycle states. |

---

### 2.2 Stage 2: Constraints (`028_stage2_constraints.sql`)

| Dimension | Phase 1.4 Implementation | Phase 1.4.1 Corrected Implementation | Security / Operational Justification |
| :--- | :--- | :--- | :--- |
| **Attendance Natural Key Reconciliation (`DEF-123`)** | Applied both standard unique constraint and case-insensitive unique index redundantly. | Reconciled onto a single authoritative uniqueness mechanism: dropped redundant `uq_class_attendance_session` constraint and applied normalized unique index `idx_class_attendance_session_unique` on `(LOWER(TRIM(class_name)), session_date, period_number, LOWER(TRIM(subject_code)), LOWER(TRIM(batch)))`. | Eliminates double-index write overhead while guaranteeing strict protection against letter-case and whitespace bypasses. |
| **Role Whitelist Alignment (`DEF-107`)** | 19 roles in check constraint without preflight check. | Added preflight validation on existing roles and expanded check constraint to full 20-role whitelist: 19 institutional roles + 1 alias `driver`. | Prevents frontend driver logins from breaking database constraints while preserving single-institution architecture and halting on invalid legacy data. |
| **Login ID Unique Index (`DEF-105`)** | Basic unique index. | Verified partial unique index `idx_profiles_login_id_unique` on `LOWER(TRIM(login_id)) WHERE login_id IS NOT NULL AND login_id <> ''` with preflight duplicate detection. | Prevents credential collisions across students and staff. |
| **Staff Leave Non-Negative Balances (`DEF-126`)** | Relied entirely on triggers; table lacked CHECK constraints against negative counts. | Added preflight verification and `chk_staff_leave_balances_non_negative` enforcing taken >= 0, taken <= quota, and quota >= 0 across all 3 leave types. | Prevents schema-level negative leave balances or quota corruptions. |

---

### 2.3 Stage 3: Triggers & Functions (`028_stage3_triggers.sql`)

| Dimension | Phase 1.4 Implementation | Phase 1.4.1 Corrected Implementation | Security / Operational Justification |
| :--- | :--- | :--- | :--- |
| **Staff Leave Balances Schema Reconciled (`DEF-117`)** | Erroneously referenced `sick_leave_total`, `sick_leave_taken`, `casual_leave_total` which do not exist in live database. | Reconciled columns to actual database schema: `casual_leave_quota/taken`, `medical_leave_quota/taken`, `earned_leave_quota/taken`, `on_duty_taken`. | Prevents catastrophic SQL runtime error `42703 (undefined_column)` during leave approvals. |
| **Leave State Machine Missing Balance Row (`DEF-117`)** | Subcase C2 locked rows without inserting the balance record for `(NEW.user_id, v_new_year)`. Missing old balance rows were not verified for reversal. | Added `INSERT INTO public.staff_leave_balances (user_id, academic_year) VALUES (NEW.user_id, v_new_year) ON CONFLICT (user_id, academic_year) DO NOTHING;` using schema defaults, and added explicit pre-check verifying existence of old balance rows before reversal. | Eliminates the critical bug where leave deductions on reassignment were silently ignored because the target row did not exist, and guarantees transaction failure if historical reversal fails. |
| **Leave Concurrency Lock Ordering (`DEF-117`)** | Partial lock ordering. | Enforced deterministic lexicographical order `(user_id, academic_year)` across all multi-row operations. | Eliminates deadlock risks during concurrent staff leave approvals. |
| **Leave Update Diagnostics (`DEF-117`)** | Update failures were not verified. | Added `GET DIAGNOSTICS v_rows = ROW_COUNT;` raising exception `23514` if update affects 0 rows. | Eliminates silent failures in leave balance deductions. |
| **Teacher UUID Assignment (`DEF-118`)** | Permitted fallback name matching: `t.teacher_name = (SELECT name FROM profiles ...)`. | Restricted strictly to stable UUID assignment: `t.teacher_id = p_teacher_id`. | Eliminates faculty identity spoofing through name collisions or name alterations. |
| **Subject-Level Verification (`DEF-118`)** | Checked only class name. | Added `is_teacher_assigned_to_class_and_subject()` validating class and subject code. | Prevents teachers from taking attendance for courses or subjects they are not authorized to teach. |
| **Helper Authorization Guard (`DEF-119`)** | Any authenticated user could query helper functions for arbitrary teacher UUIDs. | Guard added: `IF p_teacher_id <> auth.uid() AND role NOT IN ('admin', 'principal', 'hod') THEN RETURN FALSE;`. | Prevents malicious callers from probing institutional faculty allocations. |
| **Attendance 24-Hour Correction Window (`DEF-104`)** | Timestamps were unconstrained during session and roll call updates. | Triggers enforce that non-admin/principal updates must occur within 24 hours of session creation (`OLD.created_at >= NOW() - INTERVAL '24 hours'`). | Prevents retroactive modification or falsification of historical attendance records. |
| **Principal Disciplinary Barrier & Email Protection (`DEF-106`, `DEF-122`)** | Principal could change status to `'suspended'` and email was unprotected against self-modification. | Added barriers: self-modification of `email` is blocked; Principal cannot modify user `email` addresses or set `status = 'suspended'`. | Account suspension and identity updates are administrative actions reserved exclusively for System Administration. |
| **PUBLIC Function Execution Revocation (`DEF-121`)** | Functions retained default `PUBLIC` execute permissions. | Issued `REVOKE ALL ON FUNCTION ... FROM PUBLIC;` across 14 functions; granted `EXECUTE` strictly to `authenticated` for required RLS helpers; dynamic verification guards against missing functions. | Hardens database against unauthorized anonymous RPC execution and avoids script failure on legacy catalogs. |
| **Negative Leave Balance Prevention & LOP (`DEF-127`)** | Absence of quota exhaustion verification allowed staff leave deductions to produce negative available balances; leave reversals could force taken balances below zero; 'Loss of Pay' caused unsupported type crash. | Enforced pre-deduction quota checks `(taken + delta) <= quota` raising exception `23514` on overdraft; enforced non-negative reversal bounds `(taken - delta) >= 0`; supported `'Loss of Pay'` (lop) without quota deduction. | Prevents negative leave balances and supports all legitimate institutional leave categories. |

---

### 2.4 Stage 4: RLS & Storage Hardening (`028_stage4_rls.sql`)

| Dimension | Phase 1.4 Implementation | Phase 1.4.1 Corrected Implementation | Security / Operational Justification |
| :--- | :--- | :--- | :--- |
| **Storage Bucket Privacy Enforcement (`DEF-102` & `DEF-124`)** | Only updated `documents` bucket to `public = false`. | Added `UPDATE storage.buckets SET public = false WHERE id IN ('documents', 'attachments', 'student_documents', 'staff_documents');`. | Guarantees that none of the four sensitive buckets are publicly accessible via direct CDN endpoints. |
| **Legacy Storage Policies Drop (`DEF-007`)** | Dropped only 3 documents policies from migration 003. | Explicitly dropped all 6 legacy storage policies from migration 003 (`"Public read access for attachments"`, `"Authenticated users can upload attachments"`, `"Users can update/delete their own attachments"`, etc.). | Eliminates legacy permissive policies that bypassed row-level security. |
| **Storage Attachments SELECT Leak (`DEF-115`)** | Universal read for all authenticated users: `bucket_id = 'attachments'`. | Restricted to uploader UID folder, verified parent of student uploader, Admin/Principal, or assigned faculty for enrolled active students. | Eliminates cross-student data scraping of sensitive assignment files, medical notes, and payment receipts. |
| **Faculty Access to Student Documents (`DEF-116`)** | Universal read for all teachers across all student documents. | Restricted faculty SELECT strictly to active enrolled students in classes assigned to that teacher via `is_teacher_assigned_to_class()`. | Enforces classroom privacy and prevents faculty from browsing records of unrelated students across other departments. |
| **Student Application Status Escalation (`DEF-125`)** | Students could insert records with any status (`'Approved'`, `'Selected'`). | Added strict status validation on INSERT and UPDATE: `scholarship_applications` limited to `'Draft'` or `'Submitted'`, `hostel_out_passes` limited to `'Pending'`, `placement_applications` limited to `'Applied'`, and staff leaves limited to `'Pending_HOD'`, `'Pending_Principal'`, `'Pending'`. | Prevents students or staff from self-approving scholarship funding, hostel leaves, placement offers, or employee leave requests. |
| **Attendance 24-Hour Correction Window in RLS (`DEF-104`)** | Updating session was permitted indefinitely by assigned teacher. | Added `created_at >= NOW() - INTERVAL '24 hours'` to `att_sessions_update` and `att_records_update`. | Enforces policy-level temporal barrier ensuring instructors cannot alter closed attendance sessions. |
| **Public Visibility Filtering** | Broadcasts, hostel rooms, and placement drives used broad `USING (true)`. | Filtered broadcasts by target audience and published timestamp; filtered placement drives by open status; filtered hostel rooms by non-maintenance status. | Prevents exposure of unpublished circulars, draft recruitment drives, and maintenance inventory. |
| **Comprehensive Core ERP Table Coverage (`DEF-128`)** | Addressed only the 17 listed target tables, leaving exams, schedules, results, and timetables under legacy permissive policies. | Added RLS enablement, TRUNCATE revocation, and granular unbundled CRUD policies across all core ERP catalog tables (`exams`, `exam_schedules`, `exam_results`, `timetables`, `parent_student_links`, `departments`, `sections`, `store_products`, `store_orders`, `admission_applications`). | Closes security holes across all operational ERP tables. |

---

### 2.5 Stage 5: Configs & Audit Immutability (`028_stage5_configs.sql`)

| Dimension | Phase 1.4 Implementation | Phase 1.4.1 Corrected Implementation | Security / Operational Justification |
| :--- | :--- | :--- | :--- |
| **Audit Log Privilege Hardening (`DEF-120`)** | Granted `SELECT, INSERT` without explicit `REVOKE ALL FROM PUBLIC`. | Added explicit `REVOKE ALL ON public.super_admin_audit_logs FROM PUBLIC, authenticated, anon;` followed by strictly `GRANT SELECT, INSERT`. | Ensures zero residual table privileges permit UPDATE or DELETE. |
| **Audit Log TRUNCATE Protection (`DEF-108`)** | Trigger covered only `BEFORE UPDATE OR DELETE FOR EACH ROW`. | Added dedicated statement-level trigger `BEFORE TRUNCATE ON public.super_admin_audit_logs FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_audit_log_truncate();`. | Closes the PostgreSQL engine gap where `TRUNCATE` bypasses row-level update/delete triggers. |
| **Release Ledger Immutability (`DEF-113`)** | Allowed UPDATE and DELETE permissions on release ledger. | Revoked `UPDATE` and `DELETE` on `super_admin_releases`, dropped legacy UPDATE/DELETE policies, and granted strictly `SELECT, INSERT`. | Implements a strictly append-only software release ledger. |
| **Audit Actor Binding Authenticity (`DEF-120`)** | Injected fallback `'system_admin@institution.local'`. | Queried profile email, then `auth.users` email, with fallback strictly to real UID prefix (`'auth_user_' || auth.uid()::text`) or `'system:' || session_user`. Deterministically generated `id` and `created_at` on server. | Prevents fabricated email domains and ensures forensic trust boundaries. |
| **Existing Table Schema Reconciliation (`DEF-129`)** | Relied purely on `CREATE TABLE IF NOT EXISTS`, failing to add missing columns or constraints if tables pre-existed from migration 026. Applied immutability triggers only to `super_admin_audit_logs`. | Added idempotent `ALTER TABLE ADD COLUMN IF NOT EXISTS` across `super_admin_configs`, `super_admin_releases`, and `audit_logs`; reconciled `public.audit_logs` with dual row and statement immutability triggers and server actor binding. | Guarantees seamless migration execution regardless of pre-existing catalog state and secures both administrative and standard audit logs. |
