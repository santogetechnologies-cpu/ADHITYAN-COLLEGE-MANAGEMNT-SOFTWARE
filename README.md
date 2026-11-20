# Adhityan Group of Institutions — College Management ERP

A production-grade College Management ERP built with React, TypeScript, Tailwind CSS, Vite, and Supabase (PostgreSQL with Row Level Security).

---

## 1. Supported Institutional Roles (13 Roles)

The ERP enforces strict Role-Based Access Control (RBAC) across 13 user roles:
1. `admin` — System Administrator
2. `principal` — Principal / Dean
3. `teacher` — Teaching Faculty & Clinical Trainers
4. `student` — Undergraduate Vocational Students
5. `parent` — Parents & Guardians
6. `finance_manager` — Chief Financial Officer
7. `financier` — Billing & Cashier Desk
8. `accountant` — Ledger & Audit Officer
9. `store_manager` — Central Store & Procurement
10. `storekeeper` — Counter Fulfillment & Inventory
11. `transport_driver` — Transit Fleet Officer
12. `driver` — Bus Driver & Route Operator
13. `receptionist` — Front Desk Receptionist

---

## 2. Official College Courses

The ERP is standardized around the 9 official institutional programs:
1. B.VOC Medical Lab Technology (MLT)
2. B.VOC Dialysis Technology
3. B.VOC Radiology & Medical Imaging Technology
4. B.VOC Cardiac Care Technology
5. B.VOC Operation Theatre Technology
6. B.VOC Hospital Administration (3 Years)
7. Logistics & Supply Chain Management (1 Year)
8. Hospitality Management (1 Year)
9. Hospital Administration (1 Year)

---

## 3. Database Setup & Migrations

### Prerequisites
- A Supabase project (e.g. `https://<your-project-id>.supabase.co`)
- The project's `anon` / `publishable` key and `service_role` key (found in Supabase Dashboard → Project Settings → API).

### Method A: Execute via Supabase SQL Editor (Recommended)
1. Open your Supabase Dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Navigate to **SQL Editor**.
3. Open `supabase/migrations/all_migrations.sql`.
4. Copy and paste the entire contents into the SQL Editor and click **Run**.
5. This applies all tables, RLS policies, storage buckets, triggers, and courses in one execution.

### Method B: Using Supabase CLI
```bash
# Link your project
supabase link --project-ref <your-project-id>

# Push all migrations
supabase db push
```

---

## 4. Seeding Institutional Users & Sample Data

The seed script (`scripts/seed.ts`) provisions the 13 institutional users in Supabase Auth, links them to the `profiles` table with correct RBAC roles, and seeds departments, store products, library books, and transport vehicles.

### Running the Seed Script:

**On Windows (PowerShell):**
```powershell
$env:SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
npx tsx scripts/seed.ts
```

**On Linux / macOS / Git Bash:**
```bash
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key" npx tsx scripts/seed.ts
```

### Seeded Credentials Reference:
| Role | Email | Password |
| :--- | :--- | :--- |
| `admin` | `admin@adhityan.edu.in` | `Adhityan@Admin2026!` |
| `principal` | `principal@adhityan.edu.in` | `Principal@Adhityan2026!` |
| `teacher` | `teacher@adhityan.edu.in` | `Teacher@Adhityan2026!` |
| `student` | `student@adhityan.edu.in` | `Student@Adhityan2026!` |
| `parent` | `parent@adhityan.edu.in` | `Parent@Adhityan2026!` |
| `finance_manager` | `financemanager@adhityan.edu.in` | `Finance@Adhityan2026!` |
| `financier` | `financier@adhityan.edu.in` | `Financier@Adhityan2026!` |
| `accountant` | `accountant@adhityan.edu.in` | `Accountant@Adhityan2026!` |
| `store_manager` | `storemanager@adhityan.edu.in` | `StoreManager@Adhityan2026!` |
| `storekeeper` | `storekeeper@adhityan.edu.in` | `StoreKeeper@Adhityan2026!` |
| `transport_driver` | `transportdriver@adhityan.edu.in` | `Transport@Adhityan2026!` |
| `driver` | `driver@adhityan.edu.in` | `Driver@Adhityan2026!` |
| `receptionist` | `receptionist@adhityan.edu.in` | `Reception@Adhityan2026!` |

---

## 5. Development & Build

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev

# Run TypeScript compilation check
npx tsc --noEmit

# Run ESLint check
npm run lint

# Build for production
npm run build
```
