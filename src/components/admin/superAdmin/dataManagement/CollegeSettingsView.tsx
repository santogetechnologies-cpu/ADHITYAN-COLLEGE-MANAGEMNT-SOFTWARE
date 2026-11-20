import React, { useState, useEffect } from 'react';
import { useCollege } from '@/context/CollegeContext';
import { collegeDataService } from '@/services/collegeDataService';
import { InstitutionalSettings } from '@/types/database.types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Settings2,
  Save,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  Globe,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Percent,
  Sliders,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export function CollegeSettingsView() {
  const { currentCollege } = useCollege();
  const [settings, setSettings] = useState<InstitutionalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    institution_name: '',
    institution_code: '',
    academic_year: '2026-2027',
    contact_email: '',
    contact_phone: '',
    address: '',
    min_attendance_percentage: 75,
    passing_marks_percentage: 40,
    enable_realtime: true,
    enable_email_alerts: true,
    maintenance_mode: false
  });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await collegeDataService.getCollegeSettings(currentCollege.id);
      setSettings(data);
      setFormData({
        institution_name: data.institution_name || currentCollege.name,
        institution_code: data.institution_code || currentCollege.code,
        academic_year: data.academic_year || '2026-2027',
        contact_email: data.contact_email || currentCollege.contact_email || '',
        contact_phone: data.contact_phone || currentCollege.contact_phone || '',
        address: data.address || currentCollege.address || '',
        min_attendance_percentage: data.min_attendance_percentage || 75,
        passing_marks_percentage: data.passing_marks_percentage || 40,
        enable_realtime: data.enable_realtime ?? true,
        enable_email_alerts: data.enable_email_alerts ?? true,
        maintenance_mode: data.maintenance_mode ?? false
      });
    } catch (err) {
      console.warn('Failed to load college settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [currentCollege.id]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.institution_name.trim() || !formData.institution_code.trim()) {
      toast.error('Institution name and code are mandatory.');
      return;
    }

    setSaving(true);
    try {
      const updated = await collegeDataService.updateCollegeSettings(
        {
          institution_name: formData.institution_name.trim(),
          institution_code: formData.institution_code.trim().toUpperCase(),
          academic_year: formData.academic_year.trim(),
          contact_email: formData.contact_email.trim(),
          contact_phone: formData.contact_phone.trim(),
          address: formData.address.trim(),
          min_attendance_percentage: Number(formData.min_attendance_percentage) || 75,
          passing_marks_percentage: Number(formData.passing_marks_percentage) || 40,
          enable_realtime: formData.enable_realtime,
          enable_email_alerts: formData.enable_email_alerts,
          maintenance_mode: formData.maintenance_mode
        },
        currentCollege.id
      );

      setSettings(updated);
      toast.success('Institutional settings and academic parameters updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Error occurred while saving settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground text-xs">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-indigo-600" />
        Loading institutional settings...
      </div>
    );
  }

  return (
    <form onSubmit={handleSaveSettings} className="space-y-6">
      
      {/* Header with Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Settings2 className="w-5 h-5 text-indigo-600" />
            <span>Institutional Settings & Academic Policies</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Configure institutional profile, attendance cutoffs, examination grading thresholds, and real-time parameters for {currentCollege.name}.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadSettings}
            disabled={saving}
            className="text-xs h-9"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Reload
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 font-semibold shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Save Institutional Settings
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: College Identity & Profile */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center space-x-2 text-slate-900">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>College Identity & Information</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Official institutional metadata displayed across reports, transcripts, and portals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Institution Name *</Label>
              <Input
                value={formData.institution_name}
                onChange={e => setFormData({ ...formData, institution_name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Institution Code *</Label>
                <Input
                  value={formData.institution_code}
                  onChange={e => setFormData({ ...formData, institution_code: e.target.value.toUpperCase() })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Active Academic Year</Label>
                <Input
                  value={formData.academic_year}
                  onChange={e => setFormData({ ...formData, academic_year: e.target.value })}
                  placeholder="2026-2027"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Official Contact Email</Label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={e => setFormData({ ...formData, contact_email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Contact Phone</Label>
                <Input
                  value={formData.contact_phone}
                  onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Campus Postal Address</Label>
              <Input
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Academic Regulations & Thresholds */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center space-x-2 text-slate-900">
              <Percent className="w-4 h-4 text-emerald-600" />
              <span>Academic Regulations & Cutoffs</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Institutional policies enforced in exam hall ticket generation and pass criteria.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold">Minimum Mandatory Attendance (%)</Label>
                <Badge variant="outline" className="font-mono text-xs text-indigo-700 bg-indigo-50 border-indigo-200">
                  {formData.min_attendance_percentage}%
                </Badge>
              </div>
              <Input
                type="number"
                min="50"
                max="100"
                value={formData.min_attendance_percentage}
                onChange={e => setFormData({ ...formData, min_attendance_percentage: Number(e.target.value) })}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Students falling below this threshold are automatically flagged on the Shortage Telemetry desk.
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold">Passing Marks Percentage (%)</Label>
                <Badge variant="outline" className="font-mono text-xs text-emerald-700 bg-emerald-50 border-emerald-200">
                  {formData.passing_marks_percentage}%
                </Badge>
              </div>
              <Input
                type="number"
                min="35"
                max="60"
                value={formData.passing_marks_percentage}
                onChange={e => setFormData({ ...formData, passing_marks_percentage: Number(e.target.value) })}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Standard baseline score required across theory and practical assessments.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">Supabase Realtime Synchronization</div>
                  <div className="text-[11px] text-slate-500">Live attendance & notification broadcasts</div>
                </div>
                <Switch
                  checked={formData.enable_realtime}
                  onCheckedChange={checked => setFormData({ ...formData, enable_realtime: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">Email Alerts & Notifications</div>
                  <div className="text-[11px] text-slate-500">Dispatch fee receipts and exam hall tickets</div>
                </div>
                <Switch
                  checked={formData.enable_email_alerts}
                  onCheckedChange={checked => setFormData({ ...formData, enable_email_alerts: checked })}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="font-semibold text-rose-700">Maintenance Mode</div>
                  <div className="text-[11px] text-rose-500">Temporarily restrict student and parent logins</div>
                </div>
                <Switch
                  checked={formData.maintenance_mode}
                  onCheckedChange={checked => setFormData({ ...formData, maintenance_mode: checked })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </form>
  );
}
