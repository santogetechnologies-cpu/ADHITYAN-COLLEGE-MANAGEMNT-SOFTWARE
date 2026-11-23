# Admissions → Student: trace of the current flow (step 1)

Traced from `src/pages/AdmissionManagement.tsx` through `src/services/supabase/database.ts` to the tables created in
migrations 001/013. Verified by reading code and comparing payload keys with real table columns (scratch DB).

## What each tab really does
| Tab | Writes to | Result today |
|-----|-----------|--------------|
| Applications (`ApplicationPortal`) | `create_admission_application` API / `admission_applications`; "Approve" → `db.updateAdmissionStatus` | Status flips. **No student, enrollment, fee or login is created** |
| Verification (`DocumentVerification`) | `admission_document_verifications` | Standalone checklist; approving an application does not depend on it, and rejecting a document does not stop approval |
| Entrance Test (`EntranceTest`) | `admission_entrance_tests` | **Broken:** UI sends `test_name, course_name, start_time, end_time, venue, max_marks, registered_count, qualified_count` — none exist on the table (it is per-applicant: `applicant_name, roll_no!, test_date!, score…`). Insert fails; `addAdmissionEntranceTest` swallows the error and returns `null` |
| Merit List (`MeritList`) | `admission_merit_lists` | Candidates typed in by hand (free-text name), not selected from applications; "Admitted" is only a label; no seat limits, no rank calculation, no link to the application |
| Fees (`AdmissionFees`) | `student_fees` via `db.createStudentFee` | Records fees for *already enrolled* students, not admission fees (`admission_fees` table is not used) |

## Where a student is actually created
Only `confirm_admission` (admin-api / dev backend: creates auth user, profile, `students` row, parent account + link,
first fee + receipt, document rows, and marks the application) — and it is called **only** from `PrincipalDashboard`.
It is not reachable from the Admission Management page or the receptionist's flow. The receptionist dialog text says
"does NOT create Student or Parent login accounts… provisioned later in Admin User Management".

## Defects
| # | Defect | Severity |
|---|--------|----------|
| A1 | `db.updateAdmissionStatus` wraps every write in `try/catch {}` and **always returns true** → "Admission Approved" toast even if nothing was saved | High |
| A2 | Application extras (DOB, address, previous school…) are stored as JSON in `admission_document_verifications.document_url` with `document_type='APPLICATION_METADATA'` because `admission_applications` has no columns for them; status is mirrored into that JSON by string-matching `document_url.includes(id)` | High |
| A3 | Entrance-test screen cannot save (column mismatch, error swallowed) | High |
| A4 | No path from Approved/Admitted → student on the admissions screen; stages are not connected (verification, test, merit, fee do not gate or feed approval) | High |
| A5 | `admission_applications.status` allows only Submitted/Under Review/Approved/Rejected — no Waitlisted/Offered/Enrolled/Cancelled, so the lifecycle in the brief cannot be represented | Medium |
| A6 | `confirm_admission` is long, runs ~10 separate writes with no transaction (a failure part-way leaves an auth user without profile/fee) and is only idempotent by e-mail lookup | High |
| A7 | Student id format differs between backend (`STU-YYYY-NNNN`) and DB generator (`AIP-…`) | Medium |
| A8 | Merit/eligibility uses no configurable seat count or formula | Medium |

## Proposed target for the next steps (needs your OK)
1. **Schema (migration 037):** extend `admission_applications` (typed columns for the extras, `student_id` link, `stage` + wider status set, `applied_course`, academic year) and stop using the JSON-in-documents hack (backfill existing metadata rows into the new columns, keep originals).
2. **DB functions:** `admission_set_stage()` (validated transitions + audit) and `admission_enroll()` — one transaction, idempotent, creates/links the `students` row and the first fee row; account provisioning stays a separate explicit step.
3. **UI:** one application-centred workspace (stage pipeline), Entrance-test and Merit tabs operate on applications, a visible "Enroll student" action, honest errors (no swallowed failures).
4. Each step verified on the scratch DB, then summarised here.
