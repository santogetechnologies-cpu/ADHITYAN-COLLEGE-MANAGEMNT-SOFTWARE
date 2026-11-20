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

## Module switches (Control Center)
| Bug | Status |
|-----|--------|
| `permissionEnforcementService` tested `mod.status === 'disabled'`, but modules have `enabled` and no `status`: disabling a module never blocked any page | Fixed (`mod.enabled === false`) |
| The route→module map used ids that do not exist (`alumni`, `medical`, `sports`, `compliance`, `communication`, `departments`), so those pages could never be switched off | Fixed: added Alumni / Medical / Sports modules; `/certificate-generation`→`certificates`, `/admin/departments`→`academics`, message-parents→`broadcasts` |
| Config was only refreshed at start-up in other users' tabs | Fixed: refresh on focus and every minute |

## Examinations (found in the module scan)
| Bug | Status |
|-----|--------|
| **Unpublished marks readable by the student and the parent**: old permissive policies on `exam_results` bypassed the `is_published` rule | Fixed (045) |
| Any teacher could edit any student's result; unpublished exams/timetables visible to all signed-in users | Fixed (045) |
| `examService` was written for another schema: read `exams.title`/`total_marks` (not columns), inserted schedules without the required `exam_id`, saved marks without `student_name`/`class_name`, upserted on a unique constraint that did not exist, "published" by writing `status='published'` (rejected by the CHECK constraint) — publishing and marks saving could never succeed | Fixed (rewritten against the real tables; server functions) |
| Scheduling screen never created an exam; showed invented student counts, durations and statuses | Rebuilt |
| "Workflows" tab invented online exams from the row index, counted every student as a participant, offered Monitor Live / End Exam for an engine that does not exist | Replaced by a real progress board |
| "Grading" screen grouped by a non-existent `exam_schedule_id` (all counts 0), guessed MCQ vs subjective from names, could not enter marks for a student without a result | Replaced by Marks entry (roster, validation, grades, locks after publish) |
| Result pass mark hard-coded at 35 in analytics; grades computed in the browser | Fixed: pass mark from the paper (or the institution's pass %), grades on the server |
| Hall tickets were created with invented defaults (hall B-302, seat 14-B, 88% attendance, 'Semester 4', a fake COE signature) and `issueHallTicket` swallowed errors; student screen invented an exam and matched tickets by fuzzy name | Fixed (046, rewritten screens) |
| `record_fee_payment` / `record_admission_deposit` failed where pgcrypto lives in the `extensions` schema | Fixed (search_path) |
| Alumni directory (names, e-mail, phone) readable by every signed-in user including students and parents | Fixed (047) |
| Alumni donations/mentorship tabs showed invented figures (₹12.5L, 78 mentors, 92% success) and hard-coded rows; realtime listened to a table that does not exist (`alumni_members`) | Fixed (rebuilt on real tables) |
| Certificates: browser invented the number (`CRT-2024-####`), typed the student name, auto-approved, and displayed a certificate even when the database insert failed; realtime listened to a non-existent table | Fixed (048, screen rebuilt) |
| Teachers could read every student's allergies and medical conditions (policy allowed role `teacher`) | Fixed (049) |
| Medical screen: invented totals (2847 records, 23 visits, 7 alerts), fake flu outbreak, fake emergency numbers, "100% updated"; infirmary table read non-existent columns (`complaint`, `doctor_name`); New Record / Log Visit only showed toasts | Fixed (rebuilt) |
