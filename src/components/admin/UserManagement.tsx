import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OFFICIAL_COURSES } from '@/constants/courses';
import { 
  UserPlus, 
  Users, 
  Search, 
  GraduationCap, 
  User, 
  Filter, 
  Loader2,
  MoreVertical,
  KeyRound,
  Edit,
  UserX,
  UserCheck,
  Trash2,
  Shield,
  AlertTriangle,
  Building2,
  Phone,
  Package,
  CreditCard,
  Bus,
  Briefcase,
  Library,
  Home,
  Award,
  Link as LinkIcon,
  Unlink,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Mail,
  BookOpen
} from 'lucide-react';
import { TeacherClassAssignmentSelector } from '@/components/admin/TeacherClassAssignmentSelector';
import { adminUserService, AdminManagedUser, CreateUserData, UpdateUserData } from '@/services/adminUserService';
import { UserRole, useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { usePresence } from '@/context/PresenceContext';
import { toast } from '@/hooks/use-toast';
import { InstitutionName } from '@/lib/institution';

// The 13 official project roles
export const ALL_13_ROLES: { id: UserRole; title: string; category: 'student' | 'parent' | 'staff'; icon: any }[] = [
  { id: 'student', title: 'Student', category: 'student', icon: GraduationCap },
  { id: 'parent', title: 'Parent', category: 'parent', icon: Users },
  { id: 'teacher', title: 'Faculty / Teacher', category: 'staff', icon: User },
  { id: 'principal', title: 'Principal / Dean', category: 'staff', icon: Building2 },
  { id: 'admin', title: 'Executive Administrator', category: 'staff', icon: Shield },
  { id: 'finance_manager', title: 'Finance Manager', category: 'staff', icon: CreditCard },
  { id: 'hr_manager', title: 'HR Manager', category: 'staff', icon: Briefcase },
  { id: 'receptionist', title: 'Receptionist / Front Desk', category: 'staff', icon: Phone },
  { id: 'librarian', title: 'Chief Librarian', category: 'staff', icon: Library },
  { id: 'hostel_warden', title: 'Hostel Warden', category: 'staff', icon: Home },
  { id: 'placement_officer', title: 'Placement Officer', category: 'staff', icon: Award },
  { id: 'store_manager', title: 'Store & Inventory Manager', category: 'staff', icon: Package },
  { id: 'transport_driver', title: 'Transport Driver / Supervisor', category: 'staff', icon: Bus },
];

export const STAFF_ROLES_LIST = ALL_13_ROLES.filter(r => r.category === 'staff');

export default function UserManagement() {
  const { user: currentAdmin } = useAuth();
  const { isUserOnline } = usePresence();

  // Primary Data State
  const [users, setUsers] = useState<AdminManagedUser[]>([]);
  const [unprovisionedStudents, setUnprovisionedStudents] = useState<any[]>([]);
  const [studentsForParentLink, setStudentsForParentLink] = useState<any[]>([]);
  const [parentLinks, setParentLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab & Filter States
  const [activeTab, setActiveTab] = useState<'students' | 'parents' | 'staff'>('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [staffRoleFilter, setStaffRoleFilter] = useState<string>('all');

  // Dialog States
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminManagedUser | null>(null);

  // 1. Provision Student Dialog State
  const [provisionStudentOpen, setProvisionStudentOpen] = useState(false);
  const [selectedUnprovisionedStudent, setSelectedUnprovisionedStudent] = useState<any | null>(null);
  const [studentProvisionForm, setStudentProvisionForm] = useState({
    email: '',
    password: 'Student@2026',
    phone: '',
  });

  // 2. Provision Parent Dialog State
  const [provisionParentOpen, setProvisionParentOpen] = useState(false);
  const [selectedStudentForParent, setSelectedStudentForParent] = useState<any | null>(null);
  const [parentProvisionForm, setParentProvisionForm] = useState({
    name: '',
    email: '',
    phone: '',
    relationship: 'Father',
    password: 'Parent@2026',
  });

  // 3. Link Existing Parent Dialog State
  const [linkExistingParentOpen, setLinkExistingParentOpen] = useState(false);
  const [selectedExistingParentId, setSelectedExistingParentId] = useState('');
  const [existingParentRelationship, setExistingParentRelationship] = useState('Parent');

  // 4. Staff Creation Dialog State
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [staffFormData, setStaffFormData] = useState({
    name: '',
    email: '',
    password: 'Staff@2026',
    role: 'teacher' as UserRole,
    phone: '',
    assigned_classes: [] as string[],
  });

  // 5. Edit User Dialog State
  const [editOpen, setEditOpen] = useState(false);
  const [editAssignedClasses, setEditAssignedClasses] = useState<string[]>([]);
  const [editFormData, setEditFormData] = useState<UpdateUserData>({
    name: '',
    phone: '',
    department: '',
    class_name: '',
  });

  // 6. Reset Password Dialog State
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // 7. Delete User Dialog State
  const [deleteOpen, setDeleteOpen] = useState(false);

  // 8. Manage Parent Links Dialog State
  const [manageLinksOpen, setManageLinksOpen] = useState(false);
  const [activeParentForLinks, setActiveParentForLinks] = useState<AdminManagedUser | null>(null);
  const [childToLinkProfileId, setChildToLinkProfileId] = useState('');

  // Load all user directories, unprovisioned approved admissions, and parent-student links
  const loadAllData = useCallback(async () => {
    try {
      const failed: string[] = [];
      const soft = <T,>(p: Promise<T[]>, what: string) => p.catch(() => { failed.push(what); return [] as T[]; });
      const [allUsers, unprovisioned, studentsParentStatus, linksData] = await Promise.all([
        soft(adminUserService.listUsers(), 'user list'),
        soft(adminUserService.listUnprovisionedApprovedStudents(), 'approved admissions'),
        soft(adminUserService.listStudentsForParentLinking(), 'parent linking'),
        supabase.from('parent_student_links').select('*').order('created_at', { ascending: false }).then(r => { if (r.error) failed.push('parent links'); return r.data || []; })
      ]);
      if (failed.length) {
        toast({ title: 'Some lists could not be loaded', description: `Not loaded: ${failed.join(', ')}. What you see may be incomplete — refresh to try again.`, variant: 'destructive' });
      }

      setUsers(allUsers);
      setUnprovisionedStudents(unprovisioned);
      setStudentsForParentLink(studentsParentStatus);
      setParentLinks(linksData);
    } catch (err: any) {
      console.error('Failed to load user management data:', err);
      toast({
        title: "Registry Fetch Error",
        description: err.message || "Failed to load user management data from database.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Real-time synchronization for profiles and parent_student_links
  useRealtimeSubscription({
    table: 'profiles',
    onChange: loadAllData,
    onReconnect: loadAllData,
  });

  useRealtimeSubscription({
    table: 'parent_student_links',
    onChange: loadAllData,
    onReconnect: loadAllData,
  });

  // Subsets
  const enrolledStudents = useMemo(() => users.filter(u => u.role === 'student'), [users]);
  const parentAccounts = useMemo(() => users.filter(u => u.role === 'parent'), [users]);
  const staffMembers = useMemo(() => users.filter(u => u.role !== 'student' && u.role !== 'parent'), [users]);

  // Helper: Get linked children for a parent account
  const getLinkedChildrenForParent = useCallback((parentId: string) => {
    const matchingLinks = parentLinks.filter(l => l.parent_id === parentId);
    return matchingLinks.map(link => {
      const student = enrolledStudents.find(s => s.id === link.student_id);
      return {
        linkId: link.id,
        studentId: link.student_id,
        relationship: link.relationship || 'Child',
        verified: link.verified !== false,
        studentName: student?.name || 'Enrolled Student',
        studentManualId: student?.student_id || student?.roll_number || 'N/A',
        department: student?.department || 'Paramedical Sciences'
      };
    });
  }, [parentLinks, enrolledStudents]);

  // Unlinked enrolled students needing a parent account
  const unlinkedEnrolledStudents = useMemo(() => {
    const linkedStudentProfileIds = new Set(parentLinks.map(l => l.student_id));
    return enrolledStudents.filter(s => !linkedStudentProfileIds.has(s.id));
  }, [enrolledStudents, parentLinks]);

  // Filtered Students Directory
  const filteredStudents = useMemo(() => {
    return enrolledStudents.filter(s => {
      if (courseFilter !== 'all' && s.department !== courseFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (s.name || '').toLowerCase().includes(q);
        const matchesId = (s.student_id || s.roll_number || '').toLowerCase().includes(q);
        const matchesEmail = (s.email || '').toLowerCase().includes(q);
        const matchesDept = (s.department || '').toLowerCase().includes(q);
        return matchesName || matchesId || matchesEmail || matchesDept;
      }
      return true;
    });
  }, [enrolledStudents, courseFilter, searchQuery]);

  // Filtered Parents Directory
  const filteredParents = useMemo(() => {
    return parentAccounts.filter(p => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (p.name || '').toLowerCase().includes(q);
        const matchesEmail = (p.email || '').toLowerCase().includes(q);
        const matchesPhone = (p.phone || '').includes(q);
        const linked = getLinkedChildrenForParent(p.id);
        const matchesChild = linked.some(c => 
          c.studentName.toLowerCase().includes(q) || 
          c.studentManualId.toLowerCase().includes(q)
        );
        return matchesName || matchesEmail || matchesPhone || matchesChild;
      }
      return true;
    });
  }, [parentAccounts, searchQuery, getLinkedChildrenForParent]);

  // Filtered Staff Directory
  const filteredStaff = useMemo(() => {
    return staffMembers.filter(s => {
      if (staffRoleFilter !== 'all' && s.role !== staffRoleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (s.name || '').toLowerCase().includes(q);
        const matchesEmail = (s.email || '').toLowerCase().includes(q);
        const matchesPhone = (s.phone || '').includes(q);
        const matchesDept = (s.department || '').toLowerCase().includes(q);
        const matchesRole = (s.role || '').toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesPhone || matchesDept || matchesRole;
      }
      return true;
    });
  }, [staffMembers, staffRoleFilter, searchQuery]);

  // Action: Open Student Provisioning Modal
  const handleOpenProvisionStudent = (adm: any) => {
    setSelectedUnprovisionedStudent(adm);
    setStudentProvisionForm({
      email: adm.email || '',
      password: 'Student@2026',
      phone: adm.phone || '',
    });
    setProvisionStudentOpen(true);
  };

  // Action: Submit Student Portal Provisioning
  const handleProvisionStudent = async () => {
    if (!selectedUnprovisionedStudent) return;
    const sId = selectedUnprovisionedStudent.student_id || selectedUnprovisionedStudent.application_number;
    if (!sId) {
      toast({ title: "Error", description: "Student ID missing from approved application.", variant: "destructive" });
      return;
    }
    if (!studentProvisionForm.email.trim()) {
      toast({ title: "Error", description: "Email address is required for portal login.", variant: "destructive" });
      return;
    }
    if (studentProvisionForm.password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    setActionLoading(true);
    try {
      await adminUserService.provisionStudentAccount({
        admission_id: selectedUnprovisionedStudent.id,
        student_id: sId,
        name: selectedUnprovisionedStudent.name,
        email: studentProvisionForm.email.trim(),
        password: studentProvisionForm.password,
        department: selectedUnprovisionedStudent.department,
        class_name: selectedUnprovisionedStudent.class_name || 'Semester 1',
        phone: studentProvisionForm.phone.trim() || undefined,
      });

      toast({
        title: "Student Portal Login Provisioned",
        description: `Account for ${selectedUnprovisionedStudent.name} (ID: ${sId}) is now active.`,
      });

      setProvisionStudentOpen(false);
      setSelectedUnprovisionedStudent(null);
      loadAllData();
    } catch (err: any) {
      toast({
        title: "Provisioning Failed",
        description: err.message || "Could not provision student portal login.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Open Parent Provisioning Modal
  const handleOpenProvisionParent = (student: any) => {
    setSelectedStudentForParent(student);
    setParentProvisionForm({
      name: `Parent of ${student.name}`,
      email: '',
      phone: student.phone || '',
      relationship: 'Father',
      password: 'Parent@2026',
    });
    setProvisionParentOpen(true);
  };

  // Action: Submit Parent Account Creation and Linking
  const handleProvisionParent = async () => {
    if (!selectedStudentForParent) return;
    if (!parentProvisionForm.name.trim() || !parentProvisionForm.email.trim()) {
      toast({ title: "Validation Error", description: "Parent Name and Email are required.", variant: "destructive" });
      return;
    }
    if (parentProvisionForm.password.length < 6) {
      toast({ title: "Validation Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    setActionLoading(true);
    try {
      await adminUserService.createParentAccountAndLink({
        student_id: selectedStudentForParent.id,
        name: parentProvisionForm.name.trim(),
        email: parentProvisionForm.email.trim(),
        phone: parentProvisionForm.phone.trim() || undefined,
        password: parentProvisionForm.password,
        relationship: parentProvisionForm.relationship,
      });

      toast({
        title: "Parent Account Created & Linked",
        description: `Parent ${parentProvisionForm.name} linked to student ${selectedStudentForParent.name}.`,
      });

      setProvisionParentOpen(false);
      setSelectedStudentForParent(null);
      loadAllData();
    } catch (err: any) {
      toast({
        title: "Parent Account Creation Failed",
        description: err.message || "Failed to create and link parent account.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Link to Existing Parent (for siblings)
  const handleLinkExistingParent = async () => {
    if (!selectedStudentForParent || !selectedExistingParentId) {
      toast({ title: "Error", description: "Please select an existing parent profile.", variant: "destructive" });
      return;
    }

    setActionLoading(true);
    try {
      await adminUserService.linkParentStudent(
        selectedExistingParentId,
        selectedStudentForParent.id,
        existingParentRelationship
      );

      toast({
        title: "Student Linked to Existing Parent",
        description: `Student ${selectedStudentForParent.name} successfully linked to parent profile.`,
      });

      setLinkExistingParentOpen(false);
      setSelectedStudentForParent(null);
      setSelectedExistingParentId('');
      loadAllData();
    } catch (err: any) {
      toast({
        title: "Linking Failed",
        description: err.message || "Failed to link to existing parent.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Add Staff Member (strictly staff roles)
  const handleCreateStaff = async () => {
    if (!staffFormData.name.trim() || !staffFormData.email.trim() || !staffFormData.password) {
      toast({ title: "Validation Error", description: "Staff Name, Email, and Password are required.", variant: "destructive" });
      return;
    }
    if (staffFormData.password.length < 6) {
      toast({ title: "Validation Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    setActionLoading(true);
    try {
      const isTeacher = staffFormData.role === 'teacher';
      const assignedClasses = isTeacher ? staffFormData.assigned_classes : [];

      await adminUserService.createUser({
        name: staffFormData.name.trim(),
        email: staffFormData.email.trim().toLowerCase(),
        password: staffFormData.password,
        role: staffFormData.role,
        phone: staffFormData.phone.trim() || undefined,
        assigned_classes: assignedClasses,
        class_name: assignedClasses[0] || undefined,
        department: isTeacher ? 'Paramedical Faculty' : undefined,
      });

      toast({
        title: "Staff Account Created",
        description: `${staffFormData.name} has been provisioned as ${staffFormData.role}${isTeacher ? ` with ${assignedClasses.length} assigned classes` : ''}.`,
      });

      setAddStaffOpen(false);
      setStaffFormData({
        name: '',
        email: '',
        password: 'Staff@2026',
        role: 'teacher',
        phone: '',
        assigned_classes: [],
      });
      window.dispatchEvent(new CustomEvent('teacher-assignments-changed'));
      loadAllData();
    } catch (err: any) {
      toast({
        title: "Staff Creation Failed",
        description: err.message || "Failed to create staff account.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Edit User
  const handleEditUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const payload: UpdateUserData = {
        name: editFormData.name,
        phone: editFormData.phone,
        department: editFormData.department,
        class_name: editFormData.class_name,
      };

      if (selectedUser.role === 'teacher') {
        payload.assigned_classes = editAssignedClasses;
        payload.class_name = editAssignedClasses[0] || '';
      }

      await adminUserService.updateUser(selectedUser.id, payload);
      toast({ title: "Profile Updated", description: `Updated details for ${selectedUser.name}.` });
      window.dispatchEvent(new CustomEvent('teacher-assignments-changed'));
      setEditOpen(false);
      setSelectedUser(null);
      loadAllData();
    } catch (err: any) {
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Reset Password
  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword || newPassword.length < 6) {
      toast({ title: "Validation Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setActionLoading(true);
    try {
      await adminUserService.resetUserPassword(selectedUser.id, newPassword);
      toast({ title: "Password Reset Successful", description: `New password set for ${selectedUser.name}.` });
      setResetOpen(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (err: any) {
      toast({ title: "Password Reset Failed", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Toggle Active Status
  const handleToggleStatus = async (user: AdminManagedUser) => {
    const nextStatus = user.status === 'active' ? false : true;
    try {
      await adminUserService.setUserActiveStatus(user.id, nextStatus);
      toast({
        title: nextStatus ? "Account Activated" : "Account Suspended",
        description: `${user.name} is now ${nextStatus ? 'active' : 'suspended'}.`,
      });
      loadAllData();
    } catch (err: any) {
      toast({ title: "Status Change Failed", description: err.message, variant: "destructive" });
    }
  };

  // Action: Delete User
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await adminUserService.deleteUser(selectedUser.id);
      toast({ title: "Account Deleted", description: `User account ${selectedUser.name} removed.` });
      setDeleteOpen(false);
      setSelectedUser(null);
      loadAllData();
    } catch (err: any) {
      toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Unlink child from parent
  const handleUnlinkChild = async (linkId: string, parentId: string, studentId: string) => {
    try {
      await adminUserService.unlinkParentStudent({ linkId, parentId, studentId });
      toast({ title: "Link Removed", description: "Child removed from this parent account." });
      loadAllData();
    } catch (err: any) {
      toast({ title: "Unlink Failed", description: err.message, variant: "destructive" });
    }
  };

  // Helper for role badge display
  const getRoleBadge = (role: string) => {
    const matched = ALL_13_ROLES.find(r => r.id === role);
    const title = matched?.title || role;
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-600 text-white font-medium text-[11px]"><Shield className="w-3 h-3 mr-1" /> {title}</Badge>;
      case 'principal':
        return <Badge className="bg-purple-600 text-white font-medium text-[11px]"><Building2 className="w-3 h-3 mr-1" /> {title}</Badge>;
      case 'teacher':
        return <Badge className="bg-blue-600 text-white font-medium text-[11px]"><User className="w-3 h-3 mr-1" /> {title}</Badge>;
      case 'student':
        return <Badge className="bg-emerald-600 text-white font-medium text-[11px]"><GraduationCap className="w-3 h-3 mr-1" /> {title}</Badge>;
      case 'parent':
        return <Badge className="bg-amber-600 text-white font-medium text-[11px]"><Users className="w-3 h-3 mr-1" /> {title}</Badge>;
      case 'finance_manager':
        return <Badge className="bg-green-700 text-white font-medium text-[11px]"><CreditCard className="w-3 h-3 mr-1" /> {title}</Badge>;
      case 'hr_manager':
        return <Badge className="bg-cyan-700 text-white font-medium text-[11px]"><Briefcase className="w-3 h-3 mr-1" /> {title}</Badge>;
      case 'receptionist':
        return <Badge className="bg-orange-600 text-white font-medium text-[11px]"><Phone className="w-3 h-3 mr-1" /> {title}</Badge>;
      case 'librarian':
        return <Badge className="bg-indigo-600 text-white font-medium text-[11px]"><Library className="w-3 h-3 mr-1" /> {title}</Badge>;
      case 'hostel_warden':
        return <Badge className="bg-teal-600 text-white font-medium text-[11px]"><Home className="w-3 h-3 mr-1" /> {title}</Badge>;
      case 'placement_officer':
        return <Badge className="bg-rose-600 text-white font-medium text-[11px]"><Award className="w-3 h-3 mr-1" /> {title}</Badge>;
      case 'store_manager':
        return <Badge className="bg-slate-700 text-white font-medium text-[11px]"><Package className="w-3 h-3 mr-1" /> {title}</Badge>;
      case 'transport_driver':
        return <Badge className="bg-amber-700 text-white font-medium text-[11px]"><Bus className="w-3 h-3 mr-1" /> {title}</Badge>;
      default:
        return <Badge variant="outline" className="text-[11px]">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER & TOP METRICS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Institutional User Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Centralized directory for Students, Parents, and 11 Staff Roles across <InstitutionName />
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'staff' && (
            <Button 
              size="sm" 
              onClick={() => setAddStaffOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add Staff Member
            </Button>
          )}
        </div>
      </div>

      {/* THREE PRIMARY TABS */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setSearchQuery(''); }} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-xl h-11 p-1 bg-muted/60 rounded-xl">
          <TabsTrigger value="students" className="text-xs font-semibold flex items-center gap-1.5 py-2">
            <GraduationCap className="h-4 w-4" />
            <span>Student Accounts</span>
            {unprovisionedStudents.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {unprovisionedStudents.length} Pending
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger value="parents" className="text-xs font-semibold flex items-center gap-1.5 py-2">
            <Users className="h-4 w-4" />
            <span>Parent Accounts</span>
            {unlinkedEnrolledStudents.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                {unlinkedEnrolledStudents.length} Unlinked
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger value="staff" className="text-xs font-semibold flex items-center gap-1.5 py-2">
            <Briefcase className="h-4 w-4" />
            <span>Staff & Faculty ({staffMembers.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* ============================================================== */}
        {/* TAB 1: STUDENT ACCOUNTS */}
        {/* ============================================================== */}
        <TabsContent value="students" className="space-y-6 pt-4">
          {/* Section A: Approved Admissions Awaiting Portal Login */}
          <Card className="border-amber-200/80 dark:border-amber-900/60 shadow-xs overflow-hidden">
            <CardHeader className="bg-amber-50/50 dark:bg-amber-950/20 py-3.5 px-4 border-b border-amber-100 dark:border-amber-900/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-amber-950 dark:text-amber-100">
                      Approved Admissions Awaiting Portal Login Setup
                    </CardTitle>
                    <CardDescription className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                      Admissions approved by Admin/Principal. Select a student to provision portal login credentials using their assigned Student ID.
                    </CardDescription>
                  </div>
                </div>

                <Badge className="bg-amber-600 text-white font-semibold text-xs px-2.5 py-0.5">
                  {unprovisionedStudents.length} Awaiting Provisioning
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {unprovisionedStudents.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-1">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 mb-1" />
                  <span className="font-semibold text-foreground">All Approved Students Have Active Portal Logins</span>
                  <span>No unprovisioned admissions currently in queue.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 border-b text-muted-foreground text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-4 text-left font-semibold">Student ID (Assigned)</th>
                        <th className="py-2.5 px-4 text-left font-semibold">Student Name</th>
                        <th className="py-2.5 px-4 text-left font-semibold">Paramedical Program</th>
                        <th className="py-2.5 px-4 text-left font-semibold">Contact Email</th>
                        <th className="py-2.5 px-4 text-left font-semibold">Approval Status</th>
                        <th className="py-2.5 px-4 text-right font-semibold">Portal Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {unprovisionedStudents.map((adm) => (
                        <tr key={adm.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-foreground">
                            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border text-blue-700 dark:text-blue-300">
                              {adm.student_id || adm.application_number}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-foreground">{adm.name}</td>
                          <td className="py-3 px-4 text-muted-foreground">{adm.department}</td>
                          <td className="py-3 px-4 text-muted-foreground">{adm.email || 'N/A'}</td>
                          <td className="py-3 px-4">
                            <Badge className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-200 text-[10px]">
                              Approved Admission
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              size="sm"
                              onClick={() => handleOpenProvisionStudent(adm)}
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                            >
                              <KeyRound className="h-3.5 w-3.5 mr-1" />
                              Provision Student Login
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section B: Enrolled Active Student Directory */}
          <Card className="shadow-xs">
            <CardHeader className="py-3.5 px-4 border-b">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-blue-600" />
                    Enrolled Active Students Directory ({enrolledStudents.length})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Full student registry with permanent Student IDs, course cohorts, and access governance
                  </CardDescription>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-56">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search ID, name, email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 text-xs h-9"
                    />
                  </div>

                  <Select value={courseFilter} onValueChange={setCourseFilter}>
                    <SelectTrigger className="w-[180px] h-9 text-xs">
                      <SelectValue placeholder="All Programs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Paramedical Programs</SelectItem>
                      {OFFICIAL_COURSES.map(c => (
                        <SelectItem key={c.id} value={c.name} className="text-xs">
                          {c.code} ({c.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span>Loading enrolled students directory...</span>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No enrolled students found matching the selected filter criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 border-b text-muted-foreground text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-4 text-left font-semibold">Student ID</th>
                        <th className="py-2.5 px-4 text-left font-semibold">Student Name</th>
                        <th className="py-2.5 px-4 text-left font-semibold">Program / Department</th>
                        <th className="py-2.5 px-4 text-left font-semibold">Email & Phone</th>
                        <th className="py-2.5 px-4 text-left font-semibold">Status</th>
                        <th className="py-2.5 px-right font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredStudents.map((std) => {
                        const online = isUserOnline(std.id);
                        return (
                          <tr key={std.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-foreground">
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border text-blue-700 dark:text-blue-300">
                                {std.student_id || std.roll_number || 'N/A'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                                <span className="font-semibold text-foreground">{std.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <span className="font-medium text-foreground block truncate max-w-[200px]">{std.department || 'Paramedical Sciences'}</span>
                                <span className="text-[10px] text-muted-foreground">{std.class_name || 'Semester 1'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <span className="text-foreground block truncate max-w-[180px]">{std.email}</span>
                                {std.phone && <span className="text-[10px] text-muted-foreground">{std.phone}</span>}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge 
                                variant={std.status === 'active' ? 'default' : 'secondary'}
                                className={`text-[10px] ${std.status === 'active' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
                              >
                                {std.status === 'active' ? 'Active' : 'Suspended'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 text-xs">
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedUser(std);
                                      setNewPassword('');
                                      setResetOpen(true);
                                    }}
                                  >
                                    <KeyRound className="h-3.5 w-3.5 mr-2 text-blue-600" /> Reset Password
                                  </DropdownMenuItem>

                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedUser(std);
                                      setEditFormData({
                                        name: std.name,
                                        phone: std.phone || '',
                                        department: std.department || '',
                                        class_name: std.class_name || '',
                                      });
                                      setEditOpen(true);
                                    }}
                                  >
                                    <Edit className="h-3.5 w-3.5 mr-2" /> Edit Student Details
                                  </DropdownMenuItem>

                                  <DropdownMenuItem onClick={() => handleToggleStatus(std)}>
                                    {std.status === 'active' ? (
                                      <>
                                        <UserX className="h-3.5 w-3.5 mr-2 text-amber-600" /> Suspend Student Access
                                      </>
                                    ) : (
                                      <>
                                        <UserCheck className="h-3.5 w-3.5 mr-2 text-emerald-600" /> Activate Student Access
                                      </>
                                    )}
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedUser(std);
                                      setDeleteOpen(true);
                                    }}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Student Profile
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================== */}
        {/* TAB 2: PARENT ACCOUNTS */}
        {/* ============================================================== */}
        <TabsContent value="parents" className="space-y-6 pt-4">
          {/* Section A: Enrolled Students Needing Parent Account Setup */}
          <Card className="border-blue-200/80 dark:border-blue-900/60 shadow-xs overflow-hidden">
            <CardHeader className="bg-blue-50/50 dark:bg-blue-950/20 py-3.5 px-4 border-b border-blue-100 dark:border-blue-900/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-blue-950 dark:text-blue-100">
                      Enrolled Students Requiring Parent Account Setup
                    </CardTitle>
                    <CardDescription className="text-[11px] text-blue-800/80 dark:text-blue-300/80">
                      Enrolled students who do not yet have a linked Parent portal account. Create a new linked account or link to an existing parent (for siblings).
                    </CardDescription>
                  </div>
                </div>

                <Badge className="bg-blue-600 text-white font-semibold text-xs px-2.5 py-0.5">
                  {unlinkedEnrolledStudents.length} Unlinked Students
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {unlinkedEnrolledStudents.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-1">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 mb-1" />
                  <span className="font-semibold text-foreground">All Enrolled Students Are Linked to Parent Accounts</span>
                  <span>No unlinked students currently in queue.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 border-b text-muted-foreground text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-4 text-left font-semibold">Student ID</th>
                        <th className="py-2.5 px-4 text-left font-semibold">Student Name</th>
                        <th className="py-2.5 px-4 text-left font-semibold">Program</th>
                        <th className="py-2.5 px-4 text-left font-semibold">Contact Phone</th>
                        <th className="py-2.5 px-right font-semibold text-right">Parent Account Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {unlinkedEnrolledStudents.slice(0, 10).map((std) => (
                        <tr key={std.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-foreground">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border text-blue-700 dark:text-blue-300">
                              {std.student_id || std.roll_number || 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-foreground">{std.name}</td>
                          <td className="py-3 px-4 text-muted-foreground">{std.department || 'Paramedical Sciences'}</td>
                          <td className="py-3 px-4 text-muted-foreground">{std.phone || 'N/A'}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedStudentForParent(std);
                                  setSelectedExistingParentId('');
                                  setLinkExistingParentOpen(true);
                                }}
                                className="h-8 text-xs"
                              >
                                <LinkIcon className="h-3.5 w-3.5 mr-1 text-blue-600" />
                                Link Existing Parent
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => handleOpenProvisionParent(std)}
                                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                              >
                                <UserPlus className="h-3.5 w-3.5 mr-1" />
                                Create Parent Account
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section B: Active Parent Accounts Directory */}
          <Card className="shadow-xs">
            <CardHeader className="py-3.5 px-4 border-b">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    Enrolled Parent Accounts Directory ({parentAccounts.length})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Parents with verified links to candidate students via parent_student_links
                  </CardDescription>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search parent name, email, child..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-9"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredParents.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No parent accounts found matching the search criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 border-b text-muted-foreground text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-4 text-left font-semibold">Parent Name</th>
                        <th className="py-2.5 px-4 text-left font-semibold">Contact Email & Phone</th>
                        <th className="py-2.5 px-4 text-left font-semibold">Linked Children (Students)</th>
                        <th className="py-2.5 px-4 text-left font-semibold">Status</th>
                        <th className="py-2.5 px-right font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredParents.map((parent) => {
                        const linkedChildren = getLinkedChildrenForParent(parent.id);
                        return (
                          <tr key={parent.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 font-semibold text-foreground">
                              {parent.name}
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <span className="text-foreground block truncate max-w-[200px]">{parent.email}</span>
                                {parent.phone && <span className="text-[10px] text-muted-foreground">{parent.phone}</span>}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {linkedChildren.length === 0 ? (
                                <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 dark:bg-amber-950/40">
                                  No linked children
                                </Badge>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {linkedChildren.map((c) => (
                                    <span 
                                      key={c.linkId} 
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[11px]"
                                    >
                                      <GraduationCap className="h-3 w-3 text-blue-600" />
                                      <span className="font-semibold text-foreground">{c.studentName}</span>
                                      <span className="font-mono text-[10px] text-muted-foreground">({c.studentManualId})</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <Badge 
                                variant={parent.status === 'active' ? 'default' : 'secondary'}
                                className={`text-[10px] ${parent.status === 'active' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-800'}`}
                              >
                                {parent.status === 'active' ? 'Active' : 'Suspended'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52 text-xs">
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setActiveParentForLinks(parent);
                                      setChildToLinkProfileId('');
                                      setManageLinksOpen(true);
                                    }}
                                  >
                                    <LinkIcon className="h-3.5 w-3.5 mr-2 text-blue-600" /> Manage Linked Children
                                  </DropdownMenuItem>

                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedUser(parent);
                                      setNewPassword('');
                                      setResetOpen(true);
                                    }}
                                  >
                                    <KeyRound className="h-3.5 w-3.5 mr-2" /> Reset Parent Password
                                  </DropdownMenuItem>

                                  <DropdownMenuItem onClick={() => handleToggleStatus(parent)}>
                                    {parent.status === 'active' ? (
                                      <>
                                        <UserX className="h-3.5 w-3.5 mr-2 text-amber-600" /> Suspend Parent Access
                                      </>
                                    ) : (
                                      <>
                                        <UserCheck className="h-3.5 w-3.5 mr-2 text-emerald-600" /> Activate Parent Access
                                      </>
                                    )}
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedUser(parent);
                                      setDeleteOpen(true);
                                    }}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Parent Account
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================== */}
        {/* TAB 3: STAFF & FACULTY ACCOUNTS (Strictly 11 Staff Roles) */}
        {/* ============================================================== */}
        <TabsContent value="staff" className="space-y-6 pt-4">
          <Card className="shadow-xs">
            <CardHeader className="py-3.5 px-4 border-b">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                    Faculty & Institutional Staff Directory ({staffMembers.length})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Govern credentials and access for Teachers, Principal, and all 9 operational departments
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-56">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search name, role, dept..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 text-xs h-9"
                    />
                  </div>

                  <Select value={staffRoleFilter} onValueChange={setStaffRoleFilter}>
                    <SelectTrigger className="w-[170px] h-9 text-xs">
                      <SelectValue placeholder="All Staff Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All 11 Staff Roles</SelectItem>
                      {STAFF_ROLES_LIST.map(r => (
                        <SelectItem key={r.id} value={r.id} className="text-xs">
                          {r.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button 
                    size="sm" 
                    onClick={() => setAddStaffOpen(true)}
                    className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" /> New Staff
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredStaff.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No staff accounts found matching the filter criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 border-b text-muted-foreground text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-4 text-left font-semibold">Staff Member</th>
                        <th className="py-2.5 px-4 text-left font-semibold">Assigned Role</th>
                        <th className="py-2.5 px-4 text-left font-semibold">Assigned Classes / Desk</th>
                        <th className="py-2.5 px-4 text-left font-semibold">Email & Mobile</th>
                        <th className="py-2.5 px-4 text-left font-semibold">Status</th>
                        <th className="py-2.5 px-right font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredStaff.map((staff) => {
                        const online = isUserOnline(staff.id);
                        return (
                          <tr key={staff.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                                <span className="font-semibold text-foreground">{staff.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {getRoleBadge(staff.role)}
                            </td>
                            <td className="py-3 px-4">
                              {staff.role === 'teacher' ? (
                                <div className="space-y-1">
                                  {staff.assigned_classes && staff.assigned_classes.length > 0 ? (
                                    <div className="flex flex-wrap items-center gap-1">
                                      <Badge className="bg-blue-600 text-white text-[10px] py-0 px-1.5 font-bold">
                                        {staff.assigned_classes.length} {staff.assigned_classes.length === 1 ? 'Class' : 'Classes'}
                                      </Badge>
                                      <span 
                                        className="text-[11px] text-slate-700 font-medium truncate max-w-[210px] block" 
                                        title={staff.assigned_classes.join('\n')}
                                      >
                                        {staff.assigned_classes[0]}
                                        {staff.assigned_classes.length > 1 && ` (+${staff.assigned_classes.length - 1} more)`}
                                      </span>
                                    </div>
                                  ) : (
                                    <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 text-[10px] py-0">
                                      No Classes Assigned
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-foreground font-medium text-xs">
                                  {STAFF_ROLES_LIST.find(r => r.id === staff.role)?.title.split('/')[0] || staff.department || 'Administration'}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <span className="text-foreground block truncate max-w-[180px]">{staff.email}</span>
                                {staff.phone && <span className="text-[10px] text-muted-foreground">{staff.phone}</span>}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge 
                                variant={staff.status === 'active' ? 'default' : 'secondary'}
                                className={`text-[10px] ${staff.status === 'active' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-800'}`}
                              >
                                {staff.status === 'active' ? 'Active' : 'Suspended'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52 text-xs">
                                  {staff.role === 'teacher' && (
                                    <DropdownMenuItem 
                                      onClick={() => {
                                        setSelectedUser(staff);
                                        setEditFormData({
                                          name: staff.name,
                                          phone: staff.phone || '',
                                          department: staff.department || '',
                                          class_name: staff.class_name || '',
                                        });
                                        setEditAssignedClasses(staff.assigned_classes || (staff.preferences?.assigned_classes || []));
                                        setEditOpen(true);
                                      }}
                                    >
                                      <BookOpen className="h-3.5 w-3.5 mr-2 text-blue-600" /> Manage Assigned Classes
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedUser(staff);
                                      setNewPassword('');
                                      setResetOpen(true);
                                    }}
                                  >
                                    <KeyRound className="h-3.5 w-3.5 mr-2 text-blue-600" /> Reset Password
                                  </DropdownMenuItem>

                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedUser(staff);
                                      setEditFormData({
                                        name: staff.name,
                                        phone: staff.phone || '',
                                        department: staff.department || '',
                                        class_name: staff.class_name || '',
                                      });
                                      setEditAssignedClasses(staff.assigned_classes || (staff.preferences?.assigned_classes || []));
                                      setEditOpen(true);
                                    }}
                                  >
                                    <Edit className="h-3.5 w-3.5 mr-2" /> Edit Details
                                  </DropdownMenuItem>

                                  <DropdownMenuItem onClick={() => handleToggleStatus(staff)}>
                                    {staff.status === 'active' ? (
                                      <>
                                        <UserX className="h-3.5 w-3.5 mr-2 text-amber-600" /> Suspend Staff Account
                                      </>
                                    ) : (
                                      <>
                                        <UserCheck className="h-3.5 w-3.5 mr-2 text-emerald-600" /> Activate Staff Account
                                      </>
                                    )}
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedUser(staff);
                                      setDeleteOpen(true);
                                    }}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Staff Profile
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============================================================== */}
      {/* DIALOG 1: PROVISION STUDENT PORTAL LOGIN */}
      {/* ============================================================== */}
      <Dialog open={provisionStudentOpen} onOpenChange={setProvisionStudentOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-emerald-600" />
              Provision Student Portal Login
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure credentials for approved candidate. The manually assigned Student ID is permanently bound to this account.
            </DialogDescription>
          </DialogHeader>

          {selectedUnprovisionedStudent && (
            <div className="space-y-4 pt-2">
              {/* STUDENT ID DISPLAY (READ-ONLY) */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Permanent Student ID (Locked to Admission Entry)
                </span>
                <p className="font-mono text-base font-bold text-foreground">
                  {selectedUnprovisionedStudent.student_id || selectedUnprovisionedStudent.application_number}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Candidate: <strong>{selectedUnprovisionedStudent.name}</strong> • {selectedUnprovisionedStudent.department}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Student Portal Username / Email *</Label>
                <Input
                  type="email"
                  value={studentProvisionForm.email}
                  onChange={(e) => setStudentProvisionForm({ ...studentProvisionForm, email: e.target.value })}
                  placeholder="student@gmail.com"
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Initial Temporary Password *</Label>
                <Input
                  type="text"
                  value={studentProvisionForm.password}
                  onChange={(e) => setStudentProvisionForm({ ...studentProvisionForm, password: e.target.value })}
                  className="font-mono text-xs"
                  required
                  minLength={6}
                />
                <p className="text-[11px] text-muted-foreground">
                  Minimum 6 characters. Safely hashed in Supabase Auth.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Mobile Phone (Optional)</Label>
                <Input
                  value={studentProvisionForm.phone}
                  onChange={(e) => setStudentProvisionForm({ ...studentProvisionForm, phone: e.target.value })}
                  placeholder="9876543210"
                  className="text-xs"
                />
              </div>

              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg text-[11px] text-blue-900 dark:text-blue-200 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>
                  Provisioning activates the student's timetable, attendance tracker, and connects their fee account.
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setProvisionStudentOpen(false)}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleProvisionStudent}
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
              Activate Portal Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* DIALOG 2: CREATE & LINK PARENT ACCOUNT */}
      {/* ============================================================== */}
      <Dialog open={provisionParentOpen} onOpenChange={setProvisionParentOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Create & Link Parent Portal Account
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provisions a dedicated Parent login account and links it to the selected enrolled student.
            </DialogDescription>
          </DialogHeader>

          {selectedStudentForParent && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl space-y-1 text-xs">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Linked Student
                </span>
                <p className="font-semibold text-foreground">
                  {selectedStudentForParent.name} (ID: {selectedStudentForParent.student_id || selectedStudentForParent.roll_number})
                </p>
                <p className="text-[11px] text-muted-foreground">{selectedStudentForParent.department}</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Parent / Guardian Full Name *</Label>
                <Input
                  value={parentProvisionForm.name}
                  onChange={(e) => setParentProvisionForm({ ...parentProvisionForm, name: e.target.value })}
                  placeholder="e.g. S. Kumaravel"
                  className="text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Relationship</Label>
                  <Select
                    value={parentProvisionForm.relationship}
                    onValueChange={(val) => setParentProvisionForm({ ...parentProvisionForm, relationship: val })}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Father">Father</SelectItem>
                      <SelectItem value="Mother">Mother</SelectItem>
                      <SelectItem value="Legal Guardian">Legal Guardian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Mobile Phone</Label>
                  <Input
                    value={parentProvisionForm.phone}
                    onChange={(e) => setParentProvisionForm({ ...parentProvisionForm, phone: e.target.value })}
                    placeholder="9876543210"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Parent Login Username / Email *</Label>
                <Input
                  type="email"
                  value={parentProvisionForm.email}
                  onChange={(e) => setParentProvisionForm({ ...parentProvisionForm, email: e.target.value })}
                  placeholder="parent@example.com"
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Initial Password *</Label>
                <Input
                  type="text"
                  value={parentProvisionForm.password}
                  onChange={(e) => setParentProvisionForm({ ...parentProvisionForm, password: e.target.value })}
                  className="font-mono text-xs"
                  required
                  minLength={6}
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setProvisionParentOpen(false)}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleProvisionParent}
              disabled={actionLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <UserPlus className="h-3.5 w-3.5 mr-1" />}
              Create & Link Parent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* DIALOG 3: LINK TO EXISTING PARENT PROFILE (SIBLINGS) */}
      {/* ============================================================== */}
      <Dialog open={linkExistingParentOpen} onOpenChange={setLinkExistingParentOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-blue-600" />
              Link Sibling to Existing Parent
            </DialogTitle>
            <DialogDescription className="text-xs">
              Link this enrolled student under an existing parent's account for multi-child monitoring.
            </DialogDescription>
          </DialogHeader>

          {selectedStudentForParent && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-muted/40 rounded-xl space-y-1 text-xs">
                <span className="font-semibold block">Student to be Linked:</span>
                <span className="font-bold text-foreground">
                  {selectedStudentForParent.name} (ID: {selectedStudentForParent.student_id || selectedStudentForParent.roll_number})
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select Existing Registered Parent Account *</Label>
                <Select value={selectedExistingParentId} onValueChange={setSelectedExistingParentId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Choose parent account..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {parentAccounts.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name} • {p.email} {p.phone ? `(${p.phone})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Relationship</Label>
                <Select value={existingParentRelationship} onValueChange={setExistingParentRelationship}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Father">Father</SelectItem>
                    <SelectItem value="Mother">Mother</SelectItem>
                    <SelectItem value="Legal Guardian">Legal Guardian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setLinkExistingParentOpen(false)}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleLinkExistingParent}
              disabled={actionLoading || !selectedExistingParentId}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <LinkIcon className="h-3.5 w-3.5 mr-1" />}
              Establish Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* DIALOG 4: ADD STAFF MEMBER (Strictly Staff Roles) */}
      {/* ============================================================== */}
      <Dialog open={addStaffOpen} onOpenChange={setAddStaffOpen}>
        <DialogContent className={`${staffFormData.role === 'teacher' ? 'max-w-2xl' : 'max-w-md'} p-6 max-h-[92vh] overflow-y-auto`}>
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Add Institutional Staff Member
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provision credentials for Teachers, Principal, and operational officers across the institution.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Institutional Role *</Label>
              <Select
                value={staffFormData.role}
                onValueChange={(val) => setStaffFormData({ ...staffFormData, role: val as UserRole })}
              >
                <SelectTrigger className="text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES_LIST.map(r => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      {r.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Full Name *</Label>
              <Input
                value={staffFormData.name}
                onChange={(e) => setStaffFormData({ ...staffFormData, name: e.target.value })}
                placeholder="e.g. Dr. K. Murugan"
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Official Email Address *</Label>
              <Input
                type="email"
                value={staffFormData.email}
                onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })}
                placeholder="staff@adithyan.edu.in"
                className="text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Mobile Phone</Label>
                <Input
                  value={staffFormData.phone}
                  onChange={(e) => setStaffFormData({ ...staffFormData, phone: e.target.value })}
                  placeholder="9876543210"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Initial Password *</Label>
                <Input
                  type="text"
                  value={staffFormData.password}
                  onChange={(e) => setStaffFormData({ ...staffFormData, password: e.target.value })}
                  className="font-mono text-xs"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {/* FOR TEACHER ROLE ONLY: Multi-Select Assign Classes Across 9 Courses */}
            {staffFormData.role === 'teacher' && (
              <div className="pt-1">
                <TeacherClassAssignmentSelector
                  selectedClasses={staffFormData.assigned_classes}
                  onChange={(classes) => setStaffFormData({ ...staffFormData, assigned_classes: classes })}
                  maxHeight="max-h-[300px]"
                />
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setAddStaffOpen(false)}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleCreateStaff}
              disabled={actionLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <UserPlus className="h-3.5 w-3.5 mr-1" />}
              Create Staff Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* DIALOG 5: EDIT USER PROFILE */}
      {/* ============================================================== */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className={`${selectedUser?.role === 'teacher' ? 'max-w-2xl' : 'max-w-md'} p-6 max-h-[92vh] overflow-y-auto`}>
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              Edit Profile Details {selectedUser ? `(${selectedUser.name})` : ''}
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Full Name</Label>
                <Input
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Mobile Phone</Label>
                <Input
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="text-xs"
                />
              </div>

              {/* For Students: Program & Class */}
              {selectedUser.role === 'student' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Department / Program</Label>
                    <Input
                      value={editFormData.department}
                      onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Class / Semester</Label>
                    <Input
                      value={editFormData.class_name}
                      onChange={(e) => setEditFormData({ ...editFormData, class_name: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                </div>
              )}

              {/* FOR TEACHER ROLE ONLY: Edit Class Assignments Across 9 Courses */}
              {selectedUser.role === 'teacher' && (
                <div className="pt-2">
                  <TeacherClassAssignmentSelector
                    selectedClasses={editAssignedClasses}
                    onChange={setEditAssignedClasses}
                    maxHeight="max-h-[300px]"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleEditUser}
              disabled={actionLoading}
              className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* DIALOG 6: RESET PASSWORD */}
      {/* ============================================================== */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-600" />
              Reset Account Password
            </DialogTitle>
            <DialogDescription className="text-xs">
              Set a new secure password for {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">New Password (Min 6 Characters) *</Label>
              <Input
                type="text"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="font-mono text-xs"
                minLength={6}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleResetPassword}
              disabled={actionLoading || !newPassword || newPassword.length < 6}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* DIALOG 7: DELETE USER CONFIRMATION */}
      {/* ============================================================== */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Confirm Profile Deletion
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete the user profile for <strong>{selectedUser?.name}</strong> ({selectedUser?.email})?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-destructive/10 rounded-lg text-destructive text-xs">
            This will remove their profile and authentication credentials permanently.
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              size="sm" 
              onClick={handleDeleteUser}
              disabled={actionLoading}
              className="font-semibold text-xs"
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Delete Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* DIALOG 8: MANAGE PARENT LINKS */}
      {/* ============================================================== */}
      <Dialog open={manageLinksOpen} onOpenChange={setManageLinksOpen}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-blue-600" />
              Manage Linked Students
            </DialogTitle>
            <DialogDescription className="text-xs">
              Parent: <strong>{activeParentForLinks?.name}</strong> ({activeParentForLinks?.email})
            </DialogDescription>
          </DialogHeader>

          {activeParentForLinks && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Currently Linked Children
                </h4>
                {getLinkedChildrenForParent(activeParentForLinks.id).length === 0 ? (
                  <p className="text-xs text-muted-foreground italic p-2 bg-muted/40 rounded-lg">
                    No children linked to this parent account.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {getLinkedChildrenForParent(activeParentForLinks.id).map(child => (
                      <div key={child.linkId} className="flex items-center justify-between p-2.5 rounded-lg border bg-card text-xs">
                        <div>
                          <span className="font-semibold text-foreground block">{child.studentName}</span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            ID: {child.studentManualId} • {child.relationship}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUnlinkChild(child.linkId, activeParentForLinks.id, child.studentId)}
                          className="h-7 text-xs text-destructive hover:text-destructive"
                        >
                          <Unlink className="h-3.5 w-3.5 mr-1" /> Unlink
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add another child */}
              <div className="border-t pt-3 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Link Another Enrolled Student
                </h4>
                <div className="flex gap-2">
                  <Select value={childToLinkProfileId} onValueChange={setChildToLinkProfileId}>
                    <SelectTrigger className="text-xs flex-1">
                      <SelectValue placeholder="Select student..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-52">
                      {enrolledStudents.map(s => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.name} ({s.student_id || s.roll_number}) • {s.department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    disabled={!childToLinkProfileId}
                    onClick={async () => {
                      if (!childToLinkProfileId) return;
                      try {
                        await adminUserService.linkParentStudent(activeParentForLinks.id, childToLinkProfileId, 'Child');
                        toast({ title: "Child Linked", description: "Successfully linked student to parent." });
                        setChildToLinkProfileId('');
                        loadAllData();
                      } catch (err: any) {
                        toast({ title: "Linking Failed", description: err.message, variant: "destructive" });
                      }
                    }}
                    className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Add Child
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button size="sm" variant="outline" onClick={() => setManageLinksOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
