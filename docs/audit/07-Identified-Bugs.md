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
| Frontend | Control Center configuration lived in each browser's `localStorage`; the published copy was read from admin-only `audit_logs`, so non-admin roles loaded DEFAULTS (a module disabled by an admin stayed open to them) | Fixed (044 + `superAdminService`) |
| Frontend | Release numbers came from an in-memory counter (v1.1.0 after every reload); rollback only searched that list; dashboards/pages/navigation/permissions/forms/workflows drafts were never published | Fixed |
| Frontend | `saveMasterConfiguration` applied edits straight to the local "published" cache and to `institutional_settings` with no draft/publish step | Fixed (saves the shared draft; goes live on Publish) |
| Frontend | Workflow definitions in `localStorage`; the editor ignored save failures and claimed "applied live" although nothing enforces workflows | Fixed (shared + honest message). Workflows remain configuration only |
| Frontend | `visualCustomizationService` / `VisualCustomizerContext` still use `localStorage` (used by the student complaints form) | Open |

## Library (found in the module scan)
| Bug | Status |
|-----|--------|
| `book_issues` / `library_books` RLS omitted the `librarian` role: the library's own role could not see issued books or manage the catalog | Fixed (043) |
| Issue dialog fell back to a direct insert on ANY error (e.g. "no copies available"), bypassing the stock check, then the parent page inserted a second time and showed success even when everything failed | Fixed: single transactional call, errors shown, dialog stays open |
| Return dialog fell back to `db.returnBook`, called a non-existent `db.getBookIssues()` (so no issued book could ever be found), and excluded Overdue books | Fixed |
| Renew only showed "Renewed for 14 days" and saved nothing | Fixed (`renew_library_book`, max 2 renewals) |
| `library_circulation` is a second, unused model of the same data | Open (consolidate) |
