# ADHITYAN COLLEGE MANAGEMENT ERP — FEATURE & AUDIT MATRIX

> **Document Version:** 1.0.0  
> **Target Schema:** `supabase/migrations/001_initial_schema.sql` (and migrations 001–016)  
> **Build Status:** Verified `tsc --noEmit`, `eslint`, and Vite build passing.  
> **Total Cataloged Files:** 125  

---

## 1. Executive Summary

This feature matrix catalogs every page, dialog, tab, and component across the 18 core ERP subsystems in `src/pages` and `src/components`.
Each entry records:
1. **File Path**: The component source file.
2. **Feature / Business Purpose**: What clinical, vocational, or administrative ERP workflow it serves.
3. **Actions / Buttons / Forms**: User interaction points (forms, action buttons, dialog triggers).
4. **Current Status**:
   - `Real (Supabase)`: Directly queries/persists against Supabase PostgreSQL with live auth and RLS.
   - `Toast-only`: Triggers optimistic or simulation toasts without backend persistence.
   - `Static Data`: Renders mock/sample datasets in local React component state.
   - `Broken`: Syntax/runtime failures (none permitted in production build).
5. **Target Supabase Table**: The normalized table in `001_initial_schema.sql` governing this feature.

---

## 2. Comprehensive Module Catalog

### Module: `src/pages` (16 files)

| File | Purpose / Feature | Actions / Buttons / Forms | Status | Target Supabase Table |
| :--- | :--- | :--- | :--- | :--- |
| `AdmissionManagement.tsx` | College admission application workflow, candidate review, document verification, entrance tests & merit list | View only | **Static Data** | `admission_applications, admission_fees, admission_entrance_tests` |
| `AlumniManagement.tsx` | Alumni directory, event management, mentorship matching and institutional donation tracking | Add Alumni, Filter, Export, window.open(`mailto:${alumnus.email}`)}>, Create Event, View Calendar | **Real (Supabase)** | `alumni_profiles, alumni_donations, alumni_events` |
| `CertificateGeneration.tsx` | Student degree/course completion, bonafide & transfer certificate generation and verification | New Certificate, Edit, Preview, Create New Template, Export, handleApprove(cert.id)}> | **Real (Supabase)** | `certificates, profiles` |
| `Dashboard.tsx` | Role-specific command center summarizing critical institutional metrics, alerts, and quick actions | View only | **Real (Supabase)** | `profiles, departments` |
| `DisciplinaryManagement.tsx` | Student code of conduct tracking, incident reporting, committee hearings, and disciplinary actions | Edit | **Real (Supabase)** | `disciplinary_incidents, profiles` |
| `ExamManagement.tsx` | Vocational semester exam scheduling, hall ticket generation, grading, and result publishing | View only | **Static Data** | `exams, exam_schedules, exam_results` |
| `Index.tsx` | General college ERP module supporting portal workflows and navigation | View only | **Real (Supabase)** | `profiles` |
| `LibraryManagement.tsx` | Library OPAC catalog, digital resources, physical book checkout/returns, and barcode/QR scanner | View only | **Static Data** | `library_books, book_issues, digital_library_resources` |
| `MedicalManagement.tsx` | Campus clinic visit logs, student medical histories, allergies, and emergency medical treatment records | View details, Filter, Export, Today, This Week | **Real (Supabase)** | `health_records, infirmary_visits` |
| `MessageTeacher.tsx` | Direct communication between teachers, students, and guardians with notification triggers | View only | **Real (Supabase)** | `teacher_messages, profiles` |
| `NotFound.tsx` | 404 error page for unmatched ERP routes with redirect back to home | Return to Home Link | **Real (Routing)** | `None (Client route handler)` |
| `ReportConcern.tsx` | Grievance and complaint submission for students/parents with escalation routing | Form submission | **Real (Supabase)** | `concerns, profiles` |
| `SportsManagement.tsx` | Inter-collegiate and intra-college sports tournaments, team rosters, and trophy/medal records | View only | **Real (Supabase)** | `sports_events, sports_teams, student_achievements` |
| `Store.tsx` | Campus store e-commerce portal for lab coats, scrubs, medical kits, stationery, and uniforms | Filters | **Real (Supabase)** | `store_products, store_orders, inventory_items, inventory_transactions` |
| `TrackSchoolBus.tsx` | College bus fleet tracking, route management, GPS telematics, driver logs, and student transit check-in | Call Office | **Real (Supabase)** | `transport_vehicles, transport_stops, student_transport_logs, vehicle_maintenance` |
| `ViewAchievements.tsx` | Student academic, clinical, and extracurricular accolades, certifications, and awards gallery | View only | **Real (Supabase)** | `student_achievements, profiles` |

---

### Module: `src/pages/admin` (3 files)

| File | Purpose / Feature | Actions / Buttons / Forms | Status | Target Supabase Table |
| :--- | :--- | :--- | :--- | :--- |
| `AdminAnalytics.tsx` | General college ERP module supporting portal workflows and navigation | Refresh Diagnostics | **Real (Supabase)** | `profiles` |
| `AdminReports.tsx` | General college ERP module supporting portal workflows and navigation | View only | **Real (Supabase)** | `profiles` |
| `AdminSettings.tsx` | General college ERP module supporting portal workflows and navigation | View only | **Real (Supabase)** | `profiles` |

---

### Module: `src/pages/teachers` (3 files)

| File | Purpose / Feature | Actions / Buttons / Forms | Status | Target Supabase Table |
| :--- | :--- | :--- | :--- | :--- |
| `CreateAssignment.tsx` | Coursework posting, student submission upload, grading, and plagiarism/rubric feedback | removeAttachment(index)}
                      >, Add Attachment, navigate('/dashboard')}>
            Cancel | **Real (Supabase)** | `assignments, assignment_submissions` |
| `GenerateReport.tsx` | General college ERP module supporting portal workflows and navigation | Preview Report, setPreviewOpen(false)}>
                Close | **Real (Supabase)** | `profiles` |
| `MessageParents.tsx` | Direct communication between teachers, students, and guardians with notification triggers | Save Draft | **Real (Supabase)** | `teacher_messages, profiles` |

---

### Module: `src/pages/naac` (12 files)

| File | Purpose / Feature | Actions / Buttons / Forms | Status | Target Supabase Table |
| :--- | :--- | :--- | :--- | :--- |
| `Criterion1.tsx` | NAAC Accreditation Assessment across Criteria 1-7, SSR metric evidence upload, and peer-review audits | View only | **Static Data** | `naac_criterion_progress, naac_documents` |
| `Criterion2.tsx` | NAAC Accreditation Assessment across Criteria 1-7, SSR metric evidence upload, and peer-review audits | View only | **Static Data** | `naac_criterion_progress, naac_documents` |
| `Criterion3.tsx` | NAAC Accreditation Assessment across Criteria 1-7, SSR metric evidence upload, and peer-review audits | View only | **Static Data** | `naac_criterion_progress, naac_documents` |
| `Criterion4.tsx` | NAAC Accreditation Assessment across Criteria 1-7, SSR metric evidence upload, and peer-review audits | View only | **Static Data** | `naac_criterion_progress, naac_documents` |
| `Criterion5.tsx` | NAAC Accreditation Assessment across Criteria 1-7, SSR metric evidence upload, and peer-review audits | View only | **Static Data** | `naac_criterion_progress, naac_documents` |
| `Criterion6.tsx` | NAAC Accreditation Assessment across Criteria 1-7, SSR metric evidence upload, and peer-review audits | View only | **Static Data** | `naac_criterion_progress, naac_documents` |
| `Criterion7.tsx` | NAAC Accreditation Assessment across Criteria 1-7, SSR metric evidence upload, and peer-review audits | View only | **Static Data** | `naac_criterion_progress, naac_documents` |
| `CriterionTemplate.tsx` | NAAC Accreditation Assessment across Criteria 1-7, SSR metric evidence upload, and peer-review audits | Save Draft, Submit Data | **Static Data** | `naac_criterion_progress, naac_documents` |
| `NAACDashboard.tsx` | NAAC Accreditation Assessment across Criteria 1-7, SSR metric evidence upload, and peer-review audits | Upload Documents, Generate Reports, Generate SSR
                  Self Study Report | **Static Data** | `naac_criterion_progress, naac_documents` |
| `Reports.tsx` | NAAC Accreditation Assessment across Criteria 1-7, SSR metric evidence upload, and peer-review audits | View only | **Static Data** | `naac_criterion_progress, naac_documents` |
| `Repository.tsx` | NAAC Accreditation Assessment across Criteria 1-7, SSR metric evidence upload, and peer-review audits | removeDocument(doc.id)}
                      > | **Static Data** | `naac_criterion_progress, naac_documents` |
| `Settings.tsx` | NAAC Accreditation Assessment across Criteria 1-7, SSR metric evidence upload, and peer-review audits | Save Institution Details, Save System Settings, Remove, Add Administrator, Add Coordinator, Save Access Settings | **Static Data** | `naac_criterion_progress, naac_documents` |

---

### Module: `src/components/admin` (11 files)

| File | Purpose / Feature | Actions / Buttons / Forms | Status | Target Supabase Table |
| :--- | :--- | :--- | :--- | :--- |
| `AdminHeader.tsx` | General college ERP module supporting portal workflows and navigation | {user?.name?.charAt(0).toUpperCase()} | **Static Data** | `profiles` |
| `AdminLayout.tsx` | General college ERP module supporting portal workflows and navigation | View only | **Static Data** | `profiles` |
| `AdminNavigation.tsx` | General college ERP module supporting portal workflows and navigation | View only | **Static Data** | `profiles` |
| `AdminOverview.tsx` | General college ERP module supporting portal workflows and navigation | Review, User Management, System Reports, Audit Logs, System Health, Financial Overview | **Real (Supabase)** | `profiles, transport_vehicles, store_orders, finance_transactions` |
| `DepartmentManagement.tsx` | HOD and academic department governance, faculty allocation, syllabus, and course capacity | Add Department / Course, Save & Initialize Department, Save Changes | **Real (Supabase)** | `departments, sections` |
| `DepartmentOversight.tsx` | HOD and academic department governance, faculty allocation, syllabus, and course capacity | Manage Sections, Configure Sections, setIsAddOpen(false)}>Cancel, {submitting ? 'Creating...' : 'Save Department'} | **Real (Supabase)** | `departments, sections, profiles` |
| `EventsManagement.tsx` | General college ERP module supporting portal workflows and navigation | handleEdit(event)}>, handleDelete(event.id)}>, Add Event, setIsDialogOpen(false)}>
                  Cancel, {editingEvent ? 'Update Event' : 'Create Event'} | **Real (Supabase)** | `profiles` |
| `FeedbackSystem.tsx` | Tuition fee collection, fee receipts, payment gateways, miscellaneous ledger expenses, and scholarships | View only | **Real (Supabase)** | `finance_transactions, student_fees` |
| `TeacherAssignments.tsx` | Coursework posting, student submission upload, grading, and plagiarism/rubric feedback | New Assignment | **Real (Supabase)** | `assignments, assignment_submissions` |
| `TimetableManagement.tsx` | Course-wise, semester-wise lecture & clinical lab timetable matrix with room allocation | {publishing ?  : }
            Publish Schedule, Export CSV, Add Session / Lab, Save Session to Schedule, handleEditSlot(s)}>, handleDeleteSlot(s.id)}> | **Real (Supabase)** | `timetables, departments, sections` |
| `UserManagement.tsx` | RBAC identity administration, account provisioning for 13 roles, status toggle, and credential reset | Export CSV, setIsAddOpen(false)}>
                Cancel, setIsEditOpen(false)}>
                Cancel, setIsResetOpen(false)}>
                Cancel, setIsDeleteOpen(false)}>
              Cancel, setIsLinkOpen(false)}>
              Close | **Real (Supabase)** | `profiles` |

---

### Module: `src/components/admission` (7 files)

| File | Purpose / Feature | Actions / Buttons / Forms | Status | Target Supabase Table |
| :--- | :--- | :--- | :--- | :--- |
| `AdmissionFees.tsx` | College admission application workflow, candidate review, document verification, entrance tests & merit list | setIsAddOpen(false)}>Cancel, {submitting ? 'Recording...' : 'Save Payment'}, setSelectedReceipt(null)}>Close | **Real (Supabase)** | `admission_applications, admission_fees, admission_entrance_tests` |
| `ApplicationDetailsDialog.tsx` | General college ERP module supporting portal workflows and navigation | onOpenChange(false)}>
            Close, Update Status | **Toast-only** | `profiles` |
| `ApplicationPortal.tsx` | General college ERP module supporting portal workflows and navigation | View only | **Real (Supabase)** | `profiles` |
| `DocumentVerification.tsx` | General college ERP module supporting portal workflows and navigation | setIsRejectOpen(false)}>Cancel, Confirm Rejection | **Real (Supabase)** | `profiles` |
| `EntranceTest.tsx` | General college ERP module supporting portal workflows and navigation | Schedule Entrance Test, setIsCreateOpen(false)}>Cancel | **Real (Supabase)** | `profiles` |
| `MeritList.tsx` | General college ERP module supporting portal workflows and navigation | Add Candidate to Merit, setIsAddOpen(false)}>Cancel, {submitting ? 'Adding...' : 'Add to Merit List'} | **Real (Supabase)** | `profiles` |
| `NewApplicationDialog.tsx` | General college ERP module supporting portal workflows and navigation | New Application, setOpen(false)}>
              Cancel | **Real (Supabase)** | `profiles` |

---

### Module: `src/components/alumni` (4 files)

| File | Purpose / Feature | Actions / Buttons / Forms | Status | Target Supabase Table |
| :--- | :--- | :--- | :--- | :--- |
| `AddAlumniDialog.tsx` | Alumni directory, event management, mentorship matching and institutional donation tracking | Choose File, setOpen(false)}>
              Cancel | **Real (Supabase)** | `alumni_profiles, alumni_donations, alumni_events` |
| `DonationTrackingDialog.tsx` | General college ERP module supporting portal workflows and navigation | Add Allocation, Generate Receipt, Download Tax Certificate, Send Acknowledgment, Generate Thank You Letter, Add Milestone | **Static Data** | `profiles` |
| `EventCreationDialog.tsx` | General college ERP module supporting portal workflows and navigation | Add Speaker, Add Item, Browse Files, setOpen(false)}>
              Cancel, Save Draft, {isEdit ? 'Update Event' : 'Publish Event'} | **Static Data** | `profiles` |
| `MentorshipMatchingDialog.tsx` | General college ERP module supporting portal workflows and navigation | Create Mentorship Match, Add Goal, Contact Participants, Schedule Meeting, setOpen(false)}>
              Cancel, Save Changes | **Real (Supabase)** | `profiles` |

---

### Module: `src/components/assignments` (1 files)

| File | Purpose / Feature | Actions / Buttons / Forms | Status | Target Supabase Table |
| :--- | :--- | :--- | :--- | :--- |
| `AssignmentsHomework.tsx` | Coursework posting, student submission upload, grading, and plagiarism/rubric feedback | Form submission | **Real (Supabase)** | `assignments, assignment_submissions` |

---

### Module: `src/components/chat` (2 files)

| File | Purpose / Feature | Actions / Buttons / Forms | Status | Target Supabase Table |
| :--- | :--- | :--- | :--- | :--- |
| `AILearningChat.tsx` | AI clinical learning assistant, medical doubt resolution, study planner, and mentorship chat | View only | **Real (Supabase)** | `student_goals, profiles` |
| `MentorChat.tsx` | AI clinical learning assistant, medical doubt resolution, study planner, and mentorship chat | Form submission | **Real (Supabase)** | `student_goals, profiles` |

---

### Module: `src/components/dashboards` (16 files)

| File | Purpose / Feature | Actions / Buttons / Forms | Status | Target Supabase Table |
| :--- | :--- | :--- | :--- | :--- |
| `AdminDashboard.tsx` | Role-specific command center summarizing critical institutional metrics, alerts, and quick actions | Exam Management, Library System, Admissions, Alumni Network, Medical Center, Certificates | **Real (Supabase)** | `profiles, notifications, departments` |
| `FinanceDashboard.tsx` | Tuition fee collection, fee receipts, payment gateways, miscellaneous ledger expenses, and scholarships | Approve | **Real (Supabase)** | `finance_transactions, student_fees` |
| `FinanceManagerDashboard.tsx` | Tuition fee collection, fee receipts, payment gateways, miscellaneous ledger expenses, and scholarships | Audit Export, Audit Export to CSV, Reports, setCollectPaymentOpen(false)}>Cancel, setAddFeeInvoiceOpen(false)}>Cancel, setPayrollDialogOpen(false)}>Cancel | **Real (Supabase)** | `finance_transactions, student_fees` |
| `HostelWardenDashboard.tsx` | Role-specific command center summarizing critical institutional metrics, alerts, and quick actions | Refresh | **Static Data** | `profiles, notifications, departments` |
| `HRManagerDashboard.tsx` | Role-specific command center summarizing critical institutional metrics, alerts, and quick actions | Refresh | **Static Data** | `profiles, notifications, departments` |
| `LibrarianDashboard.tsx` | Role-specific command center summarizing critical institutional metrics, alerts, and quick actions | Refresh, {issuing ? 'Processing...' : 'Authorize & Issue'} | **Static Data** | `profiles, notifications, departments` |
| `ParentDashboard.tsx` | Role-specific command center summarizing critical institutional metrics, alerts, and quick actions | View only | **Real (Supabase)** | `profiles, notifications, departments` |
| `PlacementOfficerDashboard.tsx` | Role-specific command center summarizing critical institutional metrics, alerts, and quick actions | Refresh | **Static Data** | `profiles, notifications, departments` |
| `PrincipalDashboard.tsx` | Role-specific command center summarizing critical institutional metrics, alerts, and quick actions | Refresh | **Real (Supabase)** | `profiles, notifications, departments` |
| `ReceptionistDashboard.tsx` | Campus front-desk visitor gate-pass issuance, management appointment scheduling, and phone inquiries | setVisitorDialogOpen(true)}>
               Add, setVisitorDialogOpen(false)}>Cancel, setAppointmentDialogOpen(false)}>Cancel, setEnquiryDialogOpen(false)}>Cancel, setNoticeDialogOpen(false)}>Cancel, {searching ?  : 'Search'} | **Real (Supabase)** | `reception_visitors, reception_appointments, reception_enquiries` |
| `StoreDashboard.tsx` | Campus store e-commerce portal for lab coats, scrubs, medical kits, stationery, and uniforms | Restock | **Real (Supabase)** | `store_products, store_orders, inventory_items, inventory_transactions` |
| `StoreManagerDashboard.tsx` | Campus store e-commerce portal for lab coats, scrubs, medical kits, stationery, and uniforms | Export Audit, Inventory Audit, setAddItemDialogOpen(false)}>Cancel, {submitting ?  : null}
                Save Item, setPurchaseOrderDialogOpen(false)}>Cancel, setDistributionDialogOpen(false)}>Cancel | **Real (Supabase)** | `store_products, store_orders, inventory_items, inventory_transactions` |
| `StudentDashboard.tsx` | Role-specific command center summarizing critical institutional metrics, alerts, and quick actions | Form submission | **Real (Supabase)** | `profiles, notifications, departments` |
| `TeacherDashboard.tsx` | Role-specific command center summarizing critical institutional metrics, alerts, and quick actions | View Timetable, Contact Parent, Create Assignment, Message Parents, Generate Report, Daily Update | **Real (Supabase)** | `profiles, notifications, departments` |
| `TransportDashboard.tsx` | College bus fleet tracking, route management, GPS telematics, driver logs, and student transit check-in | Schedule | **Real (Supabase)** | `transport_vehicles, transport_stops, student_transport_logs, vehicle_maintenance` |
| `TransportDriverDashboard.tsx` | College bus fleet tracking, route management, GPS telematics, driver logs, and student transit check-in | {isTrackingGPS ? 'Stop GPS' : 'Share Location'}, {isTrackingGPS ? 'Stop GPS' : 'Start GPS'}, setEmergencyDialogOpen(false)}>Cancel, setAddStudentDialogOpen(false)}>Cancel, {submitting ?  : null}
                Save Rider, setMaintenanceDialogOpen(false)}>Cancel | **Real (Supabase)** | `transport_vehicles, transport_stops, student_transport_logs, vehicle_maintenance` |

---

### Module: `src/components/disciplinary` (2 files)

| File | Purpose / Feature | Actions / Buttons / Forms | Status | Target Supabase Table |
| :--- | :--- | :--- | :--- | :--- |
| `ReportIncidentDialog.tsx` | General college ERP module supporting portal workflows and navigation | Report Incident, setOpen(false)}>
              Cancel, Submit Report | **Toast-only** | `profiles` |
| `TakeActionDialog.tsx` | General college ERP module supporting portal workflows and navigation | onOpenChange(false)}>
              Cancel, Record Action | **Toast-only** | `profiles` |

---

### Module: `src/components/exam` (8 files)

| File | Purpose / Feature | Actions / Buttons / Forms | Status | Target Supabase Table |
| :--- | :--- | :--- | :--- | :--- |
| `ExamAnalytics.tsx` | Vocational semester exam scheduling, hall ticket generation, grading, and result publishing | View only | **Static Data** | `exams, exam_schedules, exam_results` |
| `ExamDetailsDialog.tsx` | Vocational semester exam scheduling, hall ticket generation, grading, and result publishing | Save Changes, Add Students, Export List, Edit, Save Settings, Generate Hall Tickets | **Real (Supabase)** | `exams, exam_schedules, exam_results` |
| `ExamScheduling.tsx` | Vocational semester exam scheduling, hall ticket generation, grading, and result publishing | Schedule New Exam, Hall Tickets, deleteExam(exam.id)}
                    > | **Real (Supabase)** | `exams, exam_schedules, exam_results` |
| `ExamWorkflows.tsx` | Vocational semester exam scheduling, hall ticket generation, grading, and result publishing | View Participants, Monitor Live, End Exam, Attendance, Answer Sheets, Mark Complete | **Static Data** | `exams, exam_schedules, exam_results` |
| `GradingInterface.tsx` | General college ERP module supporting portal workflows and navigation | View Results, Continue Grading, View Progress, Save, Save & Next | **Static Data** | `profiles` |
| `HallTicketDialog.tsx` | General college ERP module supporting portal workflows and navigation | Generate Missing Tickets, Download All Tickets, Regenerate All, Print Queue, Process All Actions, setOpen(false)}>
              Close | **Static Data** | `profiles` |
| `HallTicketGeneration.tsx` | General college ERP module supporting portal workflows and navigation | Generate Selected ({selectedIds.length}), Select All, Clear Selection, setPreviewTicket(null)}>Close | **Real (Supabase)** | `profiles` |
| `ResultPublishing.tsx` | General college ERP module supporting portal workflows and navigation | Publish, Configure & Schedule Publishing, Export Results, Send Email Notifications, Send SMS Notifications | **Static Data** | `profiles` |

---

### Module: `src/components/finance` (3 files)

| File | Purpose / Feature | Actions / Buttons / Forms | Status | Target Supabase Table |
| :--- | :--- | :--- | :--- | :--- |
| `FeeStructureManager.tsx` | Tuition fee collection, fee receipts, payment gateways, miscellaneous ledger expenses, and scholarships | Refresh | **Real (Supabase)** | `finance_transactions, student_fees` |
| `MiscExpensesModule.tsx` | General college ERP module supporting portal workflows and navigation | Add Expense, {date ? format(date, "PPP") : Pick a date}, Save & Submit for Approval, Save as Draft, More Filters, Export | **Static Data** | `profiles` |
| `ScholarshipManager.tsx` | General college ERP module supporting portal workflows and navigation | Refresh | **Real (Supabase)** | `profiles` |

---

### Module: `src/components/library` (8 files)

| File | Purpose / Feature | Actions / Buttons / Forms | Status | Target Supabase Table |
| :--- | :--- | :--- | :--- | :--- |
| `BookIssueDialog.tsx` | General college ERP module supporting portal workflows and navigation | openScanner('book')}>, openScanner('student')}>, setStep('scan')}>
                  Back, Issue Book | **Real (Supabase)** | `profiles` |
| `BookReturnDialog.tsx` | General college ERP module supporting portal workflows and navigation | setScannerOpen(true)}>, setStep('scan')}>
                  Back, Complete Return | **Real (Supabase)** | `profiles` |
| `BookTracking.tsx` | General college ERP module supporting portal workflows and navigation | Issue Book, Return | **Real (Supabase)** | `profiles` |
| `DigitalCatalog.tsx` | General college ERP module supporting portal workflows and navigation | Add New Resource | **Real (Supabase)** | `profiles` |
| `DigitalLibrary.tsx` | Library OPAC catalog, digital resources, physical book checkout/returns, and barcode/QR scanner | Choose Files | **Static Data** | `library_books, book_issues, digital_library_resources` |
| `LibraryAnalytics.tsx` | Library OPAC catalog, digital resources, physical book checkout/returns, and barcode/QR scanner | View only | **Static Data** | `library_books, book_issues, digital_library_resources` |
| `QRScannerDialog.tsx` | General college ERP module supporting portal workflows and navigation | Use This, Simulate Scan, Start Camera, Add | **Static Data** | `profiles` |
| `UploadResourceDialog.tsx` | General college ERP module supporting portal workflows and navigation | Upload Resource, Choose Files, setOpen(false)}>
              Cancel | **Toast-only** | `profiles` |

---

### Module: `src/components/medical` (2 files)

| File | Purpose / Feature | Actions / Buttons / Forms | Status | Target Supabase Table |
| :--- | :--- | :--- | :--- | :--- |
| `HealthRecordDetailsDialog.tsx` | General college ERP module supporting portal workflows and navigation | Add Medication, Add Condition, Add Family History, Add Emergency Contact, Export Record, Generate Report | **Static Data** | `profiles` |
| `InfirmaryVisitDialog.tsx` | General college ERP module supporting portal workflows and navigation | Add Medication, Print Visit Summary, setOpen(false)}>
              Cancel, {isEdit ? 'Update Visit' : 'Save Visit Record'} | **Real (Supabase)** | `profiles` |

---

### Module: `src/components/naac` (3 files)

| File | Purpose / Feature | Actions / Buttons / Forms | Status | Target Supabase Table |
| :--- | :--- | :--- | :--- | :--- |
| `NAACHeader.tsx` | NAAC Accreditation Assessment across Criteria 1-7, SSR metric evidence upload, and peer-review audits | Back to Admin, 2 | **Static Data** | `naac_criterion_progress, naac_documents` |
| `NAACLayout.tsx` | NAAC Accreditation Assessment across Criteria 1-7, SSR metric evidence upload, and peer-review audits | View only | **Static Data** | `naac_criterion_progress, naac_documents` |
| `NAACNavigation.tsx` | NAAC Accreditation Assessment across Criteria 1-7, SSR metric evidence upload, and peer-review audits | View only | **Static Data** | `naac_criterion_progress, naac_documents` |

---

### Module: `src/components/roles` (2 files)

| File | Purpose / Feature | Actions / Buttons / Forms | Status | Target Supabase Table |
| :--- | :--- | :--- | :--- | :--- |
| `AccountsOfficerDashboard.tsx` | Tuition fee collection, fee receipts, payment gateways, miscellaneous ledger expenses, and scholarships | Defaulters List, Fee Receipts, Collection Report, Process Salaries, View Payments, Budget Report | **Real (Supabase)** | `finance_transactions, student_fees` |
| `StoreKeeperDashboard.tsx` | Campus store e-commerce portal for lab coats, scrubs, medical kits, stationery, and uniforms | Barcode Scan, Search Item, Reorder, Add to Inventory, Generate Asset Tag, Issue Items | **Static Data** | `store_products, store_orders, inventory_items, inventory_transactions` |

---

### Module: `src/components/sports` (2 files)

| File | Purpose / Feature | Actions / Buttons / Forms | Status | Target Supabase Table |
| :--- | :--- | :--- | :--- | :--- |
| `AddEventDialog.tsx` | General college ERP module supporting portal workflows and navigation | New Event, setOpen(false)}>
              Cancel, Create Event | **Toast-only** | `profiles` |
| `AddTeamDialog.tsx` | General college ERP module supporting portal workflows and navigation | Add Team, setOpen(false)}>
              Cancel, Create Team | **Toast-only** | `profiles` |

---

### Module: `src/components/store` (1 files)

| File | Purpose / Feature | Actions / Buttons / Forms | Status | Target Supabase Table |
| :--- | :--- | :--- | :--- | :--- |
| `CartDialog.tsx` | Campus store e-commerce portal for lab coats, scrubs, medical kits, stationery, and uniforms | Clear Cart | **Real (Supabase)** | `store_products, store_orders, inventory_items, inventory_transactions` |

---

### Module: `src/components/teachers` (4 files)

| File | Purpose / Feature | Actions / Buttons / Forms | Status | Target Supabase Table |
| :--- | :--- | :--- | :--- | :--- |
| `AttendanceShortageManager.tsx` | Biometric/period student attendance desk, shortage warnings (<75%), and condonation tracking | Refresh Compliance | **Real (Supabase)** | `sections, profiles, daily_teaching_updates` |
| `ClassManagementSidebar.tsx` | General college ERP module supporting portal workflows and navigation | View only | **Real (Supabase)** | `profiles` |
| `DailyTeachingUpdate.tsx` | Faculty daily syllabus coverage logging, lesson plan tracking, and HOD departmental sign-off | Form submission | **Real (Supabase)** | `daily_teaching_updates, departments, sections` |
| `PeriodAttendanceDesk.tsx` | Biometric/period student attendance desk, shortage warnings (<75%), and condonation tracking | {submitting ?  : }
              Submit Roll Call | **Static Data** | `sections, profiles, daily_teaching_updates` |

---

### Module: `src/components/wellness` (1 files)

| File | Purpose / Feature | Actions / Buttons / Forms | Status | Target Supabase Table |
| :--- | :--- | :--- | :--- | :--- |
| `WellnessCheckIn.tsx` | Daily student psychological and physical wellness check-ins, mood tracking, and counselor alerts | View only | **Real (Supabase)** | `wellness_checkins, profiles` |

---

### Module: `src/components/student` (14 files)

| File | Purpose / Feature | Actions / Buttons / Forms | Status | Target Supabase Table |
| :--- | :--- | :--- | :--- | :--- |
| `AILearningVenture.tsx` | AI clinical learning assistant, medical doubt resolution, study planner, and mentorship chat | Save Notes, Refresh Curriculum | **Real (Supabase)** | `student_goals, profiles` |
| `CampusProDashboardView.tsx` | Role-specific command center summarizing critical institutional metrics, alerts, and quick actions | Submit Check-in | **Static Data** | `profiles, notifications, departments` |
| `CampusProDesktopHeader.tsx` | General college ERP module supporting portal workflows and navigation | View only | **Static Data** | `profiles` |
| `CampusProDesktopSidebar.tsx` | General college ERP module supporting portal workflows and navigation | View only | **Static Data** | `profiles` |
| `CampusProMobileHeader.tsx` | General college ERP module supporting portal workflows and navigation | View only | **Static Data** | `profiles` |
| `CampusProMobileNav.tsx` | General college ERP module supporting portal workflows and navigation | View only | **Static Data** | `profiles` |
| `LiveBusTrackerMap.tsx` | General college ERP module supporting portal workflows and navigation | View only | **Static Data** | `profiles` |
| `PrintableHallTicket.tsx` | General college ERP module supporting portal workflows and navigation | Print / Save Admit Card, Close | **Static Data** | `profiles` |
| `StudentBusTab.tsx` | General college ERP module supporting portal workflows and navigation | Refresh Status | **Real (Supabase)** | `profiles` |
| `StudentComplaintsTab.tsx` | General college ERP module supporting portal workflows and navigation | Refresh Tickets | **Real (Supabase)** | `profiles` |
| `StudentExams.tsx` | Vocational semester exam scheduling, hall ticket generation, grading, and result publishing | Refresh | **Real (Supabase)** | `exams, exam_schedules, exam_results` |
| `StudentFeesTab.tsx` | Tuition fee collection, fee receipts, payment gateways, miscellaneous ledger expenses, and scholarships | Refresh | **Real (Supabase)** | `finance_transactions, student_fees` |
| `StudentSettingsTab.tsx` | General college ERP module supporting portal workflows and navigation | Sign Out of Student Account | **Real (Supabase)** | `profiles` |
| `StudentStoreTab.tsx` | Campus store e-commerce portal for lab coats, scrubs, medical kits, stationery, and uniforms | View only | **Real (Supabase)** | `store_products, store_orders, inventory_items, inventory_transactions` |

---


## 3. Status Breakdown & Hardening Roadmap

### 3.1 Status Summary
- **Live Supabase Integrated Modules**: Auth, User Management (13 Roles), Department Management, Timetable Management (9 Official Vocational Courses), Admin Overview metrics, Bus Tracker, Index login redirection.
- **Toast-only / Simulation Dialogs**: Select dialogs in Admission, Alumni, Disciplinary, Sports, and Medical currently show mock success toasts or rely on mock arrays.
- **Migration Target**: All simulated components map 1:1 to pre-provisioned relational tables in `001_initial_schema.sql`.

### 3.2 Data Flow & RLS Standards
1. All client-side writes MUST use authenticated Supabase client sessions (`supabase.from('<table>').insert/update`).
2. No `service_role` keys in frontend bundle.
3. Every mutation triggers React Query invalidation and error boundary handling.
