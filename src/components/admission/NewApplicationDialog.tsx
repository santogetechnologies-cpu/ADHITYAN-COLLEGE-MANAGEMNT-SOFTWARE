import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2, Users, Shield, CheckCircle2, KeyRound, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/services/supabase/database';
import { OFFICIAL_COURSES } from '@/constants/courses';
import { parentLinkingService, ParentAccountSummary } from '@/services/parentLinkingService';
import { studentParentAuthService, AdmissionConfirmationResult } from '@/services/studentParentAuthService';
import { AdmissionSuccessDialog } from '@/components/admission/AdmissionSuccessDialog';

interface NewApplicationDialogProps {
  onApplicationAdded: (application: any) => void;
}

export const NewApplicationDialog = ({ onApplicationAdded }: NewApplicationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [applicationData, setApplicationData] = useState({
    studentName: '',
    email: '',
    phone: '',
    parentName: '',
    parentRelationship: 'Father',
    parentPhone: '',
    parentEmail: '',
    class: '',
    previousSchool: '',
    address: '',
    dateOfBirth: '',
  });

  // Parent Account Action state
  const [parentAccountAction, setParentAccountAction] = useState<'none' | 'create' | 'link_existing'>('create');
  const [parentLoginId, setParentLoginId] = useState(`PAR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [temporaryPassword, setTemporaryPassword] = useState('Adithyan@2026');
  const [existingParents, setExistingParents] = useState<ParentAccountSummary[]>([]);
  const [selectedExistingParentId, setSelectedExistingParentId] = useState<string>('');

  // Result dialog state
  const [creationResult, setCreationResult] = useState<{
    loginId: string;
    parentName: string;
    studentName: string;
  } | null>(null);

  const [confirmedResult, setConfirmedResult] = useState<AdmissionConfirmationResult | null>(null);

  // Load existing parents when link_existing selected
  useEffect(() => {
    if (open && parentAccountAction === 'link_existing') {
      parentLinkingService.listParentAccounts().then(setExistingParents).catch(console.warn);
    }
  }, [open, parentAccountAction]);

  // COMPLETE ADMISSION CONFIRMATION & AUTOMATIC ACCOUNT PROVISIONING
  const handleConfirmAdmission = async () => {
    if (!applicationData.studentName.trim() || !applicationData.email.trim() || !applicationData.class) {
      toast({
        title: "Validation Error",
        description: "Student Full Name, Email Address, and Program are required for Admission Confirmation.",
        variant: "destructive",
      });
      return;
    }

    if (!applicationData.parentName.trim()) {
      toast({
        title: "Validation Error",
        description: "Parent / Guardian Name is required to establish parent linkage.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // 1. Register application in admission database
      const appNo = `APP${Date.now().toString().slice(-6)}`;
      const appRecord = await db.createAdmissionApplication({
        application_no: appNo,
        name: applicationData.studentName.trim(),
        email: applicationData.email.trim().toLowerCase(),
        phone: applicationData.phone.trim(),
        parent_name: applicationData.parentName.trim(),
        parent_phone: applicationData.parentPhone.trim(),
        class_applied: applicationData.class,
        previous_school: applicationData.previousSchool,
        address: applicationData.address,
        date_of_birth: applicationData.dateOfBirth,
        status: 'Approved' as const,
      });

      // 2. Perform Transactional Admission Confirmation (Generates Student ID, checks/reuses Parent ID, links accounts)
      const confirmationResult = await studentParentAuthService.confirmAdmission({
        application_id: appRecord?.id,
        student: {
          name: applicationData.studentName.trim(),
          email: applicationData.email.trim().toLowerCase(),
          phone: applicationData.phone.trim(),
          department: applicationData.class,
          class_name: 'Semester 1',
          date_of_birth: applicationData.dateOfBirth,
          address: applicationData.address,
          previous_school: applicationData.previousSchool,
        },
        parent: {
          name: applicationData.parentName.trim(),
          relationship: applicationData.parentRelationship,
          phone: applicationData.parentPhone.trim(),
          email: applicationData.parentEmail.trim() || undefined,
          existing_parent_id: parentAccountAction === 'link_existing' ? selectedExistingParentId : undefined,
        },
      });

      // 3. Update parent list
      const frontendRecord = {
        id: appRecord?.id || Date.now().toString(),
        name: applicationData.studentName,
        email: applicationData.email,
        phone: applicationData.phone,
        parentName: applicationData.parentName,
        parentPhone: applicationData.parentPhone,
        class: applicationData.class,
        previousSchool: applicationData.previousSchool,
        address: applicationData.address,
        dateOfBirth: applicationData.dateOfBirth,
        status: 'Approved',
        date: new Date().toISOString().split('T')[0],
        applicationId: appNo,
        studentId: confirmationResult.student.student_id,
      };

      onApplicationAdded(frontendRecord);
      setConfirmedResult(confirmationResult);

      toast({
        title: "Admission Confirmed",
        description: `Student ID: ${confirmationResult.student.student_id} • Parent ID: ${confirmationResult.parent.parent_id}`,
      });

      // Reset form
      setApplicationData({
        studentName: '',
        email: '',
        phone: '',
        parentName: '',
        parentRelationship: 'Father',
        parentPhone: '',
        parentEmail: '',
        class: '',
        previousSchool: '',
        address: '',
        dateOfBirth: '',
      });
    } catch (err: any) {
      console.error('Admission confirmation error:', err);
      toast({
        title: "Admission Confirmation Failed",
        description: err.message || "Failed to confirm admission and provision accounts.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleConfirmAdmission();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Application
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Student Admission & Parent Onboarding</DialogTitle>
            <DialogDescription>
              Submit a new student admission application and optionally provision the parent portal access.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Section 1: Student Information */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
                Student Candidate Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="studentName">Student Full Name *</Label>
                  <Input
                    id="studentName"
                    value={applicationData.studentName}
                    onChange={(e) =>
                      setApplicationData({ ...applicationData, studentName: e.target.value })
                    }
                    placeholder="Candidate name"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={applicationData.email}
                    onChange={(e) =>
                      setApplicationData({ ...applicationData, email: e.target.value })
                    }
                    placeholder="student@example.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone / Mobile</Label>
                  <Input
                    id="phone"
                    value={applicationData.phone}
                    onChange={(e) =>
                      setApplicationData({ ...applicationData, phone: e.target.value })
                    }
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={applicationData.dateOfBirth}
                    onChange={(e) =>
                      setApplicationData({ ...applicationData, dateOfBirth: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="class">Applying For Program / Course *</Label>
                  <Select
                    value={applicationData.class}
                    onValueChange={(value) =>
                      setApplicationData({ ...applicationData, class: value })
                    }
                  >
                    <SelectTrigger id="class">
                      <SelectValue placeholder="Select official course" />
                    </SelectTrigger>
                    <SelectContent>
                      {OFFICIAL_COURSES.map(c => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="previousSchool">Previous School / College</Label>
                  <Input
                    id="previousSchool"
                    value={applicationData.previousSchool}
                    onChange={(e) =>
                      setApplicationData({ ...applicationData, previousSchool: e.target.value })
                    }
                    placeholder="Previous institution"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Parent / Guardian Details */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
                Parent / Guardian Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="parentName">Parent / Guardian Name *</Label>
                  <Input
                    id="parentName"
                    value={applicationData.parentName}
                    onChange={(e) =>
                      setApplicationData({ ...applicationData, parentName: e.target.value })
                    }
                    placeholder="Parent's full name"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="parentRelationship">Relationship *</Label>
                  <Select
                    value={applicationData.parentRelationship}
                    onValueChange={(v) => setApplicationData({ ...applicationData, parentRelationship: v })}
                  >
                    <SelectTrigger id="parentRelationship">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Father">Father</SelectItem>
                      <SelectItem value="Mother">Mother</SelectItem>
                      <SelectItem value="Guardian">Legal Guardian</SelectItem>
                      <SelectItem value="Parent">Parent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="parentPhone">Parent Mobile Number *</Label>
                  <Input
                    id="parentPhone"
                    value={applicationData.parentPhone}
                    onChange={(e) =>
                      setApplicationData({ ...applicationData, parentPhone: e.target.value })
                    }
                    placeholder="+91 98765 43210"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="parentEmail">Parent Email (Optional)</Label>
                  <Input
                    id="parentEmail"
                    type="email"
                    value={applicationData.parentEmail}
                    onChange={(e) =>
                      setApplicationData({ ...applicationData, parentEmail: e.target.value })
                    }
                    placeholder="parent@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Parent Account Action */}
            <div className="p-4 rounded-lg border bg-muted/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Users className="w-4 h-4 text-primary" />
                  Parent Account Action
                </div>
                <Select
                  value={parentAccountAction}
                  onValueChange={(v) => setParentAccountAction(v as any)}
                >
                  <SelectTrigger className="w-[240px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="create">Create New Parent Account</SelectItem>
                    <SelectItem value="link_existing">Link to Existing Parent Account</SelectItem>
                    <SelectItem value="none">Do Not Configure Account Now</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {parentAccountAction === 'create' && (
                <div className="space-y-3 pt-1">
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 text-blue-700 bg-blue-50 p-2 rounded border border-blue-100">
                    <Shield className="w-3.5 h-3.5 shrink-0" />
                    <span>Direct manual creation in Supabase Auth. No email invites, no OTP, no activation links required.</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="parentLoginId" className="text-xs">
                        Parent Login ID *
                      </Label>
                      <Input
                        id="parentLoginId"
                        value={parentLoginId}
                        onChange={(e) => setParentLoginId(e.target.value.toUpperCase())}
                        className="font-mono text-sm tracking-wider font-semibold h-9"
                        required
                      />
                      <p className="text-[10px] text-muted-foreground">Unique ID parent enters on login screen.</p>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="temporaryPassword" className="text-xs">
                        Temporary Password *
                      </Label>
                      <Input
                        id="temporaryPassword"
                        type="text"
                        value={temporaryPassword}
                        onChange={(e) => setTemporaryPassword(e.target.value)}
                        className="font-mono text-sm h-9"
                        required
                        minLength={6}
                      />
                      <p className="text-[10px] text-muted-foreground">Provided manually to parent. Min 6 characters.</p>
                    </div>
                  </div>
                </div>
              )}

              {parentAccountAction === 'link_existing' && (
                <div className="space-y-2 pt-1">
                  <Label className="text-xs">Select Existing Parent Profile (Sibling Account)</Label>
                  <Select
                    value={selectedExistingParentId}
                    onValueChange={setSelectedExistingParentId}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Choose parent account..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {existingParents.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.login_id}) • {p.phone || p.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">Links candidate student under the selected parent's existing login.</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Residential Address</Label>
              <Input
                id="address"
                value={applicationData.address}
                onChange={(e) =>
                  setApplicationData({ ...applicationData, address: e.target.value })
                }
                placeholder="Residential address"
              />
            </div>

            <DialogFooter className="pt-3 flex flex-wrap gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className="bg-[#1D61E7] hover:bg-blue-700 text-white font-semibold"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Provisioning Accounts...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Confirm Admission & Create Accounts
                  </span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRMED ADMISSION RESULT MODAL */}
      <AdmissionSuccessDialog
        open={!!confirmedResult}
        onOpenChange={(o) => {
          if (!o) {
            setConfirmedResult(null);
            setOpen(false);
          }
        }}
        result={confirmedResult}
      />
    </>
  );
};
