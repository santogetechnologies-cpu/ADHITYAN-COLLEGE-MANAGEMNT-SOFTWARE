import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database.types';
import { apiUrl } from '@/lib/apiBase';

export interface CreateParentAccountInput {
  login_id: string;
  password: string;
  name: string;
  relationship?: string;
  phone?: string;
  email?: string;
  student_id?: string;
}

export interface ParentAccountSummary {
  id: string;
  name: string;
  email: string;
  phone?: string;
  login_id: string;
  status: string;
  created_at?: string;
  linked_children: Array<{
    link_id: string;
    relationship: string;
    verified: boolean;
    student: {
      id: string;
      name: string;
      student_id?: string;
      roll_number?: string;
      class_name?: string;
      department?: string;
    };
  }>;
}

export interface LinkedGuardian {
  link_id: string;
  relationship: string;
  verified: boolean;
  parent: {
    id: string;
    name: string;
    login_id?: string;
    email: string;
    phone?: string;
    status: string;
  };
}

export const parentLinkingService = {
  /**
   * Resolves a human-readable Login ID (e.g. PAR-2026-001) to the registered Supabase Auth email.
   * Never exposes credentials or sensitive user data.
   */
  async resolveLoginId(loginId: string): Promise<string | null> {
    if (!loginId || !loginId.trim()) return null;
    const cleanId = loginId.trim();

    // 1. Try Vite middleware / server endpoint
    try {
      const response = await fetch(apiUrl('/api/auth/resolve-login-id'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login_id: cleanId }),
      });
      if (response.ok) {
        const json = await response.json();
        if (json.email) return json.email;
      }
    } catch {
      // Fallback to Supabase RPC / query
    }

    // 2. Try Supabase RPC
    try {
      const { data: rpcEmail, error: rpcError } = await supabase.rpc('resolve_login_id', {
        p_login_id: cleanId,
      });
      if (!rpcError && rpcEmail) return rpcEmail;
    } catch {
      // Continue to direct select fallback
    }

    // 3. Fallback: Query profiles table directly
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .or(`login_id.ilike.${cleanId},email.ilike.${cleanId}`)
        .maybeSingle();

      if (!error && data?.email) return data.email;
    } catch {
      // Return null on failure
    }

    return null;
  },

  /**
   * Manually creates a Parent account in Supabase Auth and links to the given student UUID.
   * Requires Receptionist, Principal, or Admin authentication.
   */
  async createParentAccount(input: CreateParentAccountInput): Promise<{
    id: string;
    login_id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    status: string;
    linked_student?: any;
  }> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      throw new Error('Authentication required. Please log in as Receptionist or Administrator.');
    }

    const response = await fetch(apiUrl('/api/admin/users'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'create_parent_account',
        parent: input,
      }),
    });

    const json = await response.json();

    if (!response.ok || !json.success) {
      throw new Error(json.error || `Failed to create parent account (${response.status})`);
    }

    return json.parent;
  },

  /**
   * Links an existing Parent account to a Student.
   * Supports multiple children for one parent and multiple guardians for one student.
   */
  async linkExistingParent(parentId: string, studentId: string, relationship = 'Parent'): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    // 1. Try server endpoint
    if (token) {
      try {
        const response = await fetch(apiUrl('/api/admin/users'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'link_parent_student',
            parentId,
            studentId,
            relationship,
          }),
        });

        if (response.ok) {
          const json = await response.json();
          if (json.success) return json.link;
        }
      } catch {
        // Fallback to direct supabase client
      }
    }

    // 2. Direct Supabase client upsert
    const { data, error } = await supabase
      .from('parent_student_links')
      .upsert(
        {
          parent_id: parentId,
          student_id: studentId,
          relationship: relationship || 'Parent',
          verified: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'parent_id,student_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Unlinks a parent and student association.
   */
  async unlinkParentStudent(linkId: string, parentId?: string, studentId?: string): Promise<boolean> {
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
          body: JSON.stringify({
            action: 'unlink_parent_student',
            linkId,
            parentId,
            studentId,
          }),
        });

        if (response.ok) return true;
      } catch {
        // Fallback
      }
    }

    let query = supabase.from('parent_student_links').delete();
    if (linkId) {
      query = query.eq('id', linkId);
    } else if (parentId && studentId) {
      query = query.eq('parent_id', parentId).eq('student_id', studentId);
    }

    const { error } = await query;
    if (error) throw error;
    return true;
  },

  /**
   * Lists all Parent accounts with their Parent Login IDs, contact details, and linked children.
   */
  async listParentAccounts(): Promise<ParentAccountSummary[]> {
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
          body: JSON.stringify({ action: 'list_parent_accounts' }),
        });

        if (response.ok) {
          const json = await response.json();
          if (json.success && json.parents) return json.parents;
        }
      } catch {
        // Fallback
      }
    }

    // Direct database query fallback
    const { data: parents, error: pErr } = await supabase
      .from('profiles')
      .select('id, name, email, phone, login_id, status, created_at')
      .eq('role', 'parent')
      .order('created_at', { ascending: false });

    if (pErr) throw pErr;

    const parentIds = (parents || []).map(p => p.id);
    const linksMap: Record<string, any[]> = {};

    if (parentIds.length > 0) {
      const { data: links } = await supabase
        .from('parent_student_links')
        .select('id, parent_id, student_id, relationship, verified, created_at')
        .in('parent_id', parentIds);

      if (links && links.length > 0) {
        const studentIds = links.map(l => l.student_id);
        const { data: students } = await supabase
          .from('profiles')
          .select('id, name, student_id, roll_number, class_name, department')
          .in('id', studentIds);

        const studentLookup = new Map((students || []).map(s => [s.id, s]));

        links.forEach(l => {
          if (!linksMap[l.parent_id]) linksMap[l.parent_id] = [];
          linksMap[l.parent_id].push({
            link_id: l.id,
            relationship: l.relationship,
            verified: l.verified,
            student: studentLookup.get(l.student_id) || { id: l.student_id, name: 'Unknown Student' },
          });
        });
      }
    }

    return (parents || []).map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      login_id: p.login_id || 'Not Assigned',
      status: p.status || 'active',
      created_at: p.created_at,
      linked_children: linksMap[p.id] || [],
    }));
  },

  /**
   * Search parent accounts by query string (matching name, login_id, phone, email).
   */
  async searchParents(query: string): Promise<Profile[]> {
    if (!query || !query.trim()) return [];
    const term = `%${query.trim()}%`;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'parent')
      .or(`name.ilike.${term},login_id.ilike.${term},phone.ilike.${term},email.ilike.${term}`)
      .limit(15);

    if (error) throw error;
    return data || [];
  },

  /**
   * Gets all linked guardians for a given student UUID.
   */
  async getLinkedGuardiansForStudent(studentId: string): Promise<LinkedGuardian[]> {
    if (!studentId) return [];

    const { data: links, error: lErr } = await supabase
      .from('parent_student_links')
      .select('id, parent_id, relationship, verified')
      .eq('student_id', studentId);

    if (lErr || !links || links.length === 0) return [];

    const parentIds = links.map(l => l.parent_id);
    const { data: parents, error: pErr } = await supabase
      .from('profiles')
      .select('id, name, email, phone, login_id, status')
      .in('id', parentIds);

    if (pErr) return [];

    const parentMap = new Map((parents || []).map(p => [p.id, p]));

    return links.map(l => ({
      link_id: l.id,
      relationship: l.relationship,
      verified: l.verified,
      parent: parentMap.get(l.parent_id) || {
        id: l.parent_id,
        name: 'Unknown Guardian',
        email: '',
        status: 'active',
      },
    }));
  },
};

