# Authoritative Missing Features, Gaps & Bug Registry

> **Document Version:** 2.2.0 (Phase 0 Complete Source Verification)  
> **Deployment Architecture:** Single-Institution Dedicated Deployment  
> **Traceability:** Every issue is assigned a unique identifier (`BUG-*` or `GAP-*`), accompanied by its exact source location, impact severity, and verified remediation.

---

## 1. Verified Database & Security Vulnerabilities (`BUG-*`)

| Bug ID | Subsystem / Table | Exact Location | Severity | Vulnerability & Current Behavior | Verified Remediation |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `BUG-SEC-001` | User Security / `profiles` | `supabase/migrations/002_row_level_security.sql#L77-L81` | **Critical (P0)** | RLS policy `USING (id = auth.uid())` allows authenticated users to send PATCH requests modifying their own `role` column to `'admin'` via PostgREST. | Deploy PostgreSQL `BEFORE UPDATE` trigger on `public.profiles` raising an exception if `NEW.role <> OLD.role` and caller is not an `admin`. |
| `BUG-SEC-002` | Client Auth / `AuthContext` | `src/context/AuthContext.tsx#L60-L75` | **Critical (P0)** | `mapAuthToUser` prioritizes `authUser.user_metadata.role`, `preferences.role`, and email prefixes over database `profileData.role`, causing client-server role desync. | Rewrite `mapAuthToUser` to strictly prioritize the database `profileData.role`. |
| `BUG-RLS-001` | Class Attendance / `class_attendance_sessions` | `supabase/migrations/011_institutional_complete_erp.sql#L419-L420` | **High (P0)** | RLS policy is defined as `FOR ALL TO authenticated USING (true)`, allowing any authenticated user (including students) to modify or delete attendance sessions. | Replace policy with role-restricted check: `USING (public.get_current_user_role() IN ('teacher', 'hod', 'admin', 'principal'))`. |
| `BUG-ROLE-001` | User Profiles / `profiles` | `supabase/migrations/015_add_principal_role_constraint.sql#L12-L31` | **High (P1)** | Check constraint `profiles_role_check` is missing `'coe'` and `'hod'`, causing account creation for these roles to fail with check constraint violations. | Execute migration dropping constraint and re-adding constraint with all 19 official roles including `'coe'` and `'hod'`. |
| `BUG-ROLE-002` | Role Config / `naac_coordinator` | `src/config/roles.ts#L177-L185` | **Medium (P1)** | `ROLE_CONFIGS['naac_coordinator']` has `role: 'admin'`, causing coordinator to be evaluated as institutional admin in permission checks. | Correct `role: 'naac_coordinator'` in `src/config/roles.ts`. |
| `BUG-ATT-001` | Class Attendance / `class_attendance_sessions` | `supabase/migrations/011_institutional_complete_erp.sql#L208-L223` | **High (P1)** | Lacks a UNIQUE constraint on `(class_name, session_date, period_number, subject_code)`, allowing duplicate session conduct records. | Add constraint `UNIQUE (class_name, session_date, period_number, subject_code)` on `class_attendance_sessions`. |
| `BUG-CONCERN-001` | Grievance Trigger / `concerns` | `supabase/migrations/005_realtime_setup.sql#L18-L35` | **Medium (P2)** | Trigger `trg_notify_new_concern` references non-existent column `NEW.category` instead of `concern_type`, causing unhandled exceptions on inserts. | Alter procedure to check `COALESCE(NEW.concern_type, 'General')`. |
| `BUG-EXAM-001` | Examination Results / `exam_results` | `supabase/migrations/022_academic_examination_system.sql#L45-L60` | **Low (P2)** | Column `student_name` has a NOT NULL constraint without a default, causing inserts supplying only `student_id` to fail. | Add default subquery `DEFAULT (SELECT name FROM profiles WHERE id = student_id)`. |
| `BUG-HR-001` | Staff Leave Engine / `staff_leave_balances` | `src/components/hr/StaffLeaveManager.tsx#L71-L130` | **Medium (P2)** | Approving a staff leave application updates `staff_leave_applications` but never decrements `staff_leave_balances.casual_leave_remaining`. | Add PostgreSQL trigger on `staff_leave_applications` decrementing corresponding leave balance when `status = 'Approved'`. |
| `BUG-LIB-001` | Library Loans / `book_issues` | `src/components/library/BookIssueDialog.tsx#L106-L107` | **Medium (P2)** | Hardcodes `currentBooks: 0, maxBooks: 5` rather than querying active rows in `book_issues`, bypassing borrowing limits. | Query `book_issues` for active student loans and enforce role borrowing limits dynamically. |
| `BUG-STR-001` | Campus Store / `store_products` | `src/services/supabase/database.ts#L4064-L4092` | **Medium (P2)** | If `place_store_order` RPC is unavailable, client fallback executes a non-atomic loop susceptible to race conditions. | Enforce that order placement routes exclusively through the atomic PostgreSQL RPC function. |

---

## 2. Gaps & Partial Integrations Registry (`GAP-*`)

| Gap ID | Subsystem / Feature | Component File | Severity | Current Incomplete State | Required Backend / Full Stack Resolution |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `GAP-ADM-001` | Administrative Reports | `src/pages/admin/AdminReports.tsx` | **Medium (P2)** | Export buttons trigger browser `window.print()` instead of downloadable CSV/Excel files. | Integrate client-side CSV/XLSX generator pulling live records from `profiles`, `finance_transactions`, and `student_attendance`. |
| `GAP-PRIN-001` | Principal Executive Reports | `src/components/dashboards/principal/modules/ReportsModule.tsx` | **Medium (P2)** | Report summaries rely on browser print preview without structured file export. | Add downloadable CSV/PDF export using standard table data serializing utilities. |
| `GAP-TCH-001` | Faculty Progress Reports | `src/pages/teachers/GenerateReport.tsx` | **Medium (P2)** | Progress report compilation lacks direct transcript export. | Add clean progress card export format with college crest, marks breakdown, and attendance percentage. |
| `GAP-FIN-001` | Fee Payment Reminders | `src/components/dashboards/FinanceManagerDashboard.tsx` | **Low (P3)** | Records fee reminders in `fee_payment_reminders` table, but external SMS delivery requires an external SMS gateway API webhook. | Connect Supabase Edge Function to SMS/WhatsApp provider or maintain in-app notification records. |
| `GAP-TRN-001` | Live Bus GPS Telematics | `src/pages/TrackSchoolBus.tsx` | **Low (P3)** | Bus tracker renders route stops, vehicle details, driver phone, but GPS map pin uses predefined coordinate routes. | Connect to live telematics coordinates table or vehicle hardware GPS stream endpoint. |
| `GAP-LIB-001` | Library Barcode Scanner | `src/components/library/QRScannerDialog.tsx` | **Low (P3)** | Camera-based barcode scanner requires HTTPS and camera hardware, failing gracefully on desktops without camera. | Add manual ISBN search input box as prominent fallback alongside camera viewfinder. |
| `GAP-NAC-001` | NAAC SSR Export Bundle | `src/pages/naac/Reports.tsx` | **Medium (P2)** | Displays criteria metrics and evidence links, but lacks one-click compiled SSR document bundler. | Implement automated report bundler compiling all 7 criteria metrics and file attachment links into an executive document. |
| `GAP-SPT-001` | Sports Tournament Roster | `src/pages/SportsManagement.tsx` | **Low (P3)** | Team rosters display names; player jersey numbers and match statistics can be expanded into detailed stat sheets. | Add player stats modal tracking goals, points, wickets, and tournament participation history. |
