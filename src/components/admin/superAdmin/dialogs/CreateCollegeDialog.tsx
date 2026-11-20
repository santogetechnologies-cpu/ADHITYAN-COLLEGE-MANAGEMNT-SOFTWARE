import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Plus, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { multiCollegeService } from '@/services/multiCollegeService';
import { useAuth } from '@/context/AuthContext';
import { useCollege } from '@/context/CollegeContext';
import { toast } from 'sonner';

interface CreateCollegeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (collegeId: string) => void;
}

export function CreateCollegeDialog({ open, onOpenChange, onSuccess }: CreateCollegeDialogProps) {
  const { user } = useAuth();
  const { reloadCollegeData, switchCollege } = useCollege();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    institution_type: 'Paramedical' as 'Paramedical' | 'Engineering' | 'Arts & Science' | 'Medical' | 'General',
    contact_email: '',
    contact_phone: '',
    address: '',
    admin_name: '',
    admin_email: '',
    admin_password: 'Password@123'
  });

  const handleNameChange = (name: string) => {
    // Generate suggested code from name
    const suggestedCode = name
      .split(' ')
      .filter(w => w.length > 2)
      .map(w => w[0]?.toUpperCase())
      .join('')
      .slice(0, 6);

    setFormData(prev => ({
      ...prev,
      name,
      code: prev.code ? prev.code : (suggestedCode ? `${suggestedCode}-COLLEGE` : '')
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('College name and institutional code are required.');
      return;
    }

    setSubmitting(true);
    try {
      const superAdminEmail = user?.email || 'superadmin@platform.adithyan.edu';
      const result = await multiCollegeService.provisionCollege(
        {
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          institution_type: formData.institution_type,
          contact_email: formData.contact_email.trim() || `admin@${formData.code.toLowerCase()}.edu.in`,
          contact_phone: formData.contact_phone || '+91 (044) 2800-0000',
          address: formData.address || 'Campus Avenue, India',
          admin_account: {
            name: formData.admin_name || `${formData.name} Administrator`,
            email: formData.admin_email || `admin@${formData.code.toLowerCase()}.edu.in`,
            password: formData.admin_password
          },
          academic_config: {
            programs: ['Degree Programs', 'Diploma Courses'],
            academicYears: ['2025-2026', '2026-2027'],
            semesterStructure: 'Semester (1 to 6)',
            departments: ['Allied Health', 'General Sciences']
          }
        },
        superAdminEmail
      );

      if (result.success && result.college) {
        toast.success(`College "${result.college.name}" provisioned successfully!`);
        await reloadCollegeData();
        await switchCollege(result.college.id);
        onOpenChange(false);
        if (onSuccess) onSuccess(result.college.id);
      } else {
        toast.error(result.error || 'Failed to provision college.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error occurred while creating college.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center space-x-2 text-primary mb-1">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <DialogTitle className="text-lg font-bold">Register New College Tenant</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Create an independent college environment. All data, courses, students, and configurations will be strictly isolated.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label className="text-xs font-semibold">College / Institution Name *</Label>
              <Input
                placeholder="e.g. Adithyan Institute of Technology"
                value={formData.name}
                onChange={e => handleNameChange(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Institutional Code *</Label>
              <Input
                placeholder="e.g. AIT-CAMPUS"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Institution Type</Label>
              <Select
                value={formData.institution_type}
                onValueChange={(val: any) => setFormData({ ...formData, institution_type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Paramedical">Paramedical & Allied Health</SelectItem>
                  <SelectItem value="Engineering">Engineering & Technology</SelectItem>
                  <SelectItem value="Arts & Science">Arts & Science</SelectItem>
                  <SelectItem value="Medical">Medical College</SelectItem>
                  <SelectItem value="General">General Higher Education</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Official Contact Email</Label>
              <Input
                type="email"
                placeholder="admin@college.edu.in"
                value={formData.contact_email}
                onChange={e => setFormData({ ...formData, contact_email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Contact Phone</Label>
              <Input
                placeholder="+91 (044) 2800-0000"
                value={formData.contact_phone}
                onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Campus Address</Label>
            <Input
              placeholder="Full address of the college campus"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <span className="text-xs font-bold text-slate-800 flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              Initial College Admin Account
            </span>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Input
                placeholder="Administrator Name"
                value={formData.admin_name}
                onChange={e => setFormData({ ...formData, admin_name: e.target.value })}
              />
              <Input
                placeholder="Admin Email"
                value={formData.admin_email}
                onChange={e => setFormData({ ...formData, admin_email: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Provisioning College...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" />
                  Register & Activate College
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
