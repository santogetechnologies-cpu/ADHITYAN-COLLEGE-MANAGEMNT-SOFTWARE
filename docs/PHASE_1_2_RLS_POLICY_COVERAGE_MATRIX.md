# Phase 1.2: RLS Policy Coverage Matrix & Zero-Trust Verification

> **Target System:** ADHITYAN College Management Software  
> **Deployment Architecture:** Single-Institution Dedicated Deployment (`ogbbyqxulhegwvrtinib.supabase.co`)  
> **Audit Mode:** Read-Only Forensic Catalog Inspection & Static Validation  
> **Execution Status:** 100% Read-Only (Zero Database Mutations)

---

## 1. Executive Summary

This document provides a complete, statement-level audit of all Row Level Security (RLS) policies dropped, modified, and created in Migration 028. 

The audit rigorously confirms:
1. **Total Dropping of Legacy Permissive Policies:** All **24 legacy permissive policies** (including overlapping public reads and unauthenticated storage policies) are dropped.
2. **Elimination of Boolean OR Overlaps:** Proves that no policy evaluating to `USING (true)` or `WITH CHECK (true)` remains on sensitive institutional tables.
3. **Partitioned Institutional Roles:** Granular CRUD access is established across attendance, payroll, examinations, leaves, and document storage.
4. **Parent-Child Link Verification:** Parents access child data strictly through `public.is_parent_of(student_id)`, which mathematically enforces `parent_student_links.verified = true`.

---

## 2. Complete Inventory of All 24 Dropped Legacy Permissive Policies

| # | Target Table / Bucket | Dropped Policy Name | Operation (`cmd`) | Role Target | Original Qualification (`qual` / `with_check`) | Final Disposition & Replacement Security |
| :-: | :--- | :--- | :---: | :---: | :--- | :--- |
| **1** | `class_attendance_sessions` | `att_sessions_all` | `ALL` | `authenticated` | `USING (true)` | Replaced by partitioned role policies (`att_sessions_select`, `insert`, `modify`, `delete`). |
| **2** | `student_attendance_records`| `att_records_all` | `ALL` | `authenticated` | `USING (true)` | Replaced by granular student self-view, parent verified-child view, teacher session view, and admin CRUD. |
| **3** | `staff_leave_balances` | `staff_leaves_bal_all` | `ALL` | `authenticated` | `USING (true)` | Replaced by employee self-view and HR/Leadership management. |
| **4** | `staff_leave_applications` | `staff_leaves_app_all` | `ALL` | `authenticated` | `USING (true)` | Replaced by employee applicant self-CRUD (pending state) and HR/Leadership approval. |
| **5** | `staff_payroll_runs` | `payroll_runs_all` | `ALL` | `authenticated` | `USING (true)` | Replaced by Finance/HR/Leadership access only. |
| **6** | `staff_payroll_items` | `payroll_items_all` | `ALL` | `authenticated` | `USING (true)` | Replaced by employee self-payslip view and Finance/HR management. |
| **7** | `hall_tickets` | `hall_tickets_all` | `ALL` | `authenticated` | `USING (true)` | Replaced by COE management and student/verified-parent read. |
| **8** | `hall_tickets` | `Allow manage hall tickets` | `ALL` | `authenticated` | `USING (true) WITH CHECK (true)` | **DEF-007:** Permissive overlap dropped. |
| **9** | `hall_tickets` | `Allow read hall tickets` | `SELECT`| `public` | `USING (true)` | **DEF-007:** Unauthenticated public leak dropped. |
| **10** | `fee_structures` | `fee_structures_all` | `ALL` | `authenticated` | `USING (true)` | Replaced by authenticated read and Finance/Admin management. |
| **11** | `fee_structures` | `fee_structures_public_read`| `SELECT`| `public` | `USING (true)` | **DEF-007:** Unauthenticated scraping dropped. |
| **12** | `fee_payment_reminders` | `fee_reminders_all` | `ALL` | `authenticated` | `USING (true)` | Access restricted to Finance and recipient student/parent. |
| **13** | `fee_receipts` | `fee_receipts_all` | `ALL` | `authenticated` | `USING (true)` | Access restricted to Finance and paying student/parent. |
| **14** | `scholarship_applications`| `scholarship_apps_all` | `ALL` | `authenticated` | `USING (true)` | Access restricted to applicant student and Finance/Leadership. |
| **15** | `library_circulation` | `library_circ_all` | `ALL` | `authenticated` | `USING (true)` | Access restricted to Librarian and borrowing patron. |
| **16** | `hostel_rooms` | `hostel_rooms_all` | `ALL` | `authenticated` | `USING (true)` | Access restricted to Hostel Warden and resident scholars. |
| **17** | `hostel_out_passes` | `hostel_out_passes_all` | `ALL` | `authenticated` | `USING (true)` | Access restricted to Hostel Warden and applicant scholars. |
| **18** | `placement_drives` | `placement_drives_all` | `ALL` | `authenticated` | `USING (true)` | Access restricted to Placement Officer and eligible seniors. |
| **19** | `placement_applications` | `placement_apps_all` | `ALL` | `authenticated` | `USING (true)` | Access restricted to applicant student and Placement Officer. |
| **20** | `institutional_broadcasts`| `broadcasts_all` | `ALL` | `authenticated` | `USING (true)` | Replaced by authenticated read and Admin/Principal management. |
| **21** | `institutional_broadcasts`| `broadcasts_public_read`| `SELECT`| `public` | `USING (true)` | **DEF-007:** Unauthenticated broadcast scraping dropped. |
| **22** | `storage.objects` (`documents`)| `Authenticated users can delete documents` | `DELETE`| `authenticated` | `(bucket_id = 'documents')` | Replaced by folder-prefix restriction `(storage.foldername(name))[1] = auth.uid()::text`. |
| **23** | `storage.objects` (`documents`)| `Authenticated users can upload documents` | `INSERT`| `authenticated` | `WITH CHECK (bucket_id = 'documents')` | Replaced by folder-prefix check `(storage.foldername(name))[1] = auth.uid()::text`. |
| **24** | `storage.objects` (`documents`)| `Public read access for documents` | `SELECT`| `public` | `(bucket_id = 'documents')` | **ISSUE-03:** Unauthenticated document leak dropped. Replaced by folder-prefix select. |

---

## 3. Comprehensive Table-by-Table Policy Coverage Matrix

### 3.1 Attendance System Matrix

| Table Name | Operation | Permitted Roles & Conditions | Denied Roles & Conditions | Security Proof |
| :--- | :---: | :--- | :--- | :--- |
| `class_attendance_sessions` | `SELECT` | `admin`, `principal`, `hod`, `coe`; session teacher (`teacher_id = auth.uid()`); students enrolled in class; verified parents of enrolled students. | Unlinked parents, students in other classes, teachers not assigned to class, anonymous users. | Subquery verifies `profiles.class_name` and `parent_student_links.verified = true`. |
| `class_attendance_sessions` | `INSERT` | `admin`, `principal`; `teacher`, `hod` where `teacher_id = auth.uid()`. | Students, parents, finance staff, receptionists, drivers. | Strict check on authenticated caller role and teacher ID match. |
| `class_attendance_sessions` | `UPDATE` | `admin`, `principal`; session teacher within 24 hours (`created_at >= NOW() - INTERVAL '24 hours'`). | Teachers updating after 24 hours; students, parents, unauthorized staff. | Temporal boundary prevents retroactive attendance tampering. |
| `class_attendance_sessions` | `DELETE` | `admin`, `principal` only. | Teachers, students, parents, all other roles. | Restricts destructive deletion to institutional executive leadership. |
| `student_attendance_records` | `SELECT` | Student self-view (`student_id = auth.uid()`); verified parent (`is_parent_of(student_id)`); session teacher; `admin`, `principal`, `hod`. | Students viewing other students; unverified parents; unauthorized teachers. | **DEF-008:** Restores student & parent portal queries without data leakage. |
| `student_attendance_records` | `INSERT` | `admin`, `principal`; session teacher whose session exists (`EXISTS (SELECT 1 FROM class_attendance_sessions ...)`). | Students, parents, arbitrary teachers. | Record insertion bound to verified session ownership. |
| `student_attendance_records` | `UPDATE` | `admin`, `principal`; session teacher within 24 hours. | Students, parents, expired sessions. | Roll call updates locked after 24 hours. |
| `student_attendance_records` | `DELETE` | `admin`, `principal` only. | Teachers, students, parents. | Prohibits unauthorized destruction of roll call records. |

---

### 3.2 Human Resources & Staff Payroll Matrix

| Table Name | Operation | Permitted Roles & Conditions | Denied Roles & Conditions | Security Proof |
| :--- | :---: | :--- | :--- | :--- |
| `staff_payroll_runs` | `SELECT` | `admin`, `principal`, `finance_manager`, `accountant`, `hr_manager`. | Teachers, students, parents, storekeepers, drivers. | Confines payroll run history to HR and Finance leadership. |
| `staff_payroll_runs` | `ALL` (Write)| `admin`, `principal`, `finance_manager`. | Accountants, HR managers, faculty, students. | Only executive leadership and Finance Manager can disburse payroll. |
| `staff_payroll_items` | `SELECT` | Employee self-view (`user_id = auth.uid()`); `admin`, `principal`, `finance_manager`, `accountant`, `hr_manager`. | Employees viewing other employees' payslips; students; parents. | Absolute salary confidentiality across institutional staff. |
| `staff_payroll_items` | `ALL` (Write)| `admin`, `principal`, `finance_manager`. | Employees self-modifying salary slips; accountants; staff. | Prevents unauthorized manipulation of net pay, deductions, or allowances. |
| `staff_leave_balances` | `SELECT` | Employee self-view (`user_id = auth.uid()`); `admin`, `principal`, `hr_manager`. | Staff viewing other staff balances; students; parents. | Quota privacy enforced per employee. |
| `staff_leave_balances` | `ALL` (Write)| `admin`, `principal`, `hr_manager`. | Individual employees self-allocating quotas. | Balances managed strictly through HR administration. |
| `staff_leave_applications`| `SELECT` | Applicant self-view (`user_id = auth.uid()`); `admin`, `principal`, `hr_manager`, departmental `hod`. | Staff viewing peer applications; students; parents. | Application privacy preserved. |
| `staff_leave_applications`| `INSERT` | Employee self-application (`user_id = auth.uid()`); `admin`, `principal`, `hr_manager`. | Employees applying on behalf of other employees without admin rights. | Authenticated identity bound to `user_id`. |
| `staff_leave_applications`| `UPDATE` | Applicant self-update; `admin`, `principal`, `hr_manager`. | Staff editing other staff leaves. | Triggers state machine on approval transition. |
| `staff_leave_applications`| `DELETE` | Applicant while status is `'Pending'` (`user_id = auth.uid() AND status = 'Pending'`); `admin`, `principal`, `hr_manager`. | Employees deleting `'Approved'` leaves to evade balance deductions. | Prevents balance evasion fraud. |

---

### 3.3 Examination & Academic Credentials Matrix

| Table Name | Operation | Permitted Roles & Conditions | Denied Roles & Conditions | Security Proof |
| :--- | :---: | :--- | :--- | :--- |
| `hall_tickets` | `SELECT` | Candidate student (`student_id = auth.uid()`); verified parent (`is_parent_of(student_id)`); `admin`, `principal`, `coe`, faculty `teacher`. | Students viewing peers' hall tickets; unverified parents. | Confidentiality of register numbers, seat allocations, and exam centers. |
| `hall_tickets` | `ALL` (Write)| `admin`, `principal`, `coe`. | Students generating their own clearance; teachers; parents. | Complete institutional control over examination clearance. |

---

### 3.4 Storage Bucket Security Matrix (`documents`)

| Bucket ID | Operation | Permitted Roles & Path Conditions | Denied Roles & Path Conditions | Security Proof |
| :--- | :---: | :--- | :--- | :--- |
| `documents` | `INSERT` | `admin`, `principal` (any path); Authenticated user strictly in their own folder: `(storage.foldername(name))[1] = auth.uid()::text`. | User uploading into another user's folder (`victim_uuid/...`); unauthenticated users. | Folder-prefix validation prevents document spoofing and unauthorized file overwrites. |
| `documents` | `SELECT` | `admin`, `principal` (any path); User in their own folder (`(storage.foldername(name))[1] = auth.uid()::text`); Shared institutional documents (`(storage.foldername(name))[1] = 'public'`). | User reading another user's private documents; unauthenticated requests (via ISSUE-03 fix). | Eliminates public internet access to confidential institutional PDFs. |
| `documents` | `UPDATE` | `admin`, `principal`; User in their own folder. | Cross-user object mutations. | Object ownership strictly maintained. |
| `documents` | `DELETE` | `admin`, `principal`; User in their own folder. | User deleting another user's files or institutional root files. | Eliminates arbitrary document deletion vulnerability. |

---

### 3.5 Institutional Super Admin Configuration Matrix (`Stage 5`)

| Table Name | Operation | Permitted Roles | Denied Roles | Security Proof |
| :--- | :---: | :--- | :--- | :--- |
| `super_admin_configs` | `ALL` | `admin` (`public.get_current_user_role() = 'admin'`). | All non-admin roles; suspended admins (via ISSUE-04 fix). | Scoped strictly to verified active institutional IT administrator. |
| `super_admin_releases` | `ALL` | `admin` (`public.get_current_user_role() = 'admin'`). | All non-admin roles; suspended admins. | Controls institutional software versioning and feature releases. |
| `super_admin_audit_logs`| `SELECT` | `admin` (`public.get_current_user_role() = 'admin'`). | Non-admin users. | Allows forensic inspection in Super Admin Control Center. |
| `super_admin_audit_logs`| `INSERT` | `admin`, `service_role`. | Non-admin application users. | Records administrative mutation events. |
| `super_admin_audit_logs`| `UPDATE` | **NONE (Zero Policies Defined)**. | **ALL ROLES (Including Admin)**. | **Engine-Level Immutability:** PostgreSQL RLS denies update when no policy exists. |
| `super_admin_audit_logs`| `DELETE` | **NONE (Zero Policies Defined)**. | **ALL ROLES (Including Admin)**. | **Engine-Level Immutability:** PostgreSQL RLS denies delete when no policy exists. |

---

## 4. Verification Verdict

All 24 legacy permissive policies are definitively dropped. Zero permissive `USING (true)` policies remain on any sensitive institutional table. Access across attendance, payroll, leave state machines, credentials, storage, and audit logging adheres 100% to zero-trust institutional role boundaries.
