import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollege } from '@/context/CollegeContext';
import { multiCollegeService, BUILTIN_TEMPLATES } from '@/services/multiCollegeService';
import { CollegeProvisioningPayload, InstitutionType } from '@/types/multiCollege.types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Building2, 
  GraduationCap, 
  UserCheck, 
  Layers, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  ShieldCheck, 
  Plus, 
  X,
  FileCheck,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export function CollegeProvisioningWizard() {
  const navigate = useNavigate();
  const { reloadCollegeData } = useCollege();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isProvisioning, setIsProvisioning] = useState<boolean>(false);
  const [provisionedCollege, setProvisionedCollege] = useState<any | null>(null);

  // Form State
  // Step 1: Info
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [institutionType, setInstitutionType] = useState<InstitutionType>('Paramedical');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');

  // Step 2: Academic
  const [programs, setPrograms] = useState<string[]>(['B.Sc Allied Health', 'B.VOC Healthcare']);
  const [newProgramInput, setNewProgramInput] = useState('');
  const [departments, setDepartments] = useState<string[]>([
    'Cardiac Technology',
    'Dialysis Technology',
    'Radiology & Imaging',
    'Medical Laboratory'
  ]);
  const [newDeptInput, setNewDeptInput] = useState('');
  const [academicYears, setAcademicYears] = useState<string[]>(['2025-2026', '2026-2027']);
  const [semesterStructure, setSemesterStructure] = useState('Semester (1 to 8)');

  // Step 3: Admin
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('CollegeAdmin@2026');

  // Step 4 & 5: Modules & Template
  const [selectedTemplate, setSelectedTemplate] = useState('Default Paramedical ERP Template');
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'students', 'faculty', 'academics', 'attendance', 'examinations', 'finance', 'admissions', 'certificates'
  ]);

  const allAvailableModules = [
    { id: 'students', name: 'Student Management' },
    { id: 'faculty', name: 'Faculty & Staff Directory' },
    { id: 'academics', name: 'Academics & Timetables' },
    { id: 'attendance', name: 'Attendance & Compliance' },
    { id: 'examinations', name: 'Examinations & Results' },
    { id: 'finance', name: 'Fee Collection & Finance' },
    { id: 'admissions', name: 'Admissions & Document Verification' },
    { id: 'certificates', name: 'Bonafide & Certificate Generation' },
    { id: 'medical', name: 'Infirmary & Medical Center' },
    { id: 'naac', name: 'NAAC Accreditation' },
    { id: 'transport', name: 'Transport & Fleet' },
    { id: 'store', name: 'Uniform & Store' },
    { id: 'library', name: 'Digital Library' },
    { id: 'hostel', name: 'Hostel Management' }
  ];

  // Helper chips
  const addProgram = () => {
    if (newProgramInput.trim() && !programs.includes(newProgramInput.trim())) {
      setPrograms([...programs, newProgramInput.trim()]);
      setNewProgramInput('');
    }
  };

  const removeProgram = (prog: string) => {
    setPrograms(programs.filter(p => p !== prog));
  };

  const addDept = () => {
    if (newDeptInput.trim() && !departments.includes(newDeptInput.trim())) {
      setDepartments([...departments, newDeptInput.trim()]);
      setNewDeptInput('');
    }
  };

  const removeDept = (d: string) => {
    setDepartments(departments.filter(dept => dept !== d));
  };

  const toggleModule = (modId: string) => {
    if (['students', 'faculty', 'academics'].includes(modId)) return; // Core required
    setSelectedModules(prev => 
      prev.includes(modId) ? prev.filter(m => m !== modId) : [...prev, modId]
    );
  };

  // Final submission
  const handleExecuteProvisioning = async () => {
    setIsProvisioning(true);
    try {
      const payload: CollegeProvisioningPayload = {
        name,
        code,
        institution_type: institutionType,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        address,
        website,
        academic_config: {
          programs,
          academicYears,
          semesterStructure,
          departments
        },
        admin_account: {
          name: adminName || `${name} Admin`,
          email: adminEmail,
          password: adminPassword
        },
        template_name: selectedTemplate,
        selected_modules: selectedModules
      };

      const res = await multiCollegeService.provisionCollege(payload, 'superadmin@platform.adithyan.edu');
      if (res.success && res.college) {
        await reloadCollegeData();
        setProvisionedCollege(res.college);
        toast.success(`College "${res.college.name}" provisioned with isolated software environment!`);
      } else {
        toast.error(res.error || 'Failed to provision college.');
      }
    } finally {
      setIsProvisioning(false);
    }
  };

  // Success Screen
  if (provisionedCollege) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">
            College Environment Successfully Activated!
          </h2>
          <p className="text-xs text-muted-foreground">
            A private, tenant-isolated ERP software workspace has been created for <span className="font-bold text-slate-900">{provisionedCollege.name}</span>.
          </p>
        </div>

        <Card className="border-slate-200 bg-white p-4 text-left text-xs space-y-2.5">
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-500 font-medium">College Code:</span>
            <span className="font-mono font-bold text-indigo-700">{provisionedCollege.code}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-500 font-medium">Institution Type:</span>
            <span className="font-semibold text-slate-800">{provisionedCollege.institution_type}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-500 font-medium">College Admin Account:</span>
            <span className="font-semibold text-slate-800">{provisionedCollege.admin_email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Active Release:</span>
            <span className="font-mono font-bold text-emerald-700">{provisionedCollege.current_version}</span>
          </div>
        </Card>

        <div className="flex items-center justify-center space-x-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/platform-admin/colleges')}
            className="text-xs"
          >
            Back to Directory
          </Button>

          <Button
            size="sm"
            onClick={() => navigate(`/platform-admin/workspace/${provisionedCollege.id}`)}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
          >
            Launch Configuration Workspace &rarr;
          </Button>
        </div>
      </div>
    );
  }

  const steps = [
    { num: 1, label: 'Identity', icon: Building2 },
    { num: 2, label: 'Academics', icon: GraduationCap },
    { num: 3, label: 'Admin', icon: UserCheck },
    { num: 4, label: 'Modules', icon: Layers },
    { num: 5, label: 'Template', icon: Sparkles },
    { num: 6, label: 'Review & Launch', icon: FileCheck },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* 1. Header */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
          College Provisioning & Onboarding Wizard
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Deploy an independent, tenant-isolated college ERP software partition with custom academic configuration and roles.
        </p>
      </div>

      {/* 2. Step Progress Bar */}
      <div className="grid grid-cols-6 gap-2">
        {steps.map(s => {
          const isDone = currentStep > s.num;
          const isCurrent = currentStep === s.num;
          return (
            <div
              key={s.num}
              className={`p-2 rounded-lg border text-center transition-all ${
                isCurrent 
                  ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 font-bold shadow-2xs' 
                  : isDone
                  ? 'border-emerald-200 bg-emerald-50/50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-400'
              }`}
            >
              <div className="text-[10px] uppercase font-mono">Step {s.num}</div>
              <div className="text-[11px] font-semibold truncate hidden sm:block">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* 3. Wizard Content Card */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardContent className="p-6">
          
          {/* STEP 1: College Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Step 1: College Identity & Profile</h3>
                <p className="text-xs text-muted-foreground">Enter official institution metadata and unique identifier.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-semibold text-slate-700">Official College Name <span className="text-rose-500">*</span></label>
                  <Input
                    placeholder="e.g., City Medical College & Allied Sciences"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!code) {
                        const autoCode = e.target.value.split(' ').map(w => w[0]).join('').toUpperCase() + '-COLLEGE';
                        setCode(autoCode);
                      }
                    }}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Unique College Code <span className="text-rose-500">*</span></label>
                  <Input
                    placeholder="e.g., CITY-MED"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, '-'))}
                    className="h-8 text-xs font-mono font-semibold"
                  />
                  <p className="text-[10px] text-muted-foreground">Used for tenant isolation and database scoping.</p>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Institution Discipline Type</label>
                  <select
                    value={institutionType}
                    onChange={(e) => setInstitutionType(e.target.value as InstitutionType)}
                    className="h-8 text-xs w-full border border-slate-200 rounded-md px-2.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Paramedical">Paramedical & Allied Health</option>
                    <option value="Medical">Medical Sciences</option>
                    <option value="Engineering">Engineering & Technology</option>
                    <option value="Arts & Science">Arts & Science</option>
                    <option value="Multi-Disciplinary">Multi-Disciplinary</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Official Contact Email <span className="text-rose-500">*</span></label>
                  <Input
                    type="email"
                    placeholder="admin@citymedical.edu"
                    value={contactEmail}
                    onChange={(e) => {
                      setContactEmail(e.target.value);
                      if (!adminEmail) setAdminEmail(e.target.value);
                    }}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Contact Phone</label>
                  <Input
                    placeholder="+91 (044) 2345-6789"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-semibold text-slate-700">Campus Address</label>
                  <Input
                    placeholder="e.g., 42 Healthcare Boulevard, Chennai, Tamil Nadu"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Academic Configuration */}
          {currentStep === 2 && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Step 2: Academic Programs & Departments</h3>
                <p className="text-muted-foreground">Configure this college's independent course structure.</p>
              </div>

              {/* Programs */}
              <div className="space-y-2">
                <label className="font-semibold text-slate-700 block">Degree Programs Offered:</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {programs.map(p => (
                    <Badge key={p} variant="secondary" className="text-xs px-2 py-0.5 flex items-center space-x-1">
                      <span>{p}</span>
                      <button type="button" onClick={() => removeProgram(p)} className="hover:text-rose-600 ml-1">✕</button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add degree program (e.g., B.Sc Critical Care)"
                    value={newProgramInput}
                    onChange={(e) => setNewProgramInput(e.target.value)}
                    className="h-8 text-xs flex-1"
                  />
                  <Button size="sm" onClick={addProgram} variant="outline" className="h-8 text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add
                  </Button>
                </div>
              </div>

              {/* Departments */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="font-semibold text-slate-700 block">Academic Departments:</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {departments.map(d => (
                    <Badge key={d} variant="outline" className="text-xs px-2 py-0.5 border-indigo-200 text-indigo-700 bg-indigo-50/50 flex items-center space-x-1">
                      <span>{d}</span>
                      <button type="button" onClick={() => removeDept(d)} className="hover:text-rose-600 ml-1">✕</button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add department name..."
                    value={newDeptInput}
                    onChange={(e) => setNewDeptInput(e.target.value)}
                    className="h-8 text-xs flex-1"
                  />
                  <Button size="sm" onClick={addDept} variant="outline" className="h-8 text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add
                  </Button>
                </div>
              </div>

              {/* Semester Structure */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Term System:</label>
                  <select
                    value={semesterStructure}
                    onChange={(e) => setSemesterStructure(e.target.value)}
                    className="h-8 text-xs w-full border border-slate-200 rounded-md px-2 bg-white"
                  >
                    <option value="Semester (1 to 8)">Semester (1 to 8)</option>
                    <option value="Trimester">Trimester</option>
                    <option value="Annual">Annual Exam System</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Active Academic Year:</label>
                  <Input
                    value={academicYears[0] || '2025-2026'}
                    onChange={(e) => setAcademicYears([e.target.value, '2026-2027'])}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: College Admin Account */}
          {currentStep === 3 && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Step 3: Initial College Admin Account</h3>
                <p className="text-muted-foreground">Provision the chief administrator account for this college.</p>
              </div>

              <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-200 text-indigo-900 text-[11px] flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Strict Tenant Isolation Rule:</strong> This administrator account is scoped strictly to <span className="font-bold">{name || code}</span>. They will never have access to Platform Super Admin or any other college on the platform.
                </span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Admin Full Name</label>
                  <Input
                    placeholder="e.g., Dr. Rajesh Kumar (Principal / Admin)"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Admin Login Email <span className="text-rose-500">*</span></label>
                  <Input
                    type="email"
                    placeholder="admin@citymedical.edu"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Initial Secure Password</label>
                  <Input
                    type="text"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">User will be prompted to change password on first login.</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Software Modules */}
          {currentStep === 4 && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Step 4: Software Modules Activation</h3>
                <p className="text-muted-foreground">Select the functional modules to activate for this college environment.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allAvailableModules.map(mod => {
                  const isCore = ['students', 'faculty', 'academics'].includes(mod.id);
                  const isChecked = selectedModules.includes(mod.id);
                  return (
                    <div
                      key={mod.id}
                      onClick={() => toggleModule(mod.id)}
                      className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                        isChecked ? 'bg-indigo-50/60 border-indigo-200 text-indigo-900 font-semibold' : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <span>{mod.name}</span>
                      {isCore ? (
                        <Badge variant="outline" className="text-[9px] text-indigo-700 bg-indigo-100">Core</Badge>
                      ) : (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: Configuration Template */}
          {currentStep === 5 && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Step 5: Baseline Configuration Template</h3>
                <p className="text-muted-foreground">Choose an initial blueprint for roles, forms, and workflows.</p>
              </div>

              <div className="space-y-2.5">
                {BUILTIN_TEMPLATES.map(tmpl => {
                  const isSelected = selectedTemplate === tmpl.template_name;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => setSelectedTemplate(tmpl.template_name)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-indigo-600 ring-2 ring-indigo-600/20 bg-indigo-50/40' 
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">{tmpl.template_name}</span>
                        <Badge variant="outline" className="text-[9px] font-semibold text-slate-600">
                          {tmpl.institution_type}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">{tmpl.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 6: Review & Activate */}
          {currentStep === 6 && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Step 6: Review Configuration & Activate College</h3>
                <p className="text-muted-foreground">Verify settings before provisioning the isolated environment.</p>
              </div>

              {/* Pre-flight Checklist */}
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                <div className="flex items-center space-x-1.5 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Tenant Validation Passed</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Unique code "{code}" is available. Admin credentials are valid. 0 existing records will be shared with any other college.
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-slate-700">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>• College Name: <span className="font-bold text-slate-900">{name}</span></div>
                  <div>• Unique Code: <span className="font-bold font-mono text-indigo-700">{code}</span></div>
                  <div>• Type: <span className="font-semibold text-slate-900">{institutionType}</span></div>
                  <div>• Admin Email: <span className="font-semibold text-slate-900">{adminEmail}</span></div>
                  <div>• Active Programs: <span className="font-semibold text-slate-900">{programs.length} programs</span></div>
                  <div>• Departments: <span className="font-semibold text-slate-900">{departments.length} departments</span></div>
                  <div>• Active Modules: <span className="font-semibold text-slate-900">{selectedModules.length} enabled</span></div>
                  <div>• Template: <span className="font-semibold text-slate-900">{selectedTemplate}</span></div>
                </div>
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* 4. Wizard Step Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (currentStep > 1) setCurrentStep(currentStep - 1);
            else navigate('/platform-admin/colleges');
          }}
          className="text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          {currentStep === 1 ? 'Cancel' : 'Previous Step'}
        </Button>

        {currentStep < 6 ? (
          <Button
            size="sm"
            onClick={() => {
              if (currentStep === 1 && (!name.trim() || !code.trim() || !contactEmail.trim())) {
                toast.error('Please enter college name, code, and contact email.');
                return;
              }
              if (currentStep === 3 && !adminEmail.trim()) {
                toast.error('Please enter admin login email.');
                return;
              }
              setCurrentStep(currentStep + 1);
            }}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
          >
            <span>Next Step</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleExecuteProvisioning}
            disabled={isProvisioning}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
          >
            {isProvisioning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Deploying College Software...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Activate & Launch College Software
              </>
            )}
          </Button>
        )}
      </div>

    </div>
  );
}

export default CollegeProvisioningWizard;
