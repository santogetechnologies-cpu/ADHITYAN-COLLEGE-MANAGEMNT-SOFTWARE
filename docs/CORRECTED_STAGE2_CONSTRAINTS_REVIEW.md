# Corrected Stage 2: Constraints, Identity & Unique Keys Review

> **Document Version:** 1.1.0 (Phase 1.1 SQL Defect Remediation)  
> **Deployment Architecture:** Single-Institution Dedicated Deployment  
> **Script Name:** `028_stage2_constraints.sql`  
> **Target Database:** PostgreSQL 15+ (Supabase Managed Instance: `ogbbyqxulhegwvrtinib.supabase.co`)  
> **Execution Status:** Static Engineering Specification (Zero Execution)

---

## 1. Executive Summary

Stage 2 hardens business integrity constraints at the database engine level. Following the defect findings in `DEF-011` (practical lab batches) and `DEF-012` (login ID empty strings and migration 015 desync), Stage 2 establishes:
1. The authoritative 19-role institutional taxonomy (+1 backward-compatible alias).
2. The account status validation constraint.
3. Bulletproof validation and case-insensitive uniqueness on `login_id`.
4. The composite natural key on `class_attendance_sessions` that accommodates both whole-class theory lectures and clinical practical lab groups.

---

## 2. Institutional Role Hierarchy & Constraint

### 2.1 Role Whitelist Definition
The dedicated single-college deployment architecture permanently eliminates all platform-level multi-tenant roles (`platform_super_admin`). The authoritative institutional role set contains **19 primary roles** and **1 operational alias**:

```sql
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN (
    'admin',              -- Institutional Super Admin & IT Administrator
    'principal',          -- Head of Institution & Academic Executive
    'teacher',            -- Faculty, Course Instructor & Class Advisor
    'hod',                -- Head of Department
    'coe',                -- Controller of Examinations
    'student',            -- Enrolled Institutional Scholar
    'parent',             -- Verified Guardian of Enrolled Student
    'finance_manager',    -- Head of Accounts, Billing & Fee Structures
    'accountant',         -- Fee Collection & Operational Accounts
    'financier',          -- Financial Auditor & Executive Reviewer
    'store_manager',      -- Campus Store & Uniform Inventory Manager
    'storekeeper',        -- Point-of-Sale Clerk & Inventory Dispatch
    'transport_driver',   -- Institutional Vehicle Operator (Primary Role)
    'driver',             -- Backward-compatible operational alias of transport_driver
    'receptionist',       -- Front Desk Visitor & Enquiry Officer
    'naac_coordinator',   -- Accreditation & Institutional Quality Cell
    'hr_manager',         -- Staff Records, Payroll & Leave Administrator
    'librarian',          -- Library Assets & Book Circulation Officer
    'hostel_warden',      -- Student Housing & Out-Pass Administrator
    'placement_officer'   -- Career Services, Internships & Corporate Drives
));
```

### 2.2 Empirical Live Database Verification
A live query executed against `public.profiles` (`ogbbyqxulhegwvrtinib.supabase.co`) verified that all 16 existing user profiles belong strictly to the allowed set:
- `admin`: 5
- `student`: 3
- `parent`: 2
- `principal`: 1
- `teacher`: 1
- `finance_manager`: 1
- `store_manager`: 1
- `transport_driver`: 1
- `receptionist`: 1
- **Total Existing Rows:** 16  
- **Invalid Rows Found:** 0  
- **Verdict:** Safe for immediate constraint attachment without data transformation.

---

## 3. Account Status & Login ID Hardening (`DEF-012`)

### 3.1 Status Check Constraint
Enforces account lifecycle states required for fail-closed security:
```sql
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'inactive', 'suspended'));
```

### 3.2 Login ID Validation & Case-Insensitive Index
To prevent empty string (`""`) or single-whitespace collisions in the unique index:
1. **Length Check Constraint:** Prevents trivial or empty string entries while permitting `NULL` for newly invited accounts:
   ```sql
   ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_login_id_check;
   ALTER TABLE public.profiles ADD CONSTRAINT profiles_login_id_check 
       CHECK (login_id IS NULL OR LENGTH(TRIM(login_id)) >= 3);
   ```
2. **Partial Unique Index:** Enforces case-insensitive uniqueness strictly for populated login IDs:
   ```sql
   DROP INDEX IF EXISTS public.idx_profiles_login_id_unique;
   CREATE UNIQUE INDEX idx_profiles_login_id_unique 
       ON public.profiles(LOWER(TRIM(login_id))) 
       WHERE login_id IS NOT NULL AND TRIM(login_id) <> '';
   ```

---

## 4. Attendance Session Natural Key & Practical Batch Support (`DEF-011`)

### 4.1 The Paramedical Clinical Practical Problem
In allied health science programs (B.Voc Medical Lab Technology, Radiology, Dialysis Technology):
- Hospital laboratory workstations are limited (e.g., 25 workstations for a 50-student class).
- During Period 3 (11:00 AM – 1:00 PM), the class is partitioned into:
  - **Batch A:** Clinical Biochemistry Lab (Room L1, Teacher X).
  - **Batch B:** Clinical Pathology & Hematology Lab (Room L2, Teacher Y).
- If the unique constraint was `(class_name, session_date, period_number, subject_code)`:
  - If both batches are scheduled under the same practical course code (`MLT102P`), Teacher Y's submission is rejected with a unique violation error!
  - If the constraint was `(class_name, session_date, period_number)`, even different subjects are blocked!

### 4.2 The Proven 5-Tuple Natural Key
By incorporating the `batch` column added in Stage 1, the irreducible composite natural key is defined as:
$$\text{Attendance Identity} = (\text{class\_name}, \text{session\_date}, \text{period\_number}, \text{subject\_code}, \text{batch})$$

```sql
ALTER TABLE public.class_attendance_sessions DROP CONSTRAINT IF EXISTS uq_class_attendance_session;
ALTER TABLE public.class_attendance_sessions 
    ADD CONSTRAINT uq_class_attendance_session 
    UNIQUE (class_name, session_date, period_number, subject_code, batch);
```

#### Mathematical Proof of Correctness:
1. **Theory Lectures:** `batch = 'All'`. For a given class, date, period, and subject, exactly one lecture session can exist. A duplicate roll call by another teacher is blocked.
2. **Clinical Practical Lab Batches:** `batch = 'Batch A'` and `batch = 'Batch B'`. Both batches can be recorded concurrently during the same period without key collision.
3. **Double Submission Prevention:** If Teacher X attempts to submit roll call for `Batch A` a second time, the key `('B.VOC MLT', '2026-11-20', 3, 'MLT102P', 'Batch A')` collides and halts the duplicate insertion.

---

## 5. Migration 015 History Tracking Resolution

In Phase 1 Pre-Implementation checks, inspection of `supabase_migrations.schema_migrations` revealed that migration version `015` was absent from the migration ledger, yet its constraint was active in the PostgreSQL engine.
- **Root Cause:** A prior manual deployment executed the DDL statement without updating the tracking table.
- **Stage 2 Immunity:** Stage 2 executes `DROP CONSTRAINT IF EXISTS profiles_role_check;` before applying the new 20-role constraint. This guarantees complete idempotency regardless of whether migration 015 was logged or unlogged.
- **Tracking Sync:** After Stage 5 deployment, an administrative entry will be recorded in `supabase_migrations.schema_migrations` to restore perfect 1:1 synchronization between disk files and the catalog ledger.

---

## 6. Complete Corrected Stage 2 SQL Script

```sql
-- =============================================================================
-- Migration: 028_stage2_constraints.sql
-- Description: Institutional Role Whitelist, Login ID Hardening & Attendance Uniqueness
-- Architecture: Single-Institution Dedicated Deployment
-- Safety Safeguards: Strict lock_timeout and statement_timeout
-- =============================================================================

SET lock_timeout = '3s';
SET statement_timeout = '10s';

BEGIN;

-- 1. Profiles Role Check Constraint (19 Institutional Roles + 1 Alias)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN (
    'admin', 'principal', 'teacher', 'hod', 'coe',
    'student', 'parent', 'finance_manager', 'accountant', 'financier',
    'store_manager', 'storekeeper', 'transport_driver', 'driver',
    'receptionist', 'naac_coordinator', 'hr_manager', 'librarian',
    'hostel_warden', 'placement_officer'
));

-- 2. Profiles Status Check Constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'inactive', 'suspended'));

-- 3. Profiles Login ID Minimum Length Check (DEF-012)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_login_id_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_login_id_check 
    CHECK (login_id IS NULL OR LENGTH(TRIM(login_id)) >= 3);

-- 4. Case-Insensitive Unique Partial Index on Login ID (DEF-012)
DROP INDEX IF EXISTS public.idx_profiles_login_id_unique;
CREATE UNIQUE INDEX idx_profiles_login_id_unique 
    ON public.profiles(LOWER(TRIM(login_id))) 
    WHERE login_id IS NOT NULL AND TRIM(login_id) <> '';

-- 5. Attendance Session Composite Unique Constraint with Batch Support (DEF-011)
ALTER TABLE public.class_attendance_sessions DROP CONSTRAINT IF EXISTS uq_class_attendance_session;
ALTER TABLE public.class_attendance_sessions 
    ADD CONSTRAINT uq_class_attendance_session 
    UNIQUE (class_name, session_date, period_number, subject_code, batch);

COMMIT;
```
