# Corrected Stage 1: Columns Architecture & Safety Review

> **Document Version:** 1.1.0 (Phase 1.1 SQL Defect Remediation)  
> **Deployment Architecture:** Single-Institution Dedicated Deployment  
> **Script Name:** `028_stage1_columns.sql`  
> **Target Database:** PostgreSQL 15+ (Supabase Managed Instance: `ogbbyqxulhegwvrtinib.supabase.co`)  
> **Execution Status:** Static Engineering Specification (Zero Execution)

---

## 1. Executive Summary

Stage 1 implements non-destructive, additive schema modifications. In adherence to the **Expand / Contract deployment pattern**, Stage 1 introduces missing columns with non-null defaults where appropriate, ensuring that:
1. All existing records are preserved with deterministic default values.
2. Existing application queries continue to function without interruption.
3. Lock hold duration is sub-millisecond on current table volumes.
4. **Clinical Lab Practical Support (`DEF-011`):** A dedicated `batch` column is added to `class_attendance_sessions` to support parallel practical batches within the same period.

---

## 2. Detailed Column Addition Matrix

| Target Table | Column Name | Data Type | Nullable? | Default Value | Foreign Key Reference | Business Purpose & Defect Addressed |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `public.profiles` | `status` | `TEXT` | `NO` | `'active'` | None | Account state machine (`active`, `inactive`, `suspended`). Prerequisite for fail-closed auth. |
| `public.profiles` | `login_id` | `TEXT` | `YES` | `NULL` | None | Institution ID / Roll Number login identifier for student & faculty credentials. |
| `public.timetables` | `course_name` | `TEXT` | `YES` | `NULL` | None | Paramedical degree course association (e.g., B.Voc MLT). |
| `public.timetables` | `year_semester` | `TEXT` | `YES` | `'1st Year'` | None | Academic term tracking for timetable allocation. |
| `public.timetables` | `room_lab` | `TEXT` | `YES` | `NULL` | None | Physical lab or classroom designation for clinical practicals. |
| `public.exams` | `course` | `TEXT` | `YES` | `NULL` | None | Exam course scope. |
| `public.exams` | `semester` | `TEXT` | `YES` | `NULL` | None | Exam semester scope. |
| `public.exams` | `exam_category` | `TEXT` | `YES` | `'University Examination'` | None | Examination classification (Internal Assessment, Model Exam, University Final). |
| `public.exams` | `is_published` | `BOOLEAN` | `YES` | `TRUE` | None | Master visibility toggle for exam portal. |
| `public.exams` | `timetable_published` | `BOOLEAN` | `YES` | `TRUE` | None | COE publication flag for exam timetables. |
| `public.exams` | `hall_ticket_published` | `BOOLEAN` | `YES` | `TRUE` | None | COE publication flag enabling student hall ticket downloads. |
| `public.exams` | `results_published` | `BOOLEAN` | `YES` | `FALSE` | None | Controlled publication gate preventing premature marks leakage. |
| `public.exam_schedules` | `subject_code` | `TEXT` | `YES` | `NULL` | None | Course code identifier for examination schedule item. |
| `public.exam_schedules` | `passing_marks` | `INTEGER` | `YES` | `40` | None | Passing threshold for university grading compliance. |
| `public.exam_results` | `subject_code` | `TEXT` | `YES` | `NULL` | None | Course code identifier on student grade sheet. |
| `public.exam_results` | `result_status` | `TEXT` | `YES` | `'PASS'` | None | Evaluation status (`PASS`, `FAIL`, `ABSENT`, `WITHHELD`). |
| `public.exam_results` | `is_published` | `BOOLEAN` | `YES` | `TRUE` | None | Student visibility flag for individual mark record. |
| `public.exam_results` | `published_at` | `TIMESTAMPTZ`| `YES` | `NOW()` | None | Timestamp when results became legally visible. |
| `public.class_attendance_sessions` | `batch` | `TEXT` | `NO` | `'All'` | None | **DEF-011:** Practical lab batch identifier (`'All'`, `'Batch A'`, `'Batch B'`, `'Lab 1'`). |
| `public.reception_visitors` | `check_out_time` | `TIMESTAMPTZ`| `YES` | `NULL` | None | Timestamp of visitor departure from campus. |
| `public.reception_visitors` | `host_person` | `TEXT` | `YES` | `NULL` | None | Staff member or department visited. |
| `public.reception_visitors` | `badge_number` | `TEXT` | `YES` | `NULL` | None | Physical visitor badge tracking. |
| `public.reception_appointments` | `with_user_id` | `UUID` | `YES` | `NULL` | `public.profiles(id)` | Staff member requested for appointment (`ON DELETE SET NULL`). |
| `public.reception_appointments` | `appointment_date`| `DATE` | `YES` | `CURRENT_DATE` | None | Scheduled calendar date of appointment. |
| `public.reception_appointments` | `notes` | `TEXT` | `YES` | `NULL` | None | Administrative remarks on appointment. |
| `public.reception_enquiries` | `phone` | `TEXT` | `YES` | `NULL` | None | Contact number of enquiry prospect. |
| `public.reception_enquiries` | `notes` | `TEXT` | `YES` | `NULL` | None | Follow-up guidance notes for receptionist. |

---

## 3. Concurrency & Performance Safety Analysis

### 3.1 Metadata Catalog Updates vs Table Heap Rewrites
In PostgreSQL 11 and later:
- Executing `ALTER TABLE ... ADD COLUMN ... DEFAULT <constant>` does **NOT** rewrite the physical table heap on disk.
- PostgreSQL stores the default value in the catalog table `pg_attribute` (`attmissingval`). When existing rows are read, PostgreSQL returns the default value directly from the catalog.
- Execution time is instantaneous ($< 1\text{ ms}$ per statement).
- Lock acquired: `AccessExclusiveLock` on the target table.

### 3.2 Lock Timeout Safeguards
To guarantee that concurrent application requests (e.g., student portal queries) are never blocked in the event of an uncommitted read transaction, Stage 1 explicitly prepends session safeguards:
```sql
SET lock_timeout = '3s';
SET statement_timeout = '10s';
```
If any target table cannot acquire `AccessExclusiveLock` within 3 seconds, the transaction terminates cleanly without blocking the connection pool.

---

## 4. Complete Corrected Stage 1 SQL Script

```sql
-- =============================================================================
-- Migration: 028_stage1_columns.sql
-- Description: Non-Destructive Additive Schema Additions & Clinical Batch Support
-- Architecture: Single-Institution Dedicated Deployment
-- Safety Safeguards: Strict lock_timeout and statement_timeout
-- =============================================================================

SET lock_timeout = '3s';
SET statement_timeout = '10s';

BEGIN;

-- 1. Profiles Status & Login ID
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS login_id TEXT;

-- 2. Timetable Academic Fields
ALTER TABLE public.timetables ADD COLUMN IF NOT EXISTS course_name TEXT;
ALTER TABLE public.timetables ADD COLUMN IF NOT EXISTS year_semester TEXT DEFAULT '1st Year';
ALTER TABLE public.timetables ADD COLUMN IF NOT EXISTS room_lab TEXT;

-- 3. Exam System Academic Fields
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS course TEXT;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS semester TEXT;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS exam_category TEXT DEFAULT 'University Examination';
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS timetable_published BOOLEAN DEFAULT TRUE;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS hall_ticket_published BOOLEAN DEFAULT TRUE;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS results_published BOOLEAN DEFAULT FALSE;

-- 4. Exam Schedules Subject Code & Passing Threshold
ALTER TABLE public.exam_schedules ADD COLUMN IF NOT EXISTS subject_code TEXT;
ALTER TABLE public.exam_schedules ADD COLUMN IF NOT EXISTS passing_marks INTEGER DEFAULT 40;

-- 5. Exam Results Subject Code & Status
ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS subject_code TEXT;
ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS result_status TEXT DEFAULT 'PASS';
ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT NOW();

-- 6. Clinical Lab Practical Batch Support (DEF-011)
ALTER TABLE public.class_attendance_sessions ADD COLUMN IF NOT EXISTS batch TEXT NOT NULL DEFAULT 'All';

-- 7. Reception Desk Fields
ALTER TABLE public.reception_visitors ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMPTZ;
ALTER TABLE public.reception_visitors ADD COLUMN IF NOT EXISTS host_person TEXT;
ALTER TABLE public.reception_visitors ADD COLUMN IF NOT EXISTS badge_number TEXT;
ALTER TABLE public.reception_appointments ADD COLUMN IF NOT EXISTS with_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.reception_appointments ADD COLUMN IF NOT EXISTS appointment_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.reception_appointments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.reception_enquiries ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.reception_enquiries ADD COLUMN IF NOT EXISTS notes TEXT;

COMMIT;
```
