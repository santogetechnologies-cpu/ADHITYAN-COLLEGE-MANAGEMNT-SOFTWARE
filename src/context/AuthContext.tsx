import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'student' | 'parent' | 'teacher' | 'admin' | 'principal' | 'financier' | 'accountant' | 'storekeeper' | 'driver' | 'naac_coordinator' | 'receptionist' | 'store_manager' | 'finance_manager' | 'transport_driver';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USERS: Record<string, User> = {
  'student@gmail.com': {
    id: '1',
    email: 'student@gmail.com',
    name: 'Alex Chen',
    role: 'student',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
  },
  'parent@gmail.com': {
    id: '2',
    email: 'parent@gmail.com',
    name: 'Sarah Johnson',
    role: 'parent',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b829?w=150&h=150&fit=crop&crop=face'
  },
  'teacher@gmail.com': {
    id: '3',
    email: 'teacher@gmail.com',
    name: 'Dr. Michael Rodriguez',
    role: 'teacher',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
  },
  'admin@gmail.com': {
    id: '4',
    email: 'admin@gmail.com',
    name: 'Jennifer Davis',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
  },
  'principal@gmail.com': {
    id: '5',
    email: 'principal@gmail.com',
    name: 'Dr. Robert Singh',
    role: 'principal',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face'
  },
  'financier@gmail.com': {
    id: '6',
    email: 'financier@gmail.com',
    name: 'Maria Gonzalez',
    role: 'financier',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face'
  },
  'accountant@gmail.com': {
    id: '7',
    email: 'accountant@gmail.com',
    name: 'David Kumar',
    role: 'accountant',
    avatar: 'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?w=150&h=150&fit=crop&crop=face'
  },
  'storekeeper@gmail.com': {
    id: '8',
    email: 'storekeeper@gmail.com',
    name: 'Lisa Wang',
    role: 'storekeeper',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face'
  },
  'driver@gmail.com': {
    id: '9',
    email: 'driver@gmail.com',
    name: 'James Thompson',
    role: 'driver',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face'
  },
  'receptionist@gmail.com': {
    id: '10',
    email: 'receptionist@gmail.com',
    name: 'Emily Carter',
    role: 'receptionist',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b829?w=150&h=150&fit=crop&crop=face'
  },
  'storemanager@gmail.com': {
    id: '11',
    email: 'storemanager@gmail.com',
    name: 'Michael Brown',
    role: 'store_manager',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
  },
  'financemanager@gmail.com': {
    id: '12',
    email: 'financemanager@gmail.com',
    name: 'Sarah Wilson',
    role: 'finance_manager',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face'
  },
  'transportdriver@gmail.com': {
    id: '13',
    email: 'transportdriver@gmail.com',
    name: 'Robert Martinez',
    role: 'transport_driver',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const demoUser = DEMO_USERS[email.toLowerCase()];
    const validPasswords = ['student@123', 'parent@123', 'teacher@123', 'admin@123', 'principal@123', 'financier@123', 'accountant@123', 'storekeeper@123', 'driver@123', 'receptionist@123', 'storemanager@123', 'financemanager@123', 'transportdriver@123'];
    
    if (demoUser && validPasswords.includes(password)) {
      setUser(demoUser);
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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