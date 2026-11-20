import * as DBTypes from './database.types';

export * from './database.types';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: DBTypes.Profile;
        Insert: Partial<DBTypes.Profile> & { id: string; email: string; name: string; role: DBTypes.UserRole };
        Update: Partial<DBTypes.Profile>;
        Relationships: [];
      };
      departments: {
        Row: DBTypes.Department;
        Insert: Partial<DBTypes.Department> & { name: string };
        Update: Partial<DBTypes.Department>;
        Relationships: [];
      };
      sections: {
        Row: DBTypes.Section;
        Insert: Partial<DBTypes.Section> & { department_id: string; name: string };
        Update: Partial<DBTypes.Section>;
        Relationships: [];
      };
      timetables: {
        Row: DBTypes.TimetableSlot;
        Insert: Partial<DBTypes.TimetableSlot> & { day_of_week: string; start_time: string; end_time: string; subject: string };
        Update: Partial<DBTypes.TimetableSlot>;
        Relationships: [];
      };
      assignments: {
        Row: DBTypes.Assignment;
        Insert: Partial<DBTypes.Assignment> & { title: string; teacher_id: string; due_date: string };
        Update: Partial<DBTypes.Assignment>;
        Relationships: [];
      };
      assignment_submissions: {
        Row: DBTypes.AssignmentSubmission;
        Insert: Partial<DBTypes.AssignmentSubmission> & { assignment_id: string; student_id: string };
        Update: Partial<DBTypes.AssignmentSubmission>;
        Relationships: [];
      };
      daily_teaching_updates: {
        Row: DBTypes.DailyTeachingUpdate;
        Insert: Partial<DBTypes.DailyTeachingUpdate> & { teacher_id: string; date: string; topic_covered: string };
        Update: Partial<DBTypes.DailyTeachingUpdate>;
        Relationships: [];
      };
      feedback_submissions: {
        Row: DBTypes.FeedbackSubmission;
        Insert: Partial<DBTypes.FeedbackSubmission> & { user_id: string; category: string; content: string };
        Update: Partial<DBTypes.FeedbackSubmission>;
        Relationships: [];
      };
      concerns: {
        Row: DBTypes.Concern;
        Insert: Partial<DBTypes.Concern> & { user_id: string; title: string; description: string };
        Update: Partial<DBTypes.Concern>;
        Relationships: [];
      };
      teacher_messages: {
        Row: DBTypes.TeacherMessage;
        Insert: Partial<DBTypes.TeacherMessage> & { sender_id: string; recipient_id: string; message: string };
        Update: Partial<DBTypes.TeacherMessage>;
        Relationships: [];
      };
      wellness_checkins: {
        Row: DBTypes.WellnessCheckin;
        Insert: Partial<DBTypes.WellnessCheckin> & { student_id: string; mood: string };
        Update: Partial<DBTypes.WellnessCheckin>;
        Relationships: [];
      };
      health_records: {
        Row: DBTypes.HealthRecord;
        Insert: Partial<DBTypes.HealthRecord> & { student_id: string };
        Update: Partial<DBTypes.HealthRecord>;
        Relationships: [];
      };
      infirmary_visits: {
        Row: DBTypes.InfirmaryVisit;
        Insert: Partial<DBTypes.InfirmaryVisit> & { student_id: string; reason: string };
        Update: Partial<DBTypes.InfirmaryVisit>;
        Relationships: [];
      };
      transport_vehicles: {
        Row: DBTypes.TransportVehicle;
        Insert: Partial<DBTypes.TransportVehicle> & { vehicle_number: string; route_name: string };
        Update: Partial<DBTypes.TransportVehicle>;
        Relationships: [];
      };
      transport_stops: {
        Row: DBTypes.TransportStop;
        Insert: Partial<DBTypes.TransportStop> & { vehicle_id: string; stop_name: string; sequence_order: number };
        Update: Partial<DBTypes.TransportStop>;
        Relationships: [];
      };
      vehicle_maintenance: {
        Row: DBTypes.VehicleMaintenance;
        Insert: Partial<DBTypes.VehicleMaintenance> & { vehicle_id: string; service_type: string; cost: number };
        Update: Partial<DBTypes.VehicleMaintenance>;
        Relationships: [];
      };
      store_products: {
        Row: DBTypes.StoreProduct;
        Insert: Partial<DBTypes.StoreProduct> & { name: string; price: number; category: string };
        Update: Partial<DBTypes.StoreProduct>;
        Relationships: [];
      };
      store_orders: {
        Row: DBTypes.StoreOrder;
        Insert: Partial<DBTypes.StoreOrder> & { student_id: string; total_amount: number };
        Update: Partial<DBTypes.StoreOrder>;
        Relationships: [];
      };
      inventory_items: {
        Row: DBTypes.InventoryItem;
        Insert: Partial<DBTypes.InventoryItem> & { item_name: string; quantity: number };
        Update: Partial<DBTypes.InventoryItem>;
        Relationships: [];
      };
      inventory_transactions: {
        Row: DBTypes.InventoryTransaction;
        Insert: Partial<DBTypes.InventoryTransaction> & { item_id: string; transaction_type: string; quantity: number };
        Update: Partial<DBTypes.InventoryTransaction>;
        Relationships: [];
      };
      admission_applications: {
        Row: DBTypes.AdmissionApplication;
        Insert: Partial<DBTypes.AdmissionApplication> & { applicant_name: string; email: string; program_applied: string };
        Update: Partial<DBTypes.AdmissionApplication>;
        Relationships: [];
      };
      alumni_profiles: {
        Row: DBTypes.AlumniProfile;
        Insert: Partial<DBTypes.AlumniProfile> & { name: string; graduation_year: number; degree: string };
        Update: Partial<DBTypes.AlumniProfile>;
        Relationships: [];
      };
      library_books: {
        Row: DBTypes.LibraryBook;
        Insert: Partial<DBTypes.LibraryBook> & { title: string; author: string; isbn: string };
        Update: Partial<DBTypes.LibraryBook>;
        Relationships: [];
      };
      book_issues: {
        Row: DBTypes.BookIssue;
        Insert: Partial<DBTypes.BookIssue> & { book_id: string; student_id: string; issue_date: string };
        Update: Partial<DBTypes.BookIssue>;
        Relationships: [];
      };
      digital_library_resources: {
        Row: DBTypes.DigitalLibraryResource;
        Insert: Partial<DBTypes.DigitalLibraryResource> & { title: string; resource_type: string; resource_url: string };
        Update: Partial<DBTypes.DigitalLibraryResource>;
        Relationships: [];
      };
      certificates: {
        Row: DBTypes.Certificate;
        Insert: Partial<DBTypes.Certificate> & { certificate_number: string; student_id: string; certificate_type: string };
        Update: Partial<DBTypes.Certificate>;
        Relationships: [];
      };
      disciplinary_incidents: {
        Row: DBTypes.DisciplinaryIncident;
        Insert: Partial<DBTypes.DisciplinaryIncident> & { student_id: string; incident_date: string; description: string };
        Update: Partial<DBTypes.DisciplinaryIncident>;
        Relationships: [];
      };
      exams: {
        Row: DBTypes.Exam;
        Insert: Partial<DBTypes.Exam> & { title: string; academic_year: string; exam_type: string };
        Update: Partial<DBTypes.Exam>;
        Relationships: [];
      };
      exam_schedules: {
        Row: DBTypes.ExamSchedule;
        Insert: Partial<DBTypes.ExamSchedule> & { exam_id: string; subject: string; exam_date: string; start_time: string; end_time: string };
        Update: Partial<DBTypes.ExamSchedule>;
        Relationships: [];
      };
      exam_results: {
        Row: DBTypes.ExamResult;
        Insert: Partial<DBTypes.ExamResult> & { exam_id: string; student_id: string; subject: string; marks_obtained: number; total_marks: number };
        Update: Partial<DBTypes.ExamResult>;
        Relationships: [];
      };
      sports_events: {
        Row: DBTypes.SportsEvent;
        Insert: Partial<DBTypes.SportsEvent> & { event_name: string; sport_type: string; event_date: string };
        Update: Partial<DBTypes.SportsEvent>;
        Relationships: [];
      };
      calendar_events: {
        Row: DBTypes.CalendarEvent;
        Insert: Partial<DBTypes.CalendarEvent> & { title: string; start_date: string; end_date: string };
        Update: Partial<DBTypes.CalendarEvent>;
        Relationships: [];
      };
      notifications: {
        Row: DBTypes.NotificationItem;
        Insert: Partial<DBTypes.NotificationItem> & { title: string; message: string };
        Update: Partial<DBTypes.NotificationItem>;
        Relationships: [];
      };
      naac_criterion_progress: {
        Row: DBTypes.NAACCriterionProgress;
        Insert: Partial<DBTypes.NAACCriterionProgress> & { criterion_number: number; progress_percentage: number };
        Update: Partial<DBTypes.NAACCriterionProgress>;
        Relationships: [];
      };
      naac_documents: {
        Row: DBTypes.NAACDocument;
        Insert: Partial<DBTypes.NAACDocument> & { criterion_number: number; metric_number: string; document_name: string; file_url: string };
        Update: Partial<DBTypes.NAACDocument>;
        Relationships: [];
      };
      reception_visitors: {
        Row: DBTypes.ReceptionVisitor;
        Insert: Partial<DBTypes.ReceptionVisitor> & { visitor_name: string; purpose: string; check_in_time: string };
        Update: Partial<DBTypes.ReceptionVisitor>;
        Relationships: [];
      };
      reception_appointments: {
        Row: DBTypes.ReceptionAppointment;
        Insert: Partial<DBTypes.ReceptionAppointment> & { visitor_name: string; host_name: string; appointment_date: string; appointment_time: string };
        Update: Partial<DBTypes.ReceptionAppointment>;
        Relationships: [];
      };
      reception_enquiries: {
        Row: DBTypes.ReceptionEnquiry;
        Insert: Partial<DBTypes.ReceptionEnquiry> & { caller_name: string; enquiry_type: string; details: string };
        Update: Partial<DBTypes.ReceptionEnquiry>;
        Relationships: [];
      };
      finance_transactions: {
        Row: DBTypes.FinanceTransaction;
        Insert: Partial<DBTypes.FinanceTransaction> & { transaction_type: string; amount: number; description: string };
        Update: Partial<DBTypes.FinanceTransaction>;
        Relationships: [];
      };
      student_fees: {
        Row: DBTypes.StudentFee;
        Insert: Partial<DBTypes.StudentFee> & { student_id: string; fee_type: string; amount: number; due_date: string };
        Update: Partial<DBTypes.StudentFee>;
        Relationships: [];
      };
      fee_heads: {
        Row: DBTypes.FeeHead;
        Insert: Partial<DBTypes.FeeHead> & { code: string; name: string };
        Update: Partial<DBTypes.FeeHead>;
        Relationships: [];
      };
      fee_plans: {
        Row: DBTypes.FeePlan;
        Insert: Partial<DBTypes.FeePlan> & { name: string; academic_year: string };
        Update: Partial<DBTypes.FeePlan>;
        Relationships: [];
      };
      fee_plan_items: {
        Row: DBTypes.FeePlanItem;
        Insert: Partial<DBTypes.FeePlanItem> & { plan_id: string; fee_head_id: string; amount: number; billing_cycle: string };
        Update: Partial<DBTypes.FeePlanItem>;
        Relationships: [];
      };
      fee_runs: {
        Row: DBTypes.FeeRun;
        Insert: Partial<DBTypes.FeeRun>;
        Update: Partial<DBTypes.FeeRun>;
        Relationships: [];
      };
      fee_adjustments: {
        Row: DBTypes.FeeAdjustment;
        Insert: Partial<DBTypes.FeeAdjustment>;
        Update: Partial<DBTypes.FeeAdjustment>;
        Relationships: [];
      };
      students: {
        Row: DBTypes.StudentRecord;
        Insert: Partial<DBTypes.StudentRecord> & { student_id: string; name: string };
        Update: Partial<DBTypes.StudentRecord>;
        Relationships: [];
      };
      student_achievements: {
        Row: DBTypes.StudentAchievement;
        Insert: Partial<DBTypes.StudentAchievement> & { student_id: string; title: string; category: string };
        Update: Partial<DBTypes.StudentAchievement>;
        Relationships: [];
      };
      student_goals: {
        Row: DBTypes.StudentGoal;
        Insert: Partial<DBTypes.StudentGoal> & { student_id: string; title: string; target_date: string };
        Update: Partial<DBTypes.StudentGoal>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

