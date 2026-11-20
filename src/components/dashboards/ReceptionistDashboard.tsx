import { useState, useEffect, useCallback } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Users, 
  Calendar, 
  MessageSquare, 
  Bell, 
  CheckCircle, 
  Clock, 
  Loader2,
  Plus,
  Search,
  UserCheck,
  UserPlus,
  Phone,
  LogOut,
  GraduationCap,
  Filter,
  FileCheck2,
  Mail
} from 'lucide-react';
import { db } from '@/services/supabase/database';
import { supabase } from '@/lib/supabase';
import { ReceptionVisitor, ReceptionAppointment, ReceptionEnquiry, CalendarEvent, Profile, AdmissionApplication } from '@/types/database.types';
import { useToast } from '@/hooks/use-toast';
import { ComprehensiveAdmissionDialog } from '@/components/admission/ComprehensiveAdmissionDialog';
import { ComprehensiveStudentSearchDialog } from '@/components/reception/ComprehensiveStudentSearchDialog';
import { ParentAccountManagementDialog } from '@/components/parent/ParentAccountManagementDialog';
import { OFFICIAL_COURSES } from '@/constants/courses';

const ALL_ROLES_LIST = [
  { id: 'student', label: 'Students' },
  { id: 'parent', label: 'Parents' },
  { id: 'teacher', label: 'Teachers' },
  { id: 'admin', label: 'Admins' },
  { id: 'principal', label: 'Principal & Deans' },
  { id: 'finance_manager', label: 'Finance Team' },
  { id: 'store_manager', label: 'Store Keepers' },
  { id: 'transport_driver', label: 'Transport Drivers' },
  { id: 'librarian', label: 'Librarians' },
  { id: 'hostel_warden', label: 'Hostel Wardens' },
  { id: 'placement_officer', label: 'Placement Officers' }
];

export default function ReceptionistDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [visitors, setVisitors] = useState<ReceptionVisitor[]>([]);
  const [appointments, setAppointments] = useState<ReceptionAppointment[]>([]);
  const [enquiries, setEnquiries] = useState<ReceptionEnquiry[]>([]);
  const [notices, setNotices] = useState<CalendarEvent[]>([]);
  const [staffUsers, setStaffUsers] = useState<Profile[]>([]);
  const [admissions, setAdmissions] = useState<AdmissionApplication[]>([]);

  // Admission Table Search & Filter States
  const [admissionSearch, setAdmissionSearch] = useState('');
  const [admissionFilter, setAdmissionFilter] = useState<'today' | 'all'>('today');
  const [admissionStatusFilter, setAdmissionStatusFilter] = useState<string>('all');

  // Dialog States
  const [visitorDialogOpen, setVisitorDialogOpen] = useState(false);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [enquiryDialogOpen, setEnquiryDialogOpen] = useState(false);
  const [noticeDialogOpen, setNoticeDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [admissionDialogOpen, setAdmissionDialogOpen] = useState(false);
  const [admissionInitialData, setAdmissionInitialData] = useState<{
    studentName?: string;
    studentEmail?: string;
    studentPhone?: string;
    parentName?: string;
    parentPhone?: string;
    parentEmail?: string;
    course?: string;
  } | null>(null);
  const [parentLinkingDialogOpen, setParentLinkingDialogOpen] = useState(false);
  const [updateVisitorDialogOpen, setUpdateVisitorDialogOpen] = useState(false);
  const [respondEnquiryDialogOpen, setRespondEnquiryDialogOpen] = useState(false);

  // Form states
  const [selectedVisitor, setSelectedVisitor] = useState<ReceptionVisitor | null>(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState<ReceptionEnquiry | null>(null);

  const [newVisitor, setNewVisitor] = useState({
    name: '',
    purpose: '',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'checked_in' as 'checked_in' | 'waiting' | 'completed' | 'pending',
    contact: '',
    host_person: '',
    badge_number: ''
  });

  const [newAppointment, setNewAppointment] = useState({
    person: '',
    with_whom: '',
    with_user_id: '',
    contact: '',
    time: '10:00 AM',
    type: 'meeting' as 'meeting' | 'interview' | 'business' | 'counseling',
    status: 'scheduled' as 'scheduled' | 'in_progress' | 'completed' | 'cancelled',
    notes: ''
  });

  const [newEnquiry, setNewEnquiry] = useState({
    type: 'Admission',
    parent_name: '',
    contact: '',
    email: '',
    grade: OFFICIAL_COURSES[0].name,
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'pending' as 'pending' | 'in_progress' | 'resolved',
    notes: ''
  });

  const [newNotice, setNewNotice] = useState({
    title: '',
    description: '',
    category: 'meeting' as any,
    priority: 'medium' as any
  });
  const [targetRoles, setTargetRoles] = useState<string[]>(['student', 'parent', 'teacher']);
  const [selectedIndividualUserIds, setSelectedIndividualUserIds] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);

  // Load All Active Staff (Excluding Student and Parent)
  const loadStaffUsers = useCallback(async () => {
    try {
      const allProfiles = await db.getAllProfiles();
      const staffOnly = allProfiles.filter(p => p.role !== 'student' && p.role !== 'parent');
      setStaffUsers(staffOnly);
    } catch (err) {
      console.warn('Failed to load active staff users:', err);
    }
  }, []);

  const loadReceptionData = useCallback(async () => {
    try {
      const [visData, appData, enqData, eventsData, admissionApps] = await Promise.all([
        db.getReceptionVisitors(),
        db.getReceptionAppointments(),
        db.getReceptionEnquiries(),
        db.getCalendarEvents(),
        db.getAdmissionApplications()
      ]);
      setVisitors(visData || []);
      setAppointments(appData || []);
      setEnquiries(enqData || []);
      setNotices(eventsData || []);
      setAdmissions(admissionApps || []);
    } catch (err) {
      console.error('Failed to load reception data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReceptionData();
    loadStaffUsers();
  }, [loadReceptionData, loadStaffUsers]);

  // Real-time synchronization
  useRealtimeSubscription({ table: 'reception_visitors', onChange: loadReceptionData, onReconnect: loadReceptionData });
  useRealtimeSubscription({ table: 'reception_appointments', onChange: loadReceptionData, onReconnect: loadReceptionData });
  useRealtimeSubscription({ table: 'reception_enquiries', onChange: loadReceptionData, onReconnect: loadReceptionData });
  useRealtimeSubscription({ table: 'calendar_events', onChange: loadReceptionData, onReconnect: loadReceptionData });
  useRealtimeSubscription({ table: 'admission_applications', onChange: loadReceptionData, onReconnect: loadReceptionData });

  // Handle New Visitor Check-In
  const handleCheckInVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVisitor.name.trim() || !newVisitor.purpose.trim() || !newVisitor.contact.trim()) {
      toast({ title: 'Validation Error', description: 'Please fill in visitor name, purpose and contact number.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const created = await db.createReceptionVisitor({
        name: newVisitor.name.trim(),
        purpose: newVisitor.purpose.trim(),
        time: newVisitor.time,
        status: newVisitor.status,
        contact: newVisitor.contact.trim(),
        host_person: newVisitor.host_person.trim() || undefined,
        badge_number: newVisitor.badge_number.trim() || undefined
      });

      if (created) {
        toast({ title: 'Visitor Checked In', description: `${created.name} registered into reception log.` });
        setVisitorDialogOpen(false);
        setNewVisitor({
          name: '',
          purpose: '',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'checked_in',
          contact: '',
          host_person: '',
          badge_number: ''
        });
        loadReceptionData();
      } else {
        toast({ title: 'Failed', description: 'Unable to check in visitor.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Check-in failed.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Status Update / Check-Out for Visitor
  const handleUpdateVisitorStatus = async (status: ReceptionVisitor['status']) => {
    if (!selectedVisitor) return;
    setSubmitting(true);
    try {
      const isCheckingOut = status === 'completed';
      const ok = await db.updateReceptionVisitorStatus(selectedVisitor.id, status, {
        check_out_time: isCheckingOut ? new Date().toISOString() : undefined
      });
      if (ok) {
        toast({ 
          title: isCheckingOut ? 'Visitor Checked Out' : 'Status Updated', 
          description: isCheckingOut 
            ? `${selectedVisitor.name} has checked out successfully.`
            : `Visitor status changed to ${status.replace('_', ' ')}.` 
        });
        setUpdateVisitorDialogOpen(false);
        setSelectedVisitor(null);
        loadReceptionData();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Book Appointment
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppointment.person.trim() || !newAppointment.with_whom.trim()) {
      toast({ title: 'Validation Error', description: 'Please provide person name and select host staff.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const created = await db.createReceptionAppointment({
        person: newAppointment.person.trim(),
        with_whom: newAppointment.with_whom.trim(),
        with_user_id: newAppointment.with_user_id || undefined,
        contact: newAppointment.contact.trim() || undefined,
        time: newAppointment.time,
        type: newAppointment.type,
        status: newAppointment.status,
        notes: newAppointment.notes.trim() || undefined
      });

      if (created) {
        // Send notification to the host user if host user ID is bound
        if (newAppointment.with_user_id) {
          await supabase.from('notifications').insert({
            user_id: newAppointment.with_user_id,
            title: 'New Appointment Scheduled',
            message: `Official appointment scheduled with ${newAppointment.person} at ${newAppointment.time} (${newAppointment.type}).`,
            type: 'info',
            priority: 'medium',
            is_read: false
          });
        }

        toast({ 
          title: 'Appointment Booked', 
          description: `Appointment with ${created.with_whom} confirmed and host notified.` 
        });
        setAppointmentDialogOpen(false);
        setNewAppointment({
          person: '',
          with_whom: '',
          with_user_id: '',
          contact: '',
          time: '10:00 AM',
          type: 'meeting',
          status: 'scheduled',
          notes: ''
        });
        loadReceptionData();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Appointment Status Change / Host Notification
  const handleAppointmentNotify = async (appointment: ReceptionAppointment) => {
    try {
      const nextStatus = appointment.status === 'scheduled' ? 'in_progress' : 'completed';
      const ok = await db.updateReceptionAppointmentStatus(appointment.id, nextStatus);
      if (ok) {
        if (appointment.with_user_id) {
          await supabase.from('notifications').insert({
            user_id: appointment.with_user_id,
            title: `Appointment Update: ${nextStatus.replace('_', ' ').toUpperCase()}`,
            message: `Visitor ${appointment.person} status updated to ${nextStatus.replace('_', ' ')}.`,
            type: 'info',
            priority: 'high',
            is_read: false
          });
        }

        toast({ 
          title: 'Status Updated', 
          description: `Appointment status set to ${nextStatus.replace('_', ' ')}.` 
        });
        loadReceptionData();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // Handle New Enquiry (Notifies Admin and Principal/Dean)
  const handleCreateEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnquiry.parent_name.trim() || !newEnquiry.contact.trim()) {
      toast({ title: 'Validation Error', description: 'Please enter enquirer name and contact phone number.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const code = `ENQ${Date.now().toString().slice(-4)}`;
      const created = await db.createReceptionEnquiry({
        enquiry_code: code,
        type: newEnquiry.type,
        parent_name: newEnquiry.parent_name.trim(),
        grade: newEnquiry.grade.trim(),
        priority: newEnquiry.priority,
        status: 'pending',
        phone: newEnquiry.contact.trim(),
        email: newEnquiry.email.trim() || undefined,
        notes: newEnquiry.notes.trim() || undefined
      });

      if (created) {
        // Query Admin and Principal/Dean profiles
        const { data: adminPrincipalUsers } = await supabase
          .from('profiles')
          .select('id, name, role')
          .in('role', ['admin', 'principal']);

        if (adminPrincipalUsers && adminPrincipalUsers.length > 0) {
          const notificationsToInsert = adminPrincipalUsers.map(u => ({
            user_id: u.id,
            title: `New Front-Desk Enquiry: ${code}`,
            message: `${newEnquiry.type} enquiry logged from ${newEnquiry.parent_name} (📞 ${newEnquiry.contact}) for ${newEnquiry.grade}. Priority: ${newEnquiry.priority.toUpperCase()}.`,
            type: 'info' as const,
            priority: newEnquiry.priority as any,
            is_read: false
          }));

          await supabase.from('notifications').insert(notificationsToInsert);
        }

        toast({ 
          title: 'Enquiry Registered', 
          description: `Reference code ${code}. Admin and Principal/Dean have been notified.` 
        });
        setEnquiryDialogOpen(false);
        setNewEnquiry({
          type: 'Admission',
          parent_name: '',
          contact: '',
          email: '',
          grade: OFFICIAL_COURSES[0].name,
          priority: 'medium',
          status: 'pending',
          notes: ''
        });
        loadReceptionData();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Respond / Resolve Enquiry
  const handleUpdateEnquiryStatus = async (status: ReceptionEnquiry['status']) => {
    if (!selectedEnquiry) return;
    setSubmitting(true);
    try {
      const ok = await db.updateReceptionEnquiryStatus(selectedEnquiry.id, status);
      if (ok) {
        toast({ title: 'Enquiry Updated', description: `Status set to ${status.replace('_', ' ')}.` });
        setRespondEnquiryDialogOpen(false);
        setSelectedEnquiry(null);
        loadReceptionData();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertEnquiryToAdmission = (enquiry: ReceptionEnquiry) => {
    setAdmissionInitialData({
      studentName: enquiry.parent_name ? `${enquiry.parent_name}'s Ward` : '',
      parentName: enquiry.parent_name || '',
      parentPhone: enquiry.phone || '',
      parentEmail: enquiry.email || '',
      course: enquiry.grade || ''
    });
    setAdmissionDialogOpen(true);
  };

  // Handle Post Notice (Targeted Roles & Individual Recipients)
  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotice.title.trim()) {
      toast({ title: 'Validation Error', description: 'Please provide a notice title.', variant: 'destructive' });
      return;
    }
    if (targetRoles.length === 0 && selectedIndividualUserIds.length === 0) {
      toast({ title: 'Validation Error', description: 'Please select at least one recipient role or individual recipient.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      // 1. Post to campus notice calendar_events
      const created = await db.createCalendarEvent({
        title: newNotice.title,
        description: newNotice.description,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        category: newNotice.category,
        target_audience: targetRoles.length === 1 ? (targetRoles[0] as any) : 'all',
        priority: newNotice.priority,
        status: 'upcoming'
      });

      // 2. Query target recipients by selected roles
      const recipientIds = new Set<string>(selectedIndividualUserIds);
      if (targetRoles.length > 0) {
        const { data: roleUsers } = await supabase
          .from('profiles')
          .select('id')
          .in('role', targetRoles);

        if (roleUsers) {
          roleUsers.forEach(u => recipientIds.add(u.id));
        }
      }

      // 3. Batch insert notifications for targeted users only
      const recipientList = Array.from(recipientIds);
      if (recipientList.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < recipientList.length; i += chunkSize) {
          const chunk = recipientList.slice(i, i + chunkSize);
          const notifs = chunk.map(uid => ({
            user_id: uid,
            title: newNotice.title,
            message: newNotice.description || `Notice posted on front office board (${newNotice.category}).`,
            type: 'info' as const,
            priority: newNotice.priority as any,
            is_read: false
          }));
          await supabase.from('notifications').insert(notifs);
        }
      }

      if (created) {
        toast({ 
          title: 'Notice Published & Dispatched', 
          description: `Delivered notifications to ${recipientList.length} recipient${recipientList.length === 1 ? '' : 's'} across selected roles.` 
        });
        setNoticeDialogOpen(false);
        setNewNotice({
          title: '',
          description: '',
          category: 'meeting',
          priority: 'medium'
        });
        setTargetRoles(['student', 'parent', 'teacher']);
        setSelectedIndividualUserIds([]);
        loadReceptionData();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTargetRole = (roleId: string) => {
    setTargetRoles(prev => 
      prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]
    );
  };

  const toggleSelectAllRoles = () => {
    if (targetRoles.length === ALL_ROLES_LIST.length) {
      setTargetRoles([]);
    } else {
      setTargetRoles(ALL_ROLES_LIST.map(r => r.id));
    }
  };

  // Compute Real Supabase Statistics
  const todayStr = new Date().toISOString().split('T')[0];
  const todayVisitors = visitors.filter(v => v.created_at?.startsWith(todayStr) || (v as any).date === todayStr);
  const currentlyOnCampus = visitors.filter(v => v.status === 'checked_in').length;
  const pendingAppointments = appointments.filter(a => a.status === 'scheduled').length;
  const pendingEnquiries = enquiries.filter(e => e.status === 'pending').length;

  const todayAdmissions = admissions.filter(a => {
    const d = a.created_at ? a.created_at.split('T')[0] : (a.submission_date || '');
    return d === todayStr;
  });
  const todayAdmittedCount = todayAdmissions.filter(a => a.status === 'Approved' || (a.status as string) === 'Admitted').length;

  const visitorStats = [
    { 
      title: "Today's Admissions", 
      value: todayAdmissions.length.toString(), 
      icon: GraduationCap, 
      trend: `${todayAdmittedCount} admitted/approved today` 
    },
    { 
      title: "Today's Visitors", 
      value: todayVisitors.length.toString(), 
      icon: Users, 
      trend: `${currentlyOnCampus} currently on campus` 
    },
    { 
      title: 'Pending Appointments', 
      value: pendingAppointments.toString(), 
      icon: Calendar, 
      trend: `${appointments.length} total scheduled today` 
    },
    { 
      title: 'Enquiries Logged', 
      value: enquiries.length.toString(), 
      icon: MessageSquare, 
      trend: `${pendingEnquiries} pending response` 
    },
    { 
      title: 'Active Notices', 
      value: notices.length.toString(), 
      icon: Bell, 
      trend: 'Institutional notice board' 
    }
  ];

  // Filtered Admissions List for the table
  const displayedAdmissions = admissions.filter(app => {
    // Date filter
    if (admissionFilter === 'today') {
      const d = app.created_at ? app.created_at.split('T')[0] : (app.submission_date || '');
      if (d !== todayStr) return false;
    }

    // Status filter
    if (admissionStatusFilter !== 'all') {
      const st = (app.status || '').toLowerCase();
      if (admissionStatusFilter === 'admitted' && !st.includes('admitted') && !st.includes('approved')) return false;
      if (admissionStatusFilter === 'pending' && !st.includes('pending') && !st.includes('review') && !st.includes('submitted')) return false;
      if (admissionStatusFilter === 'rejected' && !st.includes('reject')) return false;
    }

    // Search term
    if (admissionSearch.trim()) {
      const q = admissionSearch.toLowerCase().trim();
      const nameMatch = (app.name || (app as any).student_name || '').toLowerCase().includes(q);
      const idMatch = (app.roll_number || (app as any).student_id || app.id || '').toLowerCase().includes(q);
      const courseMatch = (app.class_applied || app.class_name || (app as any).course || '').toLowerCase().includes(q);
      const phoneMatch = (app.phone || (app as any).contact || '').includes(q);
      return nameMatch || idMatch || courseMatch || phoneMatch;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Reception Hub</h1>
            {/* Check-in Visitor moved directly next to the title */}
            <Button size="sm" onClick={() => setVisitorDialogOpen(true)} className="gap-1.5 shadow-sm">
              <UserCheck className="h-4 w-4" />
              Check-in Visitor
            </Button>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Front office management, visitor services & enquiry tracker
          </p>
        </div>

        {/* Action Buttons: Parent Accounts replaced by Admission button */}
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            size="sm" 
            onClick={() => setAdmissionDialogOpen(true)} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Admission
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSearchDialogOpen(true)}>
            <Search className="h-4 w-4 mr-2" />
            Student Search
          </Button>
          <Button variant="outline" size="sm" onClick={() => setParentLinkingDialogOpen(true)}>
            <Users className="h-4 w-4 mr-2 text-blue-600" />
            Parent Linking
          </Button>
          <Button variant="outline" size="sm" onClick={() => setNoticeDialogOpen(true)}>
            <Bell className="h-4 w-4 mr-2" />
            Post Notice
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEnquiryDialogOpen(true)}>
            <MessageSquare className="h-4 w-4 mr-2" />
            New Enquiry
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAppointmentDialogOpen(true)}>
            <Calendar className="h-4 w-4 mr-2" />
            Book Appointment
          </Button>
        </div>
      </div>

      {/* Real Supabase Database Statistics */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        {visitorStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="shadow-2xs border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold text-slate-600">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-slate-900">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stat.value}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {stat.trend}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Visitor Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Visitor Check-in/out Log
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setVisitorDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Visitor
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {visitors.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No visitors logged today.
                <div className="mt-2">
                  <Button size="sm" variant="outline" onClick={() => setVisitorDialogOpen(true)}>
                    Check-in First Visitor
                  </Button>
                </div>
              </div>
            ) : (
              visitors.slice(0, 5).map((visitor) => (
                <div key={visitor.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1 pr-2">
                    <div className="font-medium flex items-center gap-2">
                      <span>{visitor.name}</span>
                      {visitor.badge_number && (
                        <Badge variant="outline" className="text-[10px] font-mono">
                          #{visitor.badge_number}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {visitor.purpose} • In: {visitor.time}
                      {visitor.check_out_time && (
                        <span className="text-emerald-700 font-medium ml-1">
                          • Out: {new Date(visitor.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {visitor.contact}
                      </span>
                      {visitor.host_person && (
                        <span>• Host: {visitor.host_person}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={
                        visitor.status === 'checked_in' ? 'default' :
                        visitor.status === 'waiting' ? 'secondary' :
                        visitor.status === 'completed' ? 'outline' : 'destructive'
                      }
                      className="capitalize text-xs"
                    >
                      {visitor.status === 'completed' ? 'Checked Out' : visitor.status.replace('_', ' ')}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedVisitor(visitor);
                        setUpdateVisitorDialogOpen(true);
                      }}
                    >
                      {visitor.status === 'checked_in' ? 'Check-out' : 'Update'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Today's Appointments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Scheduled Appointments
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setAppointmentDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Book
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {appointments.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No appointments scheduled today.
                <div className="mt-2">
                  <Button size="sm" variant="outline" onClick={() => setAppointmentDialogOpen(true)}>
                    Schedule Appointment
                  </Button>
                </div>
              </div>
            ) : (
              appointments.slice(0, 5).map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1 pr-2">
                    <div className="font-medium">{appointment.person}</div>
                    <div className="text-sm text-muted-foreground">
                      Host: {appointment.with_whom}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      Time: {appointment.time}
                      {appointment.contact && <span>• 📞 {appointment.contact}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize text-xs">
                      {appointment.type}
                    </Badge>
                    <Badge 
                      variant={appointment.status === 'completed' ? 'secondary' : 'default'}
                      className="capitalize text-xs"
                    >
                      {appointment.status.replace('_', ' ')}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleAppointmentNotify(appointment)}
                    >
                      {appointment.status === 'scheduled' ? 'Start' : 'Complete'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* TODAY'S ADMISSIONS & ENROLLED STUDENTS TABLE (Requirement 4) */}
      <Card className="shadow-2xs border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-2xs">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Admitted & Enrolled Students Desk
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Actual student admissions recorded in Supabase with verified course, date, and status details
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setAdmissionFilter('today')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    admissionFilter === 'today'
                      ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Today's Admissions ({todayAdmissions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAdmissionFilter('all')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    admissionFilter === 'all'
                      ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Records ({admissions.length})
                </button>
              </div>

              <Button
                size="sm"
                onClick={() => setAdmissionDialogOpen(true)}
                className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                New Admission
              </Button>
            </div>
          </div>

          {/* Search & Status Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5 pt-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={admissionSearch}
                onChange={(e) => setAdmissionSearch(e.target.value)}
                placeholder="Search by student name, roll number, course, or contact..."
                className="h-8 pl-8 text-xs bg-white border-slate-200"
              />
              {admissionSearch && (
                <button
                  type="button"
                  onClick={() => setAdmissionSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ×
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500">Status:</span>
              <select
                value={admissionStatusFilter}
                onChange={(e) => setAdmissionStatusFilter(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 font-medium focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">All Statuses</option>
                <option value="admitted">Admitted / Approved</option>
                <option value="pending">Pending / Under Review</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {displayedAdmissions.length === 0 ? (
            <div className="text-center py-12 px-4 text-xs text-slate-500 space-y-2">
              <GraduationCap className="w-9 h-9 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-700 text-sm">
                {admissionFilter === 'today' ? "No Admissions Recorded Today" : "No Admission Records Found"}
              </p>
              <p className="max-w-md mx-auto text-slate-500">
                {admissionFilter === 'today'
                  ? "There are no student admission applications logged for today. Click 'New Admission' to register candidates with real Supabase data."
                  : "No admissions match your search or filter criteria."}
              </p>
              <div className="pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAdmissionDialogOpen(true)}
                  className="h-8 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                >
                  <Plus className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Register Candidate
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Student / Roll ID</th>
                    <th className="py-2.5 px-3">Enrolled Course</th>
                    <th className="py-2.5 px-3">Admission Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Contact Details</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedAdmissions.map((adm) => {
                    const studentName = adm.name || (adm as any).student_name || 'Unnamed Student';
                    const rollId = adm.roll_number || (adm as any).student_id || adm.id?.slice(0, 8);
                    const courseName = adm.class_applied || adm.class_name || (adm as any).course || 'Paramedical Sciences';
                    const admDateRaw = adm.created_at || adm.submission_date || '';
                    const admDateFormatted = admDateRaw ? new Date(admDateRaw).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    }) : 'Today';

                    const rawStatus = (adm.status || 'Pending').toLowerCase();
                    const isAdmitted = rawStatus === 'approved' || rawStatus === 'admitted';
                    const isPending = rawStatus === 'pending' || rawStatus === 'under review' || rawStatus === 'submitted';
                    const isRejected = rawStatus === 'rejected';

                    return (
                      <tr key={adm.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                              {studentName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-900 block">{studentName}</span>
                              <span className="text-[10px] text-slate-500">{adm.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                            {rollId}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-slate-800 block">{courseName}</span>
                          {(adm as any).academic_year && (
                            <span className="text-[10px] text-slate-500">{(adm as any).academic_year}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                          {admDateFormatted}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge 
                            variant={isAdmitted ? "default" : isRejected ? "destructive" : "secondary"}
                            className={`text-[10px] font-semibold capitalize ${
                              isAdmitted ? "bg-emerald-600 text-white hover:bg-emerald-700" :
                              isPending ? "bg-amber-100 text-amber-800 border border-amber-200" : ""
                            }`}
                          >
                            {adm.status || 'Pending Review'}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-600">
                          {adm.phone ? (
                            <div className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{adm.phone}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-italic">No phone</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSearchDialogOpen(true)}
                            className="h-7 text-[11px] text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-semibold"
                          >
                            Lookup Profile
                          </Button>
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

      {/* Recent Enquiries & Follow-ups */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Recent Enquiries & Follow-ups
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={() => setEnquiryDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Enquiry
          </Button>
        </CardHeader>
        <CardContent>
          {enquiries.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No enquiries registered. Click New Enquiry to log admissions, fee or general enquiries.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {enquiries.map((enquiry) => (
                <div key={enquiry.id} className="p-4 border rounded-lg space-y-2 hover:border-primary/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-muted rounded">
                      {enquiry.enquiry_code}
                    </span>
                    <Badge 
                      variant={
                        enquiry.priority === 'high' ? 'destructive' :
                        enquiry.priority === 'medium' ? 'secondary' : 'outline'
                      }
                      className="capitalize text-xs"
                    >
                      {enquiry.priority}
                    </Badge>
                  </div>
                  <div className="font-medium text-sm">{enquiry.type}</div>
                  <div className="text-sm text-muted-foreground">
                    Enquirer: {enquiry.parent_name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    Course: {enquiry.grade}
                  </div>
                  {enquiry.phone && (
                    <div className="text-xs text-muted-foreground">
                      📞 {enquiry.phone}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t gap-1">
                    <Badge variant="outline" className="capitalize text-xs">
                      {enquiry.status.replace('_', ' ')}
                    </Badge>
                    <div className="flex items-center space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                        onClick={() => handleConvertEnquiryToAdmission(enquiry)}
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Convert
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-7 text-xs"
                        onClick={() => {
                          setSelectedEnquiry(enquiry);
                          setRespondEnquiryDialogOpen(true);
                        }}
                      >
                        Update
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check-in Visitor Dialog */}
      <Dialog open={visitorDialogOpen} onOpenChange={setVisitorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Visitor Check-in Registration</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCheckInVisitor} className="space-y-4">
            <div>
              <Label>Visitor Full Name *</Label>
              <Input
                placeholder="e.g. Mr. Rajesh Kumar"
                value={newVisitor.name}
                onChange={(e) => setNewVisitor({ ...newVisitor, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Purpose of Visit *</Label>
              <Input
                placeholder="e.g. Admission Enquiry, Fee Submission, Teacher Meeting"
                value={newVisitor.purpose}
                onChange={(e) => setNewVisitor({ ...newVisitor, purpose: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Number *</Label>
                <Input
                  placeholder="9876543210"
                  value={newVisitor.contact}
                  onChange={(e) => setNewVisitor({ ...newVisitor, contact: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Check-in Time</Label>
                <Input
                  value={newVisitor.time}
                  onChange={(e) => setNewVisitor({ ...newVisitor, time: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Meeting With (Staff / Dept)</Label>
                <Input
                  placeholder="e.g. Principal Office, MLT HOD"
                  value={newVisitor.host_person}
                  onChange={(e) => setNewVisitor({ ...newVisitor, host_person: e.target.value })}
                />
              </div>
              <div>
                <Label>Visitor Badge # (Optional)</Label>
                <Input
                  placeholder="e.g. V-102"
                  value={newVisitor.badge_number}
                  onChange={(e) => setNewVisitor({ ...newVisitor, badge_number: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setVisitorDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Complete Check-In
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Visitor Dialog (with Real Check-Out) */}
      <Dialog open={updateVisitorDialogOpen} onOpenChange={setUpdateVisitorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Visitor Status & Check-Out</DialogTitle>
          </DialogHeader>
          {selectedVisitor && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/40 rounded-lg space-y-1">
                <p className="font-semibold text-base">{selectedVisitor.name}</p>
                <p className="text-sm text-muted-foreground">{selectedVisitor.purpose} • Contact: {selectedVisitor.contact}</p>
                <p className="text-xs text-muted-foreground">In-Time: {selectedVisitor.time} • Current status: <span className="font-medium capitalize text-foreground">{selectedVisitor.status.replace('_', ' ')}</span></p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button 
                  variant="outline" 
                  disabled={submitting}
                  onClick={() => handleUpdateVisitorStatus('waiting')}
                >
                  Mark Waiting
                </Button>
                <Button 
                  variant="outline" 
                  disabled={submitting}
                  onClick={() => handleUpdateVisitorStatus('checked_in')}
                >
                  Mark Checked In
                </Button>
                <Button 
                  className="col-span-2 bg-green-600 hover:bg-green-700 text-white font-medium shadow"
                  disabled={submitting}
                  onClick={() => handleUpdateVisitorStatus('completed')}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Check-Out Visitor (Record Departure)
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Book Appointment Dialog (Dynamically listing all active users except Student and Parent) */}
      <Dialog open={appointmentDialogOpen} onOpenChange={setAppointmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Official Staff Appointment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBookAppointment} className="space-y-4">
            <div>
              <Label>Visitor / Person Name *</Label>
              <Input
                placeholder="e.g. Mr. Anil Sharma (Parent of STU-2026-1042)"
                value={newAppointment.person}
                onChange={(e) => setNewAppointment({ ...newAppointment, person: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Visitor Contact Phone</Label>
              <Input
                placeholder="9876543210"
                value={newAppointment.contact}
                onChange={(e) => setNewAppointment({ ...newAppointment, contact: e.target.value })}
              />
            </div>
            <div>
              <Label>Host Staff Member (Active Login Users) *</Label>
              <Select 
                value={newAppointment.with_user_id} 
                onValueChange={(userId: string) => {
                  const staff = staffUsers.find(u => u.id === userId);
                  setNewAppointment({
                    ...newAppointment,
                    with_user_id: userId,
                    with_whom: staff ? `${staff.name} (${staff.role.replace('_', ' ').toUpperCase()})` : ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member to meet..." />
                </SelectTrigger>
                <SelectContent className="max-h-[220px]">
                  {staffUsers.length === 0 ? (
                    <SelectItem value="none" disabled>Loading active staff...</SelectItem>
                  ) : (
                    staffUsers.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.name} — {staff.role.replace('_', ' ').toUpperCase()} {staff.department ? `(${staff.department})` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Scheduled Time</Label>
                <Input
                  placeholder="e.g. 11:30 AM"
                  value={newAppointment.time}
                  onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Appointment Type</Label>
                <Select 
                  value={newAppointment.type} 
                  onValueChange={(val: any) => setNewAppointment({ ...newAppointment, type: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meeting">Parent / Staff Meeting</SelectItem>
                    <SelectItem value="interview">Admission Interview</SelectItem>
                    <SelectItem value="business">Vendor / Institutional</SelectItem>
                    <SelectItem value="counseling">Student Welfare & Counseling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Meeting Notes / Subject</Label>
              <Textarea
                placeholder="Brief purpose of appointment..."
                value={newAppointment.notes}
                onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAppointmentDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirm & Notify Host
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Register Enquiry Dialog (Notifies Admin and Principal/Dean) */}
      <Dialog open={enquiryDialogOpen} onOpenChange={setEnquiryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register New Front-Desk Enquiry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateEnquiry} className="space-y-4">
            <div>
              <Label>Parent / Enquirer Name *</Label>
              <Input
                placeholder="e.g. Mrs. Sunita Verma"
                value={newEnquiry.parent_name}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, parent_name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Mobile Number *</Label>
                <Input
                  placeholder="9876543210"
                  value={newEnquiry.contact}
                  onChange={(e) => setNewEnquiry({ ...newEnquiry, contact: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Email (Optional)</Label>
                <Input
                  type="email"
                  placeholder="enquiry@gmail.com"
                  value={newEnquiry.email}
                  onChange={(e) => setNewEnquiry({ ...newEnquiry, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Target Course / Degree *</Label>
                <Select
                  value={newEnquiry.grade}
                  onValueChange={(val: string) => setNewEnquiry({ ...newEnquiry, grade: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Paramedical course..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[220px]">
                    {OFFICIAL_COURSES.map(c => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Enquiry Category</Label>
                <Select 
                  value={newEnquiry.type} 
                  onValueChange={(val: string) => setNewEnquiry({ ...newEnquiry, type: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admission">Admission Enquiry</SelectItem>
                    <SelectItem value="Fee Structure">Fee Structure & Installments</SelectItem>
                    <SelectItem value="Scholarship">Scholarship & Financial Aid</SelectItem>
                    <SelectItem value="Transport">Bus & Transit Route</SelectItem>
                    <SelectItem value="Hostel">Hostel & Accommodation</SelectItem>
                    <SelectItem value="General">General Campus Enquiry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Priority</Label>
              <Select 
                value={newEnquiry.priority} 
                onValueChange={(val: any) => setNewEnquiry({ ...newEnquiry, priority: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Standard</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High (Urgent Follow-up)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Enquiry Details / Query Notes</Label>
              <Textarea
                placeholder="Candidate background, cutoff marks, requirements..."
                value={newEnquiry.notes}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, notes: e.target.value })}
                rows={2}
              />
            </div>
            <p className="text-[11px] text-muted-foreground bg-blue-50 text-blue-700 p-2 rounded">
              ℹ️ Automatic live notifications will be dispatched to Admin and Principal/Dean consoles.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEnquiryDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save & Notify Leadership
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Enquiry Status Dialog */}
      <Dialog open={respondEnquiryDialogOpen} onOpenChange={setRespondEnquiryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Enquiry Status</DialogTitle>
          </DialogHeader>
          {selectedEnquiry && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/40 rounded-lg">
                <p className="font-semibold text-sm">{selectedEnquiry.enquiry_code} — {selectedEnquiry.type}</p>
                <p className="text-sm text-muted-foreground">Enquirer: {selectedEnquiry.parent_name} • Course: {selectedEnquiry.grade}</p>
                {selectedEnquiry.phone && <p className="text-xs text-muted-foreground">📞 {selectedEnquiry.phone}</p>}
                <p className="text-xs text-muted-foreground mt-1">Current status: <span className="font-medium capitalize text-foreground">{selectedEnquiry.status.replace('_', ' ')}</span></p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button 
                  variant="outline" 
                  disabled={submitting}
                  onClick={() => handleUpdateEnquiryStatus('in_progress')}
                >
                  Mark In Progress
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={submitting}
                  onClick={() => handleUpdateEnquiryStatus('resolved')}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark Resolved
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Post Notice Dialog (Multiple Role & Individual Selection) */}
      <Dialog open={noticeDialogOpen} onOpenChange={setNoticeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Post Notice & Targeted Notifications</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePostNotice} className="space-y-4">
            <div>
              <Label>Notice Title *</Label>
              <Input
                placeholder="e.g. Campus Holiday Notice, Admission Cut-off Announcement"
                value={newNotice.title}
                onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Notice Description *</Label>
              <Textarea
                placeholder="Enter details for targeted notification and board..."
                value={newNotice.description}
                onChange={(e) => setNewNotice({ ...newNotice, description: e.target.value })}
                rows={3}
                required
              />
            </div>

            {/* Target Roles Multi-Select */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Select Target Recipient Roles *</Label>
                <Button type="button" variant="ghost" size="sm" onClick={toggleSelectAllRoles} className="h-6 text-xs text-blue-600">
                  {targetRoles.length === ALL_ROLES_LIST.length ? 'Deselect All' : 'Select All Roles'}
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 p-2.5 border rounded-lg bg-slate-50">
                {ALL_ROLES_LIST.map((r) => {
                  const selected = targetRoles.includes(r.id);
                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => toggleTargetRole(r.id)}
                      className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                        selected 
                          ? 'bg-primary text-primary-foreground border-primary' 
                          : 'bg-white text-muted-foreground border-slate-200 hover:border-primary/50'
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Individual User Selection (Optional) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Specific Individual Staff Recipients (Optional)</Label>
              <Select
                onValueChange={(userId: string) => {
                  if (userId && !selectedIndividualUserIds.includes(userId)) {
                    setSelectedIndividualUserIds([...selectedIndividualUserIds, userId]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add specific individual staff to notice..." />
                </SelectTrigger>
                <SelectContent className="max-h-[180px]">
                  {staffUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} — {u.role.replace('_', ' ').toUpperCase()} {u.department ? `(${u.department})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Selected Individual Pills */}
              {selectedIndividualUserIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedIndividualUserIds.map((uid) => {
                    const u = staffUsers.find(su => su.id === uid);
                    return (
                      <Badge key={uid} variant="secondary" className="gap-1 pr-1 text-xs">
                        {u?.name || uid}
                        <button
                          type="button"
                          className="hover:text-destructive ml-1"
                          onClick={() => setSelectedIndividualUserIds(selectedIndividualUserIds.filter(id => id !== uid))}
                        >
                          ×
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Notice Category</Label>
                <Select 
                  value={newNotice.category} 
                  onValueChange={(val: any) => setNewNotice({ ...newNotice, category: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="academic">Academic Circular</SelectItem>
                    <SelectItem value="holiday">Holiday Announcement</SelectItem>
                    <SelectItem value="meeting">Staff Meeting</SelectItem>
                    <SelectItem value="exam">Examination Alert</SelectItem>
                    <SelectItem value="cultural">Campus Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select 
                  value={newNotice.priority} 
                  onValueChange={(val: any) => setNewNotice({ ...newNotice, priority: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Standard</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High Priority Alert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNoticeDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Publish & Dispatch Notifications
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Comprehensive Live Student Search Dialog */}
      <ComprehensiveStudentSearchDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
      />

      {/* Comprehensive Admission & Direct Onboarding Dialog */}
      <ComprehensiveAdmissionDialog
        open={admissionDialogOpen}
        onOpenChange={(open) => {
          setAdmissionDialogOpen(open);
          if (!open) setAdmissionInitialData(null);
        }}
        onSuccess={loadReceptionData}
        initialData={admissionInitialData}
      />

      {/* Parent Account Management & Student Linking Dialog */}
      <ParentAccountManagementDialog
        open={parentLinkingDialogOpen}
        onOpenChange={setParentLinkingDialogOpen}
        onSuccess={loadReceptionData}
      />
    </div>
  );
}
