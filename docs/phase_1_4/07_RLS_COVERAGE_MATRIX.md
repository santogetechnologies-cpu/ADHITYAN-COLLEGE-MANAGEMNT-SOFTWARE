# Phase 1.4: Complete RLS Policy, Table Privileges & ERP Coverage Matrix

> **Document Version:** 1.4.0 (Independent Static Review & Revalidation)  
> **Target Database:** Supabase Managed PostgreSQL (`ogbbyqxulhegwvrtinib.supabase.co`)  
> **Deployment Architecture:** Single-Institution Dedicated Deployment (Adhityan College)  
> **Remediations Incorporated:** `DEF-101` (8 ERP Tables), `DEF-102` (Storage Privacy), `DEF-104` (Class & Subject Attendance Validation), `DEF-108` (Append-Only Audit), `DEF-111` (Storage Bucket Isolation & Safe Cast), `DEF-112` (Unbundled CRUD & Table Grants)  
> **Execution Status:** Static Engineering Specification (Zero Live Mutations)

---

## 1. Executive Summary & PostgreSQL RLS Enforcement Model

In PostgreSQL Row Level Security (RLS), permission evaluation occurs in two strictly sequential tiers:
1. **Tier 1 — Table-Level Privileges (GRANTs):** If the calling role does not possess table privileges (`GRANT SELECT, INSERT, UPDATE, DELETE ON <table> TO authenticated`), the engine immediately halts with error `42501 (insufficient_privilege)`.
2. **Tier 2 — Row-Level Security Policies:** If table privileges exist, PostgreSQL evaluates row access. For multiple permissive policies, access is granted if **ANY** policy evaluates to true:
$$\text{Access Granted} \iff \bigvee_{i=1}^n \text{Permissive Policy}_i(\text{current\_user})$$

In Phase 1.4:
- All **24 legacy permissive policies** evaluating to `true` are permanently dropped.
- Explicit **table-level GRANT statements** are issued for every protected table.
- Bundled policies (`FOR ALL`) are unbundled into distinct, granular **`SELECT`**, **`INSERT`**, **`UPDATE`**, and **`DELETE`** policies.
- Class and department validation is hardened against cross-class attendance tampering.

---

## 2. Table-Level Privileges (GRANTs) Register

The following explicit table privileges are granted to the `authenticated` role in `028_stage4_rls.sql` and `028_stage5_configs.sql`, enabling RLS evaluation:

| Table Name | SELECT | INSERT | UPDATE | DELETE | RLS Security Note |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `public.class_attendance_sessions` | YES | YES | YES | YES | Controlled via 4 distinct RLS policies. |
| `public.student_attendance_records` | YES | YES | YES | YES | Controlled via 4 distinct RLS policies + 2 triggers. |
| `public.staff_payroll_runs` | YES | YES | YES | YES | Controlled via 4 distinct RLS policies. |
| `public.staff_payroll_items` | YES | YES | YES | YES | Controlled via 4 distinct RLS policies. |
| `public.staff_leave_balances` | YES | YES | YES | YES | Controlled via 4 distinct RLS policies. |
| `public.staff_leave_applications` | YES | YES | YES | YES | Controlled via 4 distinct RLS policies + state machine. |
| `public.hall_tickets` | YES | YES | YES | YES | Controlled via 4 distinct RLS policies. |
| `public.fee_structures` | YES | YES | YES | YES | Controlled via 4 distinct RLS policies. |
| `public.institutional_broadcasts` | YES | YES | YES | YES | Controlled via 4 distinct RLS policies. |
| `public.fee_payment_reminders` | YES | YES | YES | YES | Controlled via 4 distinct RLS policies. |
| `public.fee_receipts` | YES | YES | YES | YES | Controlled via 4 distinct RLS policies. |
| `public.scholarship_applications` | YES | YES | YES | YES | Controlled via 4 distinct RLS policies. |
| `public.library_circulation` | YES | YES | YES | YES | Controlled via 4 distinct RLS policies. |
| `public.hostel_rooms` | YES | YES | YES | YES | Controlled via 4 distinct RLS policies. |
| `public.hostel_out_passes` | YES | YES | YES | YES | Controlled via 4 distinct RLS policies. |
| `public.placement_drives` | YES | YES | YES | YES | Controlled via 4 distinct RLS policies. |
| `public.placement_applications` | YES | YES | YES | YES | Controlled via 4 distinct RLS policies. |
| `public.super_admin_configs` | YES | YES | YES | YES | Admin role only via RLS. |
| `public.super_admin_releases` | YES | YES | YES | YES | Admin role only via RLS. |
| `public.super_admin_audit_logs` | **YES** | **YES** | **NO** | **NO** | **DEF-108:** UPDATE/DELETE privileges permanently omitted. |

---

## 3. Complete Policy Inventory & SQL Reconciliation

The table below catalogs every active RLS policy in Phase 1.4, matching line-for-line with `028_stage4_rls.sql` and `028_stage5_configs.sql`:

| Table Name | Policy Name | Command | Permitted Roles & USING / WITH CHECK Expressions |
| :--- | :--- | :---: | :--- |
| `class_attendance_sessions` | `att_sessions_select` | SELECT | `admin`, `principal`, `hod`, `coe`, OR (`teacher` WHERE `teacher_id = auth.uid()` OR `is_teacher_assigned_to_class(auth.uid(), class_name)`). |
| `class_attendance_sessions` | `att_sessions_insert` | INSERT | `admin`, `principal`, `hod`, OR (`teacher` WHERE `teacher_id = auth.uid()` AND `is_teacher_assigned_to_class(auth.uid(), class_name)`). |
| `class_attendance_sessions` | `att_sessions_update` | UPDATE | `admin`, `principal`, `hod`, OR (`teacher` WHERE `teacher_id = auth.uid()` AND `is_teacher_assigned_to_class(auth.uid(), class_name)`). |
| `class_attendance_sessions` | `att_sessions_delete` | DELETE | `admin`, `principal`, `hod`. |
| `student_attendance_records` | `att_records_select` | SELECT | `admin`, `principal`, `hod`, `coe`, OR assigned `teacher`, OR student self (`student_id = auth.uid()`), OR parent (`is_parent_of(student_id)`). |
| `student_attendance_records` | `att_records_insert` | INSERT | Authorized `admin`, `principal`, `hod`, or assigned `teacher` + **Exact Class Enrollment Check:** `p.class_name = s.class_name AND (s.department IS NULL OR p.department = s.department)`. |
| `student_attendance_records` | `att_records_update` | UPDATE | Authorized `admin`, `principal`, `hod`, or assigned `teacher` + Enrollment check + Triggers preventing mutation of `student_id`, `session_id`, `created_at`. |
| `student_attendance_records` | `att_records_delete` | DELETE | `admin`, `principal`, `hod`. |
| `staff_payroll_runs` | `payroll_runs_select` | SELECT | `admin`, `principal`, `hr_manager`, `finance_manager`, `accountant`, `financier`. |
| `staff_payroll_runs` | `payroll_runs_insert` | INSERT | `admin`, `principal`, `hr_manager`, `finance_manager`. |
| `staff_payroll_runs` | `payroll_runs_update` | UPDATE | `admin`, `principal`, `hr_manager`, `finance_manager`. |
| `staff_payroll_runs` | `payroll_runs_delete` | DELETE | `admin`, `finance_manager`. |
| `staff_payroll_items` | `payroll_items_select` | SELECT | `admin`, `principal`, `hr_manager`, `finance_manager`, `accountant`, `financier`, OR employee self (`user_id = auth.uid()`). |
| `staff_payroll_items` | `payroll_items_insert` | INSERT | `admin`, `principal`, `hr_manager`, `finance_manager`. |
| `staff_payroll_items` | `payroll_items_update` | UPDATE | `admin`, `principal`, `hr_manager`, `finance_manager`. |
| `staff_payroll_items` | `payroll_items_delete` | DELETE | `admin`, `finance_manager`. |
| `staff_leave_balances` | `leave_balances_select`| SELECT | `admin`, `principal`, `hr_manager`, OR employee self (`user_id = auth.uid()`). |
| `staff_leave_balances` | `leave_balances_insert`| INSERT | `admin`, `principal`, `hr_manager`. |
| `staff_leave_balances` | `leave_balances_update`| UPDATE | `admin`, `principal`, `hr_manager`. |
| `staff_leave_balances` | `leave_balances_delete`| DELETE | `admin`. |
| `staff_leave_applications` | `leave_apps_select` | SELECT | `admin`, `principal`, `hr_manager`, `hod`, OR employee self (`user_id = auth.uid()`). |
| `staff_leave_applications` | `leave_apps_insert` | INSERT | `admin`, `principal`, `hr_manager`, OR staff applying for self (`user_id = auth.uid()`). |
| `staff_leave_applications` | `leave_apps_update` | UPDATE | `admin`, `principal`, `hr_manager`, `hod` (approval/rejection), OR applicant self while `status = 'Pending'`. |
| `staff_leave_applications` | `leave_apps_delete` | DELETE | `admin`, `principal`, `hr_manager`, OR applicant self while `status = 'Pending'`. |
| `hall_tickets` | `hall_tickets_select` | SELECT | `admin`, `principal`, `coe`, `teacher`, `hod`, OR student self (`student_id = auth.uid()`), OR parent (`is_parent_of(student_id)`). |
| `hall_tickets` | `hall_tickets_insert` | INSERT | `admin`, `principal`, `coe`. |
| `hall_tickets` | `hall_tickets_update` | UPDATE | `admin`, `principal`, `coe`. |
| `hall_tickets` | `hall_tickets_delete` | DELETE | `admin`, `principal`, `coe`. |
| `fee_structures` | `fee_structures_select` | SELECT | `true` (all authenticated students, parents, faculty). |
| `fee_structures` | `fee_structures_insert` | INSERT | `admin`, `principal`, `finance_manager`. |
| `fee_structures` | `fee_structures_update` | UPDATE | `admin`, `principal`, `finance_manager`. |
| `fee_structures` | `fee_structures_delete` | DELETE | `admin`, `finance_manager`. |
| `institutional_broadcasts` | `broadcasts_select` | SELECT | `true` (all authenticated users). |
| `institutional_broadcasts` | `broadcasts_insert` | INSERT | `admin`, `principal`. |
| `institutional_broadcasts` | `broadcasts_update` | UPDATE | `admin`, `principal`. |
| `institutional_broadcasts` | `broadcasts_delete` | DELETE | `admin`, `principal`. |
| `fee_payment_reminders` | `fee_reminders_select` | SELECT | `admin`, `principal`, `finance_manager`, `accountant`, OR student self, OR parent. |
| `fee_payment_reminders` | `fee_reminders_insert` | INSERT | `admin`, `principal`, `finance_manager`, `accountant`. |
| `fee_payment_reminders` | `fee_reminders_update` | UPDATE | `admin`, `principal`, `finance_manager`, `accountant`. |
| `fee_payment_reminders` | `fee_reminders_delete` | DELETE | `admin`, `finance_manager`. |
| `fee_receipts` | `fee_receipts_select` | SELECT | `admin`, `principal`, `finance_manager`, `accountant`, `financier`, OR student self, OR parent. |
| `fee_receipts` | `fee_receipts_insert` | INSERT | `admin`, `principal`, `finance_manager`, `accountant`. |
| `fee_receipts` | `fee_receipts_update` | UPDATE | `admin`, `principal`, `finance_manager`, `accountant`. |
| `fee_receipts` | `fee_receipts_delete` | DELETE | `admin`, `finance_manager`. |
| `scholarship_applications` | `scholarship_apps_select` | SELECT | `admin`, `principal`, `finance_manager`, `accountant`, OR student self, OR parent. |
| `scholarship_applications` | `scholarship_apps_insert` | INSERT | `admin`, `principal`, `finance_manager`, OR student self (`student_id = auth.uid()`). |
| `scholarship_applications` | `scholarship_apps_update` | UPDATE | `admin`, `principal`, `finance_manager`, `accountant`, OR student self while in `'Draft'` or `'Submitted'`. |
| `scholarship_applications` | `scholarship_apps_delete` | DELETE | `admin`, `finance_manager`, OR student self while in `'Draft'`. |
| `library_circulation` | `library_circ_select` | SELECT | `admin`, `principal`, `librarian`, OR borrower self (`user_id = auth.uid()`). |
| `library_circulation` | `library_circ_insert` | INSERT | `admin`, `principal`, `librarian`. |
| `library_circulation` | `library_circ_update` | UPDATE | `admin`, `principal`, `librarian`. |
| `library_circulation` | `library_circ_delete` | DELETE | `admin`, `librarian`. |
| `hostel_rooms` | `hostel_rooms_select` | SELECT | `true` (all authenticated students and staff). |
| `hostel_rooms` | `hostel_rooms_insert` | INSERT | `admin`, `principal`, `hostel_warden`. |
| `hostel_rooms` | `hostel_rooms_update` | UPDATE | `admin`, `principal`, `hostel_warden`. |
| `hostel_rooms` | `hostel_rooms_delete` | DELETE | `admin`, `hostel_warden`. |
| `hostel_out_passes` | `hostel_out_passes_select` | SELECT | `admin`, `principal`, `hostel_warden`, `receptionist`, `transport_driver`, `driver`, OR student self, OR parent. |
| `hostel_out_passes` | `hostel_out_passes_insert` | INSERT | `admin`, `principal`, `hostel_warden`, OR student self (`student_id = auth.uid()`). |
| `hostel_out_passes` | `hostel_out_passes_update` | UPDATE | `admin`, `principal`, `hostel_warden`. |
| `hostel_out_passes` | `hostel_out_passes_delete` | DELETE | `admin`, `hostel_warden`, OR student self while in `'Pending'`. |
| `placement_drives` | `placement_drives_select` | SELECT | `true` (all authenticated students and faculty). |
| `placement_drives` | `placement_drives_insert` | INSERT | `admin`, `principal`, `placement_officer`. |
| `placement_drives` | `placement_drives_update` | UPDATE | `admin`, `principal`, `placement_officer`. |
| `placement_drives` | `placement_drives_delete` | DELETE | `admin`, `placement_officer`. |
| `placement_applications` | `placement_apps_select` | SELECT | `admin`, `principal`, `placement_officer`, OR applicant self (`student_id = auth.uid()`). |
| `placement_applications` | `placement_apps_insert` | INSERT | `admin`, `principal`, `placement_officer`, OR student self (`student_id = auth.uid()`). |
| `placement_applications` | `placement_apps_update` | UPDATE | `admin`, `principal`, `placement_officer`, OR student self while in `'Applied'`. |
| `placement_applications` | `placement_apps_delete` | DELETE | `admin`, `placement_officer`, OR student self while in `'Applied'`. |
| `storage.objects` | `storage_objects_select` | SELECT | Bucket-aware: `attachments` (all); `documents` (finance/HR/admin + owner UID); `student_documents` (academic + owner UID + parent); `staff_documents` (HR/admin + owner UID). |
| `storage.objects` | `storage_objects_insert` | INSERT | Bucket-aware + owner UID prefix matching `(storage.foldername(name))[1] = auth.uid()::text`. |
| `storage.objects` | `storage_objects_update` | UPDATE | Bucket-filtered (`bucket_id IN (...)`) + owner UID prefix match OR `admin`/`principal`. |
| `storage.objects` | `storage_objects_delete` | DELETE | Bucket-filtered (`bucket_id IN (...)`) + owner UID prefix match OR system `admin`. |
| `super_admin_configs` | `super_admin_configs_select` | SELECT | Institutional `admin` only. |
| `super_admin_configs` | `super_admin_configs_insert` | INSERT | Institutional `admin` only. |
| `super_admin_configs` | `super_admin_configs_update` | UPDATE | Institutional `admin` only. |
| `super_admin_configs` | `super_admin_configs_delete` | DELETE | Institutional `admin` only. |
| `super_admin_releases` | `super_admin_releases_select` | SELECT | Institutional `admin` only. |
| `super_admin_releases` | `super_admin_releases_insert` | INSERT | Institutional `admin` only. |
| `super_admin_releases` | `super_admin_releases_update` | UPDATE | Institutional `admin` only. |
| `super_admin_releases` | `super_admin_releases_delete` | DELETE | Institutional `admin` only. |
| `super_admin_audit_logs` | `super_admin_audit_logs_select` | SELECT | Institutional `admin` only. |
| `super_admin_audit_logs` | `super_admin_audit_logs_insert` | INSERT | Institutional `admin` only (Actor auto-bound via trigger). |

*(Note: On `super_admin_audit_logs`, UPDATE and DELETE are 0 across all roles and blocked by trigger).*

---

## 4. Operation Matrix Across Institutional Roles

| Entity | Admin | Principal | Faculty (Teacher/HOD) | COE | Finance (Mgr/Acct/Fin) | HR Manager | Librarian | Hostel Warden | Placement Officer | Student | Parent |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `class_attendance_sessions` | SIUD | SIUD | SIU (Teacher: Assigned) | S | - | - | - | - | - | - | - |
| `student_attendance_records` | SIUD | SIUD | SIU (Exact Class Enrolled) | S | - | - | - | - | - | S (Own) | S (Child) |
| `staff_payroll_runs` | SIUD | SIUD | - | - | S (Fin) / SIUD (Mgr) | SIUD | - | - | - | - | - |
| `staff_payroll_items` | SIUD | SIUD | S (Own) | S (Own) | S (Fin) / SIUD (Mgr) | SIUD | S (Own) | S (Own) | S (Own) | - | - |
| `staff_leave_balances` | SIUD | SIUD | S (Own) | S (Own) | S (Own) | SIUD | S (Own) | S (Own) | S (Own) | - | - |
| `staff_leave_applications` | SIUD | SIUD | SIUD (Own / HOD: SU) | SIUD (Own) | SIUD (Own) | SIUD | SIUD (Own) | SIUD (Own) | SIUD (Own) | - | - |
| `hall_tickets` | SIUD | SIUD | S | SIUD | - | - | - | - | - | S (Own) | S (Child) |
| `fee_structures` | SIUD | SIUD | S | S | SIUD (Mgr) / S | S | S | S | S | S | S |
| `fee_payment_reminders` | SIUD | SIUD | - | - | SIUD | - | - | - | - | S (Own) | S (Child) |
| `fee_receipts` | SIUD | SIU | - | - | SIUD (Mgr) / SIU | - | - | - | - | S (Own) | S (Child) |
| `scholarship_applications` | SIUD | SIUD | - | - | SIUD | - | - | - | - | SIU (Own) | S (Child) |
| `library_circulation` | SIUD | SIUD | S (Own) | S (Own) | S (Own) | S (Own) | SIUD | S (Own) | S (Own) | S (Own) | S (Child) |
| `hostel_rooms` | SIUD | SIUD | S | S | S | S | S | SIUD | S | S | S |
| `hostel_out_passes` | SIUD | SIUD | - | - | - | - | - | SIUD | - | SIU (Own) | S (Child) |
| `placement_drives` | SIUD | SIUD | S | S | S | S | S | S | SIUD | S | - |
| `placement_applications` | SIUD | SIUD | - | - | - | - | - | - | SIUD | SIU (Own) | - |
| `institutional_broadcasts` | SIUD | SIUD | S | S | S | S | S | S | S | S | S |
| `storage.objects` (documents) | SIUD | SIUD | S (Own) | S (Own) | SIUD (Mgr) | SIUD | S (Own) | S (Own) | S (Own) | SI (Own) | S (Child) |
| `super_admin_configs` | SIUD | - | - | - | - | - | - | - | - | - | - |
| `super_admin_releases` | SIUD | - | - | - | - | - | - | - | - | - | - |
| `super_admin_audit_logs` | SI | - | - | - | - | - | - | - | - | - | - |
