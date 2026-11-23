export type UserRole =
  | 'student'
  | 'parent'
  | 'teacher'
  | 'admin'
  | 'principal'
  | 'financier'
  | 'accountant'
  | 'storekeeper'
  | 'driver'
  | 'receptionist'
  | 'store_manager'
  | 'finance_manager'
  | 'transport_driver'
  | 'naac_coordinator'
  | 'hr_manager'
  | 'coe'
  | 'hod'
  | 'librarian'
  | 'hostel_warden'
  | 'placement_officer';

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status?: 'active' | 'inactive' | 'suspended';
  avatar_url?: string;
  phone?: string;
  department?: string;
  class_name?: string;
  roll_number?: string;
  student_id?: string;
  bio?: string;
  preferences?: {
    theme?: string;
    language?: string;
    notifications?: boolean;
    timezone?: string;
    assigned_classes?: string[];
    designation?: string;
    [key: string]: any;
  };
  /** read from preferences by the services that load profiles */
  assigned_classes?: string[];
  designation?: string;
  phone_number?: string;
  enrollment_status?: string;
  staff_id?: string;
  address?: string;
  parent_phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Student {
  id: string;
  user_id: string;
  student_id: string;
  roll_number?: string;
  name: string;
  email: string;
  department: string;
  class_name?: string;
  current_semester: number;
  admission_date?: string;
  status: 'active' | 'inactive' | 'suspended' | 'graduated' | 'alumni';
  phone?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Department {
  id: string;
  name: string;
  duration?: number;
  duration_years?: number;
  code?: string;
  head_of_department?: string;
  created_at?: string;
  updated_at?: string;
  sections?: Section[];
}

export interface Section {
  id: string;
  department_id: string;
  name: string;
  capacity: number;
  current_students: number;
  assigned_teacher_id?: string;
  assigned_teacher_name?: string;
  created_at?: string;
}

export interface TimetableSlot {
  id: string;
  class_name: string;
  course_name?: string;
  year_semester?: string;
  room_lab?: string;
  session_type?: 'theory' | 'practical' | 'clinical' | 'seminar';
  day_of_week: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  start_time: string;
  end_time: string;
  subject: string;
  teacher_name: string;
  teacher_id?: string;
  room: string;
  created_at?: string;
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  description?: string;
  type: 'assignment' | 'homework' | 'project';
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  classes: string[];
  teacher_id?: string;
  teacher_name?: string;
  attachments?: string[];
  created_at?: string;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  student_name: string;
  subject: string;
  score?: number;
  status: 'submitted' | 'graded' | 'pending' | 'late';
  submitted_at?: string;
  feedback?: string;
  attachment_url?: string;
  submission_text?: string;
}

export interface DailyTeachingUpdate {
  id: string;
  teacher_id?: string;
  teacher_name?: string;
  subject: string;
  class_name: string;
  date: string;
  topics_covered: string[];
  important_topics: string[];
  pyq: string[];
  next_class_prep?: string;
  notes?: string;
  created_at?: string;
  course_name?: string;
  next_plan?: string;
}

export interface FeedbackSubmission {
  id: string;
  class_name: string;
  subject: string;
  teacher_name: string;
  message: string;
  sender_id?: string;
  user_id?: string;
  user_name?: string;
  created_at?: string;
  rating?: number;
}

export interface Concern {
  id: string;
  student_id?: string;
  user_id?: string;
  user_name?: string;
  concern_type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  subject: string;
  description: string;
  is_anonymous: boolean;
  status: 'Pending' | 'In Progress' | 'Resolved' | 'Dismissed';
  resolution_notes?: string;
  attachments?: string[];
  created_at?: string;
  /** derived from concern_type / user_name for the screens */
  category?: string;
  student_name?: string;
  class_name?: string;
  admin_response?: string;
}

export interface TeacherMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_email?: string;
  teacher_id?: string;
  teacher_name: string;
  subject: string;
  message: string;
  attachments?: string[];
  is_read: boolean;
  created_at?: string;
}

export interface WellnessCheckin {
  id: string;
  user_id?: string;
  checkin_type: 'morning' | 'afternoon' | 'evening';
  type?: 'morning' | 'afternoon' | 'evening';
  date: string;
  mood?: string;
  energy_level?: number;
  readiness_score?: number;
  learning_goal?: string;
  reflection?: string;
  completed_tasks?: string[];
  difficulties?: string;
  day_rating?: number;
  improvements?: string;
  notes?: string;
  details?: Record<string, any>;
  options?: string[];
  created_at?: string;
}

export interface LearningModule {
  id: string;
  title: string;
  duration: string;
  content: string;
  keyTakeaways?: string[];
  resourceUrl?: string;
}

export interface LearningContent {
  id: string;
  title: string;
  description?: string;
  subject: string;
  department?: string;
  class_name?: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimated_duration: string;
  modules: LearningModule[];
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StudentLearningProgress {
  id: string;
  student_id: string;
  content_id: string;
  current_module_index: number;
  progress_percentage: number;
  last_position_seconds: number;
  completed: boolean;
  notes?: string;
  completed_modules?: string[];
  updated_at?: string;
  created_at?: string;
  content?: LearningContent;
}

export interface HealthRecord {
  id: string;
  name: string;
  user_id?: string;
  role: string;
  class_name?: string;
  roll_no?: string;
  blood_group?: string;
  allergies: string[];
  medical_conditions: string[];
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  vaccination_status: string;
  created_at?: string;
  updated_at?: string;
}

export interface InfirmaryVisit {
  id: string;
  patient_name: string;
  patient_role?: string;
  student_id?: string;
  class_name?: string;
  visit_date?: string;
  symptoms?: string;
  complaint?: string;
  treatment?: string;
  attending_staff?: string;
  doctor_name?: string;
  follow_up_date?: string;
  status: 'Admitted' | 'Discharged' | 'Referred to Hospital' | 'active' | 'resolved' | 'urgent' | string;
  created_at?: string;
}

export interface TransportVehicle {
  id: string;
  vehicle_number: string;
  bus_number?: string;
  vehicle_type: string;
  route_name: string;
  driver_name: string;
  driver_phone?: string;
  driver_id?: string;
  capacity: number;
  occupied_seats?: number;
  status: 'active' | 'maintenance' | 'idle' | 'delayed' | 'On Route' | 'Idle' | 'Maintenance' | string;
  current_location?: string;
  eta_to_next_stop?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TransportStop {
  id: string;
  vehicle_id: string;
  stop_name: string;
  scheduled_time: string;
  stop_order: number;
  status: 'Completed' | 'Current' | 'Upcoming' | 'Skipped';
  students_count: number;
  arrival_time?: string;
}

export interface VehicleMaintenance {
  id: string;
  vehicle_id: string;
  item: string;
  last_change?: string;
  next_due?: string;
  status: 'good' | 'warning' | 'overdue';
  created_at?: string;
}

export interface StoreProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  rating: number;
  image_url: string;
  stock: number;
  description?: string;
  created_at?: string;
}

export interface StoreOrder {
  id: string;
  user_id?: string;
  user_name: string;
  items: Array<{
    id: string | number;
    name: string;
    price: number;
    quantity: number;
  }>;
  total_amount: number;
  status: 'Pending' | 'Processing' | 'Delivered' | 'Cancelled';
  created_at?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  created_at?: string;
}

export interface InventoryTransaction {
  id: string;
  type: 'Issue' | 'Receipt' | 'Order' | 'Adjustment';
  item_name: string;
  quantity: number;
  department?: string;
  supplier?: string;
  status: 'completed' | 'pending' | 'processing' | 'cancelled';
  created_at?: string;
}

export interface AdmissionApplication {
  id: string;
  application_number?: string;
  application_no?: string;
  applicant_name?: string;
  name?: string;
  email: string;
  phone: string;
  class_name?: string;
  class_applied?: string;
  parent_name: string;
  parent_phone: string;
  status: 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';
  submission_date?: string;
  previous_school?: string;
  address?: string;
  date_of_birth?: string;
  remarks?: string;
  documents?: any[];
  created_at?: string;
  roll_number?: string;
  program?: string;
}

export interface AlumniProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  roll_number?: string;
  course?: string;
  department: string;
  graduation_year: string;
  current_position?: string;
  company?: string;
  location?: string;
  linkedin_url?: string;
  bio?: string;
  status: 'Active' | 'Mentor' | 'Inactive';
  created_at?: string;
}

export interface AlumniEvent {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  location: string;
  attendees_count: number;
  status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Planning';
  created_at?: string;
}

export interface LibraryBook {
  id: string;
  book_code: string;
  title: string;
  author: string;
  isbn?: string;
  category: string;
  subject: string;
  class_level?: string;
  type: 'Physical' | 'Digital' | 'Interactive' | 'Audio';
  status: 'Available' | 'Issued' | 'Reserved' | 'Maintenance';
  total_copies: number;
  available_copies: number;
  published_year?: number;
  publisher?: string;
  created_at?: string;
}

export interface BookIssue {
  id: string;
  book_id: string;
  book_title: string;
  book_code: string;
  user_id?: string;
  student_name: string;
  student_id: string;
  roll_no?: string;
  class_name?: string;
  issue_date: string;
  due_date: string;
  return_date?: string;
  status: 'Issued' | 'Overdue' | 'Returned';
  days_overdue: number;
  renew_count: number;
  created_at?: string;
}

export interface DigitalLibraryResource {
  id: string;
  title: string;
  authors: string[];
  journal?: string;
  resource_type: string;
  published_date?: string;
  doi?: string;
  abstract?: string;
  file_url?: string;
  download_count: number;
  created_at?: string;
}

export interface Certificate {
  id: string;
  certificate_type: string;
  student_id?: string;
  student_name: string;
  roll_number?: string;
  class_name?: string;
  purpose?: string;
  issue_date: string;
  status: 'Pending' | 'Approved' | 'Issued' | 'Rejected';
  certificate_number?: string;
  qr_code_hash?: string;
  created_at?: string;
}

export interface DisciplinaryIncident {
  id: string;
  student_id?: string;
  student_name: string;
  roll_no?: string;
  class_name: string;
  incident: string;
  severity: 'Minor' | 'Major' | 'Critical';
  reported_by: string;
  incident_date: string;
  status: 'Pending Review' | 'Under Investigation' | 'Resolved';
  action_taken?: string;
  created_at?: string;
}

export interface Exam {
  id: string;
  name: string;
  title?: string;
  course?: string;
  semester?: string;
  term: string;
  academic_year: string;
  start_date: string;
  end_date: string;
  status: 'Scheduled' | 'Ongoing' | 'Completed' | 'Results Published' | string;
  exam_category?: string;
  is_published?: boolean;
  timetable_published?: boolean;
  hall_ticket_published?: boolean;
  results_published?: boolean;
  created_at?: string;
}

export interface ExamSchedule {
  id: string;
  exam_id?: string;
  subject: string;
  subject_code?: string;
  day_of_week?: string;
  class_name: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  room: string;
  room_no?: string;
  max_marks: number;
  passing_marks?: number;
  created_at?: string;
  exam_type?: string;
}

export interface ExamResult {
  id: string;
  exam_id: string;
  student_id?: string;
  student_name: string;
  roll_number?: string;
  class_name: string;
  subject: string;
  subject_code?: string;
  marks_obtained: number;
  max_marks: number;
  total_marks?: number;
  grade?: string;
  result_status?: 'PASS' | 'FAIL' | 'WITHHELD' | string;
  is_published?: boolean;
  published_at?: string;
  remarks?: string;
  created_at?: string;
  exam_name?: string;
  status?: string;
  percentage?: number | null;
}

export interface SportsEvent {
  id: string;
  name: string;
  sport: string;
  date: string;
  status: 'Upcoming' | 'Registrations Open' | 'Ongoing' | 'Completed';
  participants: number;
  teams: number;
  created_at?: string;
}

export interface SportsTeam {
  id: string;
  sport: string;
  category: string;
  captain: string;
  members_count?: number;
  members?: any;
  coach: string;
  achievements: string[];
  created_at?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
  category: 'academic' | 'cultural' | 'sports' | 'exam' | 'meeting' | 'holiday';
  target_audience: 'all' | 'students' | 'teachers' | 'parents' | 'staff';
  department?: string;
  class_name?: string;
  priority: 'low' | 'medium' | 'high';
  created_by?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  created_at?: string;
}

export type Notification = NotificationItem;

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  priority: 'low' | 'medium' | 'high';
  is_read: boolean;
  created_at?: string;
}

export interface NAACCriterionProgress {
  criterion_number: number;
  completion_percentage: number;
  total_metrics: number;
  completed_metrics: number;
  last_updated?: string;
}

export interface NAACDocument {
  id: string;
  title: string;
  filename: string;
  file_url?: string;
  criterion_number: number;
  metric_code: string;
  evidence_type: string;
  file_type: string;
  file_size?: string;
  tags: string[];
  uploaded_by?: string;
  created_at?: string;
}

export interface ReceptionVisitor {
  id: string;
  name: string;
  purpose: string;
  time: string;
  status: 'checked_in' | 'waiting' | 'completed' | 'pending';
  contact: string;
  check_out_time?: string;
  host_person?: string;
  badge_number?: string;
  created_at?: string;
}

export interface ReceptionAppointment {
  id: string;
  time: string;
  person: string;
  with_whom: string;
  with_user_id?: string;
  contact?: string;
  appointment_date?: string;
  notes?: string;
  type: 'meeting' | 'interview' | 'business' | 'counseling';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_at?: string;
}

export interface ReceptionEnquiry {
  id: string;
  enquiry_code: string;
  type: string;
  parent_name: string;
  grade: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'resolved';
  phone?: string;
  email?: string;
  notes?: string;
  created_at?: string;
}

export interface FinanceTransaction {
  id: string;
  type: string;
  amount: number;
  department?: string;
  description?: string;
  payment_method?: string;
  date?: string;
  urgency?: 'low' | 'medium' | 'high';
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at?: string;
}

export interface StudentFee {
  id: string;
  student_id?: string;
  student_name: string;
  class_name: string;
  total_due: number;
  paid_amount: number;
  due_date: string;
  status: 'paid' | 'pending' | 'overdue' | 'partially_paid' | 'waived' | 'cancelled';
  created_at?: string;
  // fee engine (migrations 040/041)
  student_record_id?: string | null;
  student_code?: string | null;
  fee_head_id?: string | null;
  plan_item_id?: string | null;
  run_id?: string | null;
  charge_key?: string | null;
  academic_year?: string | null;
  term_label?: string | null;
  description?: string | null;
  original_amount?: number | null;
  waived_amount?: number;
  term?: string;
}

export interface FeeHead { id: string; code: string; name: string; category: string; refundable: boolean; active: boolean; description?: string | null; created_at?: string; updated_at?: string }
export interface FeePlan { id: string; name: string; academic_year: string; department: string | null; class_name: string | null; quota: string | null; description: string | null; status: 'Draft' | 'Published' | 'Archived'; created_by?: string | null; published_at?: string | null; created_at?: string; updated_at?: string }
export interface FeePlanItem { id: string; plan_id: string; fee_head_id: string; amount: number; billing_cycle: 'one_time' | 'per_semester' | 'per_year'; semesters: number[] | null; due_days: number; description?: string | null; sort_order?: number; created_at?: string }
export interface FeeRun { id: string; run_type: 'plan' | 'adhoc'; plan_id: string | null; fee_head_id: string | null; amount: number | null; description: string | null; scope_type: 'student' | 'class' | 'department' | 'all'; scope_value: string | null; quota_filter: string | null; semester_filter: number | null; academic_year: string; due_date: string | null; status: 'Completed' | 'Cancelled'; students_count: number; demands_count: number; total_amount: number; created_at: string }
export interface FeeAdjustment { id: string; student_fee_id: string; kind: 'waiver' | 'concession' | 'cancellation'; amount: number; reason: string; created_by?: string | null; created_at: string }
export interface StudentRecord { id: string; user_id: string | null; student_id: string; name: string; department: string | null; class_name: string | null; current_semester: number; status: string; admission_quota?: string | null; admission_type?: string | null; entry_academic_year?: string | null }

export interface StudentAchievement {
  id: string;
  student_id: string;
  title: string;
  description: string;
  type: 'academic' | 'attendance' | 'social' | 'sports';
  date: string;
  level: 'Gold' | 'Silver' | 'Bronze';
  created_at?: string;
}

export interface StudentGoal {
  id: string;
  student_id: string;
  title: string;
  description?: string;
  progress: number;
  current_value: number;
  target_value: number;
  created_at?: string;
}

export interface AIChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'ai' | 'system';
  content: string;
  created_at?: string;
}

export interface ParentStudentLink {
  id: string;
  parent_id: string;
  student_id: string;
  relationship: string;
  verified: boolean;
  created_at?: string;
  updated_at?: string;
  student?: Profile;
}

export interface StudentAttendance {
  id: string;
  student_id: string;
  institutional_student_id?: string;
  course?: string;
  semester?: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'leave' | 'excused';
  subject?: string;
  remarks?: string;
  recorded_by?: string;
  created_at?: string;
  updated_at?: string;
  class_name?: string;
  session?: string;
}

export interface StudentMoodCheckin {
  id: string;
  user_id: string;
  student_id?: string;
  date: string;
  session: 'morning' | 'afternoon' | 'evening';
  mood: 'Happy' | 'Good' | 'Normal' | 'Tired' | 'Stressed' | 'Unwell';
  notes?: string;
  created_at?: string;
}

export interface StudentTransportLog {
  id: string;
  vehicle_id?: string;
  student_id?: string;
  student_name: string;
  class_name?: string;
  stop_name: string;
  status: 'checked_in' | 'waiting' | 'absent' | 'dropped';
  checkin_time?: string;
  date: string;
  scan_time?: string;
}

// ============================================================================
// INSTITUTIONAL COLLEGE ERP TYPES
// ============================================================================

export interface StaffServiceRecord {
  id: string;
  user_id: string;
  employee_code: string;
  designation: string;
  department: string;
  qualification: string;
  date_of_joining: string;
  employment_type: 'Permanent' | 'Probation' | 'Contract' | 'Visiting';
  pan_number?: string;
  pf_uan_number?: string;
  bank_name?: string;
  bank_account_no?: string;
  bank_ifsc?: string;
  basic_pay: number;
  da_pct: number;
  hra_pct: number;
  special_allowance: number;
  epf_opt_out: boolean;
  status: 'Active' | 'On-Leave' | 'Resigned' | 'Retired';
  created_at?: string;
  updated_at?: string;
}

export interface StaffLeaveBalance {
  id: string;
  user_id: string;
  academic_year: string;
  casual_leave_quota: number;
  casual_leave_taken: number;
  medical_leave_quota: number;
  medical_leave_taken: number;
  earned_leave_quota: number;
  earned_leave_taken: number;
  on_duty_taken: number;
}

export interface StaffLeaveApplication {
  id: string;
  user_id: string;
  staff_name: string;
  department: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  substitute_teacher_id?: string;
  substitute_teacher_name?: string;
  status: 'Pending_HOD' | 'Pending_Principal' | 'Approved' | 'Rejected';
  approved_by?: string;
  rejection_reason?: string;
  created_at?: string;
}

export interface StaffPayrollRun {
  id: string;
  month_year: string;
  total_gross_disbursed: number;
  total_deductions: number;
  total_net_disbursed: number;
  total_employees: number;
  run_date: string;
  status: 'Draft' | 'Approved' | 'Disbursed' | 'Cancelled';
  processed_by?: string;
  approved_by?: string;
  payment_reference?: string;
  created_at?: string;
}

export interface StaffPayrollItem {
  id: string;
  payroll_run_id: string;
  user_id: string;
  employee_code: string;
  employee_name: string;
  department: string;
  designation: string;
  month_year: string;
  days_in_month: number;
  days_worked: number;
  lop_days: number;
  basic_earned: number;
  da_earned: number;
  hra_earned: number;
  special_allowance: number;
  gross_salary: number;
  epf_deduction: number;
  esi_deduction: number;
  pt_deduction: number;
  tds_deduction: number;
  other_deductions: number;
  total_deductions: number;
  net_salary: number;
  payslip_number: string;
  payment_reference?: string;
  status: string;
  created_at?: string;
}

export interface FeeStructure {
  id: string;
  title: string;
  department: string;
  academic_year: string;
  quota: 'Merit' | 'Management' | 'Lateral_Entry' | 'NRI';
  tuition_fee: number;
  lab_fee: number;
  exam_fee: number;
  library_fee: number;
  sports_fee: number;
  development_fund: number;
  hostel_fee_default: number;
  transport_fee_default: number;
  total_annual_fee: number;
  installments_allowed: number;
  created_at?: string;
}

export interface ScholarshipMaster {
  id: string;
  scholarship_name: string;
  code: string;
  category: 'Government' | 'Merit' | 'Sports' | 'Staff_Ward' | 'EWS';
  discount_type: 'Percentage' | 'Fixed_Amount';
  discount_value: number;
  eligibility_criteria: string;
  is_active: boolean;
}

export interface ScholarshipApplication {
  id: string;
  student_id: string;
  student_name: string;
  roll_number: string;
  department: string;
  scholarship_id: string;
  scholarship_name: string;
  academic_year: string;
  requested_amount: number;
  sanctioned_amount: number;
  proof_document_url?: string;
  status: 'Submitted' | 'Verified_Accounts' | 'Recommended_HOD' | 'Approved' | 'Rejected';
  approved_by?: string;
  remarks?: string;
  created_at?: string;
}

export interface FeeReceipt {
  id: string;
  receipt_number: string;
  student_fee_id?: string;
  student_id: string;
  student_name: string;
  roll_number: string;
  department: string;
  academic_year: string;
  semester: string;
  fee_type: string;
  gross_amount: number;
  discount_applied: number;
  discount_reason?: string;
  amount_paid: number;
  balance_remaining: number;
  payment_mode: string;
  transaction_reference: string;
  payment_date: string;
  cashier_user_id?: string;
  qr_verification_token: string;
  created_at?: string;
}

export interface FeePaymentReminder {
  id: string;
  student_id: string;
  student_fee_id: string;
  student_name: string;
  roll_number: string;
  reminder_type: string;
  due_date: string;
  amount_due: number;
  channels: string;
  delivery_status: string;
  sent_at: string;
}

export interface ClassAttendanceSession {
  id: string;
  teacher_id?: string;
  teacher_name: string;
  class_name: string;
  department: string;
  subject_code: string;
  subject_title: string;
  session_date: string;
  period_number: number;
  total_enrolled: number;
  total_present: number;
  total_absent: number;
  status: string;
  created_at?: string;
}

export interface StudentAttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  student_name: string;
  roll_number: string;
  status: 'Present' | 'Absent' | 'Late' | 'On_Duty';
  remarks?: string;
  created_at?: string;
}

export interface AttendanceShortageWarning {
  id: string;
  student_id: string;
  student_name: string;
  roll_number: string;
  department: string;
  class_name: string;
  subject_code: string;
  subject_title: string;
  total_conducted: number;
  total_attended: number;
  percentage: number;
  warning_level: string;
  issued_date: string;
  parent_notified: boolean;
  parent_acknowledged: boolean;
  is_detained: boolean;
  condonation_applied: boolean;
  created_at?: string;
}

export interface HallTicket {
  id: string;
  student_id: string;
  student_name: string;
  roll_number: string;
  register_number: string;
  department: string;
  class_name: string;
  academic_year: string;
  semester: string;
  exam_center: string;
  hall_number: string;
  seat_number: string;
  attendance_pct: number;
  has_fee_dues: boolean;
  is_detained: boolean;
  detention_reason?: string;
  qr_code_token: string;
  issued_date: string;
  coe_signature_hash: string;
  created_at?: string;
  exam_id?: string | null;
  exam_title?: string | null;
  status?: string;
  override_reason?: string | null;
}

export interface LibraryCirculation {
  id: string;
  book_id: string;
  book_title: string;
  accession_no: string;
  user_id: string;
  user_name: string;
  user_role: string;
  issue_date: string;
  due_date: string;
  return_date?: string;
  overdue_days: number;
  fine_amount: number;
  fine_paid: boolean;
  status: 'Issued' | 'Returned' | 'Overdue' | 'Lost';
  created_at?: string;
}

export interface HostelRoom {
  id: string;
  block_name: string;
  floor_number: number;
  room_number: string;
  capacity: number;
  current_occupancy: number;
  room_type: string;
  annual_fee: number;
  status: string;
  created_at?: string;
}

export interface HostelOutPass {
  id: string;
  student_id: string;
  student_name: string;
  roll_number: string;
  room_details: string;
  purpose: string;
  destination_address: string;
  departure_time: string;
  expected_return_time: string;
  actual_return_time?: string;
  parent_phone: string;
  parent_otp_verified: boolean;
  warden_status: 'Pending' | 'Approved' | 'Rejected' | 'Exited' | 'Returned';
  guard_exit_time?: string;
  guard_entry_time?: string;
  created_at?: string;
}

export interface PlacementDrive {
  id: string;
  company_name: string;
  company_logo_url?: string;
  job_title: string;
  package_lpa: number;
  job_location: string;
  min_cgpa: number;
  max_backlogs: number;
  eligible_departments: string[];
  drive_date: string;
  application_deadline: string;
  selection_rounds: string[];
  status: 'Open' | 'Shortlisting' | 'Completed';
  created_at?: string;
}

export interface PlacementApplication {
  id: string;
  drive_id: string;
  student_id: string;
  student_name: string;
  roll_number: string;
  department: string;
  cgpa: number;
  current_round: string;
  offer_letter_url?: string;
  status: string;
  created_at?: string;
}

export interface InstitutionalBroadcast {
  id: string;
  title: string;
  message: string;
  category: 'Emergency' | 'Circular' | 'Exam' | 'Holiday' | 'Event';
  priority: 'Normal' | 'High' | 'Urgent';
  target_audience: 'All' | 'Students' | 'Faculty' | 'Parents';
  author_name: string;
  author_id?: string;
  published_at: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  duration_years: number;
  type: 'Degree' | 'Diploma' | 'Certificate';
  department: string;
  tuition_fee: number;
  description?: string;
  eligibility?: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface InstitutionalSettings {
  id: string;
  institution_name: string;
  institution_code: string;
  academic_year: string;
  contact_email: string;
  contact_phone?: string;
  address?: string;
  min_attendance_percentage: number;
  passing_marks_percentage: number;
  enable_realtime: boolean;
  enable_email_alerts: boolean;
  maintenance_mode: boolean;
  updated_at?: string;
}

export interface AdmissionDocumentVerification {
  id: string;
  application_id?: string;
  student_name: string;
  document_type: string;
  document_url?: string;
  status: 'Pending' | 'Verified' | 'Rejected';
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  submission_date?: string;
  created_at?: string;
}

export interface AdmissionMeritEntry {
  id: string;
  application_id?: string;
  student_name: string;
  course_name: string;
  merit_score: number;
  rank: number;
  category?: string;
  status: 'Selected' | 'Waitlist' | 'Admitted' | 'Declined';
  academic_year?: string;
  created_at?: string;
}

export interface AdmissionEntranceTest {
  id: string;
  test_name: string;
  course_name?: string;
  test_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  max_marks: number;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  registered_count: number;
  qualified_count: number;
  created_at?: string;
}




