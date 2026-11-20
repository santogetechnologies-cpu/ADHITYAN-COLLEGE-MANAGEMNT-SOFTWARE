# Buttons without a click handler (static scan)

Found with the TypeScript compiler API: `<Button>`/`<button>` elements with no `onClick`, no `type="submit"`, not `asChild`, not inside a form or a trigger-style wrapper.
**125 buttons in 28 files.** This is a *backlog to triage*, not a list of confirmed bugs:
- Some are **false positives**: a button passed as `children` to a dialog component (e.g. `<BookIssueDialog><Button>…`) gets its click from the wrapper. Those must be checked by hand.
- Several confirmed so far are worse than dead: they show a success toast without saving (library *Renew*) — fixed in migration 043.
- Rule going forward (master prompt §4 rule 3): a button must either do something real or be removed/disabled with a reason. `node /tmp`-style scans are not in the repo yet; re-run the scan after each module is fixed.

| File | Line | Label |
|---|---|---|
| `src/components/RoleSelection.tsx` | 363 | Access Portal |
| `src/components/RoleSelection.tsx` | 408 | Access Portal |
| `src/components/RoleSelection.tsx` | 453 | Access |
| `src/components/admin/AdminExecutiveNavbar.tsx` | 294 | <Grid className="h-3.5 w-3.5 text-blue-600 dark:text-blue-4 |
| `src/components/alumni/AddAlumniDialog.tsx` | 317 | Choose File |
| `src/components/alumni/DonationTrackingDialog.tsx` | 671 | <Download className="h-4 w-4 mr-2" /> Download Tax Certific |
| `src/components/alumni/DonationTrackingDialog.tsx` | 759 | <FileText className="h-4 w-4 mr-2" /> Generate Thank You Le |
| `src/components/alumni/DonationTrackingDialog.tsx` | 1043 | <Download className="h-4 w-4 mr-2" /> Export Donation Repor |
| `src/components/alumni/DonationTrackingDialog.tsx` | 1047 | <FileText className="h-4 w-4 mr-2" /> Tax Summary Report |
| `src/components/alumni/DonationTrackingDialog.tsx` | 1051 | <TrendingUp className="h-4 w-4 mr-2" /> Campaign Analytics |
| `src/components/alumni/EventCreationDialog.tsx` | 993 | Browse Files |
| `src/components/alumni/MentorshipMatchingDialog.tsx` | 684 | <Filter className="h-4 w-4" /> |
| `src/components/alumni/MentorshipMatchingDialog.tsx` | 687 | <Search className="h-4 w-4" /> |
| `src/components/alumni/MentorshipMatchingDialog.tsx` | 745 | <Filter className="h-4 w-4" /> |
| `src/components/alumni/MentorshipMatchingDialog.tsx` | 748 | <Search className="h-4 w-4" /> |
| `src/components/alumni/MentorshipMatchingDialog.tsx` | 1068 | <MessageCircle className="h-4 w-4 mr-2" /> Contact Particip |
| `src/components/alumni/MentorshipMatchingDialog.tsx` | 1072 | <Calendar className="h-4 w-4 mr-2" /> Schedule Meeting |
| `src/components/certificate/TemplateCustomizationDialog.tsx` | 353 | Browse Files |
| `src/components/certificate/TemplateCustomizationDialog.tsx` | 366 | Browse Files |
| `src/components/certificate/TemplateCustomizationDialog.tsx` | 481 | <Download className="h-4 w-4 mr-2" /> Export Template |
| `src/components/exam/ExamDetailsDialog.tsx` | 248 | Save Changes |
| `src/components/exam/ExamDetailsDialog.tsx` | 267 | Add Students |
| `src/components/exam/ExamDetailsDialog.tsx` | 270 | <Download className="h-4 w-4 mr-2" /> Export List |
| `src/components/exam/ExamDetailsDialog.tsx` | 307 | Edit |
| `src/components/exam/ExamDetailsDialog.tsx` | 310 | <Download className="h-4 w-4" /> |
| `src/components/exam/ExamDetailsDialog.tsx` | 427 | Save Settings |
| `src/components/exam/ExamDetailsDialog.tsx` | 439 | <Users className="h-4 w-4 mr-2" /> Generate Hall Tickets |
| `src/components/exam/ExamDetailsDialog.tsx` | 443 | <Send className="h-4 w-4 mr-2" /> Send Notifications |
| `src/components/exam/ExamDetailsDialog.tsx` | 447 | <FileText className="h-4 w-4 mr-2" /> Seat Arrangement |
| `src/components/exam/ExamDetailsDialog.tsx` | 451 | <Download className="h-4 w-4 mr-2" /> Attendance Sheet |
| `src/components/exam/ExamDetailsDialog.tsx` | 463 | <Clock className="h-4 w-4 mr-2" /> Start Exam |
| `src/components/exam/ExamDetailsDialog.tsx` | 467 | <Eye className="h-4 w-4 mr-2" /> Monitor Progress |
| `src/components/exam/ExamDetailsDialog.tsx` | 471 | <Users className="h-4 w-4 mr-2" /> Mark Attendance |
| `src/components/exam/ExamDetailsDialog.tsx` | 475 | <Clock className="h-4 w-4 mr-2" /> End Exam |
| `src/components/exam/ExamDetailsDialog.tsx` | 487 | <FileText className="h-4 w-4 mr-2" /> Collect Answer Sheets |
| `src/components/exam/ExamDetailsDialog.tsx` | 491 | <Download className="h-4 w-4 mr-2" /> Export Results |
| `src/components/exam/ExamDetailsDialog.tsx` | 495 | <Send className="h-4 w-4 mr-2" /> Publish Results |
| `src/components/exam/ExamDetailsDialog.tsx` | 507 | <FileText className="h-4 w-4 mr-2" /> Exam Report |
| `src/components/exam/ExamDetailsDialog.tsx` | 511 | <Users className="h-4 w-4 mr-2" /> Student Performance |
| `src/components/exam/ExamDetailsDialog.tsx` | 515 | <Download className="h-4 w-4 mr-2" /> Analytics Dashboard |
| `src/components/exam/ExamScheduling.tsx` | 329 | <Eye className="h-4 w-4" /> |
| `src/components/exam/ExamScheduling.tsx` | 335 | <Edit className="h-4 w-4" /> |
| `src/components/exam/ExamScheduling.tsx` | 341 | Hall Tickets |
| `src/components/exam/ExamWorkflows.tsx` | 209 | <Users className="h-4 w-4 mr-2" /> View Participants |
| `src/components/exam/ExamWorkflows.tsx` | 213 | <Monitor className="h-4 w-4 mr-2" /> Monitor Live |
| `src/components/exam/ExamWorkflows.tsx` | 218 | End Exam |
| `src/components/exam/ExamWorkflows.tsx` | 297 | <Users className="h-4 w-4 mr-2" /> Attendance |
| `src/components/exam/ExamWorkflows.tsx` | 301 | <FileText className="h-4 w-4 mr-2" /> Answer Sheets |
| `src/components/exam/ExamWorkflows.tsx` | 306 | Mark Complete |
| `src/components/exam/GradingInterface.tsx` | 215 | View Results |
| `src/components/exam/HallTicketDialog.tsx` | 64 | <FileText className="h-4 w-4 mr-2" /> Generate Missing Tick |
| `src/components/exam/HallTicketDialog.tsx` | 68 | <Download className="h-4 w-4 mr-2" /> Download All Tickets |
| `src/components/exam/HallTicketDialog.tsx` | 80 | <Users className="h-4 w-4 mr-2" /> Regenerate All |
| `src/components/exam/HallTicketDialog.tsx` | 84 | <FileText className="h-4 w-4 mr-2" /> Print Queue |
| `src/components/exam/HallTicketDialog.tsx` | 93 | Process All Actions |
| `src/components/finance/MiscExpensesModule.tsx` | 332 | <Filter className="h-4 w-4" /> More Filters |
| `src/components/finance/MiscExpensesModule.tsx` | 336 | <Download className="h-4 w-4" /> Export |
| `src/components/finance/MiscExpensesModule.tsx` | 375 | {expense.receipt} |
| `src/components/library/DigitalCatalog.tsx` | 447 | <Edit className="h-4 w-4" /> |
| `src/components/library/DigitalLibrary.tsx` | 202 | {uploading ? ( <> <Loader2 className="w-4 h-4 mr-2 animate- |
| `src/components/medical/HealthRecordDetailsDialog.tsx` | 381 | <Edit className="h-4 w-4" /> |
| `src/components/medical/HealthRecordDetailsDialog.tsx` | 387 | <Plus className="h-4 w-4 mr-2" /> Add Medication |
| `src/components/medical/HealthRecordDetailsDialog.tsx` | 403 | <Edit className="h-4 w-4" /> |
| `src/components/medical/HealthRecordDetailsDialog.tsx` | 409 | <Plus className="h-4 w-4 mr-2" /> Add Condition |
| `src/components/medical/HealthRecordDetailsDialog.tsx` | 425 | <Edit className="h-4 w-4" /> |
| `src/components/medical/HealthRecordDetailsDialog.tsx` | 431 | <Plus className="h-4 w-4 mr-2" /> Add Family History |
| `src/components/medical/HealthRecordDetailsDialog.tsx` | 475 | <Edit className="h-4 w-4" /> |
| `src/components/medical/HealthRecordDetailsDialog.tsx` | 519 | <Plus className="h-4 w-4 mr-2" /> Add Emergency Contact |
| `src/components/medical/HealthRecordDetailsDialog.tsx` | 616 | <Download className="h-4 w-4 mr-2" /> Export Record |
| `src/components/medical/HealthRecordDetailsDialog.tsx` | 620 | <FileText className="h-4 w-4 mr-2" /> Generate Report |
| `src/components/medical/InfirmaryVisitDialog.tsx` | 717 | <FileText className="h-4 w-4 mr-2" /> Print Visit Summary |
| `src/components/naac/NAACHeader.tsx` | 47 | <Bell className="w-5 h-5" /> <span className="absolute -top |
| `src/components/naac/NAACHeader.tsx` | 55 | <Settings className="w-5 h-5" /> |
| `src/components/student/StudentExams.tsx` | 556 | <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" /> Hall |
| `src/components/student/StudentExams.tsx` | 578 | <Lock className="w-3 h-3 mr-1 text-slate-400" /> Results Aw |
| `src/pages/AlumniManagement.tsx` | 89 | <Plus className="w-4 h-4 mr-2" /> Add Alumni |
| `src/pages/AlumniManagement.tsx` | 167 | <Filter className="w-4 h-4 mr-2" /> Filter |
| `src/pages/AlumniManagement.tsx` | 171 | <Download className="w-4 h-4 mr-2" /> Export |
| `src/pages/AlumniManagement.tsx` | 243 | <Plus className="w-4 h-4 mr-2" /> Create Event |
| `src/pages/AlumniManagement.tsx` | 248 | View Calendar |
| `src/pages/AlumniManagement.tsx` | 272 | Manage |
| `src/pages/AlumniManagement.tsx` | 341 | Download |
| `src/pages/AlumniManagement.tsx` | 352 | Download |
| `src/pages/AlumniManagement.tsx` | 362 | Pending |
| `src/pages/AlumniManagement.tsx` | 422 | <Plus className="w-4 h-4 mr-2" /> Create Pairing |
| `src/pages/AlumniManagement.tsx` | 429 | Mentor Applications |
| `src/pages/AlumniManagement.tsx` | 432 | Program Analytics |
| `src/pages/AlumniManagement.tsx` | 457 | View Details |
| `src/pages/AlumniManagement.tsx` | 468 | View Details |
| `src/pages/AlumniManagement.tsx` | 478 | View Report |
| `src/pages/CertificateGeneration.tsx` | 294 | Edit |
| `src/pages/CertificateGeneration.tsx` | 295 | Preview |
| `src/pages/CertificateGeneration.tsx` | 305 | Edit |
| `src/pages/CertificateGeneration.tsx` | 306 | Preview |
| `src/pages/CertificateGeneration.tsx` | 316 | Edit |
| `src/pages/CertificateGeneration.tsx` | 317 | Preview |
| `src/pages/CertificateGeneration.tsx` | 327 | Edit |
| `src/pages/CertificateGeneration.tsx` | 328 | Preview |
| `src/pages/CertificateGeneration.tsx` | 332 | <Plus className="w-4 h-4 mr-2" /> Create New Template |
| `src/pages/CertificateGeneration.tsx` | 365 | <Download className="w-4 h-4 mr-2" /> Export |
| `src/pages/CertificateGeneration.tsx` | 451 | Verify |
| `src/pages/DisciplinaryManagement.tsx` | 262 | <Edit className="h-4 w-4 mr-1" /> Edit |
| `src/pages/MedicalManagement.tsx` | 139 | View details |
| `src/pages/MedicalManagement.tsx` | 168 | <Filter className="w-4 h-4 mr-2" /> Filter |
| `src/pages/MedicalManagement.tsx` | 172 | <Download className="w-4 h-4 mr-2" /> Export |
| `src/pages/MedicalManagement.tsx` | 249 | Today |
| `src/pages/MedicalManagement.tsx` | 250 | This Week |
| `src/pages/SportsManagement.tsx` | 224 | <Edit className="h-4 w-4" /> |
| `src/pages/SportsManagement.tsx` | 227 | <Eye className="h-4 w-4" /> |
| `src/pages/SportsManagement.tsx` | 300 | <Edit className="h-4 w-4" /> |
| `src/pages/SportsManagement.tsx` | 303 | <Eye className="h-4 w-4" /> |
| `src/pages/naac/CriterionTemplate.tsx` | 240 | <Eye className="w-4 h-4" /> |
| `src/pages/naac/CriterionTemplate.tsx` | 243 | <Edit className="w-4 h-4" /> |
| `src/pages/naac/CriterionTemplate.tsx` | 309 | <Download className="w-4 h-4" /> |
| `src/pages/naac/CriterionTemplate.tsx` | 312 | <Eye className="w-4 h-4" /> |
| `src/pages/naac/CriterionTemplate.tsx` | 315 | <Trash2 className="w-4 h-4" /> |
| `src/pages/naac/CriterionTemplate.tsx` | 406 | Save Draft |
| `src/pages/naac/CriterionTemplate.tsx` | 407 | Submit Data |
| `src/pages/naac/Reports.tsx` | 204 | <Eye className="w-4 h-4" /> |
| `src/pages/naac/Repository.tsx` | 373 | <Eye className="w-4 h-4" /> |
| `src/pages/naac/Repository.tsx` | 376 | <Download className="w-4 h-4" /> |
| `src/pages/naac/Settings.tsx` | 415 | Remove |
| `src/pages/naac/Settings.tsx` | 418 | Add Administrator |
| `src/pages/naac/Settings.tsx` | 428 | Remove |
| `src/pages/naac/Settings.tsx` | 431 | Add Coordinator |
