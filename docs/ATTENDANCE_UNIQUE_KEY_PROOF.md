# Attendance Session Identity & Unique Key Mathematical Proof

> **Document Version:** 1.0.0 (Phase 0.4 Attendance Domain Verification)  
> **Deployment Architecture:** Single-Institution Dedicated Deployment  
> **Target Table:** `public.class_attendance_sessions`  
> **Verification Date:** 2026-11-19  
> **Methodology:** Workflow Code Inspection, Schema Analysis, Empirical Database Verification

---

## 1. Executive Summary & Problem Formulation

In the ADHITYAN College Management Software, student attendance is captured period-by-period (Periods 1 to 7) by faculty members using the **Period Attendance Desk** (`src/components/teachers/PeriodAttendanceDesk.tsx`).

In migration [011_institutional_complete_erp.sql#L208-L223](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/supabase/migrations/011_institutional_complete_erp.sql#L208-L223), `class_attendance_sessions` was created without a database-level natural unique constraint. Instead, deduplication was attempted via application-level JavaScript:
```typescript
const { data: existing } = await checkClient
  .from('class_attendance_sessions')
  .select('id, teacher_name')
  .eq('class_name', sessionData.class_name)
  .eq('session_date', sessionData.session_date)
  .eq('period_number', sessionData.period_number)
  .maybeSingle();

if (existing) {
  return { success: false, error: "Attendance already recorded..." };
}
```

### The Critical Concurrency Hazard
Under network latency or double-click submissions, two concurrent HTTP POST requests simultaneously execute the `SELECT` query. Both find `existing = null`, and both proceed to execute `INSERT INTO class_attendance_sessions`. 

This inserts **duplicate conduct sessions** into the database, which:
1. Doubles the total conducted sessions for that day in student attendance calculations.
2. Artificially depresses student attendance percentages (e.g. from $85\%$ to $42.5\%$).
3. Generates false-positive attendance shortage alerts (`attendance_shortage_warnings`).

---

## 2. Institutional Academic Workflow Analysis

To design the exact database constraint, we must map the institutional attendance workflow against three parameters:

### 2.1 What Defines a Class Cohort (`class_name`)?
In the Adhithyan academic structure (Allied Health & Paramedical Sciences):
- A class is identified by its degree program, academic year, and section designation:
  $$\text{Cohort} = \text{Program} + \text{Year} + \text{Section}$$
  *Examples from live database:*
  - `'B.VOC Medical Lab Technology (MLT) - Year 1 (Section A)'`
  - `'B.VOC Radiology & Medical Imaging Technology - Year 2'`
  - `'B.Sc Dialysis Technology - Year 1'`
- The `sections` table links to `departments`, and `class_name` on profiles and sessions stores this unified designation. There is no separate `section` column on `class_attendance_sessions`.

### 2.2 The Split-Batch Elective & Practical Conundrum
Can two attendance sessions ever occur during the **same period** on the **same date** for the **same class**?
- **Standard Theory Lecture:** A class cohort occupies one lecture hall with one faculty member for one subject. No two sessions can occur simultaneously.
- **Paramedical Clinical Rotations & Lab Practicals:** In medical lab technology, a single class section of 60 students is frequently split into **two concurrent practical batches**:
  - **Batch 1 (Students 1–30):** Conducts *Hematology & Blood Banking* (`MLT101`) in Clinical Lab 1.
  - **Batch 2 (Students 31–60):** Conducts *Clinical Biochemistry* (`MLT102`) in Biochemistry Lab 2.
- **Deduplication Key Evaluation:**
  - If the constraint were strictly `UNIQUE (class_name, session_date, period_number)`, the second lab batch would be **blocked from recording roll call**, breaking clinical rotations!
  - By incorporating `subject_code`, both concurrent practical batches can record their respective subject roll calls safely, while preventing any duplicate submission for the *same* subject.

---

## 3. Schema & Column Nullability Proof

To guarantee that a PostgreSQL composite unique constraint will enforce uniqueness reliably, all member columns must be strictly non-nullable. (In PostgreSQL, `NULL` values in unique constraints do not conflict with each other under standard SQL null semantics).

An audit of `class_attendance_sessions` in `011_institutional_complete_erp.sql` proves:

```sql
CREATE TABLE IF NOT EXISTS public.class_attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    teacher_name TEXT NOT NULL,
    class_name TEXT NOT NULL,           -- [NON-NULLABLE]
    department TEXT NOT NULL,
    subject_code TEXT NOT NULL,         -- [NON-NULLABLE]
    subject_title TEXT NOT NULL,
    session_date DATE DEFAULT CURRENT_DATE NOT NULL, -- [NON-NULLABLE]
    period_number INTEGER NOT NULL DEFAULT 1,        -- [NON-NULLABLE]
    ...
);
```

| Candidate Key Column | Data Type | Nullable? | Default Expression | Nullability Risk |
| :--- | :---: | :---: | :--- | :---: |
| `class_name` | `TEXT` | **NO (`NOT NULL`)** | None | **Zero Risk** |
| `session_date` | `DATE` | **NO (`NOT NULL`)** | `CURRENT_DATE` | **Zero Risk** |
| `period_number` | `INTEGER` | **NO (`NOT NULL`)** | `1` | **Zero Risk** |
| `subject_code` | `TEXT` | **NO (`NOT NULL`)** | Populated by app (`SUB101`) | **Zero Risk** |

**Proof:** Because all four columns are declared `NOT NULL`, the composite key guarantees deterministic, non-null uniqueness for every inserted row.

---

## 4. Empirical Live Database Row Audit

Applying a unique constraint to an existing table in PostgreSQL fails immediately with error `23505 (unique_violation)` if duplicate records exist.

A live SQL interrogation was executed against `public.class_attendance_sessions`:

```sql
SELECT class_name, session_date, period_number, subject_code, COUNT(*)
FROM public.class_attendance_sessions
GROUP BY class_name, session_date, period_number, subject_code
HAVING COUNT(*) > 1;
```

### Empirical Findings:
- Total rows in `class_attendance_sessions`: **2**
- Duplicate natural key groups: **0**
- Row 1: `('B.VOC Medical Lab Technology (MLT) - Year 1', '2026-11-19', 1, 'MLT101')`
- Row 2: `('B.VOC Medical Lab Technology (MLT) - Year 1', '2026-11-19', 2, 'MLT102')`

**Verdict:** The live database contains **zero duplicates**. The constraint will construct and apply cleanly without error.

---

## 5. Definitive Constraint Statement & Failure Behavior

### 5.1 Exact DDL Statement
```sql
ALTER TABLE public.class_attendance_sessions 
DROP CONSTRAINT IF EXISTS uq_class_attendance_session;

ALTER TABLE public.class_attendance_sessions 
ADD CONSTRAINT uq_class_attendance_session 
UNIQUE (class_name, session_date, period_number, subject_code);
```

### 5.2 Failure Behavior & Concurrency Handling
When two concurrent requests attempt to record attendance for the same class, date, period, and subject:
1. **Transaction A:** Acquires row-level write lock, commits the session and attendance records.
2. **Transaction B:** Encounters `uq_class_attendance_session` conflict. PostgreSQL automatically aborts Transaction B and throws:
   `ERROR: duplicate key value violates unique constraint "uq_class_attendance_session"` (SQLSTATE `23505`).
3. **Application Graceful Catch:** In `src/services/supabase/database.ts`, the catch block intercepts error code `23505` and returns:
   ```typescript
   return {
     success: false,
     error: "Attendance has already been recorded for this class session. Duplicate submission is disabled."
   };
   ```
4. **UI Notification:** The teacher's browser displays a toast alert: *"Duplicate Submission Blocked"*, and switches the desk into read-only lock mode.

---

## 6. Conclusion

The unique key composition:
$$\text{Natural Key} = (\text{class\_name}, \text{session\_date}, \text{period\_number}, \text{subject\_code})$$
is mathematically rigorous, fully compatible with non-null constraints, respects clinical practical batching, and is 100% safe to deploy against the current database state.
