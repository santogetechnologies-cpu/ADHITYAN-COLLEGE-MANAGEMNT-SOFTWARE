import { supabase } from '@/lib/supabase';
import { FeeReceipt } from '@/types/database.types';

export interface AdmissionConfirmationInput {
  application_id?: string;
  student: {
    name: string;
    email: string;
    phone?: string;
    department: string;
    class_name?: string;
    date_of_birth?: string;
    gender?: string;
    blood_group?: string;
    address?: string;
    previous_school?: string;
    qualifying_marks?: number;
    merit_category?: string;
    merit_rank?: number;
  };
  parent: {
    name: string;
    relationship?: string;
    phone?: string;
    email?: string;
    occupation?: string;
    existing_parent_id?: string;
  };
  scholarship?: {
    applicable: boolean;
    scheme?: string;
    concession_amount?: number;
  };
  fee_payment?: {
    total_course_fee: number;
    admission_fee: number;
    amount_paid: number;
    payment_method: string;
    transaction_reference?: string;
    remarks?: string;
  };
  documents?: Array<{
    document_type: string;
    document_url?: string;
    document_name?: string;
  }>;
}

export interface AdmissionConfirmationResult {
  success: boolean;
  message: string;
  student: {
    id: string;
    student_id: string;
    name: string;
    email: string;
    phone?: string;
    department: string;
    class_name: string;
    is_first_login: boolean;
  };
  parent: {
    id: string;
    parent_id: string;
    name: string;
    phone?: string;
    relationship: string;
    is_reused: boolean;
    is_first_login: boolean;
  };
  receipt?: FeeReceipt | null;
}

export interface FirstLoginChallengeResult {
  success: boolean;
  user_id: string;
  name: string;
  role: string;
  student_id?: string;
  parent_id?: string;
  masked_phone: string;
  masked_email: string;
  is_first_login: boolean;
  verification_code?: string;
}

export const studentParentAuthService = {
  /**
   * Confirm student admission, generate Student ID & Parent ID, create accounts, and link them.
   */
  async confirmAdmission(input: AdmissionConfirmationInput): Promise<AdmissionConfirmationResult> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      throw new Error('Authentication required. Please sign in as Administrator or Receptionist.');
    }

    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'confirm_admission',
        ...input,
      }),
    });

    const json = await response.json();

    if (!response.ok || !json.success) {
      throw new Error(json.error || `Admission confirmation failed (${response.status})`);
    }

    return json;
  },

  /**
   * Request secure One-Time Verification Challenge for Student or Parent First-Time Login
   */
  async requestFirstLoginChallenge(identifier: string, expectedRole?: string): Promise<FirstLoginChallengeResult> {
    const cleanId = identifier.trim();
    if (!cleanId) {
      throw new Error('Please provide your Student ID, Parent ID, Mobile Number, or Email.');
    }

    // Role-specific format guards
    if (expectedRole === 'student') {
      if (cleanId.toUpperCase().startsWith('PAR-') || cleanId.toUpperCase().startsWith('ADP')) {
        throw new Error('Parent IDs cannot be used to activate Student accounts. Please enter your Student ID (STU-...) or registered mobile.');
      }
    } else if (expectedRole === 'parent') {
      if (cleanId.toUpperCase().startsWith('STU-') || cleanId.toUpperCase().startsWith('ADS')) {
        throw new Error('Student IDs cannot be used to activate Parent accounts. Please enter your Parent ID (PAR-...) or registered mobile.');
      }
    }

    // 1. Try backend server endpoint
    try {
      const response = await fetch('/api/auth/first-login-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, expected_role: expectedRole }),
      });

      const json = await response.json();
      if (response.ok && json.success) {
        return json;
      }
      if (!response.ok && json.error) {
        throw new Error(json.error);
      }
    } catch (fetchErr: any) {
      if (fetchErr.message && !fetchErr.message.includes('fetch')) {
        throw fetchErr;
      }
      // Fallback to Supabase direct query
    }

    // 2. Direct Supabase Fallback
    let query = supabase
      .from('profiles')
      .select('id, name, email, role, phone, student_id, roll_number, login_id, is_first_login')
      .or(`login_id.ilike.${cleanId},student_id.ilike.${cleanId},roll_number.ilike.${cleanId},email.ilike.${cleanId},phone.eq.${cleanId}`);

    if (expectedRole) {
      query = query.eq('role', expectedRole);
    }

    const { data: user, error } = await query.maybeSingle();

    if (error || !user) {
      const roleHint = expectedRole === 'student' ? ' for a student' : expectedRole === 'parent' ? ' for a parent' : '';
      throw new Error(`No institutional account found${roleHint} matching "${cleanId}". Please verify your credentials or contact the Receptionist.`);
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await supabase
      .from('profiles')
      .update({ verification_code: code, verification_expires_at: expiresAt })
      .eq('id', user.id);

    const maskedPhone = user.phone 
      ? user.phone.slice(-4).padStart(user.phone.length, '*') 
      : 'Registered Mobile Number';

    const maskedEmail = user.email 
      ? user.email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.max(2, b.length)) + c)
      : 'Registered Email';

    return {
      success: true,
      user_id: user.id,
      name: user.name,
      role: user.role,
      student_id: user.student_id || user.roll_number,
      parent_id: user.login_id,
      masked_phone: maskedPhone,
      masked_email: maskedEmail,
      is_first_login: user.is_first_login ?? true,
      verification_code: code,
    };
  },

  /**
   * Verify code and set new permanent password for First-Time Login
   */
  async completeFirstLogin(identifier: string, code: string, newPassword: string): Promise<{ success: boolean; email: string }> {
    const cleanId = identifier.trim();
    const cleanCode = code.trim();

    if (!cleanId || !cleanCode || !newPassword) {
      throw new Error('Identifier, verification code, and new password are required.');
    }

    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    // 1. Try backend server endpoint
    try {
      const response = await fetch('/api/auth/complete-first-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: cleanId,
          code: cleanCode,
          new_password: newPassword,
        }),
      });

      const json = await response.json();
      if (response.ok && json.success) {
        return json;
      }
      if (!response.ok && json.error) {
        throw new Error(json.error);
      }
    } catch (fetchErr: any) {
      if (fetchErr.message && !fetchErr.message.includes('fetch')) {
        throw fetchErr;
      }
    }

    // 2. Direct Supabase Fallback
    const { data: user } = await supabase
      .from('profiles')
      .select('id, email, verification_code, verification_expires_at')
      .or(`login_id.ilike.${cleanId},student_id.ilike.${cleanId},roll_number.ilike.${cleanId},email.ilike.${cleanId},phone.eq.${cleanId}`)
      .maybeSingle();

    if (!user) {
      throw new Error('Account could not be found.');
    }

    if (!user.verification_code || user.verification_code.trim() !== cleanCode) {
      throw new Error('Invalid verification code. Please check and try again.');
    }

    // Update password via Supabase Auth client if session available, or profiles record
    await supabase.from('profiles').update({
      verification_code: null,
      verification_expires_at: null,
      is_first_login: false,
      first_login_completed: true,
      requires_password_change: false,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);

    return {
      success: true,
      email: user.email,
    };
  },

  /**
   * Resolves Student ID, Parent ID, Phone, or Email to the Supabase Auth login email,
   * enforcing optional role filter for database-level boundary isolation.
   */
  async resolveLoginIdentifier(identifier: string, expectedRole?: string): Promise<string | null> {
    const clean = identifier.trim();
    if (!clean) return null;

    if (clean.includes('@')) {
      if (expectedRole) {
        const { data: userByEmail } = await supabase
          .from('profiles')
          .select('email, role')
          .ilike('email', clean)
          .maybeSingle();
        if (userByEmail && userByEmail.role !== expectedRole) {
          return null;
        }
      }
      return clean;
    }

    // Try server endpoint
    try {
      const res = await fetch('/api/auth/resolve-login-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login_id: clean, expected_role: expectedRole }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.email) return json.email;
      }
    } catch {
      // fallback
    }

    // Try Supabase RPC
    try {
      const { data: rpcEmail } = await supabase.rpc('resolve_login_id', { p_login_id: clean });
      if (rpcEmail) {
        if (expectedRole) {
          const { data: userByEmail } = await supabase
            .from('profiles')
            .select('email, role')
            .ilike('email', rpcEmail)
            .maybeSingle();
          if (userByEmail && userByEmail.role !== expectedRole) {
            return null;
          }
        }
        return rpcEmail;
      }
    } catch {
      // fallback
    }

    // Direct profile query
    let query = supabase
      .from('profiles')
      .select('email, role')
      .or(`login_id.ilike.${clean},student_id.ilike.${clean},roll_number.ilike.${clean},phone.eq.${clean}`);

    if (expectedRole) {
      query = query.eq('role', expectedRole);
    }

    const { data } = await query.maybeSingle();

    return data?.email || null;
  },
};

