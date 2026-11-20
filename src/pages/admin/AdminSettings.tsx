import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { 
  Building2, 
  GraduationCap, 
  Bell, 
  ShieldAlert, 
  Save, 
  CheckCircle2,
  Loader2
} from 'lucide-react';

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [institutionName, setInstitutionName] = useState('Adithyan College');
  const [institutionCode, setInstitutionCode] = useState('ADITHYAN-2026');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [contactEmail, setContactEmail] = useState('admin@adithyan.edu.in');
  const [contactPhone, setContactPhone] = useState('+91 98765 43210');
  const [address, setAddress] = useState('Adithyan College Campus, Coimbatore, Tamil Nadu, India');
  const [minAttendance, setMinAttendance] = useState('75');
  const [passingMark, setPassingMark] = useState('40');
  
  const [enableRealtime, setEnableRealtime] = useState(true);
  const [enableEmailAlerts, setEnableEmailAlerts] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const data = await db.getInstitutionalSettings();
      if (data) {
        if (data.institution_name) setInstitutionName(data.institution_name);
        if (data.institution_code) setInstitutionCode(data.institution_code);
        if (data.academic_year) setAcademicYear(data.academic_year);
        if (data.contact_email) setContactEmail(data.contact_email);
        if (data.contact_phone) setContactPhone(data.contact_phone);
        if (data.address) setAddress(data.address);
        if (data.min_attendance_percentage !== undefined) setMinAttendance(String(data.min_attendance_percentage));
        if (data.passing_marks_percentage !== undefined) setPassingMark(String(data.passing_marks_percentage));
        if (data.enable_realtime !== undefined) setEnableRealtime(data.enable_realtime);
        if (data.enable_email_alerts !== undefined) setEnableEmailAlerts(data.enable_email_alerts);
        if (data.maintenance_mode !== undefined) setMaintenanceMode(data.maintenance_mode);
      }
    } catch (err) {
      console.error('Failed to load institutional settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useRealtimeSubscription({ table: 'institutional_settings', onChange: loadSettings, onReconnect: loadSettings });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await db.updateInstitutionalSettings({
        institution_name: institutionName.trim(),
        institution_code: institutionCode.trim(),
        academic_year: academicYear.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        address: address.trim(),
        min_attendance_percentage: parseFloat(minAttendance) || 75,
        passing_marks_percentage: parseFloat(passingMark) || 40,
        enable_realtime: enableRealtime,
        enable_email_alerts: enableEmailAlerts,
        maintenance_mode: maintenanceMode,
      });

      if (success) {
        toast({
          title: "Settings Saved Successfully",
          description: "Institutional configurations and security parameters have been updated in Supabase.",
        });
      } else {
        toast({
          title: "Save Failed",
          description: "Could not persist settings to Supabase. Check database permissions.",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      toast({
        title: "Error Saving Settings",
        description: err.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Institutional Settings</h1>
          <p className="text-muted-foreground">
            Configure college profile, academic thresholds, realtime engine rules, and access controls
          </p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary/90 flex items-center gap-2"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Saving to Database...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs defaultValue="institution" className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          <TabsTrigger value="institution" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Institution Profile
          </TabsTrigger>
          <TabsTrigger value="academic" className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" /> Academic Rules
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" /> Notifications & Sync
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> Security & Access
          </TabsTrigger>
        </TabsList>

        <TabsContent value="institution">
          <Card>
            <CardHeader>
              <CardTitle>College Identity & Contact Details</CardTitle>
              <CardDescription>Official college credentials displayed on reports and receipts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="inst-name">Institution Name</Label>
                  <Input 
                    id="inst-name" 
                    value={institutionName} 
                    onChange={(e) => setInstitutionName(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inst-code">Accreditation / College Code</Label>
                  <Input 
                    id="inst-code" 
                    value={institutionCode} 
                    onChange={(e) => setInstitutionCode(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="acad-year">Current Academic Year</Label>
                  <Input 
                    id="acad-year" 
                    value={academicYear} 
                    onChange={(e) => setAcademicYear(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Official Contact Email</Label>
                  <Input 
                    id="contact-email" 
                    type="email"
                    value={contactEmail} 
                    onChange={(e) => setContactEmail(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Contact Phone / Helpdesk</Label>
                  <Input 
                    id="contact-phone" 
                    value={contactPhone} 
                    onChange={(e) => setContactPhone(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inst-address">Campus Address</Label>
                  <Input 
                    id="inst-address" 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic">
          <Card>
            <CardHeader>
              <CardTitle>Academic Thresholds & Attendance Mandate</CardTitle>
              <CardDescription>Evaluation baselines and eligibility thresholds for examination hall tickets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="min-att">Minimum Attendance Required for Exams (%)</Label>
                  <Input 
                    id="min-att" 
                    type="number"
                    min="0"
                    max="100"
                    value={minAttendance} 
                    onChange={(e) => setMinAttendance(e.target.value)} 
                  />
                  <p className="text-xs text-muted-foreground">Students falling below this threshold will be flagged for hall ticket detention.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pass-mark">Minimum Passing Percentage (%)</Label>
                  <Input 
                    id="pass-mark" 
                    type="number"
                    min="0"
                    max="100"
                    value={passingMark} 
                    onChange={(e) => setPassingMark(e.target.value)} 
                  />
                  <p className="text-xs text-muted-foreground">Used as the minimum qualifying baseline in internal and semester assessments.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>System Sync & Communication Rules</CardTitle>
              <CardDescription>Manage automated dispatch for fee reminders, alerts, and live data telemetry</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <div className="font-medium text-sm">Supabase Realtime Synchronization</div>
                  <div className="text-xs text-muted-foreground">Broadcast live changes instantly to students, faculty, and administrative desks.</div>
                </div>
                <Switch 
                  checked={enableRealtime} 
                  onCheckedChange={setEnableRealtime} 
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <div className="font-medium text-sm">Automated Email & SMS Notifications</div>
                  <div className="text-xs text-muted-foreground">Dispatch immediate notifications for fee dues, exam dates, and attendance warnings.</div>
                </div>
                <Switch 
                  checked={enableEmailAlerts} 
                  onCheckedChange={setEnableEmailAlerts} 
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security & Access Control</CardTitle>
              <CardDescription>System access restrictions and maintenance switches</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <div className="font-medium text-sm">Maintenance Mode</div>
                  <div className="text-xs text-muted-foreground">Temporarily restrict student and parent logins while database migrations are deployed.</div>
                </div>
                <Switch 
                  checked={maintenanceMode} 
                  onCheckedChange={setMaintenanceMode} 
                />
              </div>

              <div className="p-4 border rounded-lg bg-muted/40 space-y-2">
                <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Role-Based Access Control (RBAC) Enforced
                </div>
                <p className="text-xs text-muted-foreground">
                  Granular PostgreSQL Row Level Security (RLS) is currently active across all tables in project ogbbyqxulhegwvrtinib.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
