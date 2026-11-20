# Authoritative Bug & Gap Registry (Phase 0.1 Updated)

> **Document Version:** 3.0.0 (Phase 0.1 Rigorous Audit & Source Verification)  
> **Deployment Architecture:** Single-Institution Dedicated Deployment  
> **Traceability:** Every bug and gap is indexed with its exact source path, verified line numbers, reproducible failure scenario, edge cases, inter-feature dependencies, and corrected severity rating.

---

## 1. Severity & Priority Definitions

- **Critical (P0):** Direct privilege escalation, arbitrary data destruction, or complete security boundary compromise. Must be remediated prior to any production usage.
- **High (P1):** Database integrity corruption, blocked account provisioning for official roles, or concurrency race conditions causing duplicate records.
- **Medium (P2):** Business logic inaccuracy (e.g., leave deduction errors, missing foreign key triggers), functional bugs in specific dialogs, or schema attribute naming mismatches.
- **Low (P3):** Incomplete exports, fallback client data, or hardware-dependent feature gracefully degrading.

---

## 2. Comprehensive Security & Database Bug Registry (`BUG-*`)

### `BUG-SEC-001`: Profile Role & Sensitive Column Self-Modification
- **Subsystem:** Authentication / Database Security / `public.profiles`
- **Exact Location:** [supabase/migrations/002_row_level_security.sql#L76-L81](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/supabase/migrations/002_row_level_security.sql#L76-L81) and [017_auth_trigger_and_profiles.sql#L38-L45](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/supabase/migrations/017_auth_trigger_and_profiles.sql#L38-L45)
- **Severity / Priority:** **Critical (P0)**
- **Confirmed Current Behavior:**
  1. Policy `"Allow users to update own profile"` specifies `WITH CHECK (id = auth.uid() OR public.get_current_user_role() = 'admin')`. Any authenticated student, parent, or faculty member can send a PostgREST `PATCH` modifying their own `role` column to `'admin'`.
  2. The auth trigger `handle_new_user()` syncs `AFTER UPDATE ON auth.users` and evaluates `NEW.raw_user_meta_data->>'role'`, updating `public.profiles.role`. Calling `supabase.auth.updateUser({ data: { role: 'admin' } })` silently elevates the user's role in the database.
- **Edge Cases & Failure Scenarios:** Malicious students gaining full institutional administrator access; unauthorized editing of `roll_number`, `student_id`, `login_id`, or `status` by users.
- **Dependencies:** Interlocks with `BUG-SEC-002`, `BUG-RLS-001`, and all administrative portals (`FEAT-001` through `FEAT-020`).
- **Validated Remediation:** Deploy `trg_protect_profile_columns` `BEFORE UPDATE` trigger on `public.profiles` raising an exception if non-admins alter sensitive columns (`role`, `status`, `student_id`, `roll_number`, `login_id`), and harden `handle_new_user()` so `DO UPDATE` never alters `role` or `status` from metadata.

---

### `BUG-SEC-002`: Client-Side Role Resolution Precedence & Email Fallback Escalation
- **Subsystem:** Client Authentication / `src/context/AuthContext.tsx`
- **Exact Location:** [src/context/AuthContext.tsx#L63-L75](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/src/context/AuthContext.tsx#L63-L75)
- **Severity / Priority:** **Critical (P0)**
- **Confirmed Current Behavior:**
  1. `mapAuthToUser` resolves role in order: `meta.role || profileData?.preferences?.role || profileData?.role || fallbackRole`. Unverified JWT metadata overrides verified database profiles.
  2. If a database profile is missing or during profile lookup failure, `mapAuthToUser` inspects the user's email: if it begins with `'admin'`, `'superadmin'`, or `'principal'`, it grants `fallbackRole = 'admin'` or `'principal'`.
- **Edge Cases & Failure Scenarios:** Any user registering with `admin.test@gmail.com` is granted administrative dashboard access on the frontend; client-side UI desynchronizes from backend PostgREST permissions.
- **Dependencies:** Affects all portal routing in `src/AppRoutes.tsx` and sidebar navigation.
- **Validated Remediation:** Rewrite `mapAuthToUser` to strictly prioritize `profileData?.role`. Remove all string-prefix administrative inferences. If profile is missing, set role to `'student'` with `{ is_verified: false, pending_profile: true }`.

---

### `BUG-SEC-003`: Storage Bucket Unrestricted Document Deletion Vulnerability
- **Subsystem:** File Storage / `storage.objects` (`documents` bucket)
- **Exact Location:** [supabase/migrations/003_storage_setup.sql#L54-L58](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/supabase/migrations/003_storage_setup.sql#L54-L58)
- **Severity / Priority:** **Critical (P0)**
- **Confirmed Current Behavior:**
  Policy `"Authenticated users can delete documents"` on `storage.objects` is defined as:
  `ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents')`.
  There is zero check on folder path, owner ID, or institutional role.
- **Edge Cases & Failure Scenarios:** Any logged-in user can call `storage.from('documents').remove([path])` to delete accreditation evidence, fee receipts, circulars, and admission certificates uploaded by other users or staff.
- **Dependencies:** Affects NAAC Accreditation (`FEAT-080`), Admission Management (`FEAT-013`), Fee Receipts (`FEAT-055`).
- **Validated Remediation:** Drop open delete policy. Restrict deletion on `documents` bucket to `admin, principal` or where `auth.uid()::text = (storage.foldername(name))[1]`.

---

### `BUG-SEC-004`: Edge Function JWT Metadata Trust & Role Whitelist Incompleteness
- **Subsystem:** Backend Functions / `supabase/functions/admin-create-user` & `admin-users`
- **Exact Location:** [supabase/functions/admin-create-user/index.ts#L43-L49](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/supabase/functions/admin-create-user/index.ts#L43-L49) and [supabase/functions/admin-users/index.ts#L10-L24](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/supabase/functions/admin-users/index.ts#L10-L24)
- **Severity / Priority:** **Critical (P0)**
- **Confirmed Current Behavior:**
  1. Edge Functions evaluate `callerUser.user_metadata?.role` to authorize provisioning requests, rather than querying the database `profiles` table with the service role client.
  2. `ALLOWED_ROLES` in `admin-users` is hardcoded to 13 roles, missing `coe`, `hod`, `accountant`, `financier`, `storekeeper`, and `naac_coordinator`.
- **Edge Cases & Failure Scenarios:** Spoofed user metadata allows unauthorized account creation; valid admins cannot create HOD, COE, or Accountant accounts via the Edge Function.
- **Dependencies:** User Management (`FEAT-002`), Parent Account Provisioning (`FEAT-112`).
- **Validated Remediation:** Update Edge Functions to query `profiles` table directly for caller authorization, and expand `ALLOWED_ROLES` to include all 19 institutional roles.

---

### `BUG-SEC-005`: All PostgreSQL `SECURITY DEFINER` Functions Missing `search_path`
- **Subsystem:** Database Engine / Stored Procedures & Triggers
- **Exact Location:** 21 functions across `002_row_level_security.sql`, `005_realtime_setup.sql`, `006_student_portal_enhancements.sql`, `017_auth_trigger_and_profiles.sql`, `018_erp_production_enhancements.sql`, `020_centralized_student_id_system.sql`, `023_manual_parent_account_and_linking.sql`.
- **Severity / Priority:** **High (P1)**
- **Confirmed Current Behavior:**
  All 21 functions execute with superuser authority (`SECURITY DEFINER`) but do not declare `SET search_path = public`.
- **Edge Cases & Failure Scenarios:** Schema search path injection attacks by malicious authenticated callers resolving unqualified table or function names in temporary schemas.
- **Dependencies:** All database RPCs and automated triggers.
- **Validated Remediation:** Re-declare all 21 functions with explicit `SET search_path = public`.

---

### `BUG-SEC-006`: `get_admin_overview_stats` RPC Lacks Role Authorization Check
- **Subsystem:** Database RPC / `public.get_admin_overview_stats()`
- **Exact Location:** [supabase/migrations/018_erp_production_enhancements.sql#L202-L234](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/supabase/migrations/018_erp_production_enhancements.sql#L202-L234)
- **Severity / Priority:** **High (P1)**
- **Confirmed Current Behavior:**
  The procedure is `SECURITY DEFINER` and aggregates total income from `finance_transactions`, active bus count, total user counts, and store orders. It contains no internal role check.
- **Edge Cases & Failure Scenarios:** Any authenticated student or parent executing `supabase.rpc('get_admin_overview_stats')` can view institutional financial totals and confidential staffing metrics.
- **Dependencies:** Admin Dashboard (`FEAT-001`), Principal Dashboard (`FEAT-021`).
- **Validated Remediation:** Add internal check `IF public.get_current_user_role() NOT IN ('admin', 'principal') THEN RAISE EXCEPTION 'Unauthorized'; END IF;` and revoke execute from public.

---

### `BUG-RLS-001`: Blanket Permissive RLS Policies (`USING (true)`) on 14 Institutional Tables
- **Subsystem:** Database Security / Row Level Security Policies
- **Exact Location:** [supabase/migrations/011_institutional_complete_erp.sql#L408-L429](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/supabase/migrations/011_institutional_complete_erp.sql#L408-L429)
- **Severity / Priority:** **Critical (P0)**
- **Confirmed Current Behavior:**
  Tables including `class_attendance_sessions`, `student_attendance_records`, `staff_leave_balances`, `staff_leave_applications`, `staff_payroll_runs`, `staff_payroll_items`, and `hall_tickets` use `FOR ALL TO authenticated USING (true)`.
- **Edge Cases & Failure Scenarios:** Students altering class attendance, faculty approving their own leaves, unauthorized personnel altering payroll or hall ticket exam clearances.
- **Dependencies:** Attendance (`FEAT-031`, `FEAT-062`), Payroll (`FEAT-088`), Staff Leaves (`FEAT-087`).
- **Validated Remediation:** Deploy partitioned role-based policies for SELECT, INSERT, UPDATE, DELETE as specified in `docs/SECURITY_REMEDIATION_REVIEW.md`.

---

### `BUG-ROLE-001`: `profiles_role_check` Constraint Missing `'coe'` and `'hod'`
- **Subsystem:** User Management / Database Constraints
- **Exact Location:** [supabase/migrations/015_add_principal_role_constraint.sql#L12-L31](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/supabase/migrations/015_add_principal_role_constraint.sql#L12-L31)
- **Severity / Priority:** **High (P1)**
- **Confirmed Current Behavior:**
  Constraint lists 18 roles, omitting `'coe'` and `'hod'`. Inserting or updating a user to `role = 'coe'` or `role = 'hod'` fails with check constraint violation `23514`.
- **Edge Cases & Failure Scenarios:** Inability to provision Head of Department or Controller of Examinations accounts.
- **Dependencies:** HOD Portal (`FEAT-041`), COE Portal (`FEAT-042`), Admin User Provisioning (`FEAT-002`).
- **Validated Remediation:** Drop and re-add `profiles_role_check` containing all 19 official institutional roles.

---

### `BUG-ROLE-002`: NAAC Coordinator Role Configuration Mapping Conflict
- **Subsystem:** Institutional Roles / `src/config/roles.ts`
- **Exact Location:** [src/config/roles.ts#L177-L185](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/src/config/roles.ts#L177-L185)
- **Severity / Priority:** **High (P1)**
- **Confirmed Current Behavior:**
  `ROLE_CONFIGS['naac_coordinator']` declares `role: 'admin'`, causing coordinator to be evaluated as institutional administrator in frontend checks.
- **Edge Cases & Failure Scenarios:** Coordinator granted access to user deletion, fee configuration, and financial ledgers.
- **Dependencies:** NAAC Portal (`FEAT-080` to `FEAT-084`).
- **Validated Remediation:** Change `role: 'admin'` to `role: 'naac_coordinator'`.

---

### `BUG-ROLE-003`: `database.types.ts` `UserRole` Union Omission
- **Subsystem:** TypeScript Types / `src/types/database.types.ts`
- **Exact Location:** [src/types/database.types.ts#L1-L15](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/src/types/database.types.ts#L1-L15)
- **Severity / Priority:** **Medium (P1)**
- **Confirmed Current Behavior:**
  `UserRole` in `database.types.ts` contains only 14 roles, omitting `coe`, `hod`, `hr_manager`, `librarian`, `hostel_warden`, and `placement_officer`.
- **Edge Cases & Failure Scenarios:** Type-checking friction and `as any` type casting in components accessing these profiles.
- **Dependencies:** All TypeScript services interacting with profiles.
- **Validated Remediation:** Harmonize `UserRole` union in `database.types.ts` with `AuthContext.tsx` 19-role specification.

---

### `BUG-ATT-001`: Lack of Composite Unique Constraint on Attendance Sessions
- **Subsystem:** Class Attendance / `class_attendance_sessions`
- **Exact Location:** [supabase/migrations/011_institutional_complete_erp.sql#L208-L223](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/supabase/migrations/011_institutional_complete_erp.sql#L208-L223)
- **Severity / Priority:** **High (P1)**
- **Confirmed Current Behavior:**
  No unique constraint on natural session key. Application relies on client-side check prone to race conditions.
- **Edge Cases & Failure Scenarios:** Duplicate attendance session records inflating student total session counts and skewing percentage calculations.
- **Dependencies:** Attendance Percentages (`FEAT-062`), Teacher Desk (`FEAT-031`).
- **Validated Remediation:** Add constraint `UNIQUE (class_name, session_date, period_number, subject_code)`. (Empirically verified 0 duplicate rows in live DB).

---

### `BUG-EXAM-001`: `exam_results.student_name` NOT NULL Constraint Without Trigger
- **Subsystem:** Academic Examinations / `exam_results`
- **Exact Location:** [supabase/migrations/001_initial_schema.sql#L560-L572](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/supabase/migrations/001_initial_schema.sql#L560-L572)
- **Severity / Priority:** **Medium (P2)**
- **Confirmed Current Behavior:**
  `student_name TEXT NOT NULL` without a default value or trigger. Inserts providing only `student_id` crash with not-null constraint violation. (Note: Phase 0 proposal of `DEFAULT (SELECT ...)` is invalid PostgreSQL syntax).
- **Edge Cases & Failure Scenarios:** Automated marks imports supplying student ID failing.
- **Dependencies:** Examination Results (`FEAT-043`), Marks Entry (`FEAT-034`).
- **Validated Remediation:** Implement `BEFORE INSERT` trigger function `set_exam_result_student_name()` to auto-populate from `public.profiles`.

---

### `BUG-HR-001`: Staff Leave Balance Decrement Non-Idempotency
- **Subsystem:** Staff Leave Engine / `staff_leave_balances` & `staff_leave_applications`
- **Exact Location:** [src/components/hr/StaffLeaveManager.tsx#L71-L130](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/src/components/hr/StaffLeaveManager.tsx#L71-L130)
- **Severity / Priority:** **Medium (P2)**
- **Confirmed Current Behavior:**
  Client updates application status to `'Approved'` but leaves `staff_leave_balances` unaffected or prone to duplicate deductions on re-saves. Cancellations do not restore quota.
- **Edge Cases & Failure Scenarios:** Faculty leave quotas prematurely depleted; repeated saves deducting multiple times.
- **Dependencies:** Staff Leave Management (`FEAT-087`), HR Portal (`FEAT-085`).
- **Validated Remediation:** Deploy idempotent PostgreSQL state machine trigger `trg_sync_staff_leave_balance` handling approvals, cancellations, day adjustments, and deletions.

---

### `BUG-CONCERN-001`: Grievance Realtime Trigger Column Reference Mismatch
- **Subsystem:** Realtime Notifications / `concerns`
- **Exact Location:** [supabase/migrations/005_realtime_setup.sql#L18-L35](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/supabase/migrations/005_realtime_setup.sql#L18-L35)
- **Severity / Priority:** **Medium (P2)**
- **Confirmed Current Behavior:**
  Trigger procedure references `NEW.category` instead of `NEW.concern_type`.
- **Edge Cases & Failure Scenarios:** Inserting a grievance raises an unhandled database exception: `record "new" has no field "category"`.
- **Dependencies:** Grievance System (`FEAT-018`, `FEAT-069`).
- **Validated Remediation:** Correct procedure to reference `COALESCE(NEW.concern_type, 'General')`.

---

### `BUG-LIB-001`: Library Book Issue Dialog Hardcoded Active Loan Count
- **Subsystem:** Library Management / `src/components/library/BookIssueDialog.tsx`
- **Exact Location:** [src/components/library/BookIssueDialog.tsx#L106-L107](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/src/components/library/BookIssueDialog.tsx#L106-L107)
- **Severity / Priority:** **Medium (P2)**
- **Confirmed Current Behavior:**
  Hardcodes `currentBooks: 0, maxBooks: 5` rather than querying active rows in `public.book_issues`.
- **Edge Cases & Failure Scenarios:** Students exceeding borrowing limits.
- **Dependencies:** Library Circulation (`FEAT-090`).
- **Validated Remediation:** Query `public.book_issues` dynamically for `student_id` where `status = 'issued'` to compute active book count.

---

### `BUG-STR-001`: Campus Store Order Placement Non-Atomic Client Loop Fallback
- **Subsystem:** Store Management / `src/services/supabase/database.ts`
- **Exact Location:** [src/services/supabase/database.ts#L4064-L4092](file:///c:/Users/abish/OneDrive/Documents/ADHITYAN-COLLEGE-MANAGEMNT-SOFTWARE/src/services/supabase/database.ts#L4064-L4092)
- **Severity / Priority:** **Medium (P2)**
- **Confirmed Current Behavior:**
  When `place_store_order` RPC fails, client executes an un-sequenced loop of individual stock deductions.
- **Edge Cases & Failure Scenarios:** Race conditions creating negative inventory if two users buy the last item simultaneously.
- **Dependencies:** Campus Store (`FEAT-057`, `FEAT-058`).
- **Validated Remediation:** Remove client loop fallback; route exclusively through atomic PostgreSQL RPC `place_store_order`.

---

## 3. Comprehensive Gaps Registry (`GAP-*`)

| Gap ID | Subsystem | File Reference | Priority | Description | Remediation |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **`GAP-ADM-001`** | Admin Reports | `src/pages/admin/AdminReports.tsx` | **P2** | Export triggers `window.print()` instead of CSV/XLSX. | Add structured client-side CSV generator. |
| **`GAP-PRIN-001`** | Principal Reports | `src/components/dashboards/principal/modules/ReportsModule.tsx` | **P2** | Lacks downloadable CSV/PDF export. | Add downloadable CSV export. |
| **`GAP-TCH-001`** | Faculty Reports | `src/pages/teachers/GenerateReport.tsx` | **P2** | Progress report lacks transcript export. | Add formatted progress card export. |
| **`GAP-FIN-001`** | Fee Reminders | `src/components/dashboards/FinanceManagerDashboard.tsx` | **P3** | In-app reminders recorded, but SMS webhook missing. | Maintain in-app notifications and support optional webhook. |
| **`GAP-TRN-001`** | Bus Telematics | `src/pages/TrackSchoolBus.tsx` | **P3** | GPS uses static route coordinates. | Connect map pins to dynamic coordinate table. |
| **`GAP-LIB-001`** | Library Scanner | `src/components/library/QRScannerDialog.tsx` | **P3** | Camera scanner fails without camera hardware. | Add manual ISBN search input box as fallback. |
| **`GAP-NAC-001`** | NAAC SSR | `src/pages/naac/Reports.tsx` | **P2** | Lacks one-click compiled SSR bundle generator. | Implement compiled SSR document bundler. |
| **`GAP-SPT-001`** | Sports Roster | `src/pages/SportsManagement.tsx` | **P3** | Player jersey numbers and stats not modalized. | Add player stats detail modal. |
