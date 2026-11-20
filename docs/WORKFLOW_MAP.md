# Complete College Management Software — Workflow Map

> **Document Version:** 2.0.0 (Phase 0 Audit)  
> **Deployment Architecture:** Single-Institution Dedicated Deployment  
> **Purpose:** Detailed step-by-step lifecycle mapping for every institutional process from initiation to completion, specifying acting roles, storage tables, cross-role transitions, and validation gates.

---

## 1. Admission & Student Record Enrollment Workflow

```mermaid
flowchart TD
    A["Prospective Candidate Submits Application"] --> B["Receptionist / Front Desk Logs Candidate"]
    B --> C["Document Verification & Eligibility Check"]
    C --> D["Entrance Test & Scoring (Optional)"]
    D --> E["Merit List Generation & Quota Ranking"]
    E --> F["Principal / Admission Officer Review"]
    F -->|Approved| G["Official Student Record Created (Status: Enrolled)"]
    F -->|Rejected| H["Notification of Rejection / Waitlist"]
    G --> I["Student ID & Roll Number Assigned"]
    G --> J["Candidate Appears in Official Student Headcount"]
```

### Steps & State Transitions
1. **Application Intake**: Candidate or Front Desk Receptionist creates entry in `admission_applications` (`status: 'submitted'`). Initial application token/fee recorded in `admission_fees`.
2. **Document Verification**: Admission Officer verifies certificates (10th/12th marksheet, transfer certificate, category certificate) in `admission_document_verifications` (`status: 'verified'`).
3. **Merit List**: Scores ranked in `admission_merit_lists`.
4. **Approval**: Principal or Admin approves application (`status: 'approved'`).
5. **Official Enrollment**: Record committed to `profiles` with official `roll_number` and `class_name`. Student is now part of official institutional statistics.
6. **Independence Invariant**: This step **does not** create a student login account. Login provisioning is an independent administrative process.

---

## 2. Account Provisioning & Student/Parent Linking Workflow

```mermaid
flowchart TD
    A["Admin / Receptionist Uploads CSV or Enters Details"] --> B["Validate File Structure & Email Formats"]
    B --> C["Match Student ID against Official 'profiles' Records"]
    C -->|Student ID Missing| D["Flag Row as Error & Add to Error Ledger"]
    C -->|Student ID Valid| E["Check for Existing Supabase Auth Account"]
    E -->|Account Exists| F["Reuse Existing User ID / Skip Creation"]
    E -->|Account New| G["Create Supabase Auth User with Provided Initial Password"]
    G --> H["Update 'profiles' Record with Auth UID"]
    F --> I["Process Parent Link (if parent data present)"]
    H --> I
    I --> J["Insert Link in 'parent_student_links' Table"]
    J --> K["Download Summary Report & Error CSV"]
```

### Steps & State Transitions
1. **File Upload**: Admin uploads Excel/CSV in `AccountProvisioningWorkspace`.
2. **Pre-Validation**: Validates headers (`Student Name`, `Student ID`, `Student Email`, `Initial Password`).
3. **Database Match**: Verifies `Student ID` exists in `profiles`. If not found, row is rejected to prevent orphan accounts.
4. **Account Creation**: Calls backend provisioning service (`adminBackend.ts`) to create Supabase Auth credentials.
5. **Parent Linking**: For parent bulk imports, checks if parent email already exists. If yes, reuses the existing parent account; if no, creates the parent user. Inserts row into `parent_student_links`.
6. **Independence Invariant**: Creating or linking accounts **never** alters the official student admission status or headcount.

---

## 3. Academic Scheduling & Master Timetable Workflow

```mermaid
flowchart LR
    A["Department & Course Creation"] --> B["Faculty Allocation (TeacherAssignments)"]
    B --> C["Section & Classroom Setup"]
    C --> D["Weekly Timetable Period Grid Builder"]
    D --> E["Conflict Detection Engine"]
    E -->|Collision Detected| D
    E -->|Collision Free| F["Publish Timetable to 'timetables'"]
    F --> G["Instant Student & Teacher Schedule Visibility"]
```

### Steps & State Transitions
1. **Curriculum Definition**: Admin sets up departments in `departments` and courses in `courses`.
2. **Faculty Assignment**: Admin/Principal allocates faculty to subjects in `TeacherAssignments`.
3. **Timetable Matrix**: Admin builds weekly schedule in `TimetableManagement`.
4. **Validation Check**: Timetable engine checks for room double-booking and faculty time collisions.
5. **Publish**: Schedule committed to `timetables`. Automatically appears in `TeacherDashboard` and `StudentClassTimetableTab`.

---

## 4. Daily Attendance & Shortage Warning Workflow

```mermaid
flowchart TD
    A["Teacher Opens Class in Faculty Hub"] --> B["Initiate Attendance Session for Period"]
    B --> C["System Creates Record in 'class_attendance_sessions'"]
    C --> D["Teacher Marks Roster: Present, Absent, Late, Leave"]
    D --> E["System Writes Records to 'student_attendance'"]
    E --> F["Realtime Recalculation Engine"]
    F --> G["Update Student Dashboard Attendance %"]
    F --> H["Check if Student Attendance < 75% Threshold"]
    H -->|Yes| I["Issue Record to 'attendance_shortage_warnings'"]
    H -->|No| J["Normal Standing"]
    I --> K["Notify Student & Linked Guardian"]
```

### Steps & State Transitions
1. **Conducted Session Creation**: Teacher selects class/period in `PeriodAttendanceDesk`. Inserts row in `class_attendance_sessions` incrementing `total_conducted`.
2. **Student Roster Marking**: Teacher marks each student (`present`, `absent`, `late`, `leave`) writing to `student_attendance`.
3. **Recalculation**: Formula $\left(\frac{\text{Present} + 0.5 \times \text{Late}}{\text{Total Conducted}}\right) \times 100$ runs in `getStudentAttendanceSummary`.
4. **Shortage Warning**: If subject attendance drops below 75%, dynamic warning is triggered in `attendance_shortage_warnings` and alert sent to guardian.

---

## 5. Coursework & Assignment Submission Workflow

```mermaid
flowchart LR
    A["Teacher Publishes Assignment"] --> B["Stored in 'assignments'"]
    B --> C["Student Sees Coursework in Portal"]
    C --> D["Student Uploads Submission Text/Files"]
    D --> E["Stored in 'assignment_submissions'"]
    E --> F["Teacher Grades & Adds Feedback"]
    F --> G["Marks & Feedback Displayed on Student Card"]
```

### Steps & State Transitions
1. **Assignment Posting**: Teacher enters title, description, max marks, and due date in `CreateAssignment.tsx`. Inserts into `assignments`.
2. **Student View**: Student sees pending tasks in `AssignmentsHomework.tsx`.
3. **Submission**: Student submits work writing to `assignment_submissions` (`status: 'submitted'`).
4. **Evaluation**: Teacher awards marks and feedback in grading desk (`status: 'graded'`).

---

## 6. Examination, Hall Tickets & Result Publishing Workflow

```mermaid
flowchart TD
    A["Admin / COE Creates Master Exam Series"] --> B["Stored in 'exams'"]
    B --> C["Publish Timetable to 'exam_schedules'"]
    C --> D["Verify Student Attendance Eligibility (>= 75%)"]
    D --> E["Generate Hall Tickets in 'hall_tickets'"]
    E --> F["Student / Parent Downloads Verified Hall Ticket"]
    F --> G["Examination Conducted"]
    G --> H["Faculty Enters Marks in 'exam_results'"]
    H --> I["Examination Council Moderates & Publishes"]
    I --> J["Results Live on Student Portal & Progress Cards"]
```

### Steps & State Transitions
1. **Exam Series Creation**: COE/Admin defines semester exams in `exams`.
2. **Schedule Timetable**: Schedules individual subject dates, shifts, and rooms in `exam_schedules`.
3. **Hall Ticket Issuance**: Batch generates numbered hall tickets in `hall_tickets`.
4. **Grading**: Faculty enters theory/practical marks in `GradingInterface.tsx`.
5. **Publishing**: Council clicks publish in `ResultPublishing.tsx`, making grades visible in `StudentExams.tsx` and updating `PerformanceAnalytics`.

---

## 7. Fee Billing, Collection & Receipt Workflow

```mermaid
flowchart TD
    A["Finance Manager Creates Fee Structure"] --> B["Allocate to Student in 'student_fees'"]
    B --> C["Fee Due Displayed in Student/Parent Portal"]
    C --> D["Payment Received: Cash, Cheque, UPI, Net Banking"]
    D --> E["Issue Receipt with Unique Reference in 'fee_receipts'"]
    E --> F["Deduct Paid Amount from 'student_fees' Pending Balance"]
    F --> G["Record Transaction in 'finance_transactions' Ledger"]
    G --> H["Student Downloads Verified Receipt via Dual Lookup"]
```

### Steps & State Transitions
1. **Structure Builder**: Fee packages defined in `fee_structures`.
2. **Allocation**: Student assigned fee record in `student_fees`.
3. **Collection**: Receptionist or Cashier records payment with payment mode and unique transaction reference.
4. **Receipt Generation**: Generated in `fee_receipts` with transaction reference, student ID, and roll number.
5. **Dual Lookup**: Student retrieves receipts via `.or(\`student_id.eq.${id},roll_number.eq.${roll}\`)`.

---

## 8. Campus Store & Inventory Fulfillment Workflow

```mermaid
flowchart LR
    A["Store Manager Stocks Products"] --> B["Student Places Order (Status: Pending)"]
    B --> C["Store Manager Reviews in Dispatch Desk"]
    C --> D["Fulfill Order (Status: Completed)"]
    D --> E["Atomic Stock Decrement in 'store_products'"]
    E --> F["Log Transaction in 'inventory_transactions'"]
```

### Steps & State Transitions
1. **Cataloging**: Products, stock, and prices managed in `store_products`.
2. **Student Order**: Student adds items to cart and submits in `StudentStoreTab.tsx`. Stored in `store_orders` with valid enum `'Pending'`.
3. **Processing**: Store Manager moves order to `'Processing'`, prepares items, then marks `'Completed'`.
4. **Stock Update**: Stock decrements atomically; transaction logged in `inventory_transactions`.

---

## 9. Campus Bus Telematics & Transit Workflow

```mermaid
flowchart LR
    A["Register Vehicles & Stops"] --> B["Assign Student to Route"]
    B --> C["Driver Starts Transit & Logs Progress"]
    C --> D["Boarding Passengers Checked-in"]
    D --> E["Student / Parent Tracks Live Bus on Map"]
```

### Steps & State Transitions
1. **Fleet Management**: Transport Manager adds vehicles in `transport_vehicles` and stops in `transport_stops`.
2. **Route Start**: Driver starts morning transit in `TransportDriverDashboard.tsx`, inserting into `student_transport_logs`.
3. **Tracking**: Students and parents view stop timings, driver phone, and transit status in `TrackSchoolBus.tsx`.

---

## 10. Grievance & Disciplinary Action Workflow

```mermaid
flowchart TD
    A["Student / Parent Lodges Concern in 'concerns'"] --> B["Admin / Principal Reviews in Approvals Desk"]
    B --> C["Committee Investigates & Formulates Response"]
    C --> D["Admin Submits Official Resolution Notes"]
    D --> E["Concern Status Updated to 'Resolved'"]
    E --> F["Student Portal Displays Resolution Remarks"]
```

### Steps & State Transitions
1. **Submission**: User submits grievance in `ReportConcern.tsx` or `StudentComplaintsTab.tsx`.
2. **Review**: Administrator reviews complaint in `ApprovalsModule.tsx`.
3. **Resolution**: Official remarks saved to `resolution_notes` and status updated to `'Resolved'`.
4. **Realtime Display**: Resolution notes immediately render in the student's grievance card.
