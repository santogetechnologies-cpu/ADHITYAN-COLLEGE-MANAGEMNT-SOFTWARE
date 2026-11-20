# Complete College Management Software — Business Logic & Validation Audit

> **Document Version:** 2.2.0 (Phase 0 Complete Source Verification)  
> **Deployment Architecture:** Single-Institution Dedicated Deployment  
> **Verification Status:** Every formula, calculation, and constraint verified against React components and PostgreSQL schemas. Rules requiring administrative policy decisions are explicitly marked as **`[Requires Institutional Confirmation]`**.

---

## 1. Attendance Calculation, Denominator & Condonation Rules

### Attendance Percentage Mathematical Formula
Attendance measures classroom presence across the entire semester:

$$\text{Attendance Percentage} = \left(\frac{\text{Effective Present Sessions}}{\text{Total Conducted Sessions}}\right) \times 100$$

Where:
- $\text{Effective Present Sessions} = \text{Count of 'Present'} + (0.5 \times \text{Count of 'Late'})$
- $\text{Total Conducted Sessions} = \max(\text{Count of records in } \texttt{class\_attendance\_sessions}, \text{Count of records for student in } \texttt{student\_attendance})$
- **Absent** and **Leave** sessions contribute $0.0$ to the numerator.
- Source Code Reference: `src/services/supabase/database.ts#L446-L533`.

### Critical Issue: Duplicate Session Prevention
- **Current Vulnerability**: `class_attendance_sessions` (`supabase/migrations/011_institutional_complete_erp.sql#L208-L223`) lacks a UNIQUE constraint on `(class_name, session_date, period_number, subject_code)`.
- **Impact**: If a faculty member submits attendance twice for the same class and period, two distinct session records are inserted, inadvertently doubling `totalConducted` and halving student attendance percentages.
- **Required Fix**: Add a database constraint:
  ```sql
  ALTER TABLE public.class_attendance_sessions 
  ADD CONSTRAINT uq_class_session UNIQUE (class_name, session_date, period_number, subject_code);
  ```

### Attendance Eligibility & Condonation Policy `[Requires Institutional Confirmation]`
| Percentage Range | Status | Institutional Rule |
| :---: | :--- | :--- |
| $\ge 75.0\%$ | **Exam Eligible** | Unconditional eligibility. Hall ticket generation enabled. |
| $65.0\% \text{ to } 74.9\%$ | **Condonation Eligible** | **`[Requires Institutional Confirmation]`**: Condonation is not automatic. It requires formal student application, genuine medical/extenuating documentation, fee payment (condonation fine), and executive sign-off from the Principal. |
| $< 65.0\%$ | **Debarred / Critical Shortage** | Ineligible to appear for semester examinations; must repeat course attendance or appear in subsequent arrears. |

---

## 2. Academic Performance Evaluation & Grading Standards

### Distinction: Degree CGPA vs Holistic Student Engagement Index
It is critical to distinguish between official university degree grades and the internal dashboard engagement index:

1. **Official University Semester GPA (SGPA) & Degree CGPA**:
   $$\text{SGPA} = \frac{\sum_{i=1}^{n} (\text{Grade Points}_i \times \text{Course Credits}_i)}{\sum_{i=1}^{n} \text{Course Credits}_i}$$
   $$\text{CGPA} = \frac{\sum_{j=1}^{m} (\text{SGPA}_j \times \text{Total Semester Credits}_j)}{\sum_{j=1}^{m} \text{Total Semester Credits}_j}$$
   - Computed exclusively from credit-bearing courses, examination marks, and moderation committee approvals.

2. **CampusPro Holistic Student Engagement Index** (`PerformanceAnalytics.tsx#L125-L155`):
   $$\text{Engagement Index} = (0.50 \times \text{Exam Mark Average}) + (0.30 \times \text{Attendance Percentage}) + (0.20 \times \text{Assignment Completion Score})$$
   - Internal multi-dimensional diagnostic metric for student counseling, early academic intervention, and mentor tracking.

### Resolution of Grade Range Boundary Overlaps
To prevent undefined behavior for fractional marks (e.g. 79.5%), grading boundaries are standardized using half-open mathematical intervals $[a, b)$:

| Interval Notation | Mark Range | Letter Grade | Grade Points | Standing Descriptor |
| :---: | :---: | :---: | :---: | :--- |
| $[90.0, 100.0]$ | $90.0\% - 100.0\%$ | **O** / **A+** | 10 | Outstanding / Distinction |
| $[80.0, 90.0)$ | $80.0\% - 89.99\%$ | **A** | 9 | Excellent / First Class |
| $[70.0, 80.0)$ | $70.0\% - 79.99\%$ | **B+** | 8 | Very Good |
| $[60.0, 70.0)$ | $60.0\% - 69.99\%$ | **B** | 7 | Good |
| $[50.0, 60.0)$ | $50.0\% - 59.99\%$ | **C** | 6 | Above Average |
| $[40.0, 50.0)$ | $40.0\% - 49.99\%$ | **P** | 5 | Pass |
| $[0.0, 40.0)$ | $< 40.0\%$ | **F** | 0 | Fail / Backlog |

---

## 3. Financial Ledger, Fee Balance & Idempotency

### Fee Computation Formulas
$$\text{Net Payable Fee} = \text{Tuition} + \text{Laboratory} + \text{Library} + \text{Transport} + \text{Hostel} - \text{Approved Scholarship}$$

$$\text{Pending Outstanding Due} = \text{Net Payable Fee} - \sum \text{Verified Receipts in } \texttt{fee\_receipts}$$

### Payment Gateway Status & Idempotency
- **Verified Status**: The current implementation operates as an **institutional cashier recording ledger**.
- **Idempotency**: Every fee receipt requires a unique `transaction_reference`. Receipt lookups use dual-matching `.or(\`student_id.eq.${id},roll_number.eq.${roll}\`)` in `src/services/supabase/database.ts#L415`.
- **Gateway Note `[Requires Institutional Confirmation]`**: Real-time payment gateway integration (Razorpay, PayU, or Stripe with HMAC SHA256 webhook signatures) is not currently connected to live bank APIs. If direct online debit/credit card processing is required, an external payment gateway Edge Function must be configured.

---

## 4. Human Resources & Staff Payroll Rules

### Statutory Calculations in `StaffPayrollEngine.tsx#L95-L110`
$$\text{Gross Salary} = \text{Basic Pay} + \text{DA} + \text{HRA} + \text{Special Allowance}$$

$$\text{Deductions} = \text{EPF} + \text{ESI} + \text{Professional Tax (PT)} + \text{TDS}$$

$$\text{Net Salary} = \text{Gross Salary} - \text{Deductions}$$

Where the source code executes:
- **DA**: `basic_pay * (da_pct / 100)` (from `staff_service_records.da_pct`)
- **HRA**: `basic_pay * (hra_pct / 100)` (from `staff_service_records.hra_pct`)
- **EPF**: `epf_opt_out ? 0 : Math.round(basic_pay * 0.12)` (Statutory 12% of basic)
- **ESI**: `gross <= 21000 ? Math.round(gross * 0.0075) : 0` (0.75% for gross $\le ₹21,000$)
- **PT**: Flat $₹200.00$ per month.
- **TDS**: `gross > 50000 ? Math.round((gross - 50000) * 0.1) : 0` (Hardcoded simplified tax slab)

### Policy Gap: Configurable Tax Slabs
- The TDS tax calculation is currently hardcoded in JavaScript. Real-world institutional payroll requires configurable tax deduction slabs and rebate rules based on the New vs. Old Tax Regime.

### Leave Balance Decrement Gap
- **Critical Finding**: In `src/components/hr/StaffLeaveManager.tsx#L71-L130`, when a leave application is created or marked `'Approved'`, the record is committed to `staff_leave_applications`, but the employee's `staff_leave_balances` row is **never decremented**.
- **Required Fix**: Add a PostgreSQL trigger on `staff_leave_applications` updating `staff_leave_balances`:
  ```sql
  UPDATE public.staff_leave_balances
  SET casual_leave_remaining = casual_leave_remaining - NEW.total_days
  WHERE user_id = NEW.user_id;
  ```

---

## 5. Library Borrowing Limits & Overdue Fines

### Policy Rules vs. Code Discrepancy
- **Standard Policy**:
  - Student: Max 3 volumes, 14 days loan duration, overdue fine ₹5/day/volume.
  - Faculty: Max 10 volumes, 30 days loan duration.
- **Code Discrepancy**: In `src/components/library/BookIssueDialog.tsx#L106-L107`, student limits are hardcoded:
  ```typescript
  currentBooks: 0,
  maxBooks: 5,
  ```
  The component fails to query `SELECT COUNT(*) FROM book_issues WHERE user_id = student.id AND status = 'Issued'`.
- **Required Fix**: Dynamically resolve `currentBooks` from database records and validate against institutional borrowing quotas.

---

## 6. Campus Store Inventory & Atomic Deduction

### Atomic RPC vs. Non-Atomic Fallback Loop
- **Verified Finding**:
  - `src/services/supabase/database.ts#L4050`: Invokes database procedure `place_store_order`, which executes an atomic transaction with `FOR UPDATE` row locking.
  - `src/services/supabase/database.ts#L4064-L4092`: If the RPC is not resolved, a client-side JavaScript loop queries stock, then separately updates rows.
  - Under concurrent checkout load, this client fallback introduces race conditions.
- **Required Fix**: Require order placement to execute exclusively through the atomic PostgreSQL RPC function.

---

## 7. Decoupled Admission vs. Account Provisioning

### Structural Independence Invariants
1. **Official Student Headcount**:
   - Counted strictly from `profiles` records with `status = 'enrolled'` or `admission_applications` with `status = 'approved'`.
   - Creating a login account does not affect student enrollment numbers.
2. **Account Provisioning Validation**:
   - Bulk upload of student credentials (`StudentBulkImportTab.tsx`) validates that the `Student ID` exists in `profiles` prior to invoking Supabase Auth.
   - For parent imports (`ParentBulkImportTab.tsx`), the service searches for an existing parent account by email. If found, it reuses the account and creates a new link in `parent_student_links`, completely preventing duplicate parent accounts.
