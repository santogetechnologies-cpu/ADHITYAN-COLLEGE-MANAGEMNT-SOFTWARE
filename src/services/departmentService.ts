import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from './api/errors';
import type { Department, Section, Profile } from '@/types/database';

export interface DepartmentWithSections {
  id: string;
  name: string;
  duration: number;
  code?: string | null;
  created_at?: string;
  updated_at?: string;
  sections: Array<{
    id: string;
    name: string;
    capacity: number;
    currentStudents: number;
    assignedTeacher?: string;
  }>;
}

export interface CreateDepartmentInput {
  name: string;
  duration: number;
  code?: string;
  sectionsCount?: number;
}

export interface UpdateDepartmentInput {
  name?: string;
  duration?: number;
  code?: string;
}

export const departmentService = {
  async listDepartments(search?: string): Promise<DepartmentWithSections[]> {
    try {
      let query = supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true });

      if (search && search.trim()) {
        query = query.ilike('name', `%${search.trim()}%`);
      }

      const { data: depts, error: deptError } = await query;
      if (deptError) throw deptError;

      const { data: sections, error: secError } = await supabase
        .from('sections')
        .select('*')
        .order('name', { ascending: true });
      if (secError) throw secError;

      return (depts || []).map((d: Department) => {
        const deptSecs = (sections || []).filter((s: Section) => s.department_id === d.id);
        return {
          id: d.id,
          name: d.name,
          duration: d.duration || 3,
          code: d.code,
          created_at: d.created_at,
          updated_at: d.updated_at,
          sections: deptSecs.map((s: Section) => ({
            id: s.id,
            name: s.name,
            capacity: s.capacity || 50,
            currentStudents: s.current_students || 0,
            assignedTeacher: s.assigned_teacher_name || undefined,
          })),
        };
      });
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to fetch departments');
    }
  },

  async getDepartment(id: string): Promise<DepartmentWithSections> {
    try {
      const { data: dept, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .eq('id', id)
        .single();
      if (deptError || !dept) throw deptError || new Error(`Department ${id} not found`);

      const { data: sections, error: secError } = await supabase
        .from('sections')
        .select('*')
        .eq('department_id', id);
      if (secError) throw secError;

      return {
        id: dept.id,
        name: dept.name,
        duration: dept.duration || 3,
        code: dept.code,
        created_at: dept.created_at,
        updated_at: dept.updated_at,
        sections: (sections || []).map((s: Section) => ({
          id: s.id,
          name: s.name,
          capacity: s.capacity || 50,
          currentStudents: s.current_students || 0,
          assignedTeacher: s.assigned_teacher_name || undefined,
        })),
      };
    } catch (error) {
      throw handleSupabaseError(error, `Failed to load department ${id}`);
    }
  },

  async createDepartment(input: CreateDepartmentInput): Promise<DepartmentWithSections> {
    try {
      const trimmedName = input.name.trim();
      const derivedCode = input.code?.trim() || trimmedName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 8);

      const { data: created, error } = await (supabase
        .from('departments') as any)
        .insert({
          name: trimmedName,
          duration: input.duration,
          code: derivedCode,
        })
        .select()
        .single();

      if (error || !created) throw error || new Error('Failed to create department');

      // Automatically create sections if requested
      const count = input.sectionsCount || 1;
      const createdSections: any[] = [];

      for (let i = 0; i < count; i++) {
        const secLetter = String.fromCharCode(65 + i); // 'A', 'B', etc.
        const { data: sec, error: secError } = await (supabase
          .from('sections') as any)
          .insert({
            department_id: created.id,
            name: `Section ${secLetter}`,
            capacity: 50,
            current_students: 0,
          })
          .select()
          .single();

        if (!secError && sec) {
          createdSections.push(sec);
        }
      }

      return {
        id: created.id,
        name: created.name,
        duration: created.duration,
        code: created.code,
        created_at: created.created_at,
        updated_at: created.updated_at,
        sections: createdSections.map(s => ({
          id: s.id,
          name: s.name,
          capacity: s.capacity || 50,
          currentStudents: s.current_students || 0,
          assignedTeacher: s.assigned_teacher_name || undefined,
        })),
      };
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to create department');
    }
  },

  async updateDepartment(id: string, input: UpdateDepartmentInput): Promise<Department> {
    try {
      const updatePayload: Partial<Department> = {};
      if (input.name !== undefined) updatePayload.name = input.name.trim();
      if (input.duration !== undefined) updatePayload.duration = input.duration;
      if (input.code !== undefined) updatePayload.code = input.code.trim();

      const { data, error } = await (supabase
        .from('departments') as any)
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error || !data) throw error || new Error('Failed to update department');
      return data;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to update department');
    }
  },

  async deleteDepartment(id: string): Promise<void> {
    try {
      // First delete dependent sections
      await supabase.from('sections').delete().eq('department_id', id);

      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to delete department');
    }
  },

  async listTeachers(): Promise<Profile[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'teacher')
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to load teachers');
    }
  },
};

export default departmentService;

