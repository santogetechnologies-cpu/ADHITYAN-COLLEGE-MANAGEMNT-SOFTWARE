# Phase 1.4.1: Final RLS Policy, Table Privileges & Storage Access Matrix

> **Document Version:** 1.4.1 (Static Independent Review & Revalidation)  
> **Target Database:** Supabase Managed PostgreSQL (`ogbbyqxulhegwvrtinib.supabase.co`)  
> **Deployment Architecture:** Single-Institution Dedicated Deployment (Adhityan College)  
> **Remediations Incorporated:** `DEF-101` (8 ERP Tables), `DEF-102` & `DEF-124` (4-Bucket Storage Privacy), `DEF-104` & `DEF-118` (Teacher Class/Subject Validation, Active Enrollment & 24h Window), `DEF-108` & `DEF-120` (Audit Table Immutability & Privileges), `DEF-111` (Storage Bucket Filter & Safe UUID), `DEF-112` (Unbundled CRUD & Table-Level Grants), `DEF-113` (Append-Only Release Ledger - UPDATE/DELETE Removed), `DEF-115` (Attachments Access Lockdown), `DEF-116` (Faculty Scoped Student Document Access), `DEF-125` (Student/Staff Initial Application Status Restrictions)  
> **Execution Status:** Static Engineering Specification (Zero Live Mutations)

---

## 1. Executive Summary & Zero-Trust Architecture

Phase 1.4.1 establishes a verified, multi-tiered zero-trust data perimeter for Adhityan College Management Software. Access control is enforced across three independent database tiers:

1. **Tier 1 (Table-Level Privileges):** Explicit `REVOKE ALL` and least-privilege `GRANT` statements enforce that the PostgreSQL engine permits only intended SQL verbs before evaluating RLS. `TRUNCATE` is revoked across all tables.
2. **Tier 2 (Row-Level Security):** All 24 legacy permissive policies evaluating to `true` and legacy migration 003 public storage policies are eliminated. Blanket read access across storage buckets is completely removed and replaced with strict uploader, parent, and authorized faculty isolation.
3. **Tier 3 (Academic & Ledger Safeguards):**
   - Faculty access to student documents (`DEF-116`) and student attendance sessions (`DEF-118`) is strictly constrained to active students enrolled in classes assigned to that specific instructor.
   - Attendance modifications (`DEF-104`) enforce a strict 24-hour correction window (`created_at >= NOW() - INTERVAL '24 hours'`).
   - Applications (`DEF-125`) enforce initial pending/draft statuses on `INSERT` to prevent privilege escalation or self-approval.
   - Forensic immutability (`DEF-108`, `DEF-120`) is enforced at the database engine level on `super_admin_audit_logs` (UPDATE, DELETE, and TRUNCATE permanently blocked) and `super_admin_releases` is an append-only ledger (UPDATE and DELETE privileges and policies removed).

---

## 2. Table-Level Privileges (GRANT & REVOKE) Register

| Table Name | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | Security Enforcement Mechanism |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `class_attendance_sessions` | YES | YES | YES | YES | **REVOKED** | 4 unbundled RLS policies + unique attendance index + 24h window. |
| `student_attendance_records` | YES | YES | YES | YES | **REVOKED** | 4 unbundled RLS policies + active student class enrollment verification. |
| `staff_payroll_runs` | YES | YES | YES | YES | **REVOKED** | 4 unbundled RLS policies (leadership & finance). |
| `staff_payroll_items` | YES | YES | YES | YES | **REVOKED** | 4 unbundled RLS policies (staff self-read + leadership). |
| `staff_leave_balances` | YES | YES | YES | YES | **REVOKED** | 4 unbundled RLS policies + deterministic balance triggers. |
| `staff_leave_applications` | YES | YES | YES | YES | **REVOKED** | 4 unbundled RLS policies + state machine deduction trigger. |
| `hall_tickets` | YES | YES | YES | YES | **REVOKED** | 4 unbundled RLS policies (COE, faculty, student self, parent). |
| `fee_structures` | YES | YES | YES | YES | **REVOKED** | 4 unbundled RLS policies (finance management). |
| `institutional_broadcasts` | YES | YES | YES | YES | **REVOKED** | 4 unbundled RLS policies (audience & publication filtering). |
| `fee_payment_reminders` | YES | YES | YES | YES | **REVOKED** | 4 unbundled RLS policies (finance + student/parent read). |
| `fee_receipts` | YES | YES | YES | YES | **REVOKED** | 4 unbundled RLS policies (finance + student/parent read). |
| `scholarship_applications` | YES | YES | YES | YES | **REVOKED** | 4 unbundled RLS policies (student INSERT limited to Draft/Submitted). |
| `library_circulation` | YES | YES | YES | YES | **REVOKED** | 4 unbundled RLS policies (librarian + borrower read). |
| `hostel_rooms` | YES | YES | YES | YES | **REVOKED** | 4 unbundled RLS policies (warden management + public room visibility). |
| `hostel_out_passes` | YES | YES | YES | YES | **REVOKED** | 4 unbundled RLS policies (student INSERT limited to Pending). |
| `placement_drives` | YES | YES | YES | YES | **REVOKED** | 4 unbundled RLS policies (placement officer + published drive visibility). |
| `placement_applications` | YES | YES | YES | YES | **REVOKED** | 4 unbundled RLS policies (student INSERT limited to Applied). |
| `super_admin_configs` | YES | YES | YES | YES | **REVOKED** | Admin role only via RLS. |
| `super_admin_releases` | **YES** | **YES** | **REVOKED** | **REVOKED** | **REVOKED** | **DEF-113:** Append-only release ledger; UPDATE/DELETE revoked. |
| `super_admin_audit_logs` | **YES** | **YES** | **REVOKED** | **REVOKED** | **REVOKED** | **DEF-108 & DEF-120:** Engine triggers block UPDATE, DELETE & TRUNCATE. |

---

## 3. Storage Buckets & Objects Security Matrix (DEF-102, DEF-115, DEF-116, DEF-124)

All four sensitive institutional buckets are explicitly configured as private (`public = false`). Direct public CDN access is blocked.

| Bucket ID | Public Status | SELECT Permissions | INSERT Permissions | UPDATE Permissions | DELETE Permissions |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **`attachments`** | **`false`** | **DEF-115:** Uploader UID folder, verified parent of student uploader, Admin/Principal, OR assigned Teacher/HOD for active students in their assigned classes. | Uploader UID prefix `(storage.foldername(name))[1] = auth.uid()::text` or `admin`/`principal`. | Bound to original bucket and uploader UID prefix or `admin`/`principal`. | Uploader UID prefix or `admin`. |
| **`documents`** | **`false`** | Document owner UID folder or authorized administrative/academic officers (`admin`, `principal`, `hr_manager`, `finance_manager`, `accountant`, `coe`, `hod`, `teacher`). | Owner UID prefix or authorized administrative officers (`admin`, `principal`, `hr_manager`, `finance_manager`). | Bound to original bucket and owner UID prefix or `admin`/`principal`. | Owner UID prefix or `admin`. |
| **`student_documents`** | **`false`** | Student owner UID folder, verified parent, `admin`, `principal`, `coe`, OR **DEF-116:** Teacher/HOD assigned to that student's specific class for active enrolled students. | Student owner UID folder or `admin`/`principal`. | Bound to original bucket and student UID folder or `admin`/`principal`. | Student owner UID folder or `admin`. |
| **`staff_documents`** | **`false`** | Staff owner UID folder, `admin`, `principal`, `hr_manager`. | Staff owner UID folder, `admin`, `principal`, `hr_manager`. | Bound to original bucket and staff UID folder or `admin`/`principal`. | Staff owner UID folder or `admin`. |

---

## 4. Complete Operation Matrix Across Institutional Roles (19 Roles + 1 Alias)

The verified institutional role registry whitelist consists of 20 identifiers:
`admin` (Institutional Super Admin), `principal`, `teacher`, `hod`, `coe`, `student`, `parent`, `accountant`, `librarian`, `hostel_warden`, `transport_driver`, `driver` (alias), `receptionist`, `naac_coordinator`, `hr_manager`, `finance_manager`, `store_manager`, `storekeeper`, `financier`, `placement_officer`.

| Entity | Admin | Principal | Faculty (Teacher/HOD) | COE | Finance (Mgr/Acct/Fin) | HR Manager | Librarian | Warden | Placement | Student | Parent |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `class_attendance_sessions` | SIUD | SIUD | SIU (Assigned Class/Subject & 24h Window) | S | - | - | - | - | - | - | - |
| `student_attendance_records` | SIUD | SIUD | SIU (Enrolled Active Class & 24h Window) | S | - | - | - | - | - | S (Own) | S (Child) |
| `staff_payroll_runs` | SIUD | SIUD | - | - | S (Fin) / SIUD (Mgr) | SIUD | - | - | - | - | - |
| `staff_payroll_items` | SIUD | SIUD | S (Own) | S (Own) | S (Fin) / SIUD (Mgr) | SIUD | S (Own) | S (Own) | S (Own) | - | - |
| `staff_leave_balances` | SIUD | SIUD | S (Own) | S (Own) | S (Own) | SIUD | S (Own) | S (Own) | S (Own) | - | - |
| `staff_leave_applications` | SIUD | SIUD | SIUD (Own / HOD: SU) | SIUD (Own) | SIUD (Own) | SIUD | SIUD (Own) | SIUD (Own) | SIUD (Own) | - | - |
| `hall_tickets` | SIUD | SIUD | S | SIUD | - | - | - | - | - | S (Own) | S (Child) |
| `fee_structures` | SIUD | SIUD | S | S | SIUD (Mgr) / S | S | S | S | S | S | S |
| `fee_payment_reminders` | SIUD | SIUD | - | - | SIUD | - | - | - | - | S (Own) | S (Child) |
| `fee_receipts` | SIUD | SIU | - | - | SIUD (Mgr) / SIU | - | - | - | - | S (Own) | S (Child) |
| `scholarship_applications` | SIUD | SIUD | - | - | SIUD | - | - | - | - | SIU (Own)* | S (Child) |
| `library_circulation` | SIUD | SIUD | S (Own) | S (Own) | S (Own) | S (Own) | SIUD | S (Own) | S (Own) | S (Own) | S (Child) |
| `hostel_rooms` | SIUD | SIUD | S | S | S | S | S | SIUD | S | S (Active) | S (Active) |
| `hostel_out_passes` | SIUD | SIUD | - | - | - | - | - | SIUD | - | SIU (Own)* | S (Child) |
| `placement_drives` | SIUD | SIUD | S | S | S | S | S | S | SIUD | S (Open) | - |
| `placement_applications` | SIUD | SIUD | - | - | - | - | - | - | SIUD | SIU (Own)* | - |
| `institutional_broadcasts` | SIUD | SIUD | S (Faculty) | S | S | S | S | S | S | S (Student) | S (Parent) |
| `storage.objects` (attachments) | SIUD | SIUD | S (Assigned/Own) | S (Own) | S (Own) | S (Own) | S (Own) | S (Own) | S (Own) | SIU (Own) | S (Child) |
| `storage.objects` (student_docs) | SIUD | SIUD | S (Assigned Class) | S | - | - | - | - | - | SIU (Own) | S (Child) |
| `super_admin_configs` | SIUD | - | - | - | - | - | - | - | - | - | - |
| `super_admin_releases` | **SI** | - | - | - | - | - | - | - | - | - | - |
| `super_admin_audit_logs` | **SI** | - | - | - | - | - | - | - | - | - | - |

*\*Note on Student Applications (`DEF-125`): On INSERT, students are strictly constrained to valid initial statuses (`Draft`/`Submitted` for scholarships, `Pending` for hostel out passes, `Applied` for placement applications). They cannot insert or self-update records to Approved or Selected.*  
*\*\*Note on Append-Only Ledgers (`DEF-108`, `DEF-113`, `DEF-120`): On `super_admin_audit_logs`, UPDATE, DELETE, and TRUNCATE are permanently blocked at the engine trigger level and privileges are revoked. On `super_admin_releases`, UPDATE and DELETE privileges and policies are removed.*
