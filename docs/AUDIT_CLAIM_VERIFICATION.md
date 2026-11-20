# Authoritative Audit Claim Verification & Evidence Ledger

> **Document Version:** 2.2.0 (Phase 0 Complete Source Verification)  
> **Methodology:** Every audit claim from Phase 0 is verified directly against React TypeScript source code, Supabase PostgreSQL migrations, RLS policies, triggers, and RPC functions.  
> **Standardized Status Classifications:**
> - `[VERIFIED]`: Confirmed with concrete source code and database implementation.
> - `[INCORRECT]`: Documentation claim contradicted by source code or SQL constraints.
> - `[PARTIALLY VERIFIED]`: Implemented in parts, with specific components or operations missing.
> - `[REQUIRES RUNTIME TESTING]`: Functional logic exists but requires live execution under load or hardware integration.

---

## 1. Role System, Precedence & Architecture Conflicts

### Claim 1.1: AuthContext Role Resolution Prioritization
- **Audit Claim**: The user's role is safely resolved from the official database `profiles.role` column upon login.
- **Status**: `[INCORRECT]` (Dangerous Client-Side Metadata Precedence)
- **Source Evidence**:
  - `src/context/AuthContext.tsx#L60-L75`:
    ```typescript
    const meta = authUser.user_metadata || {};
    const email = (authUser.email || '').toLowerCase();

    let fallbackRole: UserRole = 'student';
    if (email.startsWith('superadmin') || email.includes('superadmin@') || meta.role === 'platform_super_admin') {
      fallbackRole = 'platform_super_admin';
    } else if (email.startsWith('admin') || email.includes('admin@')) {
      fallbackRole = 'admin';
    } else if (email.startsWith('principal') || email.includes('principal@')) {
      fallbackRole = 'principal';
    }

    const resolvedRole = (meta.role || profileData?.preferences?.role || profileData?.role || fallbackRole) as UserRole;
    ```
- **Finding**:
  1. `meta.role` (user metadata in auth token, which can be passed on user registration) takes priority over the official `profileData.role` stored in PostgreSQL.
  2. `profileData?.preferences?.role` (a JSONB field that users can update via profile preferences!) takes precedence over `profileData.role`.
  3. Any email starting with `admin` or `principal` automatically falls back to administrative roles.
  4. In contrast, PostgreSQL's `public.get_current_user_role()` queries `public.profiles.role`. This causes severe client-vs-database desynchronization.
- **Correction**: Phase 1 must rewrite `mapAuthToUser` to strictly prioritize:
  ```typescript
  const resolvedRole = (profileData?.role || meta.role || 'student') as UserRole;
  ```

### Claim 1.2: `naac_coordinator` Mapping to `admin` in `roles.ts`
- **Audit Claim**: `naac_coordinator` is an independent role with its own distinct permissions.
- **Status**: `[INCORRECT]` (Frontend Registry Aliasing)
- **Source Evidence**:
  - `src/config/roles.ts#L177-L185`:
    ```typescript
    naac_coordinator: {
      role: 'admin', // Resolved to admin access as required
      label: 'NAAC Coordinator',
      home: '/admin/naac',
      allowedRoutes: ['/admin/naac', '/dashboard'],
      navItems: [{ label: 'NAAC Portal', path: '/admin/naac' }],
    },
    ```
- **Finding**: The `role` property in `ROLE_CONFIGS['naac_coordinator']` is hardcoded to `'admin'`. Any logic calling `ROLE_CONFIGS[user.role].role` evaluates the coordinator as an institutional administrator.
- **Correction**: Change property to `role: 'naac_coordinator'` in `src/config/roles.ts` during Phase 1.

### Claim 1.3: 19 Institutional Roles vs `driver` and `platform_super_admin`
- **Audit Claim**: The software has 16 or 19 roles; `driver` and `platform_super_admin` are extraneous.
- **Status**: `[PARTIALLY VERIFIED]` (Reconciled Registry)
- **Source Evidence**:
  - `src/context/AuthContext.tsx#L12-L34`: 21 union types.
  - `src/config/roles.ts`: Has both `transport_driver` (landing `/dashboard/transport_driver`) and `driver` (landing `/dashboard/driver`). Both exist in PostgreSQL `015_add_principal_role_constraint.sql#L21`.
  - `platform_super_admin`: Added in `027_multi_college_platform_architecture.sql` for a multi-tenant platform.
- **Finding**: The user's architecture specification is strict: **Independent deployment per college; no multi-tenant platform.**
- **Correction**:
  - The 19 institutional roles are maintained as distinct entities.
  - `driver` is documented as an operational route alias pointing to `TransportDriverDashboard`.
  - `platform_super_admin` is isolated as a deprecated multi-tenant artifact and must not be used in the college deployment.

---

## 2. Security & RLS Policy Vulnerability Claims

### Claim 2.1: Profile Role Self-Modification Protection
- **Audit Claim**: Authenticated users cannot change their own roles in `public.profiles`.
- **Status**: `[INCORRECT]` (Critical Security Finding `BUG-SEC-001`)
- **Source Evidence**:
  - `supabase/migrations/002_row_level_security.sql#L77-L81`:
    ```sql
    CREATE POLICY "Allow users to update own profile"
        ON public.profiles FOR UPDATE
        TO authenticated
        USING (id = auth.uid() OR public.get_current_user_role() = 'admin')
        WITH CHECK (id = auth.uid() OR public.get_current_user_role() = 'admin');
    ```
  - `supabase/migrations/017_auth_trigger_and_profiles.sql#L81-L84`: `trg_profiles_updated_at` only updates the timestamp.
- **Finding**: PostgreSQL RLS permits any authenticated user to update their own row. Without a `BEFORE UPDATE` trigger on `profiles`, any user can send `PATCH /rest/v1/profiles?id=eq.<id>` with `{ "role": "admin" }` to elevate privileges.
- **Remediation**: Deploy `protect_profile_role_update` trigger in Phase 1 raising an exception if `NEW.role <> OLD.role` and caller is not an `admin`.

### Claim 2.2: Broad SQL Policies in Migration 011 Snapshot
- **Audit Claim**: All tables have strict, role-bounded Row Level Security policies.
- **Status**: `[INCORRECT]` (Overly Broad Policies `BUG-RLS-001`)
- **Source Evidence**:
  - `supabase/migrations/011_institutional_complete_erp.sql#L409-L430`:
    ```sql
    CREATE POLICY "staff_records_all" ON public.staff_service_records FOR ALL TO authenticated USING (true);
    CREATE POLICY "staff_leaves_bal_all" ON public.staff_leave_balances FOR ALL TO authenticated USING (true);
    CREATE POLICY "payroll_runs_all" ON public.staff_payroll_runs FOR ALL TO authenticated USING (true);
    CREATE POLICY "payroll_items_all" ON public.staff_payroll_items FOR ALL TO authenticated USING (true);
    CREATE POLICY "fee_structures_all" ON public.fee_structures FOR ALL TO authenticated USING (true);
    CREATE POLICY "fee_receipts_all" ON public.fee_receipts FOR ALL TO authenticated USING (true);
    CREATE POLICY "att_sessions_all" ON public.class_attendance_sessions FOR ALL TO authenticated USING (true);
    CREATE POLICY "att_records_all" ON public.student_attendance_records FOR ALL TO authenticated USING (true);
    CREATE POLICY "hostel_rooms_all" ON public.hostel_rooms FOR ALL TO authenticated USING (true);
    CREATE POLICY "hostel_out_passes_all" ON public.hostel_out_passes FOR ALL TO authenticated USING (true);
    CREATE POLICY "reception_visitors_all" ON public.reception_visitors FOR ALL TO authenticated USING (true);
    ```
- **Finding**: Migration 011 created `FOR ALL TO authenticated USING (true)` on 22 critical institutional tables! Any authenticated student or guest token can read, insert, update, and delete staff payroll runs, fee receipts, and attendance sessions.
- **Remediation**: Phase 1 must drop these broad policies and deploy role-restricted policies using `public.get_current_user_role()`.

### Claim 2.3: Parent-Child Data Isolation
- **Audit Claim**: Parents can only access records of their linked children.
- **Status**: `[VERIFIED]`
- **Source Evidence**:
  - `supabase/migrations/024_student_parent_portal_complete_workflow.sql#L149-L180`: RLS on `student_attendance`, `exam_results`, and `student_fees` enforces `student_id IN (SELECT psl.student_id FROM public.parent_student_links psl WHERE psl.parent_id = auth.uid() AND psl.verified = true)`.
  - `src/components/parent/ParentChildSwitcherHeader.tsx#L40-L75`: Queries verified links only.

---

## 3. Academic & Attendance Business Logic Claims

### Claim 3.1: Attendance Denominator & Recalculation
- **Audit Claim**: Attendance is computed strictly as $(\text{Effective Present} / \text{Conducted Sessions}) \times 100$.
- **Status**: `[VERIFIED]`
- **Source Evidence**:
  - `src/services/supabase/database.ts#L446-L533`:
    ```typescript
    const totalConducted = Math.max(classConductedCount, studentAttendanceRecords.length);
    const effectivePresent = presentCount + (lateCount * 0.5);
    const overallPercentage = totalConducted > 0 ? Math.round((effectivePresent / totalConducted) * 100) : 0;
    ```
  - Attending 1 class out of 10 conducted yields 10%, never 100%.

### Claim 3.2: Duplicate Conducted Session Prevention
- **Audit Claim**: Teachers cannot duplicate conducted attendance sessions for the same class and period.
- **Status**: `[INCORRECT]` (Database Constraint Missing `BUG-ATT-001`)
- **Source Evidence**:
  - `supabase/migrations/011_institutional_complete_erp.sql#L208-L223`: Table `class_attendance_sessions` has no UNIQUE constraint on `(class_name, session_date, period_number, subject_code)`.
  - **Finding**: Submitting attendance twice creates two session rows, doubling `totalConducted`.
  - **Remediation**: Add constraint `UNIQUE (class_name, session_date, period_number, subject_code)` in Phase 1.

### Claim 3.3: Attendance Condonation Policy
- **Audit Claim**: Students between 65% and 75% receive condonation automatically.
- **Status**: `[REQUIRES RUNTIME TESTING / INSTITUTIONAL CONFIRMATION]`
- **Source Evidence**:
  - No automated condonation algorithm exists in code; `src/components/dashboards/principal/modules/AttendanceModule.tsx` displays shortage lists.
  - Condonation requires administrative discretion, fee payment, and medical documentation. Cannot be automated without institutional approval.

### Claim 3.4: Academic Evaluation — CPI vs Holistic Index
- **Audit Claim**: Composite Performance Index (CPI) = 50% Exams + 30% Attendance + 20% Assignments.
- **Status**: `[PARTIALLY VERIFIED]` (Clarified Distinction)
- **Source Evidence**:
  - `src/components/performance/PerformanceAnalytics.tsx#L125-L155`: Computes composite score using 50% exam marks + 30% attendance + 20% assignment completion.
  - **Finding**: This metric is an internal **CampusPro Holistic Engagement Index**, distinct from official credit-weighted university degree SGPA/CGPA.
  - **Correction**: Documented as CampusPro Engagement Score in `BUSINESS_LOGIC_AUDIT.md`.

### Claim 3.5: Grading Scale Overlaps
- **Audit Claim**: Grade ranges are 90-100 (A+), 80-89 (A), 70-79 (B+), 60-69 (B), 50-59 (C), 40-49 (P), <40 (F).
- **Status**: `[INCORRECT]` (Fractional Marks Undefined)
- **Source Evidence**:
  - Discrete integer boundaries leave fractional scores (e.g. 79.5%) undefined.
  - **Correction**: Standardized on half-open intervals:
    $[90, 100] \rightarrow \text{O/A+}$, $[80, 90) \rightarrow \text{A}$, $[70, 80) \rightarrow \text{B+}$, $[60, 70) \rightarrow \text{B}$, $[50, 60) \rightarrow \text{C}$, $[40, 50) \rightarrow \text{P}$, $[0, 40) \rightarrow \text{F}$.

---

## 4. Financial & Operational Subsystem Claims

### Claim 4.1: Fee Dual Lookup & Receipt Verification
- **Audit Claim**: Fee receipts can be looked up by either `student_id` or `roll_number`.
- **Status**: `[VERIFIED]`
- **Source Evidence**:
  - `src/services/supabase/database.ts#L415-L425`: Queries `.or(\`student_id.eq.${studentId},roll_number.eq.${rollNumber}\`)`.
  - Tested and confirmed in `scripts/test_student_portal_workflows_e2e.ts#L290-L330`.

### Claim 4.2: Payment Gateway Webhook Verification
- **Audit Claim**: Payments are cryptographically verified by bank gateway webhooks.
- **Status**: `[INCORRECT]` (Institutional Recording Ledger Only)
- **Source Evidence**:
  - `src/components/student/StudentFeesTab.tsx` and `StudentStoreTab.tsx` generate client-side transaction references (`TXN-REF-${Date.now()}`).
  - No external payment gateway webhook (Razorpay/Stripe HMAC verification) exists in `supabase/functions`.
  - **Finding**: The system currently functions as an **institutional cashier recording ledger**, not an integrated payment gateway.

### Claim 4.3: Atomic Store Stock Deductions
- **Audit Claim**: Store order stock deductions are completely atomic.
- **Status**: `[PARTIALLY VERIFIED]` (RPC is Atomic; Fallback is Not `BUG-STR-001`)
- **Source Evidence**:
  - `src/services/supabase/database.ts#L4050`: `supabase.rpc('place_store_order')` executes an atomic PostgreSQL transaction.
  - `src/services/supabase/database.ts#L4084-L4092`: If the RPC is unavailable, the fallback executes a non-atomic JavaScript `for` loop updating rows individually.
  - **Correction**: Enforce execution exclusively through the atomic PostgreSQL RPC function.

### Claim 4.4: Library Borrowing Limits
- **Audit Claim**: Library borrows enforce limits based on role (Student: 3, Faculty: 10).
- **Status**: `[INCORRECT]` (Hardcoded in Dialog `BUG-LIB-001`)
- **Source Evidence**:
  - `src/components/library/BookIssueDialog.tsx#L106-L107`: Hardcodes `currentBooks: 0, maxBooks: 5`.
  - **Finding**: Fails to query active rows in `book_issues`.
  - **Remediation**: Dynamically resolve active loans via database query in Phase 4.

### Claim 4.5: Staff Leave Balances Decrement
- **Audit Claim**: Staff leave approvals automatically deduct from `staff_leave_balances`.
- **Status**: `[INCORRECT]` (Missing Trigger `BUG-HR-001`)
- **Source Evidence**:
  - `src/components/hr/StaffLeaveManager.tsx#L71-L83`: Updates `staff_leave_applications.status` only.
  - No PostgreSQL trigger decrements `staff_leave_balances.casual_leave_remaining`.
  - **Remediation**: Add a PostgreSQL trigger in Phase 5 deducting approved days from `staff_leave_balances`.

---

## 5. Traceability Summary of Verified Claims

| Section | Claim | Source Verification Status | Documented In |
| :--- | :--- | :---: | :--- |
| **Auth** | Single-College Deployment Architecture | `[VERIFIED]` | `SECURITY_AUDIT.md` |
| **Auth** | Role Self-Modification Protection | `[INCORRECT]` | `SECURITY_AUDIT.md`, `MISSING_FEATURES_AND_BUGS.md` |
| **Auth** | AuthContext Metadata Precedence | `[INCORRECT]` | `ROLE_FEATURE_MATRIX.md`, `SECURITY_AUDIT.md` |
| **Roles** | 19 Authoritative Roles vs Aliases | `[PARTIALLY VERIFIED]` | `ROLE_FEATURE_MATRIX.md` |
| **Roles** | NAAC Coordinator Mapping to Admin | `[INCORRECT]` | `ROLE_FEATURE_MATRIX.md`, `MISSING_FEATURES_AND_BUGS.md` |
| **Roles** | Database Check Constraint Missing COE/HOD | `[INCORRECT]` | `ROLE_FEATURE_MATRIX.md`, `MISSING_FEATURES_AND_BUGS.md` |
| **Security**| Broad Migration 011 RLS Policies | `[INCORRECT]` | `SECURITY_AUDIT.md`, `MISSING_FEATURES_AND_BUGS.md` |
| **Security**| Parent-Child Isolation Subqueries | `[VERIFIED]` | `SECURITY_AUDIT.md`, `DATA_FLOW_MAP.md` |
| **Academics**| Attendance Denominator Formula | `[VERIFIED]` | `BUSINESS_LOGIC_AUDIT.md` |
| **Academics**| Duplicate Attendance Session Prevention | `[INCORRECT]` | `BUSINESS_LOGIC_AUDIT.md`, `MISSING_FEATURES_AND_BUGS.md` |
| **Academics**| Automated Attendance Condonation | `[REQUIRES CONFIRMATION]` | `BUSINESS_LOGIC_AUDIT.md` |
| **Academics**| Degree CGPA vs Holistic Engagement Index | `[PARTIALLY VERIFIED]` | `BUSINESS_LOGIC_AUDIT.md` |
| **Academics**| Grade Range Fractional Overlaps | `[INCORRECT]` | `BUSINESS_LOGIC_AUDIT.md` |
| **Finance** | Fee Receipts Dual-Lookup Retrieval | `[VERIFIED]` | `BUSINESS_LOGIC_AUDIT.md`, `DATA_FLOW_MAP.md` |
| **Finance** | Payment Gateway Cryptographic Webhook | `[INCORRECT]` | `BUSINESS_LOGIC_AUDIT.md` |
| **Logistics**| Atomic Store Stock Deduction | `[PARTIALLY VERIFIED]` | `BUSINESS_LOGIC_AUDIT.md`, `MISSING_FEATURES_AND_BUGS.md` |
| **Library** | Realtime Library Borrowing Quotas | `[INCORRECT]` | `BUSINESS_LOGIC_AUDIT.md`, `MISSING_FEATURES_AND_BUGS.md` |
| **HR** | Automated Staff Leave Balance Decrement | `[INCORRECT]` | `BUSINESS_LOGIC_AUDIT.md`, `MISSING_FEATURES_AND_BUGS.md` |
