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
| NAAC evidence readable by students and parents; teachers could delete it; uploads saved only the file name (the file was never stored) so View/Download could not work | Fixed (050) |
| NAAC criterion pages showed three invented metrics, invented "recent activity", hand-typed completion %; Reports "Generate" waited 3 seconds and logged to the console; Settings "Save" buttons only showed a success toast | Fixed (rebuilt) |
| `documents` storage bucket is public-read (admission documents reachable by URL); failed uploads were embedded as base64 inside the application | Fixed for admissions (070); older files must be re-uploaded |
| Sports: adding an event/team showed success and kept it on screen even when saving failed; Delete only removed it from the page (never from the database, it came back on refresh); invented defaults (100 participants, 8 teams, 10 members, "470+" players); `members` read from a column that is `members_count` | Fixed (rebuilt on `sportsService`) |
| Disciplinary incidents readable and resolvable by every teacher; `resolveIncident` ignored RLS rejections (0 rows updated) and the UI still said "Action Recorded"; reporting a failed save kept the incident on screen; invented student ID `ST001` and class `B.VOC MLT - Semester 1` | Fixed (051) |
| Hostel warden dashboard called `db.getProfiles()` which does not exist, so the whole screen failed to load; out-pass: parent consent could be ticked by the student, any status could be written, broadcast notification to every user when the student was unmatched, invented capacity (650/612/38) and parent phone (9876543210) | Fixed (052 + dashboard) |
| Librarian dashboard and HR leave manager called non-existent `db.getProfiles()`; parent "contact college" fallback called non-existent `db.getTeachers()`; HR "add staff" called non-existent `db.createStaffServiceRecord()`; names read from `full_name` (profiles have `name`) | Fixed |
| Teacher marks screen saved results directly with `published: true`, graded in the browser (fixed 90/80/70 cut-offs) and could create exams; Parent results fabricated pass at 50% and grade bands; principal exam module read non-existent `subject_name`/`status` | Fixed |
| `LoginForm` role-mismatch path called an undefined `logout` (ReferenceError instead of the "Access Denied" flow); Admin dashboard threw on `students` (undefined); Admissions management view crashed (Select not imported); user-account status toggle/password reset called non-existent service methods; dev `adminBackend` threw ReferenceError for schedule/record-entrance actions | Fixed |
| **CRITICAL**: `staff_service_records` policy `ALL USING (true)` — any signed-in user (student, parent) could read and modify every employee's salary, PAN, UAN and bank account | Fixed (053) |
| Payroll computed in the browser with hard-coded EPF 12% (uncapped), ESI 0.75%, PT ₹200, crude 10% TDS; leave without pay never deducted; 31 days hard-coded; payslip numbers and bank references invented (`NEFT-SBIN2610…`); runs marked "Disbursed" with no payment; bank export used one hard-coded account/IFSC for every employee; payslip printed invented PAN/UAN/IFSC and a fixed institution name | Fixed (053 + rebuilt screen) |
| Transport: any driver could update/delete any bus, stop, rider log or maintenance record; all signed-in users could read every bus including driver phone and live location; dashboard defaulted to the first bus when the driver had none, faked live GPS ("simulator") when location was blocked, invented speed/ETA/rider counts and claimed SMS to parents | Fixed (054 + dashboard) |
| Placement: no student screen existed; students could insert/update their own application (CGPA, round, status) directly; no deadline/eligibility/duplicate checks; officer dashboard showed invented statistics (₹7.8 LPA, 185 placed, 94%, 84 recruiters), never listed applicants, and drive creation invented package 4.5 / CGPA 6.0 / rounds / venue and closed the form even when saving failed | Fixed (055 + rebuilt) |
| **Store**: checkout used `place_store_order` which trusted client prices; fallback wrote orders/stock from the browser; students could insert orders with any total or status; store manager status changes were never saved (no UPDATE policy); cancellations never returned stock | Fixed (056) |
| **Notifications between users never worked**: RLS only allowed writing your own notifications, errors were swallowed, callers also used non-UUID recipients ('admin', 'all') and invalid priority 'normal' — out-pass, purchase-order, transport-emergency, front-desk and appointment alerts were all lost | Fixed (057 + `db.createNotification`/`notifyMany`) |
| Assignments: a student could insert a submission with status 'graded' and any score; any teacher could edit/grade other teachers' work; teacher dashboard reported "Submission Graded" when the update had been rejected, pre-filled 85, accepted any score | Fixed (058) |
| Sign-in flags (`is_first_login`, `requires_password_change`, `login_id`) were never loaded into the session user, so the forced-password-change check in LoginForm could never fire and the Parent dashboard displayed a fabricated ID `PAR-2026-0001` | Fixed (AuthContext + 059 + ForcePasswordChange) |
| Admin "delete user" protected the last admin by reading `user_metadata.role` (client-controlled, usually unset), so the guard could be bypassed; password reset accepted 6 characters | Fixed (edge function + dev backend) |
| Super-admin master header "Sign out" threw (`signOut` not defined on the auth context) | Fixed |
| `attendance_shortage_warnings` and `scholarships_master` allowed every signed-in user full read/write (student could edit scholarship discounts); API roles held TRUNCATE (not subject to RLS) on every table | Fixed (060) |
| Hostel warden, librarian and HR lookups used `profiles`, which those roles cannot read — matches silently returned nothing, so out-passes/book issues were saved without the student link and HR could not list staff | Fixed (students directory, 061) |
| **SECURITY (dev server)**: the development admin API accepted `Authorization: Bearer mock-test-role:admin:…` as a real administrator and trusted `user_metadata.role` (user-editable); the Vite dev server listens on all interfaces | Fixed (opt-in env flag; role from profiles) |
| Legacy admission paths bypassed the lifecycle (merit-list inserts with invented scores, `admissionService` set status 'accepted' on payment) | Removed / replaced |
| HR leave manager marked a leave Approved/Rejected on screen even when the database refused it; any HOD/principal/HR/admin could approve their own leave; rejection reasons not required; leave days could exceed the date range | Fixed (062 + screen) |
| Scholarship approval changed `student_fees.total_due` of the first fee row from the browser (no adjustment/audit trail); a student could edit their own sanctioned amount; principal "approve admission" bypassed seat/quota/deposit checks via the legacy `confirm_admission` | Fixed (063 + lifecycle) |
| "Pay" dialogs for students and parents only said online payment was unavailable; the exam fee-clearance rule had no switch anywhere in the UI; scholarship request defaulted to ₹25,000 | Online payments built (066); switches added; default removed |
| Student "Download Hall Ticket" tried to open a non-existent `file_url`; now opens the printable ticket | Fixed |
| Inventory: item looked up with `ilike '%name%'` (wrong item possible); an issue was recorded even when no item matched; read-modify-write stock updates lost concurrent changes; any quantity could be "returned" by anyone; purchase orders were never received so ordered stock never arrived | Fixed (069) |
| Concerns were stored as JSON inside the admission-document table and read back from there; unknown column `student_name` inserted; shortage warnings inserted unknown columns (`current_attendance_pct`, `status`, `parent_contacted`) so none were ever saved; parent attendance view showed present/late days as absent (case mismatch); linked-guardian list showed blank names; afternoon wellness check-in always failed the CHECK constraint | Fixed |
| Student "My Orders" showed NaN item prices for orders placed through the server checkout (field `unit_price` vs `price`) | Fixed |
