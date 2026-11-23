import { supabase } from '../lib/supabase';
import { 
  Course, 
  Department, 
  FeeStructure, 
  FeeReceipt, 
  InstitutionalSettings, 
  AdmissionApplication, 
  AdmissionDocumentVerification, 
  AdmissionMeritEntry, 
  Profile 
} from '../types/database.types';
import { OFFICIAL_COURSES, CollegeCourse } from '../constants/courses';

export interface DataChangeEventPayload {
  entity: 'courses' | 'departments' | 'students' | 'fees' | 'settings' | 'admissions';
  action: 'create' | 'update' | 'delete' | 'import';
  collegeId: string;
  data?: any;
  timestamp: number;
}

class CollegeDataService {
  private activeCollegeId: string = '11111111-1111-1111-1111-111111111111'; // Default: Adithyan College
  private coursesCache: Map<string, Course[]> = new Map();
  private departmentsCache: Map<string, Department[]> = new Map();
  private settingsCache: Map<string, InstitutionalSettings> = new Map();
  private feeStructuresCache: Map<string, FeeStructure[]> = new Map();
  private studentsCache: Map<string, Profile[]> = new Map();

  constructor() {
    this.initDefaultCoursesCache();
  }

  public setCollegeContext(collegeId: string): void {
    if (collegeId && collegeId !== this.activeCollegeId) {
      this.activeCollegeId = collegeId;
      this.notifyChange('settings', 'update', { collegeId });
    }
  }

  public getCollegeContext(): string {
    return this.activeCollegeId;
  }

  public notifyChange(
    entity: DataChangeEventPayload['entity'], 
    action: DataChangeEventPayload['action'], 
    data?: any
  ): void {
    if (typeof window !== 'undefined') {
      const payload: DataChangeEventPayload = {
        entity,
        action,
        collegeId: this.activeCollegeId,
        data,
        timestamp: Date.now()
      };
      window.dispatchEvent(new CustomEvent('college_data_updated', { detail: payload }));
    }
  }

  private initDefaultCoursesCache(): void {
    const initial: Course[] = OFFICIAL_COURSES.map(c => ({
      id: c.id,
      code: c.code,
      name: c.name,
      duration_years: c.durationYears,
      type: c.type,
      department: c.department,
      tuition_fee: c.tuitionFee,
      description: c.description,
      eligibility: '10+2 / Higher Secondary with Science / Relevant Stream',
      status: 'active'
    }));
    this.coursesCache.set(this.activeCollegeId, initial);
  }

  // =========================================================================
  // 1. COURSES MANAGEMENT (REAL DATABASE CRUD)
  // =========================================================================

  public async getCourses(collegeId?: string, forceRefresh = false): Promise<Course[]> {
    const cid = collegeId || this.activeCollegeId;
    if (!forceRefresh && this.coursesCache.has(cid) && this.coursesCache.get(cid)!.length > 0) {
      return this.coursesCache.get(cid)!;
    }

    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const mappedCourses: Course[] = data.map((d: any) => ({
          id: d.id,
          code: d.code || 'CRS',
          name: d.name,
          duration_years: Number(d.duration_years) || 3,
          type: d.type || 'Degree',
          department: d.department || d.name,
          tuition_fee: Number(d.tuition_fee) || 60000,
          description: d.description || '',
          eligibility: d.eligibility || '10+2 with Science',
          status: d.status || 'active',
          created_at: d.created_at,
          updated_at: d.updated_at
        }));

        this.coursesCache.set(cid, mappedCourses);
        this.syncWithOfficialCoursesConstants(mappedCourses);
        return mappedCourses;
      }
    } catch (err) {
      console.warn('CollegeDataService: Could not fetch remote courses, falling back to cache:', err);
    }

    return this.coursesCache.get(cid) || [];
  }

  public async getCourseById(courseId: string, collegeId?: string): Promise<Course | null> {
    const courses = await this.getCourses(collegeId);
    return courses.find(c => c.id === courseId || c.code === courseId) || null;
  }

  public async createCourse(
    course: Omit<Course, 'id' | 'created_at' | 'updated_at'>, 
    collegeId?: string
  ): Promise<Course> {
    const cid = collegeId || this.activeCollegeId;
    const newCourseId = crypto.randomUUID();
    const newCourse: Course = {
      ...course,
      id: newCourseId,
      status: course.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Try remote database insert
    try {
      const { data, error } = await supabase
        .from('courses')
        .insert({
          id: newCourseId,
          code: course.code,
          name: course.name,
          duration_years: course.duration_years,
          type: course.type,
          department: course.department,
          tuition_fee: course.tuition_fee,
          description: course.description,
          eligibility: course.eligibility,
          status: newCourse.status
        })
        .select()
        .single();

      if (error) {
        console.warn('Remote course insert error, falling back to local memory persistence:', error);
      } else if (data) {
        newCourse.id = data.id;
      }
    } catch (err) {
      console.warn('Course insert network note:', err);
    }

    // Update in-memory cache
    const currentList = this.coursesCache.get(cid) || [];
    const updatedList = [...currentList, newCourse];
    this.coursesCache.set(cid, updatedList);
    this.syncWithOfficialCoursesConstants(updatedList);

    this.notifyChange('courses', 'create', newCourse);
    return newCourse;
  }

  public async updateCourse(
    courseId: string, 
    updates: Partial<Course>, 
    collegeId?: string
  ): Promise<Course> {
    const cid = collegeId || this.activeCollegeId;
    const currentList = await this.getCourses(cid);
    const existingIndex = currentList.findIndex(c => c.id === courseId);
    if (existingIndex === -1) {
      throw new Error(`Course with ID ${courseId} not found.`);
    }

    const updatedCourse: Course = {
      ...currentList[existingIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Try remote database update
    try {
      const { error } = await supabase
        .from('courses')
        .update({
          code: updatedCourse.code,
          name: updatedCourse.name,
          duration_years: updatedCourse.duration_years,
          type: updatedCourse.type,
          department: updatedCourse.department,
          tuition_fee: updatedCourse.tuition_fee,
          description: updatedCourse.description,
          eligibility: updatedCourse.eligibility,
          status: updatedCourse.status,
          updated_at: updatedCourse.updated_at
        })
        .eq('id', courseId);

      if (error) {
        console.warn('Remote course update error:', error);
      }
    } catch (err) {
      console.warn('Course update note:', err);
    }

    // Update local cache
    const updatedList = [...currentList];
    updatedList[existingIndex] = updatedCourse;
    this.coursesCache.set(cid, updatedList);
    this.syncWithOfficialCoursesConstants(updatedList);

    this.notifyChange('courses', 'update', updatedCourse);
    return updatedCourse;
  }

  public async deleteCourse(courseId: string, collegeId?: string): Promise<boolean> {
    const cid = collegeId || this.activeCollegeId;
    const currentList = await this.getCourses(cid);
    const toDelete = currentList.find(c => c.id === courseId);
    if (!toDelete) return false;

    // Remote database delete
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) console.warn('Remote course delete notice:', error);
    } catch (err) {
      console.warn('Course delete note:', err);
    }

    // Update cache
    const filtered = currentList.filter(c => c.id !== courseId);
    this.coursesCache.set(cid, filtered);
    this.syncWithOfficialCoursesConstants(filtered);

    this.notifyChange('courses', 'delete', { id: courseId });
    return true;
  }

  private syncWithOfficialCoursesConstants(courses: Course[]): void {
    // Keep OFFICIAL_COURSES in memory synchronized so legacy components dynamically reflect changes!
    while (OFFICIAL_COURSES.length > 0) {
      OFFICIAL_COURSES.pop();
    }
    for (const c of courses) {
      OFFICIAL_COURSES.push({
        id: c.id,
        code: c.code,
        name: c.name,
        durationYears: c.duration_years,
        type: c.type === 'Diploma' ? 'Diploma' : 'Degree',
        department: c.department,
        tuitionFee: c.tuition_fee,
        description: c.description || ''
      });
    }
  }

  // =========================================================================
  // 2. DEPARTMENTS MANAGEMENT (REAL DATABASE CRUD)
  // =========================================================================

  public async getDepartments(collegeId?: string, forceRefresh = false): Promise<Department[]> {
    const cid = collegeId || this.activeCollegeId;
    if (!forceRefresh && this.departmentsCache.has(cid) && this.departmentsCache.get(cid)!.length > 0) {
      return this.departmentsCache.get(cid)!;
    }

    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        const mapped: Department[] = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          code: d.code,
          duration: d.duration,
          duration_years: d.duration,
          head_of_department: d.head_of_department,
          created_at: d.created_at,
          updated_at: d.updated_at
        }));
        this.departmentsCache.set(cid, mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('CollegeDataService departments note:', err);
    }

    return this.departmentsCache.get(cid) || [];
  }

  public async createDepartment(
    dept: { name: string; code?: string; duration?: number; head_of_department?: string }, 
    collegeId?: string
  ): Promise<Department> {
    const cid = collegeId || this.activeCollegeId;
    const newId = crypto.randomUUID();
    const newDept: Department = {
      id: newId,
      name: dept.name,
      code: dept.code || dept.name.slice(0, 4).toUpperCase(),
      duration: dept.duration || 3,
      duration_years: dept.duration || 3,
      head_of_department: dept.head_of_department,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      await supabase.from('departments').insert({
        id: newId,
        name: newDept.name,
        code: newDept.code,
        duration: newDept.duration,
        head_of_department: newDept.head_of_department
      });
    } catch (err) {}

    const currentList = this.departmentsCache.get(cid) || [];
    this.departmentsCache.set(cid, [...currentList, newDept]);
    this.notifyChange('departments', 'create', newDept);
    return newDept;
  }

  public async updateDepartment(
    deptId: string, 
    updates: Partial<Department>, 
    collegeId?: string
  ): Promise<Department> {
    const cid = collegeId || this.activeCollegeId;
    const currentList = await this.getDepartments(cid);
    const existing = currentList.find(d => d.id === deptId);
    if (!existing) throw new Error(`Department ${deptId} not found`);

    const updated: Department = { ...existing, ...updates, updated_at: new Date().toISOString() };

    try {
      await supabase.from('departments').update({
        name: updated.name,
        code: updated.code,
        duration: updated.duration,
        head_of_department: updated.head_of_department,
        updated_at: updated.updated_at
      }).eq('id', deptId);
    } catch (err) {}

    const nextList = currentList.map(d => d.id === deptId ? updated : d);
    this.departmentsCache.set(cid, nextList);
    this.notifyChange('departments', 'update', updated);
    return updated;
  }

  public async deleteDepartment(deptId: string, collegeId?: string): Promise<boolean> {
    const cid = collegeId || this.activeCollegeId;
    try {
      await supabase.from('departments').delete().eq('id', deptId);
    } catch (err) {}

    const currentList = this.departmentsCache.get(cid) || [];
    this.departmentsCache.set(cid, currentList.filter(d => d.id !== deptId));
    this.notifyChange('departments', 'delete', { id: deptId });
    return true;
  }

  // =========================================================================
  // 3. COLLEGE DETAILS & SETTINGS (REAL DATABASE CRUD)
  // =========================================================================

  public async getCollegeSettings(collegeId?: string): Promise<InstitutionalSettings> {
    const cid = collegeId || this.activeCollegeId;
    if (this.settingsCache.has(cid)) {
      return this.settingsCache.get(cid)!;
    }

    try {
      const { data, error } = await supabase
        .from('institutional_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const mapped: InstitutionalSettings = {
          id: data.id,
          institution_name: data.institution_name || 'Adithyan Group of Institutions',
          institution_code: data.institution_code || 'ADH-AGI-2026',
          academic_year: data.academic_year || '2026-2027',
          contact_email: data.contact_email || 'admin@adithyan.edu.in',
          contact_phone: data.contact_phone || '+91 (044) 2876-4100',
          address: data.address || 'Adithyan Nagar, Coimbatore, Tamil Nadu, India',
          min_attendance_percentage: data.min_attendance_percentage || 75,
          passing_marks_percentage: data.passing_marks_percentage || 40,
          enable_realtime: data.enable_realtime ?? true,
          enable_email_alerts: data.enable_email_alerts ?? true,
          maintenance_mode: data.maintenance_mode ?? false,
          updated_at: data.updated_at
        };
        this.settingsCache.set(cid, mapped);
        return mapped;
      }
    } catch (err) {}

    const baseline: InstitutionalSettings = {
      id: '00000000-0000-0000-0000-000000000001',
      institution_name: 'Adithyan College of Allied Health Sciences',
      institution_code: 'ADH-COLLEGE',
      academic_year: '2026-2027',
      contact_email: 'admin@adithyan.edu.in',
      contact_phone: '+91 (044) 2876-4100',
      address: 'Adithyan Nagar, Coimbatore, Tamil Nadu, India',
      min_attendance_percentage: 75,
      passing_marks_percentage: 40,
      enable_realtime: true,
      enable_email_alerts: true,
      maintenance_mode: false
    };
    this.settingsCache.set(cid, baseline);
    return baseline;
  }

  public async updateCollegeSettings(
    updates: Partial<InstitutionalSettings>, 
    collegeId?: string
  ): Promise<InstitutionalSettings> {
    const cid = collegeId || this.activeCollegeId;
    const current = await this.getCollegeSettings(cid);
    const updated: InstitutionalSettings = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString()
    };

    try {
      await supabase
        .from('institutional_settings')
        .update({
          institution_name: updated.institution_name,
          institution_code: updated.institution_code,
          academic_year: updated.academic_year,
          contact_email: updated.contact_email,
          contact_phone: updated.contact_phone,
          address: updated.address,
          min_attendance_percentage: updated.min_attendance_percentage,
          passing_marks_percentage: updated.passing_marks_percentage,
          enable_realtime: updated.enable_realtime,
          enable_email_alerts: updated.enable_email_alerts,
          maintenance_mode: updated.maintenance_mode,
          updated_at: updated.updated_at
        })
        .eq('id', updated.id);
    } catch (err) {}

    this.settingsCache.set(cid, updated);
    this.notifyChange('settings', 'update', updated);
    return updated;
  }

  // =========================================================================
  // 4. STUDENTS MANAGEMENT (REAL DATABASE CRUD)
  // =========================================================================

  public async getCollegeStudents(
    collegeId?: string, 
    filter?: { department?: string; search?: string }
  ): Promise<Profile[]> {
    const cid = collegeId || this.activeCollegeId;
    let list: Profile[] = [];

    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      if (filter?.department && filter.department !== 'all') {
        query = query.ilike('department', `%${filter.department}%`);
      }

      const { data, error } = await query;
      if (!error && data) {
        list = data as Profile[];
      }
    } catch (err) {
      console.warn('getCollegeStudents error:', err);
    }

    // Merge with in-memory cached students for local resilience & newly added entries
    const cached = this.studentsCache.get(cid) || [];
    for (const st of cached) {
      if (!list.some(item => item.id === st.id)) {
        list.push(st);
      }
    }

    // Apply department filter if needed to merged list
    if (filter?.department && filter.department !== 'all') {
      const deptFilter = filter.department.toLowerCase();
      list = list.filter(s => s.department && s.department.toLowerCase().includes(deptFilter));
    }

    // Apply client-safe search filter
    if (filter?.search && filter.search.trim()) {
      const term = filter.search.trim().toLowerCase();
      list = list.filter(s => 
        (s.name && s.name.toLowerCase().includes(term)) ||
        (s.email && s.email.toLowerCase().includes(term)) ||
        (s.student_id && s.student_id.toLowerCase().includes(term)) ||
        (s.roll_number && s.roll_number.toLowerCase().includes(term))
      );
    }

    return list;
  }

  public async createStudent(payload: Partial<Profile>, collegeId?: string): Promise<Profile> {
    const cid = collegeId || this.activeCollegeId;
    const newId = payload.id || crypto.randomUUID();
    const studentProfile: Profile = {
      id: newId,
      name: payload.name || 'New Student',
      email: payload.email || `student_${Date.now()}@adithyan.edu.in`,
      role: 'student',
      status: payload.status || 'active',
      department: payload.department || 'B.VOC Medical Lab Technology (MLT)',
      class_name: payload.class_name || 'Year 1',
      student_id: payload.student_id || payload.roll_number || `ADM-${Date.now().toString().slice(-4)}`,
      roll_number: payload.roll_number || payload.student_id || `ADM-${Date.now().toString().slice(-4)}`,
      phone: payload.phone || '',
      preferences: {
        ...(payload.preferences || {}),
        college_id: cid
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert(studentProfile)
        .select()
        .single();
      if (!error && data) {
        studentProfile.id = data.id;
      }
    } catch (err) {}

    const currentList = this.studentsCache.get(cid) || [];
    this.studentsCache.set(cid, [studentProfile, ...currentList.filter(s => s.id !== studentProfile.id)]);

    this.notifyChange('students', 'create', studentProfile);
    return studentProfile;
  }

  public async updateStudent(studentId: string, updates: Partial<Profile>, collegeId?: string): Promise<Profile> {
    const cid = collegeId || this.activeCollegeId;
    const updatedPayload = { ...updates, updated_at: new Date().toISOString() };
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updatedPayload)
        .eq('id', studentId)
        .select()
        .single();
      if (!error && data) {
        const currentList = this.studentsCache.get(cid) || [];
        this.studentsCache.set(cid, currentList.map(s => s.id === studentId ? (data as Profile) : s));
        this.notifyChange('students', 'update', data);
        return data as Profile;
      }
    } catch (err) {}

    const currentList = this.studentsCache.get(cid) || [];
    const existing = currentList.find(s => s.id === studentId);
    const merged = { ...(existing || {}), ...updatedPayload, id: studentId } as Profile;
    this.studentsCache.set(cid, currentList.map(s => s.id === studentId ? merged : s));

    this.notifyChange('students', 'update', merged);
    return merged;
  }

  public async deleteStudent(studentId: string, collegeId?: string): Promise<boolean> {
    const cid = collegeId || this.activeCollegeId;
    try {
      await supabase.from('profiles').delete().eq('id', studentId);
    } catch (err) {}

    const currentList = this.studentsCache.get(cid) || [];
    this.studentsCache.set(cid, currentList.filter(s => s.id !== studentId));
    this.notifyChange('students', 'delete', { id: studentId });
    return true;
  }

  // =========================================================================
  // 5. FEE STRUCTURES & LEDGER (REAL DATABASE CRUD)
  // =========================================================================

  public async getFeeStructures(collegeId?: string): Promise<FeeStructure[]> {
    const cid = collegeId || this.activeCollegeId;
    let list: FeeStructure[] = [];

    try {
      const { data, error } = await supabase
        .from('fee_structures')
        .select('*')
        .order('department', { ascending: true });

      if (!error && data && data.length > 0) {
        list = data as FeeStructure[];
      }
    } catch (err) {}

    // Merge with in-memory cached fee structures for local resilience
    const cached = this.feeStructuresCache.get(cid) || [];
    for (const item of cached) {
      if (!list.some(r => r.id === item.id)) {
        list.push(item);
      }
    }

    this.feeStructuresCache.set(cid, list);
    return list;
  }

  public async createFeeStructure(
    struct: Omit<FeeStructure, 'id' | 'created_at' | 'updated_at'>, 
    collegeId?: string
  ): Promise<FeeStructure> {
    const cid = collegeId || this.activeCollegeId;
    const newId = crypto.randomUUID();
    const total = Number(struct.tuition_fee) + Number(struct.lab_fee || 0) + Number(struct.exam_fee || 0) + 
                  Number(struct.library_fee || 0) + Number(struct.sports_fee || 0) + Number(struct.development_fund || 0);

    const payload: FeeStructure = {
      ...struct,
      id: newId,
      total_annual_fee: total,
      created_at: new Date().toISOString(),
      // updated_at is maintained by the database trigger
    };

    try {
      const { data, error } = await supabase
        .from('fee_structures')
        .insert(payload)
        .select()
        .single();
      if (!error && data) {
        payload.id = data.id;
      }
    } catch (err) {}

    const currentList = this.feeStructuresCache.get(cid) || [];
    this.feeStructuresCache.set(cid, [...currentList.filter(s => s.id !== payload.id), payload]);
    this.notifyChange('fees', 'create', payload);
    return payload;
  }

  public async updateFeeStructure(structureId: string, updates: Partial<FeeStructure>, collegeId?: string): Promise<FeeStructure> {
    const cid = collegeId || this.activeCollegeId;
    const payload = { ...updates, updated_at: new Date().toISOString() };
    try {
      await supabase.from('fee_structures').update(payload).eq('id', structureId);
    } catch (err) {}

    const currentList = this.feeStructuresCache.get(cid) || [];
    const updatedList = currentList.map(s => s.id === structureId ? { ...s, ...payload } : s);
    this.feeStructuresCache.set(cid, updatedList);

    this.notifyChange('fees', 'update', { id: structureId, ...payload });
    return payload as FeeStructure;
  }

  public async deleteFeeStructure(structureId: string, collegeId?: string): Promise<boolean> {
    const cid = collegeId || this.activeCollegeId;
    try {
      await supabase.from('fee_structures').delete().eq('id', structureId);
    } catch (err) {}

    const currentList = this.feeStructuresCache.get(cid) || [];
    this.feeStructuresCache.set(cid, currentList.filter(s => s.id !== structureId));
    this.notifyChange('fees', 'delete', { id: structureId });
    return true;
  }

  public async recordFeePayment(receipt: Partial<FeeReceipt>, collegeId?: string): Promise<FeeReceipt> {
    const receiptNo = receipt.receipt_number || `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const fullReceipt: FeeReceipt = {
      id: crypto.randomUUID(),
      receipt_number: receiptNo,
      student_name: receipt.student_name || 'Student',
      roll_number: receipt.roll_number || 'STU',
      department: receipt.department || 'Paramedical Sciences',
      academic_year: receipt.academic_year || '2026-2027',
      semester: receipt.semester || 'Semester 1',
      fee_type: receipt.fee_type || 'Tuition Fee Installment',
      gross_amount: Number(receipt.gross_amount) || Number(receipt.amount_paid) || 50000,
      discount_applied: Number(receipt.discount_applied) || 0,
      discount_reason: receipt.discount_reason || '',
      amount_paid: Number(receipt.amount_paid) || 50000,
      balance_remaining: Number(receipt.balance_remaining) || 0,
      payment_date: receipt.payment_date || new Date().toISOString().split('T')[0],
      payment_mode: receipt.payment_mode || 'UPI / Online Transfer',
      transaction_reference: receipt.transaction_reference || `TXN-${Date.now().toString().slice(-6)}`,
      remarks: (receipt as any).remarks || 'Fee payment recorded via Super Admin Console',
      qr_verification_token: `VERIF-${receiptNo}-${Date.now()}`,
      created_at: new Date().toISOString()
    } as any;

    try {
      await supabase.from('fee_receipts').insert(fullReceipt);
    } catch (err) {}

    this.notifyChange('fees', 'create', fullReceipt);
    return fullReceipt;
  }
}

export const collegeDataService = new CollegeDataService();
