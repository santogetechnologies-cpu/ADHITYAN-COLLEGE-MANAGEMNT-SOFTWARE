# Corrected Stage 3: Security Triggers, Concurrency & Function Lockdown Review

> **Document Version:** 1.1.0 (Phase 1.1 SQL Defect Remediation)  
> **Deployment Architecture:** Single-Institution Dedicated Deployment  
> **Script Name:** `028_stage3_triggers.sql`  
> **Target Database:** PostgreSQL 15+ (Supabase Managed Instance: `ogbbyqxulhegwvrtinib.supabase.co`)  
> **Execution Status:** Static Engineering Specification (Zero Execution)

---

## 1. Executive Summary

Stage 3 implements engine-level security triggers, transactional integrity state machines, and function security hardening. This review addresses the critical vulnerabilities identified in Phase 1.1:
1. **`DEF-001` (Profile Trigger Privilege Escalation Flaw):** Replaced the defective `current_user` check with a bulletproof multi-tier caller verification distinguishing PostgREST JWT claims, authenticated profiles, and physical database sessions.
2. **`DEF-002`, `DEF-003`, `DEF-004` (Staff Leave Balance State Machine):** Replaced hardcoded academic year and silent negative clamping with a dynamic, transactional state transition engine utilizing row-level locks (`FOR UPDATE`).
3. **`DEF-005`, `DEF-006` (Catalog Function Lockdown):** Corrected `is_parent_of(UUID)` signature and locked down `search_path` across all 10 live `SECURITY DEFINER` functions in the database.

---

## 2. Redesign of Profile Protection Trigger (`BUG-SEC-001` / `DEF-001`)

### 2.1 The Critical PostgreSQL `SECURITY DEFINER` Trapping Mechanism
In PostgreSQL:
- A `SECURITY DEFINER` function executes with the privileges and identity of its **owner** (typically `postgres` or `supabase_admin`).
- Within the function body, `current_user` evaluates to the **function owner**, NOT the user who invoked the RPC or PostgREST endpoint!
- In the defective draft, `IF current_user IN ('postgres', 'service_role') THEN RETURN NEW;` evaluated to `TRUE` for **every caller**, completely neutralizing the trigger!

### 2.2 Corrected Multi-Tier Authorization Architecture
To correctly identify the real origin of the request, the function evaluates three independent security contexts:

```
[Incoming Request]
       |
       v
[Is JWT Role == 'service_role'?] --------> YES ----> [ALLOW (Trusted Backend API)]
       | NO
       v
[Is auth.uid() IS NULL AND session_user IN ('postgres', 'supabase_admin')?] --> YES --> [ALLOW (CLI / Migration)]
       | NO (Authenticated End-User)
       v
[Query caller profile: SELECT role, status FROM profiles WHERE id = auth.uid()]
       |
       +---> Profile Missing or status != 'active'? ----> [FAIL CLOSED (Raise Exception)]
       |
       +---> Caller Role IN ('admin', 'principal')? ------> [ALLOW Mutation]
       |
       +---> Caller Role NOT IN ('admin', 'principal') ---> [BLOCK role, status, student_id, roll_number, login_id]
```

### 2.3 Comprehensive Test Cases for `protect_profile_sensitive_columns()`

| Scenario ID | Caller Identity | `auth.uid()` | JWT Claim Role | Target Column Mutated | Expected Engine Behavior | Security Proof |
| :--- | :--- | :---: | :---: | :--- | :---: | :--- |
| **TC-SEC-01** | Direct SQL Migration | `NULL` | None | `profiles.role` to 'admin' | **Permitted** | Physical connection is `postgres`; `auth.uid()` is null. |
| **TC-SEC-02** | Trusted Backend Script | `NULL` | `'service_role'` | `profiles.role` to 'teacher' | **Permitted** | Validated via `current_setting('request.jwt.claim.role')`. |
| **TC-SEC-03** | Authenticated Student | `student_uuid` | `'authenticated'` | `profiles.bio` | **Permitted** | Unprotected field; self-mutation allowed. |
| **TC-SEC-04** | Authenticated Student | `student_uuid` | `'authenticated'` | `profiles.role` to 'admin' | **EXCEPTION RAISED (403)** | `role` is protected; caller is not admin/principal. |
| **TC-SEC-05** | Authenticated Student | `student_uuid` | `'authenticated'` | `profiles.student_id` | **EXCEPTION RAISED (403)** | Student ID is immutable for non-administrators. |
| **TC-SEC-06** | Authenticated Student | `student_uuid` | `'authenticated'` | `profiles.login_id` | **EXCEPTION RAISED (403)** | Login ID is immutable for non-administrators. |
| **TC-SEC-07** | Inactive / Suspended Admin | `admin_uuid` | `'authenticated'` | `profiles.role` | **EXCEPTION RAISED (403)** | Account status is inactive; fails closed. |
| **TC-SEC-08** | User with Missing Profile | `anon_uuid` | `'authenticated'` | `profiles.role` | **EXCEPTION RAISED (403)** | No profile row found; fails closed. |
| **TC-SEC-09** | Active Institutional Admin | `admin_uuid` | `'authenticated'` | `profiles.role` to 'hod' | **Permitted** | Caller role is verified `admin` in database profile. |

---

## 3. Redesign of Staff Leave Balance State Machine (`BUG-HR-001` / `DEF-002–004`)

### 3.1 Architectural Flaws in Previous Draft
1. **Hardcoded Academic Year:** `v_academic_year TEXT := '2024-2025'` permanently broke multi-year operations.
2. **Silent Negative Clamping:** `GREATEST(0, casual_leave_taken - OLD.total_days)` masked accounting inconsistencies.
3. **Leave Type Transition Blindspot:** Did not handle changes from one leave type to another while in `Approved` state (e.g., Casual Leave $\to$ Medical Leave).
4. **Missing Employee Reassignment:** Did not refund old employee and deduct new employee if `user_id` was modified.
5. **Lack of Concurrency Locking:** Concurrent manager approvals could result in lost updates without `SELECT ... FOR UPDATE`.

### 3.2 Dynamic Resolution & Concurrency Engine
1. **Dynamic Academic Year:** Resolves dynamically:
   ```sql
   IF v_academic_year IS NULL THEN
       SELECT academic_year INTO v_academic_year FROM public.institutional_settings LIMIT 1;
       IF v_academic_year IS NULL THEN
           v_academic_year := TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || TO_CHAR(CURRENT_DATE + INTERVAL '1 year', 'YYYY');
       END IF;
   END IF;
   ```
2. **Pessimistic Row Locking (`FOR UPDATE`):**
   Before adjusting balances, the trigger locks the target row in `staff_leave_balances`, ensuring sequential execution under concurrent manager actions.
3. **Atomic Reassignment Support:**
   If `user_id` changes on an approved record, the old user's balance is refunded and the new user's balance is deducted within the same database transaction.
4. **Atomic Reclassification Support:**
   If `leave_type` changes while approved (e.g. from Casual to Earned), the days are refunded to the old type and deducted from the new type atomically.

### 3.3 State Transition Test Matrix

| Transition ID | Initial State | Trigger Action | New State | Days / Type Delta | Expected Balance Impact |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **TR-01** | `Pending` (3 Casual) | `INSERT` | `Approved` | $+3$ Casual | Casual balance $+3$. Row locked during insert. |
| **TR-02** | `Pending` (2 Medical) | `UPDATE` | `Approved` | $+2$ Medical | Medical balance $+2$. |
| **TR-03** | `Approved` (3 Casual) | `UPDATE` | `Cancelled` | $-3$ Casual | Casual balance $-3$. Full refund. |
| **TR-04** | `Approved` (3 Casual) | `UPDATE` | `Approved` | Days: $3 \to 5$ | Casual balance $+2$ (Delta adjustment). |
| **TR-05** | `Approved` (5 Casual) | `UPDATE` | `Approved` | Days: $5 \to 3$ | Casual balance $-2$ (Delta adjustment). |
| **TR-06** | `Approved` (3 Casual) | `UPDATE` | `Approved` | Type: Casual $\to$ Medical | Casual balance $-3$; Medical balance $+3$. |
| **TR-07** | `Approved` (2 Medical) | `UPDATE` | `Approved` | User: Staff A $\to$ Staff B | Staff A Medical $-2$; Staff B Medical $+2$. |
| **TR-08** | `Approved` (4 Casual) | `DELETE` | `DELETED` | $-4$ Casual | Casual balance $-4$. Full refund on deletion. |
| **TR-09** | `Pending` (3 Casual) | `DELETE` | `DELETED` | None | No-op. Pending leave was never deducted. |
| **TR-10** | `Approved` (3 Casual) | `UPDATE` | `Approved` | No field changed | Idempotent no-op. Balance unchanged. |

---

## 4. Complete Audit & Lockdown of Live `SECURITY DEFINER` Functions

An inspection of `pg_proc` in the live database (`ogbbyqxulhegwvrtinib.supabase.co`) identified **10 existing `SECURITY DEFINER` functions**. Every function was cataloged for owner, signature, current search_path, and required remediation:

| Function Name & Signature | Owner | Live `search_path` | Objects / Schemas Referenced | Correction Required |
| :--- | :---: | :---: | :--- | :--- |
| `public.get_current_user_role()` | `postgres` | `NONE` | `public.profiles`, `auth.uid()` | `ALTER FUNCTION public.get_current_user_role() SET search_path = public;` |
| `public.is_parent_of(p_student_id uuid)` | `postgres` | `NONE` | `public.parent_student_links`, `auth.uid()` | **DEF-005:** Corrected signature. `ALTER FUNCTION public.is_parent_of(uuid) SET search_path = public;` |
| `public.notify_certificate_status()` | `postgres` | `NONE` | `public.notifications` | `ALTER FUNCTION public.notify_certificate_status() SET search_path = public;` |
| `public.notify_fee_payment()` | `postgres` | `NONE` | `public.notifications` | `ALTER FUNCTION public.notify_fee_payment() SET search_path = public;` |
| `public.notify_new_admission()` | `postgres` | `NONE` | `public.profiles`, `public.notifications` | `ALTER FUNCTION public.notify_new_admission() SET search_path = public;` |
| `public.notify_new_assignment()` | `postgres` | `NONE` | `public.profiles`, `public.notifications` | `ALTER FUNCTION public.notify_new_assignment() SET search_path = public;` |
| `public.notify_new_concern()` | `postgres` | `NONE` | `public.profiles`, `public.notifications` | `ALTER FUNCTION public.notify_new_concern() SET search_path = public;` |
| `public.notify_store_order()` | `postgres` | `NONE` | `public.profiles`, `public.notifications` | `ALTER FUNCTION public.notify_store_order() SET search_path = public;` |
| `public.place_store_order(uuid, text, jsonb, numeric)` | `postgres` | `NONE` | `public.store_products`, `public.store_orders`, `auth.uid()` | `ALTER FUNCTION public.place_store_order(uuid, text, jsonb, numeric) SET search_path = public;` |
| `public.rls_auto_enable()` | `postgres` | `pg_catalog` | `pg_catalog.pg_class`, `public` | Retain existing secure configuration (`search_path = pg_catalog`). |

---

## 5. Complete Corrected Stage 3 SQL Script

```sql
-- =============================================================================
-- Migration: 028_stage3_triggers.sql
-- Description: Security Triggers, Concurrency Hardening & Function Lockdown
-- Architecture: Single-Institution Dedicated Deployment
-- Safety Safeguards: Strict lock_timeout and statement_timeout
-- =============================================================================

SET lock_timeout = '3s';
SET statement_timeout = '10s';

BEGIN;

-- =============================================================================
-- 1. BUG-SEC-001 / DEF-001: PROFILE SENSITIVE COLUMN PROTECTION TRIGGER
-- =============================================================================
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS TRIGGER AS $$
DECLARE
    v_caller_role TEXT;
    v_caller_status TEXT;
    v_jwt_role TEXT;
BEGIN
    -- 1. Check for PostgREST service_role API requests
    BEGIN
        v_jwt_role := current_setting('request.jwt.claim.role', true);
    EXCEPTION WHEN OTHERS THEN
        v_jwt_role := NULL;
    END;

    IF v_jwt_role = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- 2. Check for physical database CLI / migration connection (postgres superuser)
    IF auth.uid() IS NULL AND session_user IN ('postgres', 'supabase_admin') THEN
        RETURN NEW;
    END IF;

    -- 3. Authenticated end-user request: Lookup authoritative database profile
    IF auth.uid() IS NOT NULL THEN
        SELECT role, status INTO v_caller_role, v_caller_status
        FROM public.profiles 
        WHERE id = auth.uid();

        -- Fail closed: Inactive, suspended, or missing profiles cannot modify protected data
        IF v_caller_role IS NULL OR v_caller_status <> 'active' THEN
            RAISE EXCEPTION 'Security Violation: Caller account is inactive, unverified, or not found.';
        END IF;

        -- Authorized institutional executives can perform account management
        IF v_caller_role IN ('admin', 'principal') THEN
            RETURN NEW;
        END IF;

        -- Non-administrative users: Prohibit modification of protected columns
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Security Violation: Modifying user role is restricted to administrators.';
        END IF;
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Security Violation: Modifying account status is restricted to administrators.';
        END IF;
        IF NEW.student_id IS DISTINCT FROM OLD.student_id THEN
            RAISE EXCEPTION 'Security Violation: Student ID is immutable.';
        END IF;
        IF NEW.roll_number IS DISTINCT FROM OLD.roll_number THEN
            RAISE EXCEPTION 'Security Violation: Roll number is immutable.';
        END IF;
        IF NEW.login_id IS DISTINCT FROM OLD.login_id THEN
            RAISE EXCEPTION 'Security Violation: Login ID is immutable.';
        END IF;
    ELSE
        -- Unauthenticated or anonymous caller attempting mutation
        RAISE EXCEPTION 'Security Violation: Anonymous profile mutation is forbidden.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_profile_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_columns
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_sensitive_columns();

-- =============================================================================
-- 2. BUG-EXAM-001: EXAM RESULT STUDENT NAME AUTO-POPULATION TRIGGER
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_exam_result_student_name()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.student_name IS NULL OR TRIM(NEW.student_name) = '' THEN
        SELECT name INTO NEW.student_name 
        FROM public.profiles 
        WHERE id = NEW.student_id;

        IF NEW.student_name IS NULL THEN
            NEW.student_name := 'Student ' || SUBSTRING(COALESCE(NEW.student_id::text, gen_random_uuid()::text), 1, 8);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_set_exam_result_student_name ON public.exam_results;
CREATE TRIGGER trg_set_exam_result_student_name
    BEFORE INSERT ON public.exam_results
    FOR EACH ROW
    EXECUTE FUNCTION public.set_exam_result_student_name();

-- =============================================================================
-- 3. BUG-HR-001 / DEF-002–004: STAFF LEAVE BALANCE IDEMPOTENT STATE MACHINE
-- =============================================================================
CREATE OR REPLACE FUNCTION public.sync_staff_leave_balance_transition()
RETURNS TRIGGER AS $$
DECLARE
    v_academic_year TEXT;
    v_dummy_id UUID;
    v_diff INTEGER := 0;
BEGIN
    -- 1. Resolve Academic Year dynamically without hardcoding
    IF TG_OP = 'DELETE' THEN
        v_academic_year := OLD.academic_year;
    ELSE
        v_academic_year := NEW.academic_year;
    END IF;

    IF v_academic_year IS NULL OR TRIM(v_academic_year) = '' THEN
        SELECT academic_year INTO v_academic_year FROM public.institutional_settings LIMIT 1;
        IF v_academic_year IS NULL OR TRIM(v_academic_year) = '' THEN
            v_academic_year := TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || TO_CHAR(CURRENT_DATE + INTERVAL '1 year', 'YYYY');
        END IF;
    END IF;

    -- 2. DELETE Operation Handler
    IF TG_OP = 'DELETE' THEN
        IF OLD.status = 'Approved' THEN
            -- Acquire row-level pessimistic lock
            SELECT id INTO v_dummy_id FROM public.staff_leave_balances 
            WHERE user_id = OLD.user_id AND academic_year = v_academic_year FOR UPDATE;

            IF OLD.leave_type = 'Casual Leave' THEN
                UPDATE public.staff_leave_balances SET casual_leave_taken = casual_leave_taken - OLD.total_days, updated_at = NOW() WHERE user_id = OLD.user_id AND academic_year = v_academic_year;
            ELSIF OLD.leave_type = 'Medical Leave' THEN
                UPDATE public.staff_leave_balances SET medical_leave_taken = medical_leave_taken - OLD.total_days, updated_at = NOW() WHERE user_id = OLD.user_id AND academic_year = v_academic_year;
            ELSIF OLD.leave_type = 'Earned Leave' THEN
                UPDATE public.staff_leave_balances SET earned_leave_taken = earned_leave_taken - OLD.total_days, updated_at = NOW() WHERE user_id = OLD.user_id AND academic_year = v_academic_year;
            ELSIF OLD.leave_type = 'On Duty' THEN
                UPDATE public.staff_leave_balances SET on_duty_taken = on_duty_taken - OLD.total_days, updated_at = NOW() WHERE user_id = OLD.user_id AND academic_year = v_academic_year;
            END IF;
        END IF;
        RETURN OLD;
    END IF;

    -- Ensure a balance record exists for target user
    INSERT INTO public.staff_leave_balances (user_id, academic_year)
    VALUES (NEW.user_id, v_academic_year)
    ON CONFLICT (user_id, academic_year) DO NOTHING;

    -- Acquire row-level pessimistic lock
    SELECT id INTO v_dummy_id FROM public.staff_leave_balances 
    WHERE user_id = NEW.user_id AND academic_year = v_academic_year FOR UPDATE;

    -- Transition 1: Non-Approved -> Approved
    IF (TG_OP = 'INSERT' AND NEW.status = 'Approved') OR 
       (TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM 'Approved') AND NEW.status = 'Approved') THEN
        
        IF NEW.leave_type = 'Casual Leave' THEN
            UPDATE public.staff_leave_balances SET casual_leave_taken = casual_leave_taken + NEW.total_days, updated_at = NOW() WHERE user_id = NEW.user_id AND academic_year = v_academic_year;
        ELSIF NEW.leave_type = 'Medical Leave' THEN
            UPDATE public.staff_leave_balances SET medical_leave_taken = medical_leave_taken + NEW.total_days, updated_at = NOW() WHERE user_id = NEW.user_id AND academic_year = v_academic_year;
        ELSIF NEW.leave_type = 'Earned Leave' THEN
            UPDATE public.staff_leave_balances SET earned_leave_taken = earned_leave_taken + NEW.total_days, updated_at = NOW() WHERE user_id = NEW.user_id AND academic_year = v_academic_year;
        ELSIF NEW.leave_type = 'On Duty' THEN
            UPDATE public.staff_leave_balances SET on_duty_taken = on_duty_taken + NEW.total_days, updated_at = NOW() WHERE user_id = NEW.user_id AND academic_year = v_academic_year;
        END IF;

    -- Transition 2: Approved -> Non-Approved (Cancelled / Rejected / Pending)
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'Approved' AND NEW.status <> 'Approved' THEN
        
        IF OLD.leave_type = 'Casual Leave' THEN
            UPDATE public.staff_leave_balances SET casual_leave_taken = casual_leave_taken - OLD.total_days, updated_at = NOW() WHERE user_id = NEW.user_id AND academic_year = v_academic_year;
        ELSIF OLD.leave_type = 'Medical Leave' THEN
            UPDATE public.staff_leave_balances SET medical_leave_taken = medical_leave_taken - OLD.total_days, updated_at = NOW() WHERE user_id = NEW.user_id AND academic_year = v_academic_year;
        ELSIF OLD.leave_type = 'Earned Leave' THEN
            UPDATE public.staff_leave_balances SET earned_leave_taken = earned_leave_taken - OLD.total_days, updated_at = NOW() WHERE user_id = NEW.user_id AND academic_year = v_academic_year;
        ELSIF OLD.leave_type = 'On Duty' THEN
            UPDATE public.staff_leave_balances SET on_duty_taken = on_duty_taken - OLD.total_days, updated_at = NOW() WHERE user_id = NEW.user_id AND academic_year = v_academic_year;
        END IF;

    -- Transition 3: Approved -> Approved with Reclassifications or Modifications
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'Approved' AND NEW.status = 'Approved' THEN
        
        -- Subcase A: Employee Reassignment (NEW.user_id <> OLD.user_id)
        IF NEW.user_id <> OLD.user_id THEN
            -- Refund old employee
            IF OLD.leave_type = 'Casual Leave' THEN
                UPDATE public.staff_leave_balances SET casual_leave_taken = casual_leave_taken - OLD.total_days, updated_at = NOW() WHERE user_id = OLD.user_id AND academic_year = v_academic_year;
            ELSIF OLD.leave_type = 'Medical Leave' THEN
                UPDATE public.staff_leave_balances SET medical_leave_taken = medical_leave_taken - OLD.total_days, updated_at = NOW() WHERE user_id = OLD.user_id AND academic_year = v_academic_year;
            ELSIF OLD.leave_type = 'Earned Leave' THEN
                UPDATE public.staff_leave_balances SET earned_leave_taken = earned_leave_taken - OLD.total_days, updated_at = NOW() WHERE user_id = OLD.user_id AND academic_year = v_academic_year;
            ELSIF OLD.leave_type = 'On Duty' THEN
                UPDATE public.staff_leave_balances SET on_duty_taken = on_duty_taken - OLD.total_days, updated_at = NOW() WHERE user_id = OLD.user_id AND academic_year = v_academic_year;
            END IF;
            -- Deduct new employee
            IF NEW.leave_type = 'Casual Leave' THEN
                UPDATE public.staff_leave_balances SET casual_leave_taken = casual_leave_taken + NEW.total_days, updated_at = NOW() WHERE user_id = NEW.user_id AND academic_year = v_academic_year;
            ELSIF NEW.leave_type = 'Medical Leave' THEN
                UPDATE public.staff_leave_balances SET medical_leave_taken = medical_leave_taken + NEW.total_days, updated_at = NOW() WHERE user_id = NEW.user_id AND academic_year = v_academic_year;
            ELSIF NEW.leave_type = 'Earned Leave' THEN
                UPDATE public.staff_leave_balances SET earned_leave_taken = earned_leave_taken + NEW.total_days, updated_at = NOW() WHERE user_id = NEW.user_id AND academic_year = v_academic_year;
            ELSIF NEW.leave_type = 'On Duty' THEN
                UPDATE public.staff_leave_balances SET on_duty_taken = on_duty_taken + NEW.total_days, updated_at = NOW() WHERE user_id = NEW.user_id AND academic_year = v_academic_year;
            END IF;

        -- Subcase B: Leave Type Changed for Same Employee (NEW.leave_type <> OLD.leave_type)
        ELSIF NEW.leave_type <> OLD.leave_type THEN
            -- Refund old leave type
            IF OLD.leave_type = 'Casual Leave' THEN
                UPDATE public.staff_leave_balances SET casual_leave_taken = casual_leave_taken - OLD.total_days, updated_at = NOW() WHERE user_id = NEW.user_id AND academic_year = v_academic_year;
            ELSIF OLD.leave_type = 'Medical Leave' THEN
                UPDATE public.staff_leave_balances SET medical_leave_taken = medical_leave_taken - OLD.total_days, updated_at = NOW() WHERE user_id = NEW.user_id AND academic_year = v_academic_year;
            ELSIF OLD.leave_type = 'Earned Leave' THEN
                UPDATE public.staff_leave_balances SET earned_leave_taken = earned_leave_taken - OLD.total_days, updated_at = NOW() WHERE user_id = NEW.user_id AND academic_year = v_academic_year;
            ELSIF OLD.leave_type = 'On Duty' THEN
                UPDATE public.staff_leave_balances SET on_duty_taken = on_duty_taken - OLD.total_days, updated_at = NOW() WHERE user_id = NEW.user_id AND academic_year = v_academic_year;
            END IF;
            -- Deduct new leave type
            IF NEW.leave_type = 'Casual Leave' THEN
                UPDATE public.staff_leave_balances SET casual_leave_taken = casual_leave_taken + NEW.total_days, updated_at = NOW() WHERE user_id = NEW.user_id AND academic_year = v_academic_year;
            ELSIF NEW.leave_type = 'Medical Leave' THEN
                UPDATE public.staff_leave_balances SET medical_leave_taken = medical_leave_taken + NEW.total_days, updated_at = NOW() WHERE user_id = NEW.user_id AND academic_year = v_academic_year;
            ELSIF NEW.leave_type = 'Earned Leave' THEN
                UPDATE public.staff_leave_balances SET earned_leave_taken = earned_leave_taken + NEW.total_days, updated_at = NOW() WHERE user_id = NEW.user_id AND academic_year = v_academic_year;
            ELSIF NEW.leave_type = 'On Duty' THEN
                UPDATE public.staff_leave_balances SET on_duty_taken = on_duty_taken + NEW.total_days, updated_at = NOW() WHERE user_id = NEW.user_id AND academic_year = v_academic_year;
            END IF;

        -- Subcase C: Total Days Changed for Same Employee and Same Type
        ELSIF NEW.total_days <> OLD.total_days THEN
            v_diff := NEW.total_days - OLD.total_days;
            IF NEW.leave_type = 'Casual Leave' THEN
                UPDATE public.staff_leave_balances SET casual_leave_taken = casual_leave_taken + v_diff, updated_at = NOW() WHERE user_id = NEW.user_id AND academic_year = v_academic_year;
            ELSIF NEW.leave_type = 'Medical Leave' THEN
                UPDATE public.staff_leave_balances SET medical_leave_taken = medical_leave_taken + v_diff, updated_at = NOW() WHERE user_id = NEW.user_id AND academic_year = v_academic_year;
            ELSIF NEW.leave_type = 'Earned Leave' THEN
                UPDATE public.staff_leave_balances SET earned_leave_taken = earned_leave_taken + v_diff, updated_at = NOW() WHERE user_id = NEW.user_id AND academic_year = v_academic_year;
            ELSIF NEW.leave_type = 'On Duty' THEN
                UPDATE public.staff_leave_balances SET on_duty_taken = on_duty_taken + v_diff, updated_at = NOW() WHERE user_id = NEW.user_id AND academic_year = v_academic_year;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_staff_leave_balance ON public.staff_leave_applications;
CREATE TRIGGER trg_sync_staff_leave_balance
    AFTER INSERT OR UPDATE OR DELETE ON public.staff_leave_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_staff_leave_balance_transition();

-- =============================================================================
-- 4. DEF-005 & DEF-006: HARDEN SEARCH PATH ACROSS ALL LIVE SECURITY DEFINER FUNCTIONS
-- =============================================================================
ALTER FUNCTION public.get_current_user_role() SET search_path = public;
ALTER FUNCTION public.is_parent_of(uuid) SET search_path = public;
ALTER FUNCTION public.notify_certificate_status() SET search_path = public;
ALTER FUNCTION public.notify_fee_payment() SET search_path = public;
ALTER FUNCTION public.notify_new_admission() SET search_path = public;
ALTER FUNCTION public.notify_new_assignment() SET search_path = public;
ALTER FUNCTION public.notify_new_concern() SET search_path = public;
ALTER FUNCTION public.notify_store_order() SET search_path = public;
ALTER FUNCTION public.place_store_order(uuid, text, jsonb, numeric) SET search_path = public;

COMMIT;
```
