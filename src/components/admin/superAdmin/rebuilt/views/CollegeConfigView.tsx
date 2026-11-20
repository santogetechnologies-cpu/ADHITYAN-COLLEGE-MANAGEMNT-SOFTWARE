import React, { useState, useEffect } from 'react';
import { College } from '@/types/multiCollege.types';
import { collegeDataService, CourseData, DepartmentData } from '@/services/collegeDataService';
import { 
  Building2, 
  BookOpen, 
  Layers, 
  GraduationCap, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  Settings,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface CollegeConfigViewProps {
  activeCollege: College;
}

export function CollegeConfigView({ activeCollege }: CollegeConfigViewProps) {
  const [activeTab, setActiveTab] = useState('settings');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Settings State
  const [collegeSettings, setCollegeSettings] = useState({
    name: activeCollege.name,
    code: activeCollege.code,
    contactEmail: activeCollege.contact_email || 'admin@adithyan.edu.in',
    contactPhone: activeCollege.contact_phone || '+91 (044) 2876-4100',
    minAttendance: 75,
    passingMarks: 40,
    enableRealtime: true,
    maintenanceMode: false
  });

  // Courses & Depts
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [departments, setDepartments] = useState<DepartmentData[]>([]);

  // Dialogs
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newDeptName, setNewDeptName] = useState('');

  useEffect(() => {
    loadCollegeData();
  }, [activeCollege.id]);

  const loadCollegeData = async () => {
    setIsLoading(true);
    try {
      const [cList, dList, settings] = await Promise.all([
        collegeDataService.getCourses(activeCollege.id),
        collegeDataService.getDepartments(activeCollege.id),
        collegeDataService.getInstitutionalSettings(activeCollege.id)
      ]);

      setCourses(cList);
      setDepartments(dList);
      if (settings) {
        setCollegeSettings({
          name: settings.institution_name || activeCollege.name,
          code: settings.institution_code || activeCollege.code,
          contactEmail: settings.contact_email || 'admin@adithyan.edu.in',
          contactPhone: settings.contact_phone || '+91 (044) 2876-4100',
          minAttendance: settings.min_attendance_percentage ?? 75,
          passingMarks: settings.passing_marks_percentage ?? 40,
          enableRealtime: settings.enable_realtime ?? true,
          maintenanceMode: settings.maintenance_mode ?? false
        });
      }
    } catch {
      toast.error('Failed to load college configuration from database');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await collegeDataService.saveInstitutionalSettings(activeCollege.id, {
        institution_name: collegeSettings.name,
        institution_code: collegeSettings.code,
        contact_email: collegeSettings.contactEmail,
        contact_phone: collegeSettings.contactPhone,
        min_attendance_percentage: collegeSettings.minAttendance,
        passing_marks_percentage: collegeSettings.passingMarks,
        enable_realtime: collegeSettings.enableRealtime,
        maintenance_mode: collegeSettings.maintenanceMode
      });
      toast.success('College settings saved & synchronized with Supabase');
    } catch (err: any) {
      toast.error(`Save failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCourse = async () => {
    if (!newCourseName.trim() || !newCourseCode.trim()) {
      toast.error('Course Name and Code are required');
      return;
    }
    try {
      const created = await collegeDataService.createCourse({
        name: newCourseName.trim(),
        code: newCourseCode.trim().toUpperCase(),
        department: departments[0]?.name || 'Allied Health',
        duration_years: 4,
        semester_count: 8,
        total_fee: 100000,
        college_id: activeCollege.id
      });
      setCourses(prev => [...prev, created]);
      setNewCourseName('');
      setNewCourseCode('');
      toast.success(`Course "${created.name}" created successfully`);
    } catch (err: any) {
      toast.error(`Could not create course: ${err.message || 'Error'}`);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      await collegeDataService.deleteCourse(courseId);
      setCourses(prev => prev.filter(c => c.id !== courseId));
      toast.success('Course removed');
    } catch (err: any) {
      toast.error(`Failed to delete course: ${err.message || 'Error'}`);
    }
  };

  const handleAddDepartment = async () => {
    if (!newDeptName.trim()) {
      toast.error('Department name is required');
      return;
    }
    try {
      const created = await collegeDataService.createDepartment({
        name: newDeptName.trim(),
        code: newDeptName.trim().substring(0, 4).toUpperCase(),
        college_id: activeCollege.id
      });
      setDepartments(prev => [...prev, created]);
      setNewDeptName('');
      toast.success(`Department "${created.name}" created`);
    } catch (err: any) {
      toast.error(`Could not create department: ${err.message || 'Error'}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Tenant Overview Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-indigo-600" />
              College Configuration Center
            </h2>
            <p className="text-xs text-slate-500">
              Manage institution metadata, academic policies, passing thresholds, departments, and courses for {activeCollege.name}.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
              Tenant ID: {activeCollege.id.slice(0, 8)}...
            </Badge>
            <Button
              size="sm"
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              <span>Save Configuration</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Sub-Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full bg-slate-100 p-1 rounded-xl max-w-md">
          <TabsTrigger value="settings" className="text-xs font-medium">
            <Settings className="w-3.5 h-3.5 mr-1" />
            <span>Institution & Policies</span>
          </TabsTrigger>
          <TabsTrigger value="departments" className="text-xs font-medium">
            <Layers className="w-3.5 h-3.5 mr-1" />
            <span>Departments ({departments.length})</span>
          </TabsTrigger>
          <TabsTrigger value="courses" className="text-xs font-medium">
            <BookOpen className="w-3.5 h-3.5 mr-1" />
            <span>Academic Courses ({courses.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* SUB-TAB 1: SETTINGS & POLICIES */}
        <TabsContent value="settings" className="mt-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Institutional Identification</h3>
              <p className="text-xs text-slate-500 mb-4">Official college credentials displayed on receipts, ID cards, and university transcripts.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Institution Legal Name</label>
                  <Input
                    value={collegeSettings.name}
                    onChange={(e) => setCollegeSettings({ ...collegeSettings, name: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Institution Code (Affiliation)</label>
                  <Input
                    value={collegeSettings.code}
                    onChange={(e) => setCollegeSettings({ ...collegeSettings, code: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Official Contact Email</label>
                  <Input
                    value={collegeSettings.contactEmail}
                    onChange={(e) => setCollegeSettings({ ...collegeSettings, contactEmail: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Campus Phone Helpline</label>
                  <Input
                    value={collegeSettings.contactPhone}
                    onChange={(e) => setCollegeSettings({ ...collegeSettings, contactPhone: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Academic & Examination Policies</h3>
              <p className="text-xs text-slate-500 mb-4">Rigid thresholds evaluated during hall ticket generation and semester marks finalization.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Minimum Attendance Percentage Cutoff (%)
                  </label>
                  <Input
                    type="number"
                    value={collegeSettings.minAttendance}
                    onChange={(e) => setCollegeSettings({ ...collegeSettings, minAttendance: parseFloat(e.target.value) || 75 })}
                    className="h-8 text-xs"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Students below this cutoff receive automated exam condonation warnings.</span>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Passing Marks Threshold (%)
                  </label>
                  <Input
                    type="number"
                    value={collegeSettings.passingMarks}
                    onChange={(e) => setCollegeSettings({ ...collegeSettings, passingMarks: parseFloat(e.target.value) || 40 })}
                    className="h-8 text-xs"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Minimum aggregate internal score required to clear university papers.</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-900 block">Emergency Maintenance Mode</span>
                <span className="text-slate-500 text-[11px]">When activated, portal access is restricted to administrators only.</span>
              </div>
              <Switch
                checked={collegeSettings.maintenanceMode}
                onCheckedChange={(c) => setCollegeSettings({ ...collegeSettings, maintenanceMode: c })}
              />
            </div>

          </div>
        </TabsContent>

        {/* SUB-TAB 2: DEPARTMENTS */}
        <TabsContent value="departments" className="mt-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Academic Departments</h3>
                <p className="text-xs text-slate-500">Departments governing faculty assignments, curricula, and student cohorts.</p>
              </div>

              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Department Name..."
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="h-8 text-xs w-48"
                />
                <Button size="sm" onClick={handleAddDepartment} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Dept
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {departments.map((dept) => (
                <div key={dept.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-slate-900">{dept.name}</span>
                    <span className="text-[10px] text-slate-400 block font-mono">Code: {dept.code || 'N/A'}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-white text-slate-600">Active</Badge>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* SUB-TAB 3: COURSES */}
        <TabsContent value="courses" className="mt-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Registered Academic Courses</h3>
                <p className="text-xs text-slate-500">Degree, diploma, and certification courses offering admission seats.</p>
              </div>

              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Course Name..."
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="h-8 text-xs w-44"
                />
                <Input
                  placeholder="Code (e.g. BSC-CT)..."
                  value={newCourseCode}
                  onChange={(e) => setNewCourseCode(e.target.value)}
                  className="h-8 text-xs w-28 uppercase"
                />
                <Button size="sm" onClick={handleAddCourse} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Course
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Course Name</th>
                    <th className="p-2.5">Code</th>
                    <th className="p-2.5">Department</th>
                    <th className="p-2.5">Duration</th>
                    <th className="p-2.5">Standard Fee</th>
                    <th className="p-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {courses.map(course => (
                    <tr key={course.id} className="hover:bg-slate-50/80">
                      <td className="p-2.5 font-bold text-slate-900">{course.name}</td>
                      <td className="p-2.5 font-mono text-indigo-700">{course.code}</td>
                      <td className="p-2.5 text-slate-600">{course.department}</td>
                      <td className="p-2.5 text-slate-600">{course.duration_years || 4} Years ({course.semester_count || 8} Sems)</td>
                      <td className="p-2.5 font-semibold text-emerald-700">₹{(course.total_fee || 95000).toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCourse(course.id)}
                          className="text-rose-600 hover:bg-rose-50 h-6 text-xs px-2"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

      </Tabs>

    </div>
  );
}
