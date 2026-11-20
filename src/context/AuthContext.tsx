import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { queryClient } from '@/lib/queryClient';

export type UserRole =
  | 'admin'
  | 'principal'
  | 'student'
  | 'parent'
  | 'teacher'
  | 'financier'
  | 'accountant'
  | 'storekeeper'
  | 'driver'
  | 'naac_coordinator'
  | 'receptionist'
  | 'store_manager'
  | 'finance_manager'
  | 'transport_driver'
  | 'hr_manager'
  | 'coe'
  | 'hod'
  | 'librarian'
  | 'hostel_warden'
  | 'placement_officer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  department?: string;
  class_name?: string;
  roll_number?: string;
  student_id?: string;
  preferences?: any;
  assigned_classes?: string[];
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<User | null>;
  signUp: (email: string, password: string, name: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (updates: Partial<User>) => Promise<boolean>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapAuthToUser(authUser: SupabaseAuthUser, profileData?: any): User {
  const email = (authUser.email || '').toLowerCase();
  // Role MUST be resolved strictly from the verified profiles table in database
  const resolvedRole = (profileData?.role || 'student') as UserRole;
  const resolvedName = profileData?.name || authUser.user_metadata?.full_name || email.split('@')[0].replace(/[._]/g, ' ');
  const resolvedAvatar = profileData?.avatar_url || '';
  const resolvedStudentId = profileData?.student_id || profileData?.roll_number || undefined;

  let assignedClasses: string[] = [];
  if (Array.isArray(profileData?.preferences?.assigned_classes)) {
    assignedClasses = profileData.preferences.assigned_classes;
  } else if (profileData?.class_name) {
    assignedClasses = profileData.class_name.split(',').map((s: string) => s.trim()).filter(Boolean);
  }

  return {
    id: authUser.id,
    email: authUser.email || '',
    name: resolvedName,
    role: resolvedRole,
    avatar: resolvedAvatar,
    phone: profileData?.phone,
    department: profileData?.department,
    class_name: profileData?.class_name,
    roll_number: profileData?.roll_number || resolvedStudentId,
    student_id: resolvedStudentId,
    preferences: profileData?.preferences,
    assigned_classes: assignedClasses,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfileAndSetUser = async (authUser: SupabaseAuthUser): Promise<User> => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      const resolved = mapAuthToUser(authUser, profile);
      setUser(resolved);
      return resolved;
    } catch {
      const fallback = mapAuthToUser(authUser);
      setUser(fallback);
      return fallback;
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('[Auth] Session initialization warning:', error.message);
        }

        if (initialSession?.user && isMounted) {
          setSession(initialSession);
          await fetchProfileAndSetUser(initialSession.user);
        }
      } catch (err) {
        console.error('[Auth] Failed to restore session:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) return;

        if (event === 'SIGNED_OUT' || !currentSession?.user) {
          queryClient.clear();
          sessionStorage.clear();
          setSession(null);
          setUser(null);
          setIsLoading(false);
          return;
        }

        setSession(currentSession);
        if (currentSession?.user) {
          await fetchProfileAndSetUser(currentSession.user);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<User | null> => {
    setIsLoading(true);
    try {
      // Purge query client cache and session storage prior to setting new user session
      queryClient.clear();
      sessionStorage.clear();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        console.error('[Auth] Login error:', error.message);
        setIsLoading(false);
        return null;
      }

      if (data.user) {
        const authenticatedUser = await fetchProfileAndSetUser(data.user);
        setIsLoading(false);
        return authenticatedUser;
      }

      setIsLoading(false);
      return null;
    } catch (err) {
      console.error('[Auth] Login exception:', err);
      setIsLoading(false);
      return null;
    }
  };

  const signUp = async (
    _email: string,
    _password: string,
    _name: string,
    _role: UserRole
  ): Promise<{ success: boolean; error?: string }> => {
    return {
      success: false,
      error: 'Self-registration is restricted. Accounts must be provisioned exclusively by Institutional Administration.'
    };
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[Auth] Logout error:', err);
    } finally {
      queryClient.clear();
      sessionStorage.clear();
      setUser(null);
      setSession(null);
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const updatePassword = async (password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const updateUserProfile = async (updates: Partial<User>): Promise<boolean> => {
    if (!user) return false;
    try {
      const { role: _role, ...allowedUpdates } = updates;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: allowedUpdates.name,
          avatar_url: allowedUpdates.avatar,
          phone: allowedUpdates.phone,
          department: allowedUpdates.department,
          class_name: allowedUpdates.class_name,
          roll_number: allowedUpdates.roll_number,
          preferences: allowedUpdates.preferences !== undefined ? allowedUpdates.preferences : (user as any)?.preferences,
        })
        .eq('id', user.id);

      await supabase.auth.updateUser({
        data: {
          name: allowedUpdates.name,
          avatar: allowedUpdates.avatar,
        },
      });

      setUser(prev => prev ? { ...prev, ...allowedUpdates } : null);
      return !profileError;
    } catch (err) {
      console.error('[Auth] updateUserProfile error:', err);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        login,
        signUp,
        logout,
        resetPassword,
        updatePassword,
        updateUserProfile,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
