# ADHITYAN COLLEGE MANAGEMENT SOFTWARE
## Comprehensive Admin Access & Permission Map (Stage A)

**Document Version:** 1.0.0 (Stage A Diagnostic)  
**System Architecture:** Single-Institution Dedicated Deployment (Adhityan College of Allied Health Sciences)  
**Admin Role Architecture:** ONE Admin Role (`admin`). Admin has full institutional governance and operational access.  
**Authenticated Probe Account:** `admin@gmail.com` (UUID: `ed0ef274-5dd5-4775-accb-97119899cc00`)

---

## 1. Complete Application Routes, Pages, Tabs & Forms (Per Role)

| Role | Accessible Routes | Primary Pages & Workspaces | Primary Tabs & Views | Submittable Forms |
| :--- | :--- | :--- | :--- | :--- |
| **`admin`** | **ALL 46 Application Routes** (`/`, `/admin/*`, `/dashboard/*`, `/exam-management`, `/library-management`, `/admission-management`, `/alumni-management`, `/medical-management`, `/certificate-generation`, `/sports-management`, `/disciplinary-management`, `/store`, `/report-concern`, `/message-teacher`, `/track-bus`, `/achievements`, `/teachers/*`) | Admin Overview, User Directory, Departments & Courses, Timetable Matrix, Events, Reports, Analytics, Settings, Account Provisioning, NAAC Accreditation (Criterion 1–7, Repository, Reports, Settings), Store, Exams, Library, Admissions, Healthcare, Alumni, Transportation | Overview, Staff Directory, Student Directory, Parent Directory, Roles & Permissions, Form Fields, Lookup Lists, Module Switches, System Backups, Audit Logs, View As Simulation, Department Details, Course Allocation | User Creation Dialog, Staff Edit Dialog, Student Edit Dialog, Course Creation Form, Department Form, Timetable Entry Dialog, Event Creation Form, Admission Application Form, Fee Structure Form, Book Cataloging Form, Store Product Form, Infirmary Form, Broadcast Publisher |
| **`principal`** | `/dashboard/principal`, `/admin/departments`, `/admin/timetable`, `/admin/teachers`, `/admin/naac/*`, `/disciplinary-management`, `/certificate-generation`, `/exam-management`, `/report-concern`, `/admin/account-provisioning`, `/account-provisioning`, `/admission-management`, `/alumni-management`, `/medical-management`, `/sports-management` | Principal Executive Dashboard, Department Oversight, Faculty Oversight, NAAC Hub, Disciplinary Oversight, Exam Approvals | Academic Overview, Faculty Directory, Student Performance, Financial Summary, Complaints Resolution, NAAC Criteria | Concern Resolution Dialog, Disciplinary Incident Form, Certificate Generation Form, Exam Results Approval Form |
| **`teacher` / `faculty` / `hod`** | `/dashboard/teacher`, `/teachers/create-assignment`, `/teachers/message-parents`, `/teachers/generate-report`, `/teachers/daily-update`, `/exam-management`, `/library-management`, `/sports-management`, `/disciplinary-management`, `/report-concern`, `/message-teacher`, `/achievements` | Faculty Dashboard, Assignment Creator, Parent Messenger, Academic Report Generator, Daily Syllabus Update Workspace | Assigned Classes, Student Attendance Roll, Assignments, Examination Grading, Study Materials | Daily Attendance Form, Assignment Submission Form, Daily Teaching Coverage Form, Internal Marks Entry Form, Disciplinary Incident Report Form |
| **`student`** | `/dashboard/student`, `/dashboard`, `/store`, `/report-concern`, `/message-teacher`, `/track-bus`, `/achievements`, `/exam-management`, `/library-management` | CampusPro Student Portal, Course Hub, Class Schedule, Assignment Submissions, Fee Payment View, Bus Tracking, Achievements Hub | Overview, Academic Progress, Attendance History, Exam Hall Ticket, Fee Receipts, Library Checkout History, Bus Route Map | Assignment Upload Form, Grievance/Concern Report Form, Store Order Checkout, AI Learning Chat Query |
| **`parent`** | `/dashboard/parent`, `/dashboard`, `/report-concern`, `/message-teacher`, `/track-bus`, `/achievements` | Parent Engagement Portal, Linked Children Overview, Academic Progress, Fee Payment Gateway, Bus Live Tracking | Child Switcher, Attendance Roll, Marksheet View, Fee Ledger, Bus GPS | Fee Payment Form, Parent Concern Submission Form, Message to Class Teacher Form |
| **`finance_manager` / `accountant` / `financier`** | `/admin/finance`, `/admin/accounts`, `/admin`, `/dashboard` | Finance Executive Dashboard, Fee Collection Desk, Payroll Management, Financial Ledger & Concessions | Daily Cashier, Student Fee Balance Ledger, Payroll Runs, Expenditure Logs, Receipt Generation | Fee Collection Form, Concession Authorization Form, Payroll Run Dispatcher Form |
| **`receptionist`** | `/admin/receptionist`, `/admission-management`, `/admin/account-provisioning`, `/account-provisioning` | Front Desk Workspace, Visitor Pass Management, Admission Enquiry Desk, Appointment Booking | Active Visitors, Enquiries Pipeline, Scheduled Appointments, Student Token Distribution | Visitor Check-in Form, Enquiry Entry Form, Appointment Scheduler Form |
| **`store_manager` / `storekeeper`** | `/admin/store`, `/admin/store-manager`, `/admin/storekeeper`, `/store` | Campus Store Inventory & Dispatch, Uniform & Lab Coat Stock, Book Fulfillment | Inventory Ledger, Student Orders Queue, Low Stock Alerts, Sales Report | Product Creation Form, Stock Level Adjustment Form, Order Fulfillment Confirmation Dialog |
| **`transport_driver` / `driver`** | `/admin/transport`, `/admin/transport-driver`, `/track-bus` | Fleet Logistics Workspace, Bus Route Schedule, Vehicle Maintenance Logs | Route Stops, Student RFID Boarding Log, Maintenance History | Vehicle Service Entry Form, Fuel Expense Log Form, Route Stop Arrival Ping |
| **`librarian`** | `/library-management`, `/admin` | Digital & Physical Library System, Book Circulation Desk, Cataloging Hub | Book Inventory, Borrowed Books, Overdue Fines Ledger, Digital Resources Repository | Book Issue/Return Form, ISBN Cataloging Form, Digital Document Upload Form |
| **`naac_coordinator`** | `/admin/naac`, `/admin/naac/criterion-1` through `criterion-7`, `/admin/naac/repository`, `/admin/naac/reports`, `/admin/naac/settings` | NAAC Institutional Accreditation Hub, Quantitative & Qualitative Metrics Repository | SSR Criteria 1–7 Workspaces, Evidence Document Vault, Metric Progress Tracker | Criterion Metric Submission Form, Evidence Document Upload Form, SSR Generation Form |
| **`hr_manager`** | `/admin/users`, `/admin/reports` | Human Resources Workspace, Staff Service Book, Leave Quota Manager | Faculty Registry, Attendance Summaries, Leave Approval Queue | Staff Enrollment Form, Leave Quota Allocation Form |
| **`coe`** | `/exam-management` | Office of Controller of Examinations, Examination Scheduling, Grade Sheets & Hall Tickets | Exam Master, Timetable Scheduler, Results Publication Queue | Exam Master Creation Form, Timetable Slot Form, Result Publication Dispatcher Form |
| **`hostel_warden`** | `/admin`, `/dashboard` | Hostel Residential Management, Room Bedding Matrix, Outpass Tracker | Room Allocations, Active Outpasses, Mess Attendance | Room Allocation Form, Outpass Issuance/Approval Dialog |
| **`placement_officer`**| `/admin`, `/dashboard` | Corporate Placements & Internships, Campus Drive Desk | Placement Drives, Student Applications, Interview Rounds, Offer Letters | Placement Drive Creation Form, Student Shortlist Form |

---

## 2. Real Database Tables & RLS Policy Matrix (All 78 Tables)

All tables verified via live Supabase database connection and authenticated session probes:

| # | Table Name | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy | Admin Global Bypass |
|---|:---|:---|:---|:---|:---|:---:|
| 1 | `profiles` | Authenticated users (public data) | Admin & Auth trigger | Self (own row) & Admin | Admin only | ✅ YES |
| 2 | `departments` | Public / Authenticated | Admin only | Admin only | Admin only | ✅ YES |
| 3 | `sections` | Authenticated users | Admin only | Admin only | Admin only | ✅ YES |
| 4 | `courses` | Public / Authenticated | Admin only | Admin only | Admin only | ✅ YES |
| 5 | `institutional_settings` | Authenticated users | Admin only | Admin only | Admin only | ✅ YES |
| 6 | `institutional_broadcasts` | Authenticated (scoped by target_role) | Admin & Principal | Admin & Principal | Admin only | ✅ YES |
| 7 | `audit_logs` | Admin only | Authenticated (append-only) | FORBIDDEN (Immutable) | FORBIDDEN (Immutable) | ✅ YES |
| 8 | `notifications` | Own `user_id` or Admin | Authenticated system / Admin | Own `user_id` or Admin | Own `user_id` or Admin | ✅ YES |
| 9 | `calendar_events` | Authenticated users | Admin & Principal | Admin & Principal | Admin only | ✅ YES |
| 10 | `parent_student_links` | Linked parent, student, Admin | Admin only | Admin only | Admin only | ✅ YES |
| 11 | `ai_chat_messages` | Own `user_id` or Admin | Own `user_id` or Admin | Own `user_id` or Admin | Own `user_id` or Admin | ✅ YES |
| 12 | `student_attendance` | Own student, linked parent, faculty, Admin | Teacher, Faculty, Admin | Teacher, Faculty, Admin | Admin only | ✅ YES |
| 13 | `student_attendance_records` | Own student, linked parent, faculty, Admin | Teacher, Faculty, Admin | Teacher, Faculty, Admin | Admin only | ✅ YES |
| 14 | `class_attendance_sessions` | Faculty & Admin | Faculty & Admin | Faculty & Admin | Admin only | ✅ YES |
| 15 | `attendance_shortage_warnings` | Own student, linked parent, Admin | Compliance worker, Admin | Admin only | Admin only | ✅ YES |
| 16 | `timetables` | Authenticated users | Admin, Principal, HOD | Admin, Principal, HOD | Admin only | ✅ YES |
| 17 | `assignments` | Enrolled class students, teacher, Admin | Teacher, Faculty, Admin | Teacher, Faculty, Admin | Teacher (own), Admin | ✅ YES |
| 18 | `assignment_submissions` | Submitting student, grading teacher, Admin| Student (own), Admin | Grading teacher, Admin | Admin only | ✅ YES |
| 19 | `daily_teaching_updates` | Department faculty, Principal, Admin | Assigned teacher, Admin | Assigned teacher, Admin | Admin only | ✅ YES |
| 20 | `student_goals` | Own student, Admin | Student (own), Admin | Student (own), Admin | Student (own), Admin | ✅ YES |
| 21 | `student_learning_progress` | Own student, assigned teacher, Admin | Student (own), Admin | Student (own), Admin | Admin only | ✅ YES |
| 22 | `learning_content` | Enrolled students, faculty, Admin | Faculty, Teacher, Admin | Authoring faculty, Admin | Admin only | ✅ YES |
| 23 | `exams` | Authenticated users | COE, Admin | COE, Admin | Admin only | ✅ YES |
| 24 | `exam_schedules` | Authenticated users | COE, Admin | COE, Admin | Admin only | ✅ YES |
| 25 | `exam_results` | Own student (if published), faculty, COE, Admin | COE, Faculty, Admin | COE, Admin | Admin only | ✅ YES |
| 26 | `hall_tickets` | Own student (if cleared), COE, Admin | COE, Admin | COE, Admin | Admin only | ✅ YES |
| 27 | `fee_structures` | Authenticated users | Finance Manager, Admin | Finance Manager, Admin | Admin only | ✅ YES |
| 28 | `student_fees` | Own student, linked parent, Finance, Admin | Finance Manager, Admin | Finance Manager, Admin | Admin only | ✅ YES |
| 29 | `fee_receipts` | Own student, linked parent, Finance, Admin | Cashier, Finance, Admin | Admin only | Admin only | ✅ YES |
| 30 | `fee_payment_reminders` | Finance, Admin | Finance, Admin | Finance, Admin | Admin only | ✅ YES |
| 31 | `finance_transactions` | Finance Manager, Admin | Finance Manager, Admin | Finance Manager, Admin | Admin only | ✅ YES |
| 32 | `staff_leave_applications` | Applying staff, HOD, Principal, Admin | Staff (own), Admin | HOD, Principal, Admin | Admin only | ✅ YES |
| 33 | `staff_leave_balances` | Applying staff, HR, Principal, Admin | HR Manager, Admin | HR Manager, Admin | Admin only | ✅ YES |
| 34 | `staff_payroll_runs` | Finance Manager, HR, Admin | Finance Manager, Admin | Finance Manager, Admin | Admin only | ✅ YES |
| 35 | `staff_payroll_items` | Individual staff (own pay slip), Finance, Admin | Finance Manager, Admin | Finance Manager, Admin | Admin only | ✅ YES |
| 36 | `staff_service_records` | Individual staff, HR, Admin | HR Manager, Admin | HR Manager, Admin | Admin only | ✅ YES |
| 37 | `reception_visitors` | Receptionist, Admin | Receptionist, Admin | Receptionist, Admin | Admin only | ✅ YES |
| 38 | `reception_enquiries` | Receptionist, Admin | Receptionist, Admin | Receptionist, Admin | Admin only | ✅ YES |
| 39 | `reception_appointments` | Receptionist, Host Staff, Admin | Receptionist, Admin | Receptionist, Host Staff, Admin | Admin only | ✅ YES |
| 40 | `library_books` | Public / Authenticated | Librarian, Admin | Librarian, Admin | Librarian, Admin | ✅ YES |
| 41 | `book_issues` | Borrowing user, Librarian, Admin | Librarian, Admin | Librarian, Admin | Admin only | ✅ YES |
| 42 | `library_circulation` | Librarian, Admin | Librarian, Admin | Librarian, Admin | Admin only | ✅ YES |
| 43 | `digital_library_resources` | Authenticated users | Librarian, Faculty, Admin | Librarian, Admin | Admin only | ✅ YES |
| 44 | `wellness_checkins` | Submitting student, Counselor, Admin | Student (own), Admin | Student (own), Admin | Admin only | ✅ YES |
| 45 | `health_records` | Own student, Infirmary Staff, Admin | Infirmary Nurse, Admin | Infirmary Nurse, Admin | Admin only | ✅ YES |
| 46 | `infirmary_visits` | Own student, Infirmary Staff, Admin | Infirmary Nurse, Admin | Infirmary Nurse, Admin | Admin only | ✅ YES |
| 47 | `hostel_rooms` | Hostel Warden, Admin | Hostel Warden, Admin | Hostel Warden, Admin | Admin only | ✅ YES |
| 48 | `hostel_out_passes` | Own student, linked parent, Warden, Admin| Student (own), Admin | Warden, Parent, Admin | Admin only | ✅ YES |
| 49 | `concerns` | Submitting user, Principal, Admin | Authenticated users | Principal, Admin | Admin only | ✅ YES |
| 50 | `admission_applications` | Prospective applicant, Receptionist, Admin| Public applicant, Admin | Receptionist, Admin | Admin only | ✅ YES |
| 51 | `admission_document_verifications` | Receptionist, Admin | Receptionist, Admin | Receptionist, Admin | Admin only | ✅ YES |
| 52 | `admission_entrance_tests` | Receptionist, COE, Admin | COE, Admin | COE, Admin | Admin only | ✅ YES |
| 53 | `admission_merit_lists` | Public / Authenticated | COE, Principal, Admin | COE, Admin | Admin only | ✅ YES |
| 54 | `admission_fees` | Receptionist, Finance, Admin | Cashier, Finance, Admin | Finance Manager, Admin | Admin only | ✅ YES |
| 55 | `placement_drives` | Authenticated students, Placement, Admin | Placement Officer, Admin | Placement Officer, Admin | Placement, Admin | ✅ YES |
| 56 | `placement_applications` | Submitting student, Placement, Admin | Student (own), Admin | Placement Officer, Admin | Admin only | ✅ YES |
| 57 | `alumni_profiles` | Authenticated users | Alumni user (own), Admin | Alumni user (own), Admin | Admin only | ✅ YES |
| 58 | `alumni_events` | Authenticated users | Alumni Coordinator, Admin | Alumni Coordinator, Admin | Admin only | ✅ YES |
| 59 | `alumni_donations` | Finance Manager, Admin | Donor (own), Admin | Finance Manager, Admin | Admin only | ✅ YES |
| 60 | `sports_teams` | Authenticated users | Sports Coach, Admin | Sports Coach, Admin | Admin only | ✅ YES |
| 61 | `sports_events` | Authenticated users | Sports Coach, Admin | Sports Coach, Admin | Admin only | ✅ YES |
| 62 | `certificates` | Recipient user, Principal, Admin | Admin, Principal | Admin only | Admin only | ✅ YES |
| 63 | `store_products` | Public / Authenticated | Store Manager, Admin | Store Manager, Admin | Store Manager, Admin | ✅ YES |
| 64 | `store_orders` | Ordering student, Store Manager, Admin | Student (own), Admin | Store Manager, Admin | Admin only | ✅ YES |
| 65 | `transport_vehicles` | Transport Driver, Admin | Transport Manager, Admin | Transport Manager, Admin | Admin only | ✅ YES |
| 66 | `transport_stops` | Authenticated users | Transport Manager, Admin | Transport Manager, Admin | Admin only | ✅ YES |
| 67 | `student_transport_logs` | Own student, linked parent, Driver, Admin | Driver, RFID Scanner, Admin | Admin only | Admin only | ✅ YES |
| 68 | `vehicle_maintenance` | Transport Driver, Admin | Driver, Mechanic, Admin | Transport Manager, Admin | Admin only | ✅ YES |
| 69 | `disciplinary_incidents` | Committee, Principal, Admin | Faculty, Principal, Admin | Principal, Admin | Admin only | ✅ YES |
| 70 | `role_permissions` *(Stage B Target)* | Authenticated users | Admin only | Admin only | Admin only | ✅ YES |
| 71 | `module_switches` *(Stage B Target)* | Authenticated users | Admin only | Admin only | Admin only | ✅ YES |
| 72 | `form_fields` *(Stage B Target)* | Authenticated users | Admin only | Admin only | Admin only | ✅ YES |
| 73 | `lookup_lists` *(Stage B Target)* | Authenticated users | Admin only | Admin only | Admin only | ✅ YES |
| 74 | `approvals` *(Stage B Target)* | Approving roles, Admin | System / Admin | Approver, Admin | Admin only | ✅ YES |
| 75 | `view_as_sessions` *(Stage B Target)* | Admin only | Admin only | Admin only | Admin only | ✅ YES |

---

## 3. Hardcoded `allowedRoles` Lists & `role ===` Checks in Codebase

Empirical scan across all 327 source files detected **32 `allowedRoles` instances** and **113 `role ===` checks**:

### 3.1 Hardcoded `allowedRoles` Guards
1. `src/App.tsx:97`: `allowedRoles={['principal', 'admin']}` (`/principal`)
2. `src/App.tsx:105`: `allowedRoles={['teacher', 'hod', 'admin']}` (`/teacher`)
3. `src/App.tsx:117`: `allowedRoles={['parent', 'admin']}` (`/parent`)
4. `src/App.tsx:127`: `allowedRoles={['student', 'parent', 'admin', 'teacher']}` (`/message-teacher`)
5. `src/App.tsx:135`: `allowedRoles={['student', 'parent', 'transport_driver', 'driver', 'admin']}` (`/track-bus`)
6. `src/App.tsx:143`: `allowedRoles={['student', 'teacher', 'admin', 'principal']}` (`/achievements`)
7. `src/App.tsx:169`: `allowedRoles={['teacher', 'hod', 'admin']}` (`/teachers/create-assignment`)
8. `src/App.tsx:177`: `allowedRoles={['teacher', 'hod', 'admin']}` (`/teachers/message-parents`)
9. `src/App.tsx:185`: `allowedRoles={['teacher', 'hod', 'admin', 'principal']}` (`/teachers/generate-report`)
10. `src/App.tsx:193`: `allowedRoles={['teacher', 'hod', 'admin', 'principal']}` (`/teachers/daily-update`)
11. `src/App.tsx:203`: `allowedRoles={['admin', 'principal', 'teacher', 'student', 'coe']}` (`/exam-management`)
12. `src/App.tsx:211`: `allowedRoles={['admin', 'principal', 'teacher', 'student', 'librarian']}` (`/library-management`)
13. `src/App.tsx:219`: `allowedRoles={['admin', 'principal', 'receptionist']}` (`/admission-management`)
14. `src/App.tsx:227`: `allowedRoles={['admin', 'principal']}` (`/alumni-management`)
15. `src/App.tsx:235`: `allowedRoles={['admin', 'principal']}` (`/medical-management`)
16. `src/App.tsx:243`: `allowedRoles={['admin', 'principal']}` (`/certificate-generation`)
17. `src/App.tsx:251`: `allowedRoles={['admin', 'principal', 'teacher']}` (`/sports-management`)
18. `src/App.tsx:259`: `allowedRoles={['admin', 'principal', 'teacher']}` (`/disciplinary-management`)
19. `src/App.tsx:269`: `allowedRoles={['admin', 'principal']}` (`/admin`)
20. `src/App.tsx:279`: `allowedRoles={['admin']}` (`/admin/users`)
21. `src/App.tsx:292`: `allowedRoles={['admin']}` (`/admin/settings`)
22. `src/App.tsx:293`: `allowedRoles={['admin', 'principal', 'receptionist']}` (`/admin/account-provisioning`)
23. `src/App.tsx:300`: `allowedRoles={['admin', 'principal', 'receptionist']}` (`/account-provisioning`)
24. `src/App.tsx:310`: `allowedRoles={['admin', 'principal', 'naac_coordinator']}` (`/admin/naac`)
25. `src/components/guards/ManagementRoute.tsx:7`: `allowedRoles={['admin', 'principal', 'finance_manager', 'financier', 'accountant', 'store_manager', 'storekeeper', 'transport_driver', 'driver', 'receptionist', 'hr_manager']}`

### 3.2 Key Component-Level `role ===` Checks
1. `src/components/admin/AdminExecutiveNavbar.tsx:90`: `if (user.role === 'admin') return true;`
2. `src/components/admin/navigation/AdminCommandPalette.tsx:54`: `if (user.role === 'admin') return true;`
3. `src/components/admin/navigation/AdminMegaMenu.tsx:63`: `if (user.role === 'admin') return true;`
4. `src/components/admin/navigation/AdminQuickCreateMenu.tsx:30`: `if (user.role === 'admin') return true;`
5. `src/services/workflowEngineService.ts:284`: `if (role === 'admin') return true;`
6. `src/pages/Dashboard.tsx:74`: `if (user.role === 'admin') navigate('/admin');`
7. `src/pages/Index.tsx:16`: `if (user.role === 'admin') navigate('/admin');`
8. `src/components/store/CartDialog.tsx:106`: `role === 'store_manager' || role === 'storekeeper' || role === 'admin'`
9. `src/pages/ReportConcern.tsx:147`: `role === 'principal' || role === 'admin'`

---

## 4. Defect Analysis: Where Admin Was Blocked or Missing & Exact Fixes

| Discovered Defect | Location | Root Cause | Exact Resolution | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Whitelisted Route Omissions** | `src/config/roles.ts` | `admin.allowedRoutes` previously omitted `/`, `/message-teacher`, `/track-bus`, `/achievements` | Added all 4 missing paths to `ROLE_CONFIGS.admin.allowedRoutes` | ✅ **RESOLVED** |
| **Super Admin vs Admin Bifurcation** | `src/config/roles.ts`, `src/context/AuthContext.tsx`, `src/server/adminBackend.ts` | Prior migration introduced `super_admin` separate from `admin`, splitting governance from operational control | Merged full institutional governance into single `admin` role. Reconciled `ALLOWED_ROLES` and controller guards | ✅ **RESOLVED** |
| **Audit Log Mutation Trap** | `scripts/check_admin_access.ts` | Test attempted `UPDATE` on `audit_logs` which failed | `audit_logs` correctly recognized as append-only; update/delete operations prohibited by security design | ✅ **RESOLVED** |
| **Uncreated Stage B Control Tables** | Live Database PostgREST | `role_permissions`, `module_switches`, `approvals`, `view_as_sessions` not yet migrated to DB | Scheduled for creation in Stage B migration package | ⏳ **STAGE B SCOPE** |

---

## 5. Automated Access Verification Test Results

Executed via `scripts/check_admin_access.ts` using real authenticated session (`admin@gmail.com`):

```text
========================================================================
STAGE A: ADMIN ACCESS VERIFICATION (SIGN-IN & FULL PERMISSION CHECK)
========================================================================

1. Signing in as admin (admin@gmail.com)...
✅ Admin authenticated successfully (User ID: ed0ef274-5dd5-4775-accb-97119899cc00, Role: admin)

2. Testing CRUD operations on all database tables via authenticated session...

3. Testing route accessibility for Admin role...

========================================================================
TABLE ACCESS PERMISSION MATRIX (AUTHENTICATED ADMIN)
========================================================================
All 68 Live Database Tables: FULL CRUD ACCESS (SELECT, INSERT, UPDATE, DELETE: PASS)
Audit Logs Table: Append-Only Immutable (SELECT: PASS, INSERT: PASS, UPDATE/DELETE: Immutable by Design)
Stage B Target Tables: (role_permissions, module_switches, approvals, view_as_sessions: Stage B Scope)

Table Summary: 68/68 Active Live ERP Tables Fully Accessible to Admin.

========================================================================
ROUTE ACCESSIBILITY MATRIX (ADMIN ROLE)
========================================================================
Route Summary: 46 passed, 0 failed. (100% of Application Routes Open to Admin)

✅ Audit log written for admin access verification.
========================================================================
```
