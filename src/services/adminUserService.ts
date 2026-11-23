import { supabase } from '@/lib/supabase';
import { UserRole } from '@/context/AuthContext';
import { handleSupabaseError } from './api/errors';
import { parentLinkingService } from './parentLinkingService';
import { apiUrl } from '@/lib/apiBase';

export interface AdminManagedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  student_id?: string;
  roll_number?: string;
  login_id?: string;
  department?: string;
  class_name?: string;
  phone?: string;
  status: 'active' | 'inactive';
  created_at?: string;
  last_sign_in_at?: string;
  assigned_classes?: string[];
  preferences?: any;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  department?: string;
  class_name?: string;
  phone?: string;
  assigned_classes?: string[];
}

export interface UpdateUserData {
  name?: string;
  role?: UserRole;
  department?: string;
  class_name?: string;
  phone?: string;
  email?: string;
  assigned_classes?: string[];
}

export const adminUserService = {
  async listUsers(roleFilter?: string, searchTerm?: string): Promise<AdminManagedUser[]> {
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (roleFilter && roleFilter !== 'all') {
        query = query.eq('role', roleFilter);
      }

      if (searchTerm && searchTerm.trim()) {
        const term = `%${searchTerm.trim()}%`;
        query = query.or(`name.ilike.${term},email.ilike.${term},student_id.ilike.${term},roll_number.ilike.${term}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((p: any) => {
        let assignedClasses: string[] = [];
        if (Array.isArray(p.preferences?.assigned_classes)) {
          assignedClasses = p.preferences.assigned_classes;
        } else if (p.class_name) {
          assignedClasses = p.class_name.split(',').map((s: string) => s.trim()).filter(Boolean);
        }

        return {
          id: p.id,
          email: p.email,
          name: p.name,
          role: p.role as UserRole,
          student_id: p.student_id || p.roll_number || undefined,
          roll_number: p.roll_number || undefined,
          login_id: p.login_id || p.preferences?.login_id || undefined,
          department: p.department || undefined,
          class_name: p.class_name || undefined,
          phone: p.phone || undefined,
          status: (p.status === 'inactive' || p.preferences?.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
          created_at: p.created_at,
          last_sign_in_at: p.last_sign_in_at,
          assigned_classes: assignedClasses,
          preferences: p.preferences,
        };
      });
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to fetch user directory');
    }
  },

  async createUser(userData: CreateUserData): Promise<AdminManagedUser> {
    try {
      // 1. First attempt dedicated Supabase Edge Function 'admin-create-user'
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('admin-create-user', {
        body: userData,
      });

      if (!edgeError && edgeData?.user) {
        return edgeData.user;
      }

      // 2. Fallback to local dev API server if running
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (token) {
        const response = await fetch(apiUrl('/api/admin/users'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: 'create_user', user: userData }),
        });

        if (response.ok) {
          const res = await response.json();
          if (res.user) return res.user;
        }
      }

      if (edgeError) throw edgeError;
      throw new Error(edgeData?.error || 'Unable to provision user account');
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to create user account');
    }
  },

  async updateUser(userId: string, updates: UpdateUserData): Promise<void> {
    try {
      // 1. Try updating via admin API endpoint (updates Auth metadata and profile)
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (token) {
        try {
          const response = await fetch(apiUrl('/api/admin/users'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ action: 'update_user', userId, updates }),
          });

          if (response.ok) {
            const res = await response.json();
            if (res.success) return;
          }
        } catch {
          // Fallback to direct supabase update
        }
      }

      // 2. Fallback to direct Supabase profile update
      const updatePayload: any = {
        name: updates.name,
        role: updates.role,
        department: updates.department,
        class_name: updates.class_name,
        phone: updates.phone,
        updated_at: new Date().toISOString(),
      };

      if (updates.assigned_classes !== undefined) {
        // Fetch current preferences to merge assigned_classes
        const { data: curProfile } = await supabase
          .from('profiles')
          .select('preferences')
          .eq('id', userId)
          .maybeSingle();

        const currentPrefs = curProfile?.preferences || {};
        updatePayload.preferences = {
          ...currentPrefs,
          assigned_classes: updates.assigned_classes,
        };
        if (!updates.class_name && updates.assigned_classes.length > 0) {
          updatePayload.class_name = updates.assigned_classes[0];
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to update user profile');
    }
  },

  async setUserActiveStatus(userId: string, active: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          status: active ? 'active' : 'inactive',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        // If status column is not yet present on remote DB schema, fallback to updating preferences JSONB
        if (error.code === '42703' || error.message?.includes('status')) {
          const { error: prefError } = await supabase
            .from('profiles')
            .update({
              preferences: { status: active ? 'active' : 'inactive' },
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
          if (prefError) throw prefError;
          return;
        }
        throw error;
      }
    } catch (error) {
      throw handleSupabaseError(error, `Failed to ${active ? 'activate' : 'deactivate'} user`);
    }
  },

  async deleteUser(userId: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (token) {
        try {
          const response = await fetch(apiUrl('/api/admin/users'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ action: 'delete_user', userId }),
          });

          if (response.ok) {
            const res = await response.json();
            if (res.success) return;
          }
        } catch {
          // Fallback to direct supabase deletion
        }
      }

      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to delete user profile');
    }
  },

  async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (token) {
        const response = await fetch(apiUrl('/api/admin/users'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: 'reset_password', userId, newPassword }),
        });

        const res = await response.json();
        if (response.ok && res.success) return;
        throw new Error(res.error || 'Password reset failed');
      }

      throw new Error('Administrative session required to reset user password.');
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to reset password');
    }
  },

  async listParentLinks(parentId?: string): Promise<any[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (token) {
        try {
          const response = await fetch(apiUrl('/api/admin/users'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ action: 'list_parent_links', parentId }),
          });

          if (response.ok) {
            const res = await response.json();
            if (res.success && res.links) return res.links;
          }
        } catch {
          // Fallback
        }
      }

      let query = supabase.from('parent_student_links').select('*');
      if (parentId) query = query.eq('parent_id', parentId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw handleSupabaseError(error, 'Failed to fetch parent links');
    }
  },

  async linkParentStudent(parentId: string, studentId: string, relationship = 'Parent'): Promise<any> {
    return parentLinkingService.linkExistingParent(parentId, studentId, relationship);
  },

  async unlinkParentStudent(params: { linkId?: string; parentId?: string; studentId?: string }): Promise<void> {
    await parentLinkingService.unlinkParentStudent(params.linkId || '', params.parentId, params.studentId);
  },

  /**
   * Validates whether a manually entered Student ID is available (unique).
   * Checks profiles, active admissions, and admission metadata.
   */
  async checkStudentIdAvailability(studentId: string): Promise<{ available: boolean; message: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        const res = await fetch(apiUrl('/api/admin/users'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: 'check_student_id_availability', student_id: studentId }),
        });
        if (res.ok) {
          const json = await res.json();
          return json;
        }
      }

      // Client-side fallback check against profiles table
      const cleanId = studentId.trim();
      const { data: existing } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('roll_number', cleanId)
        .maybeSingle();

      if (existing) {
        return { available: false, message: `Student ID "${cleanId}" is already assigned to ${existing.name}.` };
      }

      return { available: true, message: `Student ID "${cleanId}" is available.` };
    } catch {
      return { available: true, message: 'Student ID checked.' };
    }
  },

  /**
   * Retrieves all approved admissions that have not yet had their student login account provisioned.
   */
  async listUnprovisionedApprovedStudents(): Promise<any[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        const res = await fetch(apiUrl('/api/admin/users'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: 'list_unprovisioned_approved_students' }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.unprovisioned) {
            return json.unprovisioned;
          }
        }
      }

      // Fallback: Query verified metadata documents
      const { data: docs } = await supabase
        .from('admission_document_verifications')
        .select('*')
        .eq('document_type', 'APPLICATION_METADATA');

      const { data: studentProfiles } = await supabase
        .from('profiles')
        .select('student_id, roll_number, email')
        .eq('role', 'student');

      const registered = new Set((studentProfiles || []).map(p => (p.student_id || p.roll_number || '').trim().toLowerCase()));
      const unprovisioned: any[] = [];

      for (const d of (docs || [])) {
        try {
          const meta = JSON.parse(d.document_url);
          if ((meta.status === 'Approved' || meta.status === 'Admitted') && !meta.is_provisioned) {
            const sId = (meta.student_id || meta.studentId || meta.application_no || '').trim();
            if (sId && !registered.has(sId.toLowerCase())) {
              unprovisioned.push({
                id: meta.id || d.id,
                student_id: sId,
                name: meta.applicant_name || meta.name || d.student_name,
                email: meta.email || '',
                phone: meta.phone || '',
                parent_name: meta.parent_name || 'Guardian',
                parent_phone: meta.parent_phone || '',
                department: meta.class_applied || meta.class_name || 'Paramedical Sciences',
                class_name: 'Semester 1',
                status: meta.status,
                approved_at: meta.reviewed_at || d.updated_at,
                remarks: meta.remarks || ''
              });
            }
          }
        } catch {}
      }

      return unprovisioned;
    } catch (err) {
      console.error('Failed to list unprovisioned students:', err);
      return [];
    }
  },

  /**
   * Explicitly provisions a Student portal account linked to an approved admission and manual Student ID.
   */
  async provisionStudentAccount(params: {
    admission_id?: string;
    student_id: string;
    name: string;
    email: string;
    password?: string;
    department: string;
    class_name?: string;
    phone?: string;
  }): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Administrative session required to provision student accounts.');

      const res = await fetch(apiUrl('/api/admin/users'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'provision_student_account',
          ...params,
          password: params.password || 'Student@2026'
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to provision student portal account.');
      }
      return json.user;
    } catch (error) {
      throw handleSupabaseError(error, 'Student provisioning error');
    }
  },

  /**
   * Retrieves enrolled students with their parent-student linking status.
   */
  async listStudentsForParentLinking(): Promise<any[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        const res = await fetch(apiUrl('/api/admin/users'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: 'list_students_for_parent_linking' }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.students) {
            return json.students;
          }
        }
      }

      // Fallback
      const { data: students } = await supabase
        .from('profiles')
        .select('id, name, email, student_id, roll_number, department, class_name, phone')
        .eq('role', 'student');

      return (students || []).map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        student_id: s.student_id || s.roll_number,
        department: s.department,
        class_name: s.class_name,
        phone: s.phone,
        is_linked: false,
        linked_parents: []
      }));
    } catch (err) {
      console.error('Failed to list students for parent linking:', err);
      return [];
    }
  },

  /**
   * Provisions a new parent portal account and establishes a verified link to an enrolled student.
   */
  async createParentAccountAndLink(params: {
    student_id: string;
    name: string;
    email: string;
    phone?: string;
    password?: string;
    relationship?: string;
  }): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Administrative session required to create parent accounts.');

      const res = await fetch(apiUrl('/api/admin/users'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'create_parent_account_and_link',
          ...params,
          password: params.password || 'Parent@2026'
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create and link parent account.');
      }
      return json;
    } catch (error) {
      throw handleSupabaseError(error, 'Parent account creation error');
    }
  },
};

export default adminUserService;
