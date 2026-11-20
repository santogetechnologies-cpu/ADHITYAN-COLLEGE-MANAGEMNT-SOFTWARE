import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Building2, 
  Save, 
  Loader2, 
  ShieldCheck, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { GlobalSettingsConfig } from '@/types/superAdmin.types';
import { DEFAULT_GLOBAL_SETTINGS } from '@/services/superAdminDefaults';

interface GlobalSettingsSectionProps {
  settings?: GlobalSettingsConfig;
  onSaveGlobalDraft: (updated: GlobalSettingsConfig) => Promise<boolean>;
}

export function GlobalSettingsSection({
  settings = DEFAULT_GLOBAL_SETTINGS,
  onSaveGlobalDraft
}: GlobalSettingsSectionProps) {
  const [form, setForm] = useState<GlobalSettingsConfig>(settings);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveGlobalDraft(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Institutional Global System Policies
            </h2>
            <Badge variant="outline" className="text-xs border-indigo-200 text-indigo-700 bg-indigo-50">
              Institution Profile
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure college identifiers, academic sessions, attendance regulatory thresholds, and maintenance status.
          </p>
        </div>

        <Button
          size="sm"
          disabled={saving}
          onClick={handleSubmit}
          className="h-8 text-xs font-semibold bg-primary text-primary-foreground shadow-xs shrink-0"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
          Save Settings Draft
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Profile Card */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="py-3 px-4 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-primary" />
              <span>College Identity & Regulatory Identifiers</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">Institution Legal Name *</Label>
              <Input
                required
                value={form.institutionName}
                onChange={(e) => setForm({ ...form, institutionName: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">Institution Code *</Label>
              <Input
                required
                value={form.institutionCode}
                onChange={(e) => setForm({ ...form, institutionCode: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">Active Academic Year</Label>
              <Input
                value={form.academicYear}
                onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">Current Semester</Label>
              <Input
                value={form.currentSemester}
                onChange={(e) => setForm({ ...form, currentSemester: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">Official Contact Email</Label>
              <Input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">Contact Telephone</Label>
              <Input
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label className="font-semibold text-slate-700">Campus Physical Address</Label>
              <Textarea
                rows={2}
                value={form.campusAddress}
                onChange={(e) => setForm({ ...form, campusAddress: e.target.value })}
                className="text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Academic Policies */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="py-3 px-4 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-primary" />
              <span>Regulatory Policies & Benchmarks</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">Attendance Regulatory Threshold (%) *</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.attendancePolicyThreshold}
                onChange={(e) => setForm({ ...form, attendancePolicyThreshold: Number(e.target.value) })}
                className="h-8 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">Students below this rate trigger shortage warnings.</p>
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">Passing Marks Benchmark (%)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.passingMarksThreshold}
                onChange={(e) => setForm({ ...form, passingMarksThreshold: Number(e.target.value) })}
                className="h-8 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">Standard examination passing percentage.</p>
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">Currency Symbol</Label>
              <Input
                value={form.currencySymbol}
                onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">Date Format</Label>
              <Input
                value={form.dateFormat}
                onChange={(e) => setForm({ ...form, dateFormat: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
