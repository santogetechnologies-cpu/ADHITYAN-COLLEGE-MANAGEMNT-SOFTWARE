# Identified bugs (this pass)

See `01-Executive-Audit.md` for the full table with status. Quick index:

| Area | Bug | Status |
|------|-----|--------|
| Auth | Role from user_metadata (SEC-1) | Fixed in edge fns |
| Auth | mock-test-role bypass (SEC-2) | Removed from edge code; dev file pending |
| Auth | First-login account takeover (SEC-3) | Replaced |
| API | IDORs on parent/telemetry actions (SEC-4) | Fixed |
| API | Fake-success handlers (SEC-6) | Fixed / 501 |
| DB | Missing tables/RPCs (DB-1) | Migrations 028, 036 |
| DB | Conflicting 016–027 (DB-2) | Archived |
| DB | Pre-approved hostel passes (DB-3) | Fixed 029 |
| DB | phase_1_4_1 SQL defects (DB-4) | Fixed 029–033 |
| Config | Config drafts/rollback not persisted | Open |
| Frontend | Role from user_metadata / e-mail prefix in AuthContext | Fixed (profiles.role only) |
| Frontend | `naac_coordinator` config said role `admin` (not used by the guards, but wrong) | Fixed |
| Frontend | Receptionist had an empty menu | Fixed (Front Desk, Admissions, Student & Parent Accounts) |
| Frontend | Finance manager / financier / accountant menu items pointed at `/admin/finance` and `/admin/accounts`, which only admin/principal may open (clicking bounced them) | Fixed: new `/finance` and `/accounts` routes; `node scripts/check-navigation.cjs` verifies all 21 roles |
| Frontend | Control Center (roles, modules, workflows) and the visual form customizer are stored in each browser's `localStorage`: an admin's customization never reaches other users/devices | Open (next) |
