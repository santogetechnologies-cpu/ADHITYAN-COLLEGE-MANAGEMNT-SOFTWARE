# Comprehensive Database Migration Inventory (001–027)

> **Document Version:** 1.0.0 (Phase 0.3 Migration Architecture Review)  
> **Deployment Architecture:** Single-Institution Dedicated Deployment  
> **Target Database:** Supabase PostgreSQL (`ogbbyqxulhegwvrtinib.supabase.co`)  
> **Verification Date:** 2026-11-19  
> **Mode:** Static Inspection & Empirical Database State Cross-Referencing

---

## 1. Executive Summary

This inventory provides a rigorous, migration-by-migration technical evaluation of all 27 SQL migration files (`001` through `027`) stored in `supabase/migrations/`. 

Each migration was cross-checked against:
1. **The Live Database State:** Empirical PostgREST schema definitions confirming which objects exist on the remote instance.
2. **Sequential Execution Safety:** The risks of duplicate objects, constraint conflicts, or data truncation if unexecuted migrations were run sequentially without consolidation.
3. **Architecture Alignment:** Compliance with the **Single-Institution Dedicated Deployment** mandate (no multi-tenant switching or platform super-admin).

### Summary Finding
- **Migrations 001 through 015:** **EXECUTED in the live database**. They form the active database baseline (78 tables, 4 RPCs).
- **Migrations 016 through 027:** **NOT EXECUTED in the live database**. They exist only as local files on disk.
- **Sequential Execution Hazard:** Migrations 016–027 **CANNOT be run sequentially as-is**. They contain contradictory DDL statements (e.g., duplicate `profiles.status` definitions in 016 and 019; competing student ID generators in 020 and 024; auth trigger overwrites in 017 and 023; and multi-college platform constructs in 027 that violate the single-institution architecture).
- **Consolidation Mandate:** All necessary, non-conflicting columns from 016–025 must be merged into a single, idempotent **Migration 028**, completely omitting the multi-college platform constructs from 027.

---

## 2. Migration-by-Migration Detailed Audit (001–027)

---

### Migration 001: `001_initial_schema.sql` (31,119 Bytes)
- **Purpose & Scope:** Baseline institutional database schema. Creates initial 28 tables covering core profiles, academic structures, daily updates, grievances, exams, alumni, sports, reception, and infirmary.
- **Affected Tables:** `profiles`, `departments`, `sections`, `timetables`, `assignments`, `assignment_submissions`, `daily_teaching_updates`, `feedback_submissions`, `concerns`, `teacher_messages`, `wellness_checkins`, `student_goals`, `student_achievements`, `notifications`, `audit_logs`, `alumni_profiles`, `alumni_events`, `alumni_donations`, `inventory_items`, `inventory_transactions`, `certificates`, `disciplinary_incidents`, `health_records`, `infirmary_visits`, `exams`, `exam_schedules`, `exam_results`, `sports_events`, `sports_teams`, `reception_visitors`, `reception_appointments`, `reception_enquiries`.
- **Dependencies:** PostgreSQL extensions `uuid-ossp`, `pgcrypto`.
- **Live Database Execution State:** **Executed in database.** All 28 base tables exist in live PostgreSQL schema.
- **Single-Institution Compatibility:** **Fully Compatible.** Focuses exclusively on one institutional domain.
- **Duplicate Object / Data Loss Risk:** Re-execution would skip table creation via `IF NOT EXISTS`, but re-running triggers could duplicate executions if unhandled.

---

### Migration 002: `002_row_level_security.sql` (30,548 Bytes)
- **Purpose & Scope:** Enables Row Level Security (RLS) across all base tables; declares helper function `public.get_current_user_role()`; establishes initial select/update policies.
- **Affected Tables:** All tables from Migration 001.
- **Dependencies:** Migration 001 (`profiles` table).
- **Live Database Execution State:** **Executed in database.** `get_current_user_role()` exists in live DB; RLS is active on tables.
- **Single-Institution Compatibility:** **Fully Compatible.**
- **Duplicate Object / Data Loss Risk:** Uses `DROP POLICY IF EXISTS`, avoiding duplicate policy errors. However, introduces `BUG-SEC-001` (`profiles` role update) and `BUG-SEC-005` (missing `search_path`).

---

### Migration 003: `003_storage_setup.sql` (3,316 Bytes)
- **Purpose & Scope:** Configures Supabase Storage buckets (`attachments`, `documents`, `avatars`) and their RLS policies on `storage.objects`.
- **Affected Tables:** `storage.buckets`, `storage.objects`.
- **Dependencies:** Supabase storage schema.
- **Live Database Execution State:** **Executed in database.** All three buckets are active in the live project.
- **Single-Institution Compatibility:** **Fully Compatible.**
- **Duplicate Object / Data Loss Risk:** Introduces `BUG-SEC-003`: policy `"Authenticated users can delete documents"` allows any authenticated user to delete files in `documents`.

---

### Migration 004: `004_seed_data.sql` (11,509 Bytes)
- **Purpose & Scope:** Inserts initial academic departments (e.g. Paramedical Sciences), sections, demo timetables, and system configurations.
- **Affected Tables:** `departments`, `sections`, `timetables`, `profiles`.
- **Dependencies:** Migrations 001, 002.
- **Live Database Execution State:** **Executed in database.** Seed departments and sections exist in live DB.
- **Single-Institution Compatibility:** **Fully Compatible.**
- **Duplicate Object / Data Loss Risk:** Re-running without `ON CONFLICT DO NOTHING` would raise duplicate key errors on primary keys.

---

### Migration 005: `005_realtime_setup.sql` (8,135 Bytes)
- **Purpose & Scope:** Adds tables to `supabase_realtime` publication; creates trigger notification functions for concerns, assignments, feedback, wellness checkins.
- **Affected Tables:** `concerns`, `assignments`, `feedback_submissions`, `wellness_checkins`, `daily_teaching_updates`.
- **Dependencies:** Migrations 001, 002.
- **Live Database Execution State:** **Executed in database.** Realtime publication active; notification functions present.
- **Single-Institution Compatibility:** **Fully Compatible.**
- **Duplicate Object / Data Loss Risk:** Contains `BUG-CONCERN-001`: `trg_notify_new_concern` references `NEW.category` instead of `NEW.concern_type`, causing insert crashes.

---

### Migration 006: `006_student_portal_enhancements.sql` (7,437 Bytes)
- **Purpose & Scope:** Implements campus store purchasing RPC `place_store_order(p_items, p_notes)` with stock deduction and order generation.
- **Affected Tables:** `store_orders`, `store_products`, `store_order_items`.
- **Dependencies:** Migrations 001, 002.
- **Live Database Execution State:** **Executed in database.** `/rpc/place_store_order` confirmed active in live PostgREST schema cache.
- **Single-Institution Compatibility:** **Fully Compatible.**
- **Duplicate Object / Data Loss Risk:** Stored function lacks `SET search_path = public` (`BUG-SEC-005`).

---

### Migration 007: `007_parent_portal_enhancements.sql` (8,488 Bytes)
- **Purpose & Scope:** Creates `parent_student_links` table and `is_parent_of(p_student_id)` verification helper RPC.
- **Affected Tables:** `parent_student_links`.
- **Dependencies:** Migrations 001, 002 (`profiles`).
- **Live Database Execution State:** **Executed in database.** `parent_student_links` table and `/rpc/is_parent_of` confirmed active in live DB.
- **Single-Institution Compatibility:** **Fully Compatible.**
- **Duplicate Object / Data Loss Risk:** Safe.

---

### Migration 008: `008_student_learning_and_checkins.sql` (10,720 Bytes)
- **Purpose & Scope:** Creates self-paced learning content repository and student progress tracking tables.
- **Affected Tables:** `learning_content`, `student_learning_progress`, `student_goals`.
- **Dependencies:** Migrations 001, 002.
- **Live Database Execution State:** **Executed in database.** Confirmed active in PostgREST definitions.
- **Single-Institution Compatibility:** **Fully Compatible.**
- **Duplicate Object / Data Loss Risk:** Safe.

---

### Migration 009: `009_seed_store_products.sql` (2,577 Bytes)
- **Purpose & Scope:** Populates initial inventory items in `store_products` (lab coats, stethoscope kits, notebooks, ID cards).
- **Affected Tables:** `store_products`.
- **Dependencies:** Migration 006.
- **Live Database Execution State:** **Executed in database.** Store inventory exists.
- **Single-Institution Compatibility:** **Fully Compatible.**
- **Duplicate Object / Data Loss Risk:** Uses `ON CONFLICT (id) DO UPDATE`.

---

### Migration 010: `010_store_products_anon_read.sql` (258 Bytes)
- **Purpose & Scope:** Adds permissive public SELECT policy on `store_products` so catalog can be browsed prior to login.
- **Affected Tables:** `store_products`.
- **Dependencies:** Migration 006.
- **Live Database Execution State:** **Executed in database.**
- **Single-Institution Compatibility:** **Fully Compatible.**
- **Duplicate Object / Data Loss Risk:** Safe.

---

### Migration 011: `011_institutional_complete_erp.sql` (24,174 Bytes)
- **Purpose & Scope:** Major institutional expansion. Creates 14 core tables: staff service records, leave balances/applications, monthly payroll runs/items, fee structures, receipts, class attendance sessions, student attendance records, shortage warnings, hall tickets, library circulation, hostel rooms/out-passes, placement drives/applications, broadcasts.
- **Affected Tables:** 14 tables as listed above.
- **Dependencies:** Migrations 001, 002.
- **Live Database Execution State:** **Executed in database.** All 14 tables confirmed present in live DB.
- **Single-Institution Compatibility:** **Fully Compatible.** Designed specifically for an independent college.
- **Duplicate Object / Data Loss Risk:** **Introduces `BUG-RLS-001`:** Establishes `FOR ALL TO authenticated USING (true)` on all 14 tables. Also lacks `UNIQUE` constraint on attendance sessions (`BUG-ATT-001`).

---

### Migration 012: `012_remote_sync.sql` (42 Bytes)
- **Purpose & Scope:** Marker comment file for remote git synchronization.
- **Affected Tables:** None.
- **Dependencies:** None.
- **Live Database Execution State:** **Executed in database.**
- **Single-Institution Compatibility:** **Fully Compatible.**
- **Duplicate Object / Data Loss Risk:** None.

---

### Migration 013: `013_official_college_courses_and_erp_fix.sql` (13,533 Bytes)
- **Purpose & Scope:** Creates official `courses` table; seeds Paramedical / Allied Health degree programs (B.VOC MLT, B.VOC RMIT, Dialysis Technology, etc.); seeds official annual fee structures.
- **Affected Tables:** `courses`, `departments`, `fee_structures`.
- **Dependencies:** Migrations 001, 011.
- **Live Database Execution State:** **Executed in database.** `courses` and fee structures confirmed present in live DB.
- **Single-Institution Compatibility:** **Fully Compatible.** Represents the core academic offerings of Adhithyan.
- **Duplicate Object / Data Loss Risk:** Safe.

---

### Migration 014: `014_public_read_departments_sections.sql` (563 Bytes)
- **Purpose & Scope:** Adds public read policies on `departments` and `sections` to allow unauthenticated admissions and course browsing.
- **Affected Tables:** `departments`, `sections`.
- **Dependencies:** Migrations 001, 002.
- **Live Database Execution State:** **Executed in database.**
- **Single-Institution Compatibility:** **Fully Compatible.**
- **Duplicate Object / Data Loss Risk:** Safe.

---

### Migration 015: `015_add_principal_role_constraint.sql` (1,047 Bytes)
- **Purpose & Scope:** Updates check constraint `profiles_role_check` on `public.profiles` to validate 18 institutional portal roles including `'principal'`.
- **Affected Tables:** `profiles`.
- **Dependencies:** Migrations 001, 002.
- **Live Database Execution State:** **Executed in database.** Active on `profiles.role` in live DB.
- **Single-Institution Compatibility:** **Fully Compatible.**
- **Duplicate Object / Data Loss Risk:** **Introduces `BUG-ROLE-001`:** Omitted `'coe'` (Controller of Examinations) and `'hod'` (Head of Department), causing account inserts for these roles to crash with check constraint violation `23514`.

---

### Migration 016: `016_college_timetable_and_profiles_status.sql` (3,164 Bytes)
- **Purpose & Scope:** Alters `profiles` to add `status TEXT DEFAULT 'active'` with check `('active', 'inactive', 'suspended')`; alters `timetables` to add `course_name`, `year_semester`, `room_lab`.
- **Affected Tables:** `profiles`, `timetables`.
- **Dependencies:** Migrations 001, 015.
- **Live Database Execution State:** **NOT EXECUTED in live database.** (Empirically verified: `profiles.status` does not exist in live DB).
- **Single-Institution Compatibility:** **Fully Compatible.**
- **Duplicate Object / Data Loss Risk:** If run sequentially with 019, creates duplicate column/constraint attempts. Must be consolidated.

---

### Migration 017: `017_auth_trigger_and_profiles.sql` (6,745 Bytes)
- **Purpose & Scope:** Re-creates `handle_new_user()` trigger on `auth.users` to automatically populate `profiles.status` and metadata; adds performance indexes on foreign keys.
- **Affected Tables:** `auth.users`, `profiles`, `timetables`, `assignments`, `student_fees`, `store_orders`.
- **Dependencies:** Migrations 015, 016 (`profiles.status`).
- **Live Database Execution State:** **NOT EXECUTED in live database.**
- **Single-Institution Compatibility:** **Fully Compatible.**
- **Duplicate Object / Data Loss Risk:** Fails if `profiles.status` is not present. Re-creates `handle_new_user()` which is overwritten again in 023.

---

### Migration 018: `018_erp_production_enhancements.sql` (9,664 Bytes)
- **Purpose & Scope:** Stored procedures for library operations (`issue_library_book`, `return_library_book`), store checkout (`checkout_store_order`), and real-time leadership analytics (`get_admin_overview_stats()`).
- **Affected Tables:** `book_issues`, `library_circulation`, `store_orders`, `store_products`, `finance_transactions`.
- **Dependencies:** Migrations 001, 011.
- **Live Database Execution State:** **NOT EXECUTED in live database.** (Empirically verified: RPCs do not exist in live DB).
- **Single-Institution Compatibility:** **Fully Compatible.**
- **Duplicate Object / Data Loss Risk:** Contains `BUG-SEC-005` (missing `search_path`) and `BUG-SEC-006` (`get_admin_overview_stats` lacks role check). Must be hardened before deployment.

---

### Migration 019: `019_add_profiles_status.sql` (680 Bytes)
- **Purpose & Scope:** Redundant standalone script to add `status` column to `profiles`.
- **Affected Tables:** `profiles`.
- **Dependencies:** Migration 001.
- **Live Database Execution State:** **NOT EXECUTED in live database.**
- **Single-Institution Compatibility:** **Fully Compatible.**
- **Duplicate Object / Data Loss Risk:** Duplicates Migration 016. Should be excluded in favor of consolidated Migration 028.

---

### Migration 020: `020_centralized_student_id_system.sql` (9,418 Bytes)
- **Purpose & Scope:** Adds sequence-based `generate_student_id()` (`ADH-YYYY-XXXX`), trigger `enforce_immutable_student_id()`, and search function.
- **Affected Tables:** `profiles`, `student_id_sequence`.
- **Dependencies:** Migrations 001, 015.
- **Live Database Execution State:** **NOT EXECUTED in live database.**
- **Single-Institution Compatibility:** **Fully Compatible.**
- **Duplicate Object / Data Loss Risk:** Conflict with Migration 024, which alters the format to `ADH/YYYY/XXXX`.

---

### Migration 021: `021_student_attendance_and_mood_separation.sql` (7,406 Bytes)
- **Purpose & Scope:** Realtime metadata triggers syncing student roll numbers into attendance logs and wellness checkins.
- **Affected Tables:** `student_attendance`, `wellness_checkins`.
- **Dependencies:** Migrations 001, 011.
- **Live Database Execution State:** **NOT EXECUTED in live database.**
- **Single-Institution Compatibility:** **Fully Compatible.**
- **Duplicate Object / Data Loss Risk:** Contains `SECURITY DEFINER` functions missing `search_path`.

---

### Migration 022: `022_academic_examination_system.sql` (2,609 Bytes)
- **Purpose & Scope:** Alters `exams` to add `course`, `semester`, `exam_category`, publication flags (`is_published`, `timetable_published`, `hall_ticket_published`, `results_published`); alters `exam_results` to add `subject_code`, `result_status`, `is_published`.
- **Affected Tables:** `exams`, `exam_schedules`, `exam_results`, `hall_tickets`.
- **Dependencies:** Migrations 001, 011.
- **Live Database Execution State:** **NOT EXECUTED in live database.** (Empirically verified: columns absent in live DB).
- **Single-Institution Compatibility:** **Fully Compatible.**
- **Duplicate Object / Data Loss Risk:** Essential academic columns. Safe if applied via `ALTER TABLE ADD COLUMN IF NOT EXISTS`.

---

### Migration 023: `023_manual_parent_account_and_linking.sql` (4,877 Bytes)
- **Purpose & Scope:** Adds `login_id` column to `profiles` with case-insensitive unique index; adds `resolve_login_id(p_login_id)` RPC; updates `handle_new_user()`.
- **Affected Tables:** `profiles`, `parent_student_links`.
- **Dependencies:** Migrations 001, 007.
- **Live Database Execution State:** **NOT EXECUTED in live database.**
- **Single-Institution Compatibility:** **Fully Compatible.**
- **Duplicate Object / Data Loss Risk:** Contains `handle_new_user()` overwriting logic. Must be integrated into Migration 028 with role protection.

---

### Migration 024: `024_student_parent_portal_complete_workflow.sql` (7,506 Bytes)
- **Purpose & Scope:** Redefines `generate_student_id()` and adds `generate_parent_id()`, `get_first_login_status()`.
- **Affected Tables:** `profiles`, sequences.
- **Dependencies:** Migrations 020, 023.
- **Live Database Execution State:** **NOT EXECUTED in live database.**
- **Single-Institution Compatibility:** **Fully Compatible.**
- **Duplicate Object / Data Loss Risk:** Clashes with Migration 020's sequence format.

---

### Migration 025: `025_receptionist_portal_enhancements.sql` (3,954 Bytes)
- **Purpose & Scope:** Alters `reception_visitors`, `reception_appointments`, and `reception_enquiries` to add check-out times, host user IDs, badge numbers; establishes receptionist RLS policies.
- **Affected Tables:** `reception_visitors`, `reception_appointments`, `reception_enquiries`, `calendar_events`.
- **Dependencies:** Migration 001.
- **Live Database Execution State:** **Base tables exist, but column enhancements and RLS updates NOT EXECUTED in live DB.**
- **Single-Institution Compatibility:** **Fully Compatible.**
- **Duplicate Object / Data Loss Risk:** Safe with `IF NOT EXISTS`.

---

### Migration 026: `026_super_admin_control_center.sql` (5,379 Bytes)
- **Purpose & Scope:** Creates institutional control center configuration tables: `super_admin_configs` (JSONB system configs per role/module), `super_admin_releases` (version snapshots), `super_admin_audit_logs`.
- **Affected Tables:** `super_admin_configs`, `super_admin_releases`, `super_admin_audit_logs`.
- **Dependencies:** Migrations 001, 002.
- **Live Database Execution State:** **NOT EXECUTED in live database.** (Empirically verified: tables absent in live DB).
- **Single-Institution Compatibility:** **Fully Compatible.** Provides institutional autonomy for this college's Super Admin.
- **Duplicate Object / Data Loss Risk:** Safe.

---

### Migration 027: `027_multi_college_platform_architecture.sql` (12,558 Bytes)
- **Purpose & Scope:** Implements multi-college multi-tenancy platform architecture: `colleges` table, `college_memberships`, `college_configurations`, `college_templates`, `platform_audit_logs`, `platform_super_admin` role.
- **Affected Tables:** `colleges`, `college_memberships`, `college_configurations`, `college_templates`, `platform_audit_logs`.
- **Dependencies:** Migrations 001, 002, 026.
- **Live Database Execution State:** **NOT EXECUTED in live database.**
- **Single-Institution Compatibility:** **DIRECT CONFLICT.** Directly violates the dedicated single-institution architecture mandate.
- **Duplicate Object / Data Loss Risk:** Introduces unnecessary multi-tenant foreign keys, global cross-tenant access paths, and confusion with the institutional administrator role. **Must be EXCLUDED from database deployment.**

---

## 3. Sequential Execution Conflict & Hazard Analysis

If migrations 016 through 027 were executed sequentially as separate files:

1. **Multiple Conflicting Column Additions:**
   - Migration 016 and Migration 019 both execute `ALTER TABLE public.profiles ADD COLUMN status TEXT...`.
   - Migration 023 and Migration 024 both execute variations of `login_id` indexes and triggers.
2. **Competing Stored Functions:**
   - Migration 020 creates `generate_student_id()` using format `ADH-YYYY-XXXX`.
   - Migration 024 overwrites `generate_student_id()` using format `ADH/YYYY/XXXX`.
3. **Repeated Overwriting of Auth Trigger `handle_new_user()`:**
   - `017` creates `handle_new_user()` without `login_id`.
   - `023` recreates `handle_new_user()` with `login_id`.
   - Both versions contain the critical security flaw allowing client metadata updates to elevate user roles (`BUG-SEC-001`).
4. **Architectural Contamination from Migration 027:**
   - Executing `027` creates tables and policies assuming multiple colleges share the database, contradicting the dedicated deployment model.
5. **Zero Resolution of Core Security Bugs:**
   - Migrations 016–027 contain **zero fixes** for `BUG-SEC-001` (profile role tampering), `BUG-RLS-001` (blanket `USING (true)` RLS), `BUG-ROLE-001` (missing `coe`/`hod` check constraint), `BUG-ATT-001` (attendance deduplication), or `BUG-SEC-003` (storage deletion).

---

## 4. Conclusion & Action Plan

Sequential execution of migrations 016–027 is **strictly rejected**.

Instead, a clean, staged **Migration 028** must be deployed that:
1. Harvests only the valid, essential column enhancements from migrations 016, 022, 023, 025, and 026.
2. Implements all verified security remediations (`FIX-SEC-001` through `FIX-HR-001`).
3. Permanently excludes all multi-college platform constructs from Migration 027.
