# Phase 1 Implementation Approval & Pre-Flight Checklist

> **Document Version:** 1.0.0 (Phase 0.4 Final Gate Sign-Off)  
> **Deployment Architecture:** Single-Institution Dedicated Deployment  
> **Target System:** ADHITYAN College Management Software  
> **Verification Date:** 2026-11-19  
> **Gate Status:** **100% READY — FROZEN AWAITING USER APPROVAL**

---

## 1. Executive Summary

This checklist establishes the final, immutable gate controls before initiating **Phase 1: Database Hardening & Security Perimeter Remediation**. 

All 16 bugs (`BUG-SEC-001` through `BUG-STR-001`), all 27 migrations, the multi-college platform architecture, and all live database states have been forensically verified across Phases 0.1, 0.2, 0.3, and 0.4.

---

## 2. Pre-Execution Verification Sign-Off Matrix

| Check Item | Validation Domain | Verification Evidence | Sign-Off Status |
| :--- | :--- | :--- | :---: |
| **1. Execution Contradiction Resolved** | Process & Auditing | `IMPLEMENTATION_STATE_REPORT.md`: Proved zero code or schema changes were applied during Phase 0/0.1. | **PASSED** |
| **2. Live Database Baseline Confirmed** | Supabase PostgreSQL | `LIVE_DATABASE_SECURITY_VERIFICATION.md`: Confirmed 78 tables, 4 active RPCs, 16 profiles, 2 sessions, 0 duplicates. | **PASSED** |
| **3. Multi-College Platform Decoupled** | System Architecture | `MIGRATION_027_ARCHITECTURE_REVIEW.md`: Migration 027 tables & `platform_super_admin` role permanently excluded. | **PASSED** |
| **4. Legal PostgreSQL Syntax Enforced** | Database Engine | `DATABASE_CONSTRAINT_VALIDATION.md`: Disallowed subquery in `DEFAULT` replaced with valid `BEFORE INSERT` trigger. | **PASSED** |
| **5. Attendance Identity Proven** | Data Integrity | `ATTENDANCE_UNIQUE_KEY_PROOF.md`: Natural key `(class_name, session_date, period_number, subject_code)` verified against 0 live duplicates. | **PASSED** |
| **6. Leave State Machine Formulated** | Business Logic | `DATABASE_CONSTRAINT_VALIDATION.md`: Idempotent trigger handling approvals, cancellations, day modifications, and deletes. | **PASSED** |
| **7. Concurrency & Lock Modes Evaluated** | Operational Safety | `PHASE_0_4_FINAL_READINESS_AUDIT.md`: Lock levels evaluated; lock durations $< 10\text{ ms}$; `lock_timeout = '3s'` mandated. | **PASSED** |
| **8. Authoritative Role Registry Finalized** | Access Governance | `FINAL_INSTITUTIONAL_ROLE_REGISTRY.md`: Exactly 19 institutional roles + 1 alias reconciled across 6 system tiers. | **PASSED** |
| **9. Staged 5-Step Deployment Designed** | Deployment Architecture | `DATABASE_DEPLOYMENT_AND_ROLLBACK_PLAN.md`: Staged sequence with pre-conditions and rollback scripts established. | **PASSED** |
| **10. TypeScript Compiler Clean** | Application Health | `npx tsc --noEmit` exited with code 0 (zero compiler errors or warnings). | **PASSED** |

---

## 3. Phase 1 Linear Execution Checklist

Upon your explicit approval, Phase 1 will execute according to this exact linear protocol:

### Phase 1.1: Database Staged Deployment
- [ ] **Stage 1 (Columns):** Execute `028_stage1_columns.sql` (Add `profiles.status`, `profiles.login_id`, exam publication flags, reception fields with constant defaults).
- [ ] **Stage 1 Verification:** Execute verification query confirming 18 new columns exist in `information_schema.columns`.
- [ ] **Stage 2 (Constraints):** Execute `028_stage2_constraints.sql` (Update `profiles_role_check` to 20 roles; add `uq_class_attendance_session` unique key).
- [ ] **Stage 2 Verification:** Execute verification query confirming constraints active in `pg_constraint`.
- [ ] **Stage 3 (Triggers):** Execute `028_stage3_triggers.sql` (Deploy `trg_protect_profile_columns`, `trg_set_exam_result_student_name`, `trg_sync_staff_leave_balance`, fix grievance trigger, append `SET search_path = public`).
- [ ] **Stage 3 Verification:** Execute verification query confirming triggers attached in `pg_trigger`.
- [ ] **Stage 4 (RLS & Storage):** Execute `028_stage4_rls.sql` (Drop all 17 legacy permissive policies; apply partitioned role RLS; restrict `documents` storage delete).
- [ ] **Stage 4 Verification:** Execute verification query confirming zero policies on ERP tables evaluate to `true`.
- [ ] **Stage 5 (Admin Configs):** Execute `028_stage5_configs.sql` (Create `super_admin_configs` and `super_admin_releases` for institutional customization).
- [ ] **Stage 5 Verification:** Execute verification query confirming tables exist in `information_schema.tables`.

---

### Phase 1.2: Application Source Code & Edge Functions Updates
- [ ] **AuthContext Update:** Rewrite `mapAuthToUser` in `src/context/AuthContext.tsx` to strictly prioritize database `profileData.role`; remove all string-prefix email escalation (`admin*`, `principal*`, `superadmin*`); assign fail-closed unverified state if profile is missing.
- [ ] **Role Config Update:** Correct `ROLE_CONFIGS['naac_coordinator'].role` to `'naac_coordinator'` in `src/config/roles.ts`; remove `platform_super_admin` configuration block.
- [ ] **TypeScript Types Update:** Expand `UserRole` in `src/types/database.types.ts` to match all 20 permitted role keys.
- [ ] **Library Loan Lookup:** Query active loans dynamically from `public.book_issues` in `src/components/library/BookIssueDialog.tsx`.
- [ ] **Edge Functions Update:** Update `admin-create-user` and `admin-users` to verify caller role directly against `public.profiles` using `supabaseAdmin`; expand `ALLOWED_ROLES` to 20 roles.
- [ ] **Edge Functions Deployment:** Deploy updated Edge Functions via Supabase CLI.

---

### Phase 1.3: Post-Deployment Automated Regression Suite
- [ ] **Typecheck Verification:** Run `npx tsc --noEmit` (Must pass with 0 errors).
- [ ] **Automated Integration Test:** Run `scripts/test_full_college_workflows_e2e.ts` verifying:
  - Profile self-role patch fails with security exception.
  - Storage document delete by non-owner student fails with HTTP 403.
  - Teacher attendance insert for unassigned class fails RLS.
  - Attendance duplicate insert fails unique constraint `uq_class_attendance_session`.
  - Marks insert omitting student name succeeds via auto-name trigger.
  - Staff leave approval decrements quota; cancellation restores quota.
  - All 19 institutional role portals render live authenticated data.
- [ ] **Final Sign-Off Delivery:** Deliver Phase 1 Completion Audit Report to user.

---

## 4. Rollback Guarantee

If any stage fails during execution:
1. **Automated Rollback Script:** Execute `028_rollback.sql` immediately to restore constraint 015, drop triggers, and restore baseline policies.
2. **Git Working Tree Reset:** Revert local changes via `git checkout` on modified files.
3. **Data Safety Assurance:** Zero existing rows will be dropped or truncated; all tables contain production data that is preserved throughout.

---

## 5. Strict Gate Hold Statement

> [!IMPORTANT]
> **GATE HOLD IN EFFECT:**
> All planning, verification, SQL syntax testing, and dependency mapping are 100% complete.
> In accordance with your strict rules, **no source code changes, SQL execution, or database modifications have been performed**.
> 
> **I am now stopped and waiting for your explicit instruction to begin executing Phase 1.**
