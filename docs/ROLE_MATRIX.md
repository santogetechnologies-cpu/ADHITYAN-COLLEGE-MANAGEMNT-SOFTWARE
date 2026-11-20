# ADHITYAN COLLEGE MANAGEMENT ERP — ROLE-BASED ACCESS CONTROL (RBAC) MATRIX

> **Document Version:** 1.0.0  
> **Target System:** Adhityan Group of Institutions ERP (Vite + React + TypeScript + Supabase RLS)  
> **Governing Roles:** 13 Institutional Profiles  

---

## 1. Architectural Overview

The Adhityan College ERP supports **13 distinct user roles**, each mapped to specific clinical, vocational, administrative, and academic duties.
Authentication is anchored in Supabase Auth (`auth.users`) with profiles stored in the public `profiles` table containing the `role` column.

### Role Taxonomy & Hierarchy
1. **Executive & Governance**: `admin`, `principal`
2. **Academic & Clinical Faculty**: `teacher`
3. **Primary Consumers**: `student`, `parent`
4. **Financial Operations**: `finance_manager`, `financier`, `accountant`
5. **Supply & Procurement**: `store_manager`, `storekeeper`
6. **Campus Logistics & Transit**: `transport_driver`, `driver`
7. **Front-Desk & Campus Security**: `receptionist`

---

## 2. Role-by-Role Specification Matrix

---

### 1. `admin` (Super Administrator & System Governance)
- **Primary Dashboard Route**: `/admin`, `/dashboard/admin`
- **Accessible Routes**:
  - `/admin/*` (Overview, Users, Departments, Timetable, Teachers, Events, Reports, Analytics, Settings, Receptionist, Store, Finance, Transport)
  - `/admin/naac/*` (Full NAAC Accreditation Suite: Criteria 1–7, Repository, Reports, Settings)
  - All Module Pages: `/admission-management`, `/exam-management`, `/library-management`, `/disciplinary-management`, `/certificate-generation`, `/sports-management`, `/medical-management`, `/alumni-management`, `/store`
- **Key Capabilities & Actions**:
  - Provision and deactivate accounts across all 13 roles (`profiles` table).
  - Configure the 9 official college courses, departments, and semesters.
  - Generate and publish college-wide master timetables.
  - Manage NAAC documentation and SSR criteria evidence.
  - Issue system-wide notices and institutional announcements.
- **Data Access Boundaries**:
  - Full read/write access to all 48 database tables subject to institutional audit trails.

---

### 2. `principal` (Principal / Dean / Academic Head)
- **Primary Dashboard Route**: `/principal`, `/dashboard/principal`, `/admin/principal`
- **Accessible Routes**:
  - `/principal`, `/dashboard/principal`
  - `/admin/overview`, `/admin/departments`, `/admin/timetable`, `/admin/teachers`
  - `/admin/naac/*` (All Criteria, Executive Accreditation Reviews)
  - `/disciplinary-management` (Disciplinary hearings, committee sanctions)
  - `/certificate-generation` (Certificate approval and digital issuance)
  - `/exam-management` (Exam scheduling, results validation)
- **Key Capabilities & Actions**:
  - Review academic health and syllabus progress across all 9 vocational departments.
  - Approve disciplinary actions, suspension notices, and conduct reports.
  - Validate and sign graduation, provisional, and bonafide certificates.
  - Oversee faculty performance metrics and daily teaching updates.
- **Data Access Boundaries**:
  - Read access across all student, faculty, and academic tables.
  - Write/Sign-off access on `certificates`, `disciplinary_incidents`, and `naac_documents`.

---

### 3. `teacher` (Lecturer, Clinical Instructor, Lab Trainer)
- **Primary Dashboard Route**: `/teacher`, `/dashboard/teacher`
- **Accessible Routes**:
  - `/teacher`, `/dashboard/teacher`
  - `/teachers/create-assignment` (Assignment authoring & rubric design)
  - `/teachers/message-parents` (Guardian communication portal)
  - `/teachers/generate-report` (Student progress & attendance report generator)
  - `/teachers/daily-update` (Daily lesson syllabus coverage log)
  - `/exam-management` (Subject grading interface & internal marks entry)
  - `/report-concern` (Report clinical or classroom issues)
- **Key Capabilities & Actions**:
  - Record daily/period attendance and log attendance shortage warnings.
  - Create and evaluate clinical lab assignments and theoretical homework.
  - Enter semester internal marks and practical assessments.
  - Log daily curriculum updates against the 9 vocational programs.
- **Data Access Boundaries**:
  - Read access to students in assigned departments and sections.
  - Write access to `assignments`, `assignment_submissions`, `daily_teaching_updates`, and `teacher_messages`.

---

### 4. `student` (Vocational & Degree Undergraduates)
- **Primary Dashboard Route**: `/student`, `/dashboard/student`
- **Accessible Routes**:
  - `/student`, `/dashboard/student` (CampusPro Desktop & Mobile interface)
  - `/track-bus` (Live GPS campus bus telematics)
  - `/achievements` (Personal honors, certificates, badges)
  - `/store` (Uniforms, scrub suits, clinical kits, stationery)
  - `/message-teacher` (Academic doubt queries)
  - `/report-concern` (Anonymous or open student grievances)
  - `/exam-management` (View timetable, download hall tickets, view semester grades)
  - `/library-management` (Search OPAC, reserve books, access digital journals)
- **Key Capabilities & Actions**:
  - Check in to daily wellness tracker (morning/evening check-in).
  - Submit assignment files and view clinical instructor grades.
  - Download official hall tickets for scheduled examinations.
  - Make tuition fee payments and download PDF fee receipts.
  - Track assigned transit bus in real-time.
- **Data Access Boundaries**:
  - Strict RLS isolation: only personal records in `profiles`, `assignment_submissions`, `student_fees`, `health_records`, and `wellness_checkins`.

---

### 5. `parent` (Parent / Guardian)
- **Primary Dashboard Route**: `/parent`, `/dashboard/parent`
- **Accessible Routes**:
  - `/parent`, `/dashboard/parent`
  - `/track-bus` (Track child's transit)
  - `/report-concern` (Parental complaints and feedback)
  - `/store` (Purchase uniforms and academic supplies)
- **Key Capabilities & Actions**:
  - Monitor ward's daily attendance, clinical shortage warnings, and marks.
  - Settle outstanding college tuition, lab fees, and examination dues.
  - Receive automated SMS/Email alerts for absenteeism or fee dues.
  - Communicate directly with class mentors and department heads.
- **Data Access Boundaries**:
  - Read access restricted to linked child's records via parent-student relationship mapping in `profiles`.

---

### 6. `finance_manager` (Chief Finance Officer / Accounts Head)
- **Primary Dashboard Route**: `/dashboard/finance_manager`, `/admin/finance-manager`
- **Accessible Routes**:
  - `/admin/finance`, `/admin/finance-manager`, `/admin/accounts`
  - `/admin/overview`
- **Key Capabilities & Actions**:
  - Define fee structures for the 9 vocational degree and diploma programs.
  - Configure institutional scholarships, fee waivers, and early-bird discounts.
  - Authorize vendor disbursements and log miscellaneous campus expenditures.
  - Reconcile online payment gateway transactions with the college ledger.
- **Data Access Boundaries**:
  - Full read/write to `finance_transactions`, `student_fees`, and `admission_fees`.

---

### 7. `financier` (Finance Executive / Billing Specialist)
- **Primary Dashboard Route**: `/dashboard/financier`, `/admin/finance`
- **Accessible Routes**:
  - `/admin/finance`, `/dashboard/financier`
- **Key Capabilities & Actions**:
  - Process cash, UPI, and bank transfer tuition fee payments.
  - Generate and print official GST-compliant fee receipts.
  - Dispatch automated payment reminder notices to students with dues.
- **Data Access Boundaries**:
  - Read/Write to `student_fees` and `finance_transactions` (operational level).

---

### 8. `accountant` (Ledger & Audit Accountant)
- **Primary Dashboard Route**: `/dashboard/accountant`, `/admin/accounts`
- **Accessible Routes**:
  - `/admin/accounts`, `/dashboard/accountant`
- **Key Capabilities & Actions**:
  - Book daily petty cash entries, department lab consumable receipts, and audit ledgers.
  - Export monthly balance sheets, income/expenditure statements for NAAC Criterion 6.
- **Data Access Boundaries**:
  - Read/Write to `finance_transactions`, read-only to student academic profiles.

---

### 9. `store_manager` (Central Supply & Procurement Head)
- **Primary Dashboard Route**: `/dashboard/store_manager`, `/admin/store-manager`
- **Accessible Routes**:
  - `/admin/store`, `/admin/store-manager`, `/store`
- **Key Capabilities & Actions**:
  - Maintain catalog of clinical lab equipment, lab coats, books, and medical scrubs.
  - Set inventory restock thresholds and process vendor purchase orders.
  - Approve student orders and supervise warehouse dispatch.
- **Data Access Boundaries**:
  - Full read/write to `store_products`, `store_orders`, `inventory_items`, `inventory_transactions`.

---

### 10. `storekeeper` (Store Clerk & Inventory Dispatcher)
- **Primary Dashboard Route**: `/dashboard/storekeeper`, `/admin/storekeeper`
- **Accessible Routes**:
  - `/admin/storekeeper`, `/dashboard/storekeeper`, `/store`
- **Key Capabilities & Actions**:
  - Pack and hand over student orders across the counter.
  - Scan physical inventory on delivery and adjust stock levels.
  - Mark order dispatch and fulfillment status.
- **Data Access Boundaries**:
  - Update access to `store_orders` and `inventory_items`.

---

### 11. `transport_driver` (Chief Transit Coordinator / Senior Driver)
- **Primary Dashboard Route**: `/dashboard/transport_driver`, `/admin/transport-driver`
- **Accessible Routes**:
  - `/admin/transport`, `/admin/transport-driver`, `/track-bus`
- **Key Capabilities & Actions**:
  - Update live bus coordinates, fuel logs, and maintenance logs.
  - Log daily student boarding and deboarding check-ins.
  - Trigger emergency roadside delay or route diversion alerts.
- **Data Access Boundaries**:
  - Write access to `transport_vehicles`, `student_transport_logs`, `vehicle_maintenance`.

---

### 12. `driver` (Bus Operator & Route Assistant)
- **Primary Dashboard Route**: `/dashboard/driver`, `/admin/transport`
- **Accessible Routes**:
  - `/dashboard/driver`, `/track-bus`
- **Key Capabilities & Actions**:
  - Transmit mobile GPS telemetry during morning and evening transit runs.
  - Scan student RFID/QR bus passes at boarding stops.
- **Data Access Boundaries**:
  - Append-only to `student_transport_logs`, live broadcast to `transport_vehicles`.

---

### 13. `receptionist` (Front Desk & Campus Welcome Officer)
- **Primary Dashboard Route**: `/dashboard/receptionist`, `/admin/receptionist`
- **Accessible Routes**:
  - `/admin/receptionist`, `/dashboard/receptionist`
  - `/admission-management` (Initial visitor enquiry desk)
- **Key Capabilities & Actions**:
  - Register campus visitors and issue visitor gate passes.
  - Schedule appointments with Principal, Deans, and Department HODs.
  - Record admission telephone enquiries and route to admissions team.
- **Data Access Boundaries**:
  - Full read/write to `reception_visitors`, `reception_appointments`, `reception_enquiries`.

---

## 3. RBAC Route Permission Matrix

| Route Path | Allowed Roles | Access Level |
| :--- | :--- | :--- |
| `/` | All (Public / Unauthenticated) | Public Landing / Role Login |
| `/dashboard` | All 13 Roles | Dynamic RBAC Dashboard Dispatcher |
| `/dashboard/:role` | Matching role or `admin` / `principal` | Dynamic Role View |
| `/admin` | `admin`, `principal` | Read / Manage |
| `/admin/users` | `admin` | Full User CRUD |
| `/admin/departments` | `admin`, `principal` | Academic Structure CRUD |
| `/admin/timetable` | `admin`, `principal`, `teacher` | Timetable Config & View |
| `/admin/finance` | `admin`, `finance_manager`, `financier`, `accountant` | Financial Ledger & Fees |
| `/admin/store` | `admin`, `store_manager`, `storekeeper` | Inventory & Store Orders |
| `/admin/transport` | `admin`, `transport_driver`, `driver` | Transit Fleet Management |
| `/admin/receptionist` | `admin`, `receptionist` | Front Desk Operations |
| `/admin/naac/*` | `admin`, `principal`, Faculty Committee | Accreditation Management |
| `/student` | `student` | Student Portal (CampusPro) |
| `/teacher` | `teacher` | Faculty Classroom Portal |
| `/parent` | `parent` | Guardian Monitoring Portal |
| `/track-bus` | `student`, `parent`, `admin`, `transport_driver`, `driver` | Live Map Telematics |
| `/store` | `student`, `parent`, `store_manager`, `storekeeper`, `admin` | Campus Store Products & Checkout |
| `/exam-management` | `admin`, `principal`, `teacher`, `student` | Exam Scheduling & Hall Tickets |
| `/admission-management` | `admin`, `principal`, `receptionist` | Admission Application Pipeline |
| `/library-management` | `student`, `teacher`, `admin`, `librarian` | OPAC & Book Management |
| `/disciplinary-management`| `admin`, `principal`, `teacher` | Student Conduct Incidents |
| `/certificate-generation` | `admin`, `principal` | Degree/Bonafide Certificate Sign & Print |

---

## 4. Row Level Security (RLS) Policy Architecture

All 48 database tables have Row Level Security enabled in `supabase/migrations/002_row_level_security.sql`.
- **Admins & Principals**: Granted global select policies based on `auth.jwt() -> role` check or helper function `is_admin()`.
- **Students**: Filtered by `user_id = auth.uid()`.
- **Parents**: Filtered by `student_id IN (SELECT student_id FROM parent_student_map WHERE parent_id = auth.uid())`.
- **Teachers**: Filtered by `department_id IN (SELECT department_id FROM teacher_assignments WHERE teacher_id = auth.uid())`.
- **Role Isolation**: Store, Finance, Transport, and Reception staff are restricted to their operational domain tables.
