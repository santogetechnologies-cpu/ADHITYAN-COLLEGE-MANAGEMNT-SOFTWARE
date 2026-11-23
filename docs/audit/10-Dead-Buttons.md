# Buttons without a click handler (static scan)

Found with the TypeScript compiler API (`node scripts/find-dead-buttons.cjs`): `<Button>`/`<button>` with no `onClick`, no `type="submit"`, not `asChild`, not inside a form or trigger-style wrapper.
**81 likely-dead buttons in 22 files** (+11 that are direct children of a custom component, which usually supplies the click and is probably fine).

Rule (master prompt §4 rule 3): a button must do something real, or be removed/disabled with a reason.

**Already resolved:** library Issue/Return/Renew (migration 043); the exam module (`ExamScheduling`, `ExamWorkflows`, `GradingInterface` rebuilt; `ExamDetailsDialog` and `HallTicketDialog`, which were ~25 decorative buttons, removed).

| File | Line | Label |
|---|---|---|
| `src/components/RoleSelection.tsx` | 363 | Access Portal |
| `src/components/RoleSelection.tsx` | 408 | Access Portal |
| `src/components/RoleSelection.tsx` | 453 | Access |
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
| `src/pages/AlumniManagement.tsx` | 167 | <Filter className="w-4 h-4 mr-2" /> Filter |
| `src/pages/AlumniManagement.tsx` | 171 | <Download className="w-4 h-4 mr-2" /> Export |
| `src/pages/AlumniManagement.tsx` | 248 | View Calendar |
| `src/pages/AlumniManagement.tsx` | 272 | Manage |
| `src/pages/AlumniManagement.tsx` | 352 | Download |
| `src/pages/AlumniManagement.tsx` | 362 | Pending |
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
