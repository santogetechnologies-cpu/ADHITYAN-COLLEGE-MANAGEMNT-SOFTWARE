import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  UserPlus, 
  GraduationCap, 
  Users, 
  FileText, 
  Award, 
  DollarSign, 
  Upload, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  Eye,
  Trash2,
  Receipt,
  FileCheck2,
  Clock
} from 'lucide-react';
import { OFFICIAL_COURSES } from '@/constants/courses';
import { useCollegeCourses } from '@/hooks/useCollegeCourses';
import { adminUserService } from '@/services/adminUserService';
import { FeeReceiptModal } from '@/components/shared/FeeReceiptModal';
import { FeeReceipt } from '@/types/database.types';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/services/supabase/database';
import { supabase } from '@/lib/supabase';
import { uploadAdmissionDocument, resolveDocumentUrl } from '@/lib/privateDocs';
import { storageService } from '@/services/supabase/storage';
import { ConfiguredFields, type FormFieldDef } from '@/components/admission/ConfiguredFields';
import { EditableText } from '@/components/customizer/EditableText';

interface ComprehensiveAdmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialData?: {
    studentName?: string;
    studentEmail?: string;
    studentPhone?: string;
    parentName?: string;
    parentPhone?: string;
    parentEmail?: string;
    course?: string;
  } | null;
}

interface UploadedDocument {
  id: string;
  type: string;
  required: boolean;
  file_name: string;
  file_url: string;
  preview_url?: string;
  file_size?: number;
  status: 'Pending' | 'Uploaded';
}

export function ComprehensiveAdmissionDialog({
  open,
  onOpenChange,
  onSuccess,
  initialData
}: ComprehensiveAdmissionDialogProps) {
  const { toast } = useToast();
  const { collegeCourses: coursesList } = useCollegeCourses();
  const [activeTab, setActiveTab] = useState('student');
  const [submitting, setSubmitting] = useState(false);
  // one key per deposit attempt: a retry returns the same receipt instead of charging twice
  const depositKeyRef = useRef<string>(crypto.randomUUID());

  // Preview Dialog State
  const [previewDoc, setPreviewDoc] = useState<{ name: string; url: string; type: string } | null>(null);

  // Optional Counter Receipt Modal State
  const [receiptData, setReceiptData] = useState<FeeReceipt | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  // 1. Student Personal Details State
  const [studentData, setStudentData] = useState({
    studentId: '',
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'Male',
    bloodGroup: 'O+',
    address: '',
    previousSchool: '',
  });

  // Dynamic Custom Form Fields
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // configuration from Admission setup (shared by all staff, validated by the server)
  const [cfgFields, setCfgFields] = useState<FormFieldDef[]>([]);
  const [cfgRoutes, setCfgRoutes] = useState<{ code: string; name: string }[]>([]);
  const [cfgQuotas, setCfgQuotas] = useState<{ code: string; name: string }[]>([]);
  const [cfgDocs, setCfgDocs] = useState<{ doc_type: string; course_name: string | null; required: boolean }[]>([]);

  // Student ID Uniqueness Validation State
  const [studentIdCheck, setStudentIdCheck] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({ checking: false, available: null, message: '' });

  // 2. Parent / Guardian Details State
  const [parentData, setParentData] = useState({
    name: '',
    relationship: 'Father',
    phone: '',
    email: '',
    occupation: '',
    annualIncome: '',
  });

  // 3. Academic & Paramedical Course State
  const [academicData, setAcademicData] = useState({
    courseName: OFFICIAL_COURSES[0].name,
    academicYear: '2026-2027',
    admissionBatch: '2026 Regular Paramedical Batch',
    qualifyingBoard: 'State Board (HSC)',
    passingYear: new Date().getFullYear().toString(),
    qualifyingScore: '',
    scienceScore: '',
    meritCategory: 'General Merit',
    admissionType: '',
    quota: '',
    eligibilityVerified: true,
  });

  // 4. Initial Fee / Counter Deposit State (Optional Reception Receipt)
  const [feeData, setFeeData] = useState({
    depositAmount: '',
    paymentMethod: 'Cash',
    transactionReference: '',
    remarks: '',
    generateReceipt: true,
  });

  // 5. Individual Document Uploads State
  const courseNameNow = academicData.courseName;
  const fieldsFor = (section: FormFieldDef['section']) =>
    cfgFields.filter((f) => f.section === section && (!f.course_name || f.course_name === courseNameNow));
  const setCustom = (key: string, value: string) => {
    setCustomFields((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => { if (!prev[key]) return prev; const n = { ...prev }; delete n[key]; return n; });
  };
  const [documents, setDocuments] = useState<UploadedDocument[]>([
    { id: 'photo', type: 'Student Passport Photo', required: true, file_name: '', file_url: '', status: 'Pending' },
    { id: 'marksheet_10th', type: '10th Standard Marksheet / Age Proof', required: true, file_name: '', file_url: '', status: 'Pending' },
    { id: 'marksheet_12th', type: '12th / Qualifying Marksheet', required: true, file_name: '', file_url: '', status: 'Pending' },
    { id: 'tc', type: 'Transfer Certificate (TC)', required: true, file_name: '', file_url: '', status: 'Pending' },
    { id: 'conduct', type: 'Conduct / Character Certificate', required: true, file_name: '', file_url: '', status: 'Pending' },
    { id: 'id_proof', type: 'Government ID Proof (Aadhaar / Voter ID)', required: true, file_name: '', file_url: '', status: 'Pending' },
    { id: 'community', type: 'Community / Caste Certificate (If Applicable)', required: false, file_name: '', file_url: '', status: 'Pending' },
  ]);

  // Pre-fill from initialData (e.g. Receptionist enquiry conversion)
  useEffect(() => {
    const relevant = cfgDocs.filter((d) => !d.course_name || d.course_name === academicData.courseName);
    if (relevant.length === 0) return;               // nothing configured: keep the standard checklist
    setDocuments((prev) => relevant.map((d, i) => prev.find((x) => x.type.toLowerCase() === d.doc_type.toLowerCase())
      ?? { id: `cfg_${i}`, type: d.doc_type, required: d.required, file_name: '', file_url: '', status: 'Pending' }));
  }, [cfgDocs, academicData.courseName]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const q = (t: string, extra?: (b: any) => any) => { const b: any = supabase.from(t as any).select('*'); return (extra ? extra(b) : b).order('sort_order'); };
      const [f, r, qu, d] = await Promise.all([
        q('admission_form_fields', (b) => b.eq('active', true)), q('admission_routes', (b) => b.eq('active', true)),
        q('admission_quotas', (b) => b.eq('active', true)), q('admission_required_documents', (b) => b.eq('active', true)),
      ]);
      if (cancelled) return;
      setCfgFields(((f as any).data || []) as FormFieldDef[]);
      setCfgRoutes(((r as any).data || []) as any[]);
      setCfgQuotas(((qu as any).data || []) as any[]);
      setCfgDocs(((d as any).data || []) as any[]);
    })();
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (open && initialData) {
      if (initialData.studentName || initialData.studentEmail || initialData.studentPhone) {
        setStudentData(prev => ({
          ...prev,
          name: initialData.studentName || prev.name,
          email: initialData.studentEmail || prev.email,
          phone: initialData.studentPhone || prev.phone,
        }));
      }
      if (initialData.parentName || initialData.parentPhone || initialData.parentEmail) {
        setParentData(prev => ({
          ...prev,
          name: initialData.parentName || prev.name,
          phone: initialData.parentPhone || prev.phone,
          email: initialData.parentEmail || prev.email,
        }));
      }
      if (initialData.course) {
        setAcademicData(prev => ({
          ...prev,
          courseName: initialData.course || prev.courseName
        }));
      }
    }
  }, [open, initialData]);

  // Real-time Student ID Uniqueness Check with Debounce
  useEffect(() => {
    const rawId = studentData.studentId.trim();
    if (!rawId) {
      setStudentIdCheck({ checking: false, available: null, message: '' });
      return;
    }

    setStudentIdCheck({ checking: true, available: null, message: 'Validating uniqueness...' });
    const timer = setTimeout(async () => {
      try {
        const res = await adminUserService.checkStudentIdAvailability(rawId);
        setStudentIdCheck({
          checking: false,
          available: res.available,
          message: res.message
        });
      } catch (err: any) {
        setStudentIdCheck({ checking: false, available: null, message: 'Could not verify ID' });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [studentData.studentId]);

  // Document Upload Handler (Supports Supabase Storage & safe DataURL fallback)
  const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Maximum allowed file size is 5MB.",
        variant: "destructive"
      });
      return;
    }

    // Validate mime type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Format",
        description: "Please upload an image (JPG, PNG) or PDF document.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Stored in the PRIVATE admission-documents bucket; the application keeps only a reference. No local fallback: if the upload
      // fails the document is NOT recorded, so nothing sensitive is silently embedded in the application record.
      const finalUrl = await uploadAdmissionDocument(file, studentData.studentId || 'application');
      const previewUrl = URL.createObjectURL(file);

      setDocuments(prev => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          file_name: file.name,
          file_url: finalUrl,
          preview_url: previewUrl,
          file_size: file.size,
          status: 'Uploaded'
        };
        return next;
      });

      toast({
        title: "Document Uploaded",
        description: `${documents[index].type} uploaded successfully.`,
      });
    } catch (err: any) {
      console.error('Document upload error:', err);
      toast({
        title: "Upload Failed",
        description: err.message || "Failed to upload document.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        file_name: '',
        file_url: '',
        file_size: undefined,
        status: 'Pending'
      };
      return next;
    });
  };

  // Submit Admission Application (Saves as Pending - NEVER creates login accounts)
  const handleSubmitAdmission = async () => {
    const cleanStudentId = studentData.studentId.trim();

    // 1. Mandatory Student ID Validation
    if (!cleanStudentId) {
      toast({
        title: "Validation Error",
        description: "Student ID must be entered manually by authorized staff. Auto-generation is not permitted.",
        variant: "destructive"
      });
      setActiveTab('student');
      return;
    }

    if (studentIdCheck.available === false) {
      toast({
        title: "Duplicate Student ID",
        description: `Student ID "${cleanStudentId}" is already assigned. Please enter a unique Student ID.`,
        variant: "destructive"
      });
      setActiveTab('student');
      return;
    }

    if (!studentData.name.trim()) {
      toast({ title: "Validation Error", description: "Student Full Name is required.", variant: "destructive" });
      setActiveTab('student');
      return;
    }

    if (!studentData.email.trim()) {
      toast({ title: "Validation Error", description: "Student Email Address is required.", variant: "destructive" });
      setActiveTab('student');
      return;
    }

    if (!studentData.phone.trim()) {
      toast({ title: "Validation Error", description: "Student Mobile Phone is required.", variant: "destructive" });
      setActiveTab('student');
      return;
    }

    if (!parentData.name.trim()) {
      toast({ title: "Validation Error", description: "Parent / Guardian Name is required.", variant: "destructive" });
      setActiveTab('parent');
      return;
    }

    if (!parentData.phone.trim()) {
      toast({ title: "Validation Error", description: "Parent Mobile Phone is required.", variant: "destructive" });
      setActiveTab('parent');
      return;
    }

    if (!academicData.eligibilityVerified) {
      toast({
        title: "Eligibility Check Required",
        description: "Please verify and check the candidate eligibility criteria before submitting.",
        variant: "destructive"
      });
      setActiveTab('academic');
      return;
    }

    // route / quota are required once they are configured; configured required fields must be answered
    if ((cfgRoutes.length > 0 && !academicData.admissionType) || (cfgQuotas.length > 0 && !academicData.quota)) {
      toast({ title: 'Choose the admission route and quota', description: 'Both are required. They decide how this candidate is processed.', variant: 'destructive' });
      setActiveTab('academic');
      return;
    }
    const missing: Record<string, string> = {};
    let firstSection: FormFieldDef['section'] | null = null;
    for (const f of cfgFields.filter((x) => !x.course_name || x.course_name === academicData.courseName)) {
      const v = customFields[f.field_key];
      const empty = v === undefined || v === null || String(v).trim() === '' || (f.field_type === 'checkbox' && String(v) !== 'true');
      if (f.required && empty) { missing[f.field_key] = `${f.label} is required.`; firstSection = firstSection ?? f.section; }
    }
    if (firstSection) {
      setFieldErrors(missing);
      toast({ title: 'Complete the required questions', description: Object.values(missing)[0], variant: 'destructive' });
      setActiveTab(firstSection === 'parent' ? 'parent' : firstSection === 'academic' ? 'academic' : 'student');
      return;
    }

    const depositCheck = Number(feeData.depositAmount) || 0;
    if (depositCheck < 0 || (feeData.depositAmount.trim() !== '' && !Number.isFinite(Number(feeData.depositAmount)))) {
      toast({ title: 'Check the deposit', description: 'Enter a valid deposit amount or leave it blank.', variant: 'destructive' });
      setActiveTab('fee');
      return;
    }
    if (depositCheck > 0 && feeData.paymentMethod !== 'Cash' && feeData.transactionReference.trim().length < 4) {
      toast({ title: 'Reference required', description: 'Enter the transaction reference for a non-cash deposit.', variant: 'destructive' });
      setActiveTab('fee');
      return;
    }

    setSubmitting(true);

    try {
      const depositAmount = depositCheck;
      const selectedCourse = coursesList.find(c => c.name === academicData.courseName) || coursesList[0] || OFFICIAL_COURSES[0];

      // Payload strictly submitted as "Pending"
      const applicationPayload = {
        student_id: cleanStudentId,
        studentId: cleanStudentId,
        application_number: cleanStudentId,
        application_no: cleanStudentId,
        name: studentData.name.trim(),
        applicant_name: studentData.name.trim(),
        email: studentData.email.trim(),
        phone: studentData.phone.trim(),
        date_of_birth: studentData.dateOfBirth,
        gender: studentData.gender,
        blood_group: studentData.bloodGroup,
        address: studentData.address.trim(),
        previous_school: studentData.previousSchool.trim(),

        // Parent Information
        parent_name: parentData.name.trim(),
        parent_phone: parentData.phone.trim(),
        parent_email: parentData.email.trim() || undefined,
        relationship: parentData.relationship,
        occupation: parentData.occupation.trim(),
        annual_income: parentData.annualIncome.trim(),

        // Academic & Course Information
        class_applied: selectedCourse.name,
        class_name: selectedCourse.name,
        academic_year: academicData.academicYear,
        admission_batch: academicData.admissionBatch,
        qualifying_board: academicData.qualifyingBoard,
        passing_year: academicData.passingYear,
        // blank stays blank: no invented marks
        qualifying_marks: academicData.qualifyingScore.trim() === '' ? undefined : Number(academicData.qualifyingScore),
        science_score: academicData.scienceScore.trim() === '' ? undefined : Number(academicData.scienceScore),
        merit_category: academicData.meritCategory,
        admission_type: academicData.admissionType || undefined,
        quota: academicData.quota || undefined,
        eligibility_verified: academicData.eligibilityVerified,

        // Uploaded Documents
        documents: documents
          .filter(d => d.file_name && d.file_url)
          .map(d => ({
            type: d.type,
            file_name: d.file_name,
            file_url: d.file_url,
            status: 'Uploaded',
            uploaded_at: new Date().toISOString()
          })),

        // Initial Fee Details
        fee_payment: {
          total_tuition: selectedCourse.tuitionFee,
          deposit_amount: depositAmount,
          payment_method: feeData.paymentMethod,
          transaction_reference: feeData.transactionReference.trim() || `TXN-REC-${Date.now().toString().slice(-6)}`,
          remarks: feeData.remarks
        },

        status: 'Submitted',
        remarks: `Manual Student ID: ${cleanStudentId}. Registered via Admission Form.`,
        custom_fields: customFields
      };

      const application: any = await db.createAdmissionApplication(applicationPayload);

      // Optional counter deposit: saved by the server together with its receipt (never fabricated in the browser)
      let depositReceipt: any = null;
      let depositError: string | null = null;
      if (depositAmount > 0) {
        try {
          const dep = await db.recordAdmissionDeposit({
            applicationId: application.id,
            amount: depositAmount,
            paymentMode: feeData.paymentMethod,
            reference: feeData.transactionReference.trim() || undefined,
            idempotencyKey: depositKeyRef.current,
          });
          depositReceipt = dep.receipt ?? null;
          depositKeyRef.current = crypto.randomUUID();
        } catch (depErr: any) {
          depositError = depErr?.message || 'The deposit could not be recorded.';
        }
      }

      toast({
        title: depositError ? 'Application saved, deposit NOT recorded' : 'Application submitted for review',
        description: depositError
          ? `Student ID "${cleanStudentId}" is registered, but the ₹${depositAmount.toLocaleString('en-IN')} deposit was not saved (${depositError}). Use "Collect deposit" on the application to record it.`
          : `Student ID "${cleanStudentId}" is registered and awaiting review.${depositReceipt ? ' Deposit receipt ' + depositReceipt.receipt_number + ' issued.' : ''}`,
        variant: depositError ? 'destructive' : 'default',
      });

      if (depositReceipt && feeData.generateReceipt) {
        setReceiptData(depositReceipt as any);
        setReceiptModalOpen(true);
      }

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      if (Array.isArray(err?.fields) && err.fields.length > 0) {
        const map: Record<string, string> = {};
        err.fields.forEach((e: any) => { map[e.field] = e.message; });
        setFieldErrors(map);
      }
      console.error('Admission submission error:', err);
      toast({
        title: "Submission Error",
        description: err.message || "Failed to submit admission application.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-6">
          <DialogHeader className="pb-3 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold shadow-sm">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  Adithyan Paramedical Admission Form
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete official candidate enrollment, academic qualifications, document uploads & counter fee registry
                </p>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleSubmitAdmission(); }} className="space-y-4 pt-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-5 w-full text-xs h-auto p-1 bg-muted/60 rounded-xl">
                <TabsTrigger value="student" className="py-2 flex items-center gap-1.5 text-xs">
                  <GraduationCap className="h-3.5 w-3.5" /> 1. Student Details
                </TabsTrigger>
                <TabsTrigger value="parent" className="py-2 flex items-center gap-1.5 text-xs">
                  <Users className="h-3.5 w-3.5" /> 2. Parent / Guardian
                </TabsTrigger>
                <TabsTrigger value="academic" className="py-2 flex items-center gap-1.5 text-xs">
                  <FileText className="h-3.5 w-3.5" /> 3. Academics & Course
                </TabsTrigger>
                <TabsTrigger value="docs" className="py-2 flex items-center gap-1.5 text-xs">
                  <Upload className="h-3.5 w-3.5" /> 4. Document Uploads
                </TabsTrigger>
                <TabsTrigger value="fee" className="py-2 flex items-center gap-1.5 text-xs">
                  <DollarSign className="h-3.5 w-3.5" /> 5. Counter Deposit
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: STUDENT PERSONAL DETAILS */}
              <TabsContent value="student" className="space-y-4 pt-3">
                {/* PROMINENT MANUAL STUDENT ID ENTRY */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <Label htmlFor="manual-student-id" className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4 text-blue-600" />
                      Permanent Student ID (Manual Staff Entry) *
                    </Label>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Auto-generation is strictly disabled
                    </span>
                  </div>

                  <div className="relative">
                    <Input
                      id="manual-student-id"
                      placeholder="e.g. ADM-2026-001 or MLT-2026-042"
                      value={studentData.studentId}
                      onChange={(e) => setStudentData({ ...studentData, studentId: e.target.value })}
                      className="font-mono text-sm font-semibold tracking-wide pr-10"
                      required
                    />
                    <div className="absolute right-3 top-2.5">
                      {studentIdCheck.checking && (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      )}
                      {!studentIdCheck.checking && studentIdCheck.available === true && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                      {!studentIdCheck.checking && studentIdCheck.available === false && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </div>

                  {studentIdCheck.message && (
                    <p className={`text-xs flex items-center gap-1 ${
                      studentIdCheck.available === true ? 'text-emerald-600 dark:text-emerald-400 font-medium' :
                      studentIdCheck.available === false ? 'text-destructive font-semibold' : 'text-muted-foreground'
                    }`}>
                      {studentIdCheck.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="std-name" className="text-xs font-semibold">Student Full Name *</Label>
                    <Input
                      id="std-name"
                      placeholder="e.g. Ramesh Kumar S"
                      value={studentData.name}
                      onChange={(e) => setStudentData({ ...studentData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="std-email" className="text-xs font-semibold">Student Email Address *</Label>
                    <Input
                      id="std-email"
                      type="email"
                      placeholder="student@gmail.com"
                      value={studentData.email}
                      onChange={(e) => setStudentData({ ...studentData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="std-phone" className="text-xs font-semibold">Mobile Phone Number *</Label>
                    <Input
                      id="std-phone"
                      placeholder="9876543210"
                      value={studentData.phone}
                      onChange={(e) => setStudentData({ ...studentData, phone: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="std-dob" className="text-xs font-semibold">Date of Birth</Label>
                    <Input
                      id="std-dob"
                      type="date"
                      value={studentData.dateOfBirth}
                      onChange={(e) => setStudentData({ ...studentData, dateOfBirth: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="std-gender" className="text-xs font-semibold">Gender</Label>
                    <Select
                      value={studentData.gender}
                      onValueChange={(val) => setStudentData({ ...studentData, gender: val })}
                    >
                      <SelectTrigger id="std-gender">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="std-blood" className="text-xs font-semibold">Blood Group</Label>
                    <Select
                      value={studentData.bloodGroup}
                      onValueChange={(val) => setStudentData({ ...studentData, bloodGroup: val })}
                    >
                      <SelectTrigger id="std-blood">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                          <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="std-address" className="text-xs font-semibold">Permanent Residential Address</Label>
                    <Textarea
                      id="std-address"
                      placeholder="Door No, Street Name, City, District, State, Pincode"
                      value={studentData.address}
                      onChange={(e) => setStudentData({ ...studentData, address: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="std-school" className="text-xs font-semibold">Previous School / Institution Attended</Label>
                    <Input
                      id="std-school"
                      placeholder="Higher Secondary School / College name"
                      value={studentData.previousSchool}
                      onChange={(e) => setStudentData({ ...studentData, previousSchool: e.target.value })}
                    />
                  </div>
                </div>

                {/* Fields configured in Admission setup (shared by all staff, validated by the server) */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <ConfiguredFields fields={[...fieldsFor('student'), ...fieldsFor('other')]} values={customFields} errors={fieldErrors} onChange={setCustom} />
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="button" onClick={() => setActiveTab('parent')} className="text-xs">
                    Next: Parent / Guardian Details →
                  </Button>
                </div>
              </TabsContent>

              {/* TAB 2: PARENT / GUARDIAN DETAILS */}
              <TabsContent value="parent" className="space-y-4 pt-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="par-name" className="text-xs font-semibold">Parent / Guardian Name *</Label>
                    <Input
                      id="par-name"
                      placeholder="e.g. S. Kumaravel"
                      value={parentData.name}
                      onChange={(e) => setParentData({ ...parentData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="par-rel" className="text-xs font-semibold">Relationship</Label>
                    <Select
                      value={parentData.relationship}
                      onValueChange={(val) => setParentData({ ...parentData, relationship: val })}
                    >
                      <SelectTrigger id="par-rel">
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
                    <Label htmlFor="par-phone" className="text-xs font-semibold">Parent Mobile Number *</Label>
                    <Input
                      id="par-phone"
                      placeholder="9876543211"
                      value={parentData.phone}
                      onChange={(e) => setParentData({ ...parentData, phone: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="par-email" className="text-xs font-semibold">Parent Email Address</Label>
                    <Input
                      id="par-email"
                      type="email"
                      placeholder="parent@gmail.com"
                      value={parentData.email}
                      onChange={(e) => setParentData({ ...parentData, email: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="par-occ" className="text-xs font-semibold">Occupation</Label>
                    <Input
                      id="par-occ"
                      placeholder="e.g. Government Service / Business"
                      value={parentData.occupation}
                      onChange={(e) => setParentData({ ...parentData, occupation: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="par-income" className="text-xs font-semibold">Annual Family Income (₹)</Label>
                    <Input
                      id="par-income"
                      placeholder="e.g. 2,50,000"
                      value={parentData.annualIncome}
                      onChange={(e) => setParentData({ ...parentData, annualIncome: e.target.value })}
                    />
                  </div>
                </div>

                <ConfiguredFields fields={fieldsFor('parent')} values={customFields} errors={fieldErrors} onChange={setCustom} />

                <div className="flex justify-between pt-2">
                  <Button type="button" variant="outline" onClick={() => setActiveTab('student')} className="text-xs">
                    ← Back to Student
                  </Button>
                  <Button type="button" onClick={() => setActiveTab('academic')} className="text-xs">
                    Next: Academics & Course →
                  </Button>
                </div>
              </TabsContent>

              {/* TAB 3: ACADEMICS & COURSE SELECTION */}
              <TabsContent value="academic" className="space-y-4 pt-3">
                {/* 9 OFFICIAL PARAMEDICAL COURSES */}
                <div className="space-y-1.5">
                  <Label htmlFor="course-select" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Paramedical Program / Course Selection (Strictly 9 Official Courses) *
                  </Label>
                  <Select
                    value={academicData.courseName}
                    onValueChange={(val) => setAcademicData({ ...academicData, courseName: val })}
                  >
                    <SelectTrigger id="course-select" className="font-semibold text-xs h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {coursesList.map(course => (
                        <SelectItem key={course.id} value={course.name} className="py-2">
                          <div className="flex flex-col">
                            <span className="font-semibold">{course.name}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {course.type} • {course.durationYears} {course.durationYears === 1 ? 'Year' : 'Years'} • Standard Tuition: ₹{course.tuitionFee.toLocaleString('en-IN')}/year
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Academic Year</Label>
                    <Input
                      value={academicData.academicYear}
                      onChange={(e) => setAcademicData({ ...academicData, academicYear: e.target.value })}
                      className="font-medium text-xs bg-muted/40"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Admission Batch</Label>
                    <Input
                      value={academicData.admissionBatch}
                      onChange={(e) => setAcademicData({ ...academicData, admissionBatch: e.target.value })}
                      className="font-medium text-xs bg-muted/40"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Merit category</Label>
                    <Select
                      value={academicData.meritCategory}
                      onValueChange={(val) => setAcademicData({ ...academicData, meritCategory: val })}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Institutional Merit">Institutional Merit</SelectItem>
                        <SelectItem value="Government Quota">Government Quota</SelectItem>
                        <SelectItem value="Management Quota">Management Quota</SelectItem>
                        <SelectItem value="Sports / Cultural Quota">Sports / Cultural Quota</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(cfgRoutes.length > 0 || cfgQuotas.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {cfgRoutes.length > 0 && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Admission route *</Label>
                        <Select value={academicData.admissionType || undefined} onValueChange={(val) => setAcademicData({ ...academicData, admissionType: val })}>
                          <SelectTrigger className="text-xs"><SelectValue placeholder="How is this candidate admitted?" /></SelectTrigger>
                          <SelectContent>{cfgRoutes.map((r) => <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )}
                    {cfgQuotas.length > 0 && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Seat quota *</Label>
                        <Select value={academicData.quota || undefined} onValueChange={(val) => setAcademicData({ ...academicData, quota: val })}>
                          <SelectTrigger className="text-xs"><SelectValue placeholder="Which quota?" /></SelectTrigger>
                          <SelectContent>{cfgQuotas.map((q) => <SelectItem key={q.code} value={q.code}>{q.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                <ConfiguredFields fields={fieldsFor('academic')} values={customFields} errors={fieldErrors} onChange={setCustom} />

                <div className="border-t pt-3 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Previous Qualifying Examination & Marks
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Qualifying Examination</Label>
                      <Select
                        value={academicData.qualifyingBoard}
                        onValueChange={(val) => setAcademicData({ ...academicData, qualifyingBoard: val })}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="State Board (HSC)">State Board (HSC)</SelectItem>
                          <SelectItem value="CBSE Senior Secondary">CBSE Senior Secondary</SelectItem>
                          <SelectItem value="ISC Board">ISC Board</SelectItem>
                          <SelectItem value="Diploma in Allied Health">Diploma in Allied Health</SelectItem>
                          <SelectItem value="Other Recognized Board">Other Recognized Board</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Year of Passing</Label>
                      <Input
                        value={academicData.passingYear}
                        onChange={(e) => setAcademicData({ ...academicData, passingYear: e.target.value })}
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Overall Aggregate Marks (%)</Label>
                      <Input
                        type="number"
                        placeholder="85"
                        value={academicData.qualifyingScore}
                        onChange={(e) => setAcademicData({ ...academicData, qualifyingScore: e.target.value })}
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Science Group Score (%)</Label>
                      <Input
                        type="number"
                        placeholder="88"
                        value={academicData.scienceScore}
                        onChange={(e) => setAcademicData({ ...academicData, scienceScore: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  {/* ELIGIBILITY CHECK */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg flex items-start gap-2.5 mt-2">
                    <Checkbox
                      id="eligibility-check"
                      checked={academicData.eligibilityVerified}
                      onCheckedChange={(c) => setAcademicData({ ...academicData, eligibilityVerified: !!c })}
                      className="mt-0.5"
                    />
                    <div className="text-xs">
                      <label htmlFor="eligibility-check" className="font-semibold text-blue-900 dark:text-blue-200 cursor-pointer">
                        Eligibility Criteria Verified (10+2 with Physics, Chemistry, Biology / Mathematics)
                      </label>
                      <p className="text-blue-700 dark:text-blue-300 text-[11px] mt-0.5">
                        Authorized staff confirms that the applicant meets the mandatory regulatory paramedical eligibility conditions.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <Button type="button" variant="outline" onClick={() => setActiveTab('parent')} className="text-xs">
                    ← Back to Parent
                  </Button>
                  <Button type="button" onClick={() => setActiveTab('docs')} className="text-xs">
                    Next: Document Uploads →
                  </Button>
                </div>
              </TabsContent>

              {/* TAB 4: INDIVIDUAL DOCUMENT UPLOADS */}
              <TabsContent value="docs" className="space-y-4 pt-3">
                <div className="flex items-center justify-between pb-1">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Mandatory Document Uploads & Verifications
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Upload clear scans in JPG, PNG, or PDF format (Max 5MB per document). Preview is available.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold">
                    {documents.filter(d => d.status === 'Uploaded').length} of {documents.length} Uploaded
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {documents.map((doc, idx) => (
                    <Card key={doc.id} className="p-3 border rounded-xl shadow-xs">
                      <div className="flex flex-col h-full justify-between gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-foreground">{doc.type}</span>
                              {doc.required && (
                                <span className="text-[10px] text-destructive font-bold">*</span>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground block truncate max-w-[200px]">
                              {doc.file_name || 'No file selected yet'}
                            </span>
                          </div>

                          <Badge 
                            variant={doc.status === 'Uploaded' ? 'default' : 'secondary'}
                            className={`text-[10px] shrink-0 ${doc.status === 'Uploaded' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                          >
                            {doc.status === 'Uploaded' ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Uploaded
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Pending
                              </span>
                            )}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 pt-1 border-t">
                          <label className="cursor-pointer flex-1">
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              onChange={(e) => handleFileUpload(idx, e)}
                              className="hidden"
                            />
                            <div className="h-8 px-2.5 rounded-lg border border-input hover:bg-muted text-xs font-medium flex items-center justify-center gap-1.5 transition-colors">
                              <Upload className="h-3.5 w-3.5" />
                              <span>{doc.status === 'Uploaded' ? 'Replace' : 'Upload File'}</span>
                            </div>
                          </label>

                          {doc.status === 'Uploaded' && (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={async () => { try { setPreviewDoc({ name: doc.type, url: (doc as any).preview_url || await resolveDocumentUrl(doc.file_url), type: doc.file_name }); } catch (e: any) { toast({ title: 'Cannot open the document', description: e.message, variant: 'destructive' }); } }}
                                className="h-8 px-2 text-xs"
                                title="Preview Document"
                              >
                                <Eye className="h-3.5 w-3.5 text-blue-600" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleRemoveDocument(idx)}
                                className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                                title="Remove File"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-between pt-2">
                  <Button type="button" variant="outline" onClick={() => setActiveTab('academic')} className="text-xs">
                    ← Back to Academics
                  </Button>
                  <Button type="button" onClick={() => setActiveTab('fee')} className="text-xs">
                    Next: Counter Fee Deposit →
                  </Button>
                </div>
              </TabsContent>

              {/* TAB 5: COUNTER FEE DEPOSIT & SUBMISSION */}
              <TabsContent value="fee" className="space-y-4 pt-3">
                <div className="p-4 bg-muted/40 border rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Receipt className="h-4 w-4 text-emerald-600" />
                        Optional Counter Registration Fee Deposit
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Record initial registration or application fee paid directly at the reception / admission counter.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Deposit Amount (₹)</Label>
                      <Input
                        type="number"
                        placeholder="10000"
                        value={feeData.depositAmount}
                        onChange={(e) => setFeeData({ ...feeData, depositAmount: e.target.value })}
                        className="font-mono text-xs font-semibold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Payment Mode</Label>
                      <Select
                        value={feeData.paymentMethod}
                        onValueChange={(val) => setFeeData({ ...feeData, paymentMethod: val })}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash at Counter</SelectItem>
                          <SelectItem value="UPI">UPI / QR Code</SelectItem>
                          <SelectItem value="Bank_Transfer">Bank Transfer / NEFT</SelectItem>
                          <SelectItem value="Card">POS Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Transaction / Reference #</Label>
                      <Input
                        placeholder="e.g. UPI-998811 or Cash Scroll #"
                        value={feeData.transactionReference}
                        onChange={(e) => setFeeData({ ...feeData, transactionReference: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Checkbox
                      id="gen-receipt"
                      checked={feeData.generateReceipt}
                      onCheckedChange={(c) => setFeeData({ ...feeData, generateReceipt: !!c })}
                    />
                    <label htmlFor="gen-receipt" className="text-xs text-muted-foreground cursor-pointer">
                      Open the printable deposit receipt after submission
                    </label>
                  </div>
                </div>

                {/* SUBMISSION NOTICE BANNER */}
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl space-y-1">
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Important Notice: Admission Approval & User Accounts
                  </p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    Submitting this form registers the application for review. It does <strong>NOT</strong> create Student or Parent login accounts. After approval and enrolment in the Application Portal, portal login accounts are created in Admin User Management.
                  </p>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Button type="button" variant="outline" onClick={() => setActiveTab('docs')} className="text-xs">
                    ← Back to Documents
                  </Button>

                  <Button
                    type="submit"
                    disabled={submitting || studentIdCheck.available === false || studentIdCheck.checking}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 shadow-sm"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Submitting Application...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <FileCheck2 className="h-4 w-4" /> Submit Application for Review (Pending)
                      </span>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </form>
        </DialogContent>
      </Dialog>

      {/* DOCUMENT PREVIEW DIALOG */}
      {previewDoc && (
        <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] p-4 flex flex-col">
            <DialogHeader className="pb-2 border-b">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-600" />
                {previewDoc.name}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto p-2 flex items-center justify-center min-h-[350px]">
              {previewDoc.url.startsWith('data:application/pdf') || previewDoc.type.endsWith('.pdf') ? (
                <iframe
                  src={previewDoc.url}
                  className="w-full h-[500px] rounded-lg border"
                  title="PDF Document Preview"
                />
              ) : (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.name}
                  className="max-h-[500px] w-auto object-contain rounded-lg shadow-sm border"
                />
              )}
            </div>
            <div className="flex justify-end pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => setPreviewDoc(null)}>
                Close Preview
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* FEE RECEIPT MODAL */}
      <FeeReceiptModal
        receipt={receiptData}
        open={receiptModalOpen}
        onOpenChange={setReceiptModalOpen}
      />
    </>
  );
}
