# Authoritative Institutional Role-Feature Matrix & Access Control Specification

> **Document Version:** 2.2.0 (Phase 0 Complete Source Verification)  
> **Deployment Architecture:** Single-Institution Dedicated Deployment (Isolated Supabase PostgreSQL per College)  
> **Authoritative Role Registry:** Exactly 19 Distinct Institutional Roles  
> **Special Role Investigations:** `platform_super_admin` (Deprecated multi-tenant platform key), `driver` (Transport route alias), `naac_coordinator` (Mapping to admin in frontend registry)

---

## 1. Multi-Tier Role Reconciliation Table

This table comprehensively compares how each role is handled across all 7 layers of the system:
1. **Frontend Role Registry** (`src/config/roles.ts`)
2. **AuthContext Role Resolution** (`src/context/AuthContext.tsx#L60-L100`)
3. **Route Guards & Paths** (`src/components/guards/ProtectedRoute.tsx`, `src/App.tsx`)
4. **Account Provisioning** (`src/services/bulkAccountProvisioningService.ts`, `src/server/adminBackend.ts`)
5. **Database Role Constraints** (`supabase/migrations/015_add_principal_role_constraint.sql#L12-L31`)
6. **Backend Authorization** (`src/services/permissionEnforcementService.ts`, `src/server/adminBackend.ts`)
7. **Edge Function Authorization** (`supabase/functions/admin-create-user/index.ts`, `supabase/functions/admin-users/index.ts`)

| Role Key | 1. Frontend Registry | 2. AuthContext Resolution | 3. Route Guard Access | 4. Account Provisioning | 5. Database Constraint | 6. Backend Auth | 7. Edge Function Auth | Status & Analysis |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `admin` | Configured (`/admin`) | Resolved (`email.startsWith('admin')` or profile) | Global access (`isRouteAllowed`) | Can provision all roles | Verified in check constraint | Full permissions | Verified (`admin-users`, `admin-create-user`) | **Aligned & Verified** |
| `principal` | Configured (`/dashboard/principal`) | Resolved (`email.startsWith('principal')` or profile) | `/dashboard/principal`, `/admin/*` | Can approve admissions & view | Verified in check constraint | Full oversight | Read-only in Edge Functions | **Aligned & Verified** |
| `teacher` | Configured (`/dashboard/teacher`) | Resolved via profile | `/dashboard/teacher`, `/teachers/*` | Provisioned by Admin | Verified in check constraint | Faculty permissions | Denied (403) | **Aligned & Verified** |
| `hod` | Configured (`/dashboard/teacher`) | Resolved via profile | `/dashboard/teacher`, `/teachers/*` | Provisioned by Admin | **Missing in 015 constraint** | Faculty + Department oversight | Denied (403) | **Constraint Bug (`BUG-ROLE-001`)** |
| `coe` | Configured (`/exam-management`) | Resolved via profile | `/exam-management` | Provisioned by Admin | **Missing in 015 constraint** | Exam creation & grading | Denied (403) | **Constraint Bug (`BUG-ROLE-001`)** |
| `naac_coordinator`| Configured (maps `role: 'admin'`) | Resolved via profile | `/admin/naac` | Provisioned by Admin | Verified in check constraint | NAAC Criteria CRUD | Denied (403) | **Registry Mismatch (`BUG-ROLE-002`)** |
| `student` | Configured (`/dashboard/student`) | Default fallback role | `/dashboard/student`, `/store`, etc. | Bulk CSV Provisioning | Verified in check constraint | Student isolated access | Denied (403) | **Aligned & Verified** |
| `parent` | Configured (`/dashboard/parent`) | Resolved via profile | `/dashboard/parent`, `/track-bus`, etc.| Bulk CSV & Student Linking | Verified in check constraint | Linked ward access only | Denied (403) | **Aligned & Verified** |
| `receptionist`| Configured (`/dashboard/receptionist`)| Resolved via profile | `/dashboard/receptionist`, `/admission-*`| Provisioned by Admin | Verified in check constraint | Front office CRUD | Denied (403) | **Aligned & Verified** |
| `finance_manager`| Configured (`/dashboard/finance_manager`)| Resolved via profile| `/dashboard/finance_manager`, `/admin/finance`| Provisioned by Admin | Verified in check constraint | Financial ledger CRUD | Denied (403) | **Aligned & Verified** |
| `accountant` | Configured (`/dashboard/accountant`)| Resolved via profile | `/dashboard/accountant`, `/admin/accounts`| Provisioned by Admin | Verified in check constraint | Ledger & payroll items | Denied (403) | **Aligned & Verified** |
| `financier` | Configured (`/dashboard/financier`)| Resolved via profile | `/dashboard/financier`, `/admin/finance`| Provisioned by Admin | Verified in check constraint | Cashier desk & fee receipts | Denied (403) | **Aligned & Verified** |
| `store_manager`| Configured (`/dashboard/store_manager`)| Resolved via profile| `/dashboard/store_manager`, `/store` | Provisioned by Admin | Verified in check constraint | Store inventory CRUD | Denied (403) | **Aligned & Verified** |
| `storekeeper`| Configured (`/dashboard/storekeeper`)| Resolved via profile | `/dashboard/storekeeper`, `/store` | Provisioned by Admin | Verified in check constraint | Store dispatch & orders | Denied (403) | **Aligned & Verified** |
| `transport_driver`| Configured (`/dashboard/transport_driver`)| Resolved via profile| `/dashboard/transport_driver`, `/track-bus`| Provisioned by Admin | Verified in check constraint | Vehicle fleet & transit logs | Denied (403) | **Aligned & Verified** |
| `hr_manager` | Configured (`/dashboard/hr_manager`)| Resolved via profile | `/dashboard/hr_manager` | Provisioned by Admin | Verified in check constraint | Staff records & payroll | Denied (403) | **Aligned & Verified** |
| `librarian` | Configured (`/dashboard/librarian`)| Resolved via profile | `/dashboard/librarian`, `/library-management`| Provisioned by Admin | Verified in check constraint | OPAC catalog & loans | Denied (403) | **Aligned & Verified** |
| `hostel_warden`| Configured (`/dashboard/hostel_warden`)| Resolved via profile| `/dashboard/hostel_warden` | Provisioned by Admin | Verified in check constraint | Hostel rooms & out-passes | Denied (403) | **Aligned & Verified** |
| `placement_officer`| Configured (`/dashboard/placement_officer`)| Resolved via profile| `/dashboard/placement_officer` | Provisioned by Admin | Verified in check constraint | Placement drives CRUD | Denied (403) | **Aligned & Verified** |
| *`driver` (alias)* | Configured (`/dashboard/driver`) | Resolved via profile | `/dashboard/driver`, `/track-bus` | Provisioned by Admin | Verified in check constraint | Same as `transport_driver` | Denied (403) | **Route Alias (Keep distinct)** |
| *`platform_super_admin`* | Configured (`/platform-admin`) | Resolved (`email.startsWith('superadmin')`)| `/platform-admin/*` | N/A (Multi-tenant artifact) | **Not in 015 constraint** | Deprecated platform key | Denied (403) | **Architecture Conflict (Isolate)** |

---

## 2. Dedicated Investigation of Special Roles

### Investigation A: `naac_coordinator` Mapping to `admin` in `roles.ts`
- **Source Finding**: In `src/config/roles.ts#L177-L185`:
  ```typescript
  naac_coordinator: {
    role: 'admin', // Resolved to admin access as required
    label: 'NAAC Coordinator',
    home: '/admin/naac',
    allowedRoutes: ['/admin/naac', '/dashboard'],
    navItems: [
      { label: 'NAAC Portal', path: '/admin/naac' },
    ],
  },
  ```
- **Discrepancy**: The property `role` inside the `naac_coordinator` object is set to `'admin'` instead of `'naac_coordinator'`.
- **Impact**: When the system checks `isRouteAllowed(user.role, path)` or evaluates permission capabilities, a user with `role = 'naac_coordinator'` may be misclassified or granted broader admin privileges than intended.
- **Resolution**: In Phase 1, correct `src/config/roles.ts` to `role: 'naac_coordinator'`, and ensure that route `/admin/naac` explicitly permits `allowedRoles={['admin', 'principal', 'naac_coordinator']}` (which is already set in `src/App.tsx#L351`).

### Investigation B: `driver` vs `transport_driver`
- **Source Finding**:
  - `src/config/roles.ts#L150`: Defines `transport_driver` (landing `/dashboard/transport_driver`).
  - `src/config/roles.ts#L160`: Defines `driver` (landing `/dashboard/driver`).
  - `src/pages/Dashboard.tsx#L130-L133`: Both render `<TransportDriverDashboard />`.
  - `supabase/migrations/015_add_principal_role_constraint.sql#L21`: Both `'driver'` and `'transport_driver'` exist in the database check constraint.
- **Resolution**: Both values are valid and supported in the software. They must not be silently merged. `transport_driver` serves as the official administrative designation (Chief Transit Officer), while `driver` serves as the operational mobile desk.

### Investigation C: `platform_super_admin` vs Single-Institution Architecture
- **Source Finding**:
  - `src/context/AuthContext.tsx#L64`: `if (email.startsWith('superadmin')) fallbackRole = 'platform_super_admin'`.
  - `src/App.tsx#L330-L345`: Route `/platform-admin` renders `PlatformAdminLayout` with multi-college management.
  - `supabase/migrations/027_multi_college_platform_architecture.sql`: Added `platform_colleges`.
- **Architectural Invariant**: The user's specification is unequivocal:
  > **Each college has its own completely separate software deployment, its own Supabase project/database, and its own Super Admin. No multi-college platform. No platform-level Super Admin. No college switching between institutions. One college must never access another college's data.**
- **Resolution**: In this dedicated single-institution deployment, all administrative authority belongs to institutional `admin` (or Super Admin Control Center in `/admin/control-center`). The `/platform-admin` routes and `platform_super_admin` role are isolated artifacts that must be deactivated from the college deployment navigation without altering the database schema during Phase 0.

---

## 3. Authoritative 19-Column Granular Permission Matrix

**Legend:**
- **`C`**: Create new records
- **`R`**: Read records
- **`U`**: Update existing records
- **`D`**: Delete / Archive records
- **`—`**: No access permitted

| Subsystem / Feature | Admin | Principal | Teacher | HOD | COE | NAAC Coord | Student | Parent | Receptionist | Finance Mgr | Accountant | Financier | Store Mgr | Storekeeper | Driver | HR Mgr | Librarian | Warden | Placement |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Super Admin Control Center** | CRUD | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| **User Directory (`profiles`)** | CRUD | R | — | — | — | — | — | — | — | — | — | — | — | — | — | R | — | — | — |
| **Departments & Courses** | CRUD | CRUD | R | R | R | R | R | R | R | R | R | R | — | — | — | R | R | — | R |
| **Faculty Subject Allocations** | CRUD | CRUD | R | R | — | — | — | — | — | — | — | — | — | — | — | R | — | — | — |
| **Class Timetables** | CRUD | CRUD | CRUD | CRUD | R | R | R | R | R | — | — | — | — | — | — | — | — | — | — |
| **Admission Applications** | CRUD | CRUD | — | — | — | — | — | — | CR | R | — | — | — | — | — | — | — | — | — |
| **Account Provisioning** | CRUD | CRUD | — | — | — | — | — | — | CR | — | — | — | — | — | — | — | — | — | — |
| **Parent-Student Links** | CRUD | CRUD | R | R | — | — | — | R | CR | — | — | — | — | — | — | — | — | — | — |
| **Conducted Class Sessions** | CRUD | CRUD | CRUD | CRUD | — | R | R | R | — | — | — | — | — | — | — | — | — | — | — |
| **Student Attendance Marking** | CRUD | CRUD | CRUD | CRUD | — | R | R | R | — | — | — | — | — | — | — | — | — | — | — |
| **Coursework & Assignments** | CRUD | R | CRUD | CRUD | — | — | CR | R | — | — | — | — | — | — | — | — | — | — | — |
| **Lesson Logs (`daily_updates`)**| CRUD | CRUD | CRUD | CRUD | — | R | — | — | — | — | — | — | — | — | — | — | — | — | — |
| **Master Exams (`exams`)** | CRUD | CRUD | R | R | CRUD | R | R | R | — | — | — | — | — | — | — | — | — | — | — |
| **Exam Schedules** | CRUD | CRUD | R | R | CRUD | R | R | R | — | — | — | — | — | — | — | — | — | — | — |
| **Hall Tickets** | CRUD | CRUD | R | R | CRUD | — | R | R | — | — | — | — | — | — | — | — | — | — | — |
| **Exam Marks & Results** | CRUD | CRUD | CRUD | CRUD | CRUD | R | R | R | — | — | — | — | — | — | — | — | — | — | R |
| **Fee Structures** | CRUD | R | — | — | — | — | R | R | R | CRUD | R | R | — | — | — | — | — | — | — |
| **Student Fee Accounts** | CRUD | R | — | — | — | — | R | R | R | CRUD | CRUD | CRUD | — | — | — | — | — | — | — |
| **Fee Receipts & Payments** | CRUD | R | — | — | — | — | R | R | CR | CRUD | CRUD | CRUD | — | — | — | — | — | — | — |
| **Financial Ledger** | CRUD | R | — | — | — | — | — | — | — | CRUD | CRUD | R | — | — | — | — | — | — | — |
| **Scholarships Master** | CRUD | CRUD | — | — | — | R | R | R | R | CRUD | R | R | — | — | — | — | — | — | — |
| **Campus Store Catalog** | CRUD | R | R | R | — | — | R | R | R | R | — | — | CRUD | R | — | — | — | — | — |
| **Store Orders & POS** | CRUD | R | — | — | — | — | CR | CR | — | R | — | — | CRUD | CRUD | — | — | — | — | — |
| **Inventory Stock Ledger** | CRUD | R | — | — | — | — | — | — | — | R | R | — | CRUD | CRUD | — | — | — | — | — |
| **Transport Vehicles & Routes**| CRUD | R | — | — | — | — | R | R | R | R | — | — | — | — | CRUD | — | — | — | — |
| **Driver Transit Progress** | CRUD | R | — | — | — | — | R | R | — | — | — | — | — | — | CRUD | — | — | — | — |
| **Staff Service Records** | CRUD | R | — | — | — | — | — | — | — | R | R | — | — | — | — | CRUD | — | — | — |
| **Staff Leave Applications** | CRUD | CRUD | CR | CR | CR | CR | — | — | CR | CR | CR | CR | CR | CR | CR | CRUD | CR | CR | CR |
| **Staff Payroll Runs** | CRUD | R | — | — | — | — | — | — | — | R | R | — | — | — | — | CRUD | — | — | — |
| **Library Book Catalog (OPAC)**| CRUD | R | R | R | — | R | R | R | — | — | — | — | — | — | — | — | CRUD | — | — |
| **Library Circulation** | CRUD | R | R | R | — | — | R | R | — | — | — | — | — | — | — | — | CRUD | — | — |
| **Hostel Rooms & Occupancy** | CRUD | R | — | — | — | — | R | R | R | R | — | — | — | — | — | — | — | CRUD | — |
| **Hostel Out-Passes** | CRUD | R | — | — | — | — | CR | R | — | — | — | — | — | — | — | — | — | CRUD | — |
| **Placement Drives & Offers** | CRUD | R | R | R | — | R | CR | — | — | — | — | — | — | — | — | — | — | — | CRUD |
| **NAAC Accreditation Metrics** | CRUD | CRUD | R | R | — | CRUD | — | — | — | — | — | — | — | — | — | — | — | — | — |
| **Campus Concerns / Complaints**| CRUD | CRUD | R | R | — | — | CRUD | CRUD | R | — | — | — | — | — | — | — | — | R | — |
| **Disciplinary Incidents** | CRUD | CRUD | CR | CR | — | — | R | R | — | — | — | — | — | — | — | — | — | CR | — |
| **Medical Infirmary Visits** | CRUD | R | — | — | — | — | R | R | R | — | — | — | — | — | — | — | — | R | — |
| **College Events & Calendar** | CRUD | CRUD | R | R | R | R | R | R | R | R | R | R | R | R | R | R | R | R | R |
