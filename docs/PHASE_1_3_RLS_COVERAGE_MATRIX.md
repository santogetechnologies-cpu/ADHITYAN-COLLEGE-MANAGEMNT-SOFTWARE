# Phase 1.3: Complete RLS Policy & ERP Coverage Matrix

> **Document Version:** 1.3.0 (Master Security Revalidation)  
> **Deployment Architecture:** Single-Institution Dedicated Deployment (Adhityan College)  
> **Target Database:** PostgreSQL 15+ (Supabase Managed Instance: `ogbbyqxulhegwvrtinib.supabase.co`)  
> **Remediations Incorporated:** `DEF-101` (8 ERP Tables), `DEF-102` (Storage Privacy), `DEF-104` (Class Enrollment Validation), `DEF-108` (Append-Only Audit Logs)  
> **Execution Status:** Static Specification & Catalog Revalidation (Zero Live Mutations)

---

## 1. Executive Summary

In PostgreSQL Row Level Security (RLS), access permissions combine using boolean **`OR`** across all permissive policies attached to a table:
$$\text{Access Granted} \iff \bigvee_{i=1}^n \text{Permissive Policy}_i(\text{current\_user})$$

In Phase 1.1 and 1.2 reviews, two severe vulnerabilities were identified:
1. **Permissive Policy Overlap (`DEF-007`, `DEF-102`):** Legacy blanket policies evaluating to `true` (such as `att_sessions_all`, `fee_structures_public_read`, `Allow read hall tickets`, and storage `"Public read access for documents"`) completely bypassed granular restrictions.
2. **ERP Application Lockout Risk (`DEF-101`):** In previous migration drafts, dropping `_all` policies on 8 core ERP tables (`fee_payment_reminders`, `fee_receipts`, `scholarship_applications`, `library_circulation`, `hostel_rooms`, `hostel_out_passes`, `placement_drives`, `placement_applications`) without creating replacements left them in an unconditional `DENY ALL` state.

Phase 1.3 completely resolves both defects:
- All **24 legacy permissive policies** are dropped.
- The `documents` storage bucket is hardened from `public = true` to `public = false`.
- **Complete, role-based CRUD policies** are established for all 8 ERP tables, core academic tables, payroll, leaves, and audit logs.

---

## 2. Legacy Policy Dropping & Replacement Inventory

The following table tracks every legacy permissive policy dropped in Stage 4, its exact security vulnerability, and the specific replacement policies established in `028_stage4_rls.sql`:

| Target Table | Legacy Dropped Policy | Vulnerability in Legacy Policy | Replacement Policy / Policies Created in Stage 4 |
| :--- | :--- | :--- | :--- |
| `storage.objects` | `"Public read access for documents"` | Public read access granted to anonymous users; bypassed all auth. | `storage_objects_select` (Strict folder-prefix `(storage.foldername(name))[1] = auth.uid()::text` + admin roles). |
| `storage.objects` | `"Authenticated users can upload documents"` | Allowed any user to upload files to any path across institution. | `storage_objects_insert` (Restricted to user's UID folder prefix + role checks). |
| `storage.objects` | `"Authenticated users can delete documents"` | Allowed any logged-in student or staff to delete institutional files. | `storage_objects_delete` (Owner UID prefix match OR system `admin`). |
| `public.class_attendance_sessions` | `"att_sessions_all"` | Blanket `ALL TO authenticated (true)`: unauthorized session tampering. | `att_sessions_select`, `att_sessions_insert`, `att_sessions_update`, `att_sessions_delete`. |
| `public.student_attendance_records` | `"att_records_all"` | Blanket `ALL TO authenticated (true)`: mark manipulation across classes. | `att_records_select`, `att_records_insert`, `att_records_update`, `att_records_delete`. |
| `public.staff_leave_balances` | `"staff_leaves_bal_all"` | Blanket `ALL TO authenticated (true)`: staff leave quota tampering. | `leave_balances_select`, `leave_balances_write`. |
| `public.staff_leave_applications` | `"staff_leaves_app_all"` | Blanket `ALL TO authenticated (true)`: staff leave self-approval. | `leave_apps_select`, `leave_apps_insert`, `leave_apps_update`, `leave_apps_delete`. |
| `public.staff_payroll_runs` | `"payroll_runs_all"` | Blanket `ALL TO authenticated (true)`: arbitrary payroll disbursement. | `payroll_runs_select`, `payroll_runs_write`. |
| `public.staff_payroll_items` | `"payroll_items_all"` | Blanket `ALL TO authenticated (true)`: universal salary slip exposure. | `payroll_items_select`, `payroll_items_write`. |
| `public.hall_tickets` | `"hall_tickets_all"` | Blanket `ALL TO authenticated (true)`: exam clearance bypass. | `hall_tickets_select`, `hall_tickets_write`. |
| `public.hall_tickets` | `"Allow manage hall tickets"` | Permissive overlap granting universal write to authenticated. | Consolidated into `hall_tickets_write`. |
| `public.hall_tickets` | `"Allow read hall tickets"` | Public leak of student register numbers and exam locations. | Consolidated into `hall_tickets_select`. |
| `public.fee_structures` | `"fee_structures_all"` | Blanket `ALL TO authenticated (true)`: fee structure tampering. | `fee_structures_select`, `fee_structures_write`. |
| `public.fee_structures` | `"fee_structures_public_read"` | Unrestricted anonymous public scraping of institutional fees. | `fee_structures_select` (restricted to authenticated). |
| `public.institutional_broadcasts` | `"broadcasts_all"` | Blanket `ALL TO authenticated (true)`: unauthorized public broadcast. | `broadcasts_select`, `broadcasts_write`. |
| `public.institutional_broadcasts` | `"broadcasts_public_read"` | Unrestricted anonymous read of internal announcements. | `broadcasts_select` (restricted to authenticated). |
| `public.fee_payment_reminders` | `"fee_reminders_all"` | Blanket `ALL TO authenticated (true)`. Dropping caused DENY ALL. | `fee_reminders_select`, `fee_reminders_write`. |
| `public.fee_receipts` | `"fee_receipts_all"` | Blanket `ALL TO authenticated (true)`. Dropping caused DENY ALL. | `fee_receipts_select`, `fee_receipts_insert`, `fee_receipts_update`, `fee_receipts_delete`. |
| `public.scholarship_applications` | `"scholarship_apps_all"` | Blanket `ALL TO authenticated (true)`. Dropping caused DENY ALL. | `scholarship_apps_select`, `scholarship_apps_insert`, `scholarship_apps_update`, `scholarship_apps_delete`. |
| `public.library_circulation` | `"library_circ_all"` | Blanket `ALL TO authenticated (true)`. Dropping caused DENY ALL. | `library_circ_select`, `library_circ_write`. |
| `public.hostel_rooms` | `"hostel_rooms_all"` | Blanket `ALL TO authenticated (true)`. Dropping caused DENY ALL. | `hostel_rooms_select`, `hostel_rooms_write`. |
| `public.hostel_out_passes` | `"hostel_out_passes_all"` | Blanket `ALL TO authenticated (true)`. Dropping caused DENY ALL. | `hostel_out_passes_select`, `hostel_out_passes_insert`, `hostel_out_passes_update`, `hostel_out_passes_delete`. |
| `public.placement_drives` | `"placement_drives_all"` | Blanket `ALL TO authenticated (true)`. Dropping caused DENY ALL. | `placement_drives_select`, `placement_drives_write`. |
| `public.placement_applications` | `"placement_apps_all"` | Blanket `ALL TO authenticated (true)`. Dropping caused DENY ALL. | `placement_apps_select`, `placement_apps_insert`, `placement_apps_update`, `placement_apps_delete`. |

---

## 3. Comprehensive Operation Matrix by Role

The matrix below defines access permissions across all protected institutional tables and storage:
- **`S`**: SELECT
- **`I`**: INSERT
- **`U`**: UPDATE
- **`D`**: DELETE
- **`Own`**: Row-level self-ownership or student link (`auth.uid() = user_id`, `student_id = auth.uid()`, or `is_parent_of(student_id)`).

| Table / Entity | Admin | Principal | Faculty (Teacher/HOD) | COE | Finance (Mgr/Acct/Fin) | HR Manager | Librarian | Hostel Warden | Placement Officer | Student | Parent |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `class_attendance_sessions` | SIUD | SIUD | SIU (Teacher: Own) | S | - | - | - | - | - | - | - |
| `student_attendance_records` | SIUD | SIUD | SIU (Class Enrolled) | S | - | - | - | - | - | S (Own) | S (Child) |
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

*(Note: On `super_admin_audit_logs`, UPDATE and DELETE permissions are permanently 0 for all roles, enforcing forensic immutability).*

---

## 4. Deep Inspection of Core ERP Table Policies

### 4.1 Accounts & Fees: `fee_payment_reminders` & `fee_receipts`
- **Business Need:** Accounts staff issue reminders and receipts; students and parents must verify receipt authenticity without editing financial ledgers.
- **`fee_payment_reminders_select`:**
  ```sql
  USING (
      public.get_current_user_role() IN ('admin', 'principal', 'finance_manager', 'accountant')
      OR student_id = auth.uid()
      OR public.is_parent_of(student_id)
  )
  ```
- **`fee_receipts_delete`:** Restricted strictly to `admin` and `finance_manager`. Ordinary accountants can generate (`INSERT`) and update notes (`UPDATE`), but cannot silently destroy financial records.

### 4.2 Scholarships: `scholarship_applications`
- **Business Need:** Students submit applications; finance office reviews and disburses awards.
- **Application Ownership:** Students can submit (`INSERT`) when `student_id = auth.uid()` and make edits (`UPDATE`) only while the status is in `'Draft'` or `'Submitted'`. Once approved or under official review, mutations are restricted to `finance_manager` and `admin`.

### 4.3 Library: `library_circulation`
- **Business Need:** Centralized book circulation managed by `librarian`; users track their borrowed books and dues.
- **Circulation Read:** Permitted to `librarian`, `admin`, `principal`, or the individual borrower (`user_id = auth.uid()`).
- **Circulation Write:** Restricted strictly to `librarian`, `principal`, and `admin`.

### 4.4 Hostel Management: `hostel_rooms` & `hostel_out_passes`
- **Business Need:** Wardens manage bed allocations and verify out-pass approvals; gate security and drivers verify student gate-pass clearance.
- **Out-Pass Gate Verification:** Staff roles with gate or transit responsibilities (`receptionist`, `transport_driver`, `driver`, `hostel_warden`) are granted `SELECT` access to verify approved passes at the campus perimeter.
- **Out-Pass Submission:** Students can request an out-pass (`INSERT` where `student_id = auth.uid()`), but cannot self-approve (`UPDATE` restricted to `hostel_warden`, `principal`, and `admin`).

### 4.5 Placement Cell: `placement_drives` & `placement_applications`
- **Business Need:** Placement officer posts recruitment drives and coordinates applicant shortlists; students apply to matching drives.
- **Drive Visibility:** All authenticated students and faculty can view active placement drives (`SELECT USING (true)` for authenticated).
- **Application Submission:** Eligible students can submit their own profile (`student_id = auth.uid()`); shortlisting and round results are managed strictly by `placement_officer` and `admin`.

---

## 5. Defense-in-Depth & Edge-Case Protection

1. **Suspended Account Defense (`BUG-SEC-002`):**
   `public.get_current_user_role()` filters on `status = 'active'`. If a staff member or student is set to `'suspended'` or `'inactive'`, this function returns `NULL`. As a result, all role checks evaluate to `false`, instantly severing access across every ERP table without waiting for session revocation.
2. **Attendance Enrollment Validation (`DEF-104`):**
   Even if a teacher attempts to submit an attendance record for an arbitrary student UUID, the `WITH CHECK` clause verifies that the student is actually enrolled in the session's specific `class_name` or `department`.
3. **Forensic Audit Immutability (`DEF-108`):**
   `super_admin_audit_logs` has zero `UPDATE` and zero `DELETE` policies. In PostgreSQL, omitting a policy defaults to `DENY`. Thus, even an institutional Super Admin cannot delete or falsify their past audit entries via Supabase client or API.
