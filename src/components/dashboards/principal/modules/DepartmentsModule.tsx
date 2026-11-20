import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Building2, 
  Search, 
  Users, 
  GraduationCap, 
  Clock, 
  BookOpen, 
  Eye, 
  ChevronRight, 
  Layers,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { Department, Profile } from '@/types/database.types';

interface DepartmentsModuleProps {
  departments: Department[];
  students: Profile[];
  faculty: Profile[];
}

export function DepartmentsModule({
  departments,
  students,
  faculty
}: DepartmentsModuleProps) {
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const filteredDepartments = useMemo(() => {
    return departments.filter(d => 
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.code && d.code.toLowerCase().includes(search.toLowerCase()))
    );
  }, [departments, search]);

  const handleOpenDetails = (dept: Department) => {
    setSelectedDept(dept);
    setDetailsOpen(true);
  };

  // Associated students and faculty for selected department
  const selectedDeptStudents = useMemo(() => {
    if (!selectedDept) return [];
    const norm = selectedDept.name.toLowerCase();
    return students.filter(s => {
      const d = (s.department || '').toLowerCase();
      const c = (s.class_name || '').toLowerCase();
      return d.includes(norm) || norm.includes(d) || c.includes(norm);
    });
  }, [selectedDept, students]);

  const selectedDeptFaculty = useMemo(() => {
    if (!selectedDept) return [];
    const norm = selectedDept.name.toLowerCase();
    return faculty.filter(f => {
      const d = (f.department || '').toLowerCase();
      const c = (f.assigned_classes || []).map((x: string) => x.toLowerCase());
      return d.includes(norm) || norm.includes(d) || c.some((x: string) => x.includes(norm));
    });
  }, [selectedDept, faculty]);

  return (
    <div className="space-y-5">
      {/* Module Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <span>Academic Departments & Curriculum Programs</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Central repository of all registered Paramedical & Allied Health Sciences departments
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search departments or codes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-white"
          />
        </div>
      </div>

      {/* Department Cards Grid */}
      {filteredDepartments.length === 0 ? (
        <Card className="bg-white border-slate-200 p-12 text-center">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">No Matching Departments Found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {departments.length === 0 ? 'No departments currently registered in the database.' : 'Try adjusting your search criteria.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepartments.map((dept) => {
            const norm = dept.name.toLowerCase();
            const enrolled = students.filter(s => {
              const d = (s.department || '').toLowerCase();
              const c = (s.class_name || '').toLowerCase();
              return d.includes(norm) || norm.includes(d) || c.includes(norm);
            }).length;

            const assignedTeachers = faculty.filter(f => {
              const d = (f.department || '').toLowerCase();
              const c = (f.assigned_classes || []).map((x: string) => x.toLowerCase());
              return d.includes(norm) || norm.includes(d) || c.some((x: string) => x.includes(norm));
            }).length;

            return (
              <Card 
                key={dept.id} 
                className="bg-white border-slate-200 shadow-2xs hover:border-primary/50 transition-all flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] font-bold text-primary bg-primary/5">
                      {dept.code || 'PARAMED'}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {dept.duration} {dept.duration > 1 ? 'Years' : 'Year'}
                    </span>
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900 mt-1 line-clamp-2">
                    {dept.name}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-3">
                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-lg text-center text-xs">
                    <div>
                      <span className="block text-[10px] text-muted-foreground uppercase tracking-wider">Students</span>
                      <strong className="text-slate-900 font-bold">{enrolled}</strong>
                    </div>
                    <div>
                      <span className="block text-[10px] text-muted-foreground uppercase tracking-wider">Faculty</span>
                      <strong className="text-slate-900 font-bold">{assignedTeachers}</strong>
                    </div>
                    <div>
                      <span className="block text-[10px] text-muted-foreground uppercase tracking-wider">Sections</span>
                      <strong className="text-slate-900 font-bold">{dept.sections?.length || 1}</strong>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDetails(dept)}
                    className="w-full h-8 text-xs font-medium justify-between hover:bg-slate-100"
                  >
                    <span>View Department Details</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Department Detail Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-xl bg-white p-6 rounded-2xl max-h-[85vh] overflow-y-auto">
          {selectedDept && (
            <>
              <DialogHeader>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs font-bold text-primary bg-primary/5">
                    {selectedDept.code || 'PARAMED'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Duration: {selectedDept.duration} {selectedDept.duration > 1 ? 'Years' : 'Year'}
                  </span>
                </div>
                <DialogTitle className="text-base font-bold text-slate-900 mt-1">
                  {selectedDept.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Associated students, faculty instructors, and section allocations
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-3 text-xs">
                {/* Stats Bar */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl text-center">
                  <div>
                    <span className="block text-[10px] text-muted-foreground uppercase">Enrolled Students</span>
                    <strong className="text-base text-slate-900">{selectedDeptStudents.length}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted-foreground uppercase">Assigned Teachers</span>
                    <strong className="text-base text-slate-900">{selectedDeptFaculty.length}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted-foreground uppercase">Active Sections</span>
                    <strong className="text-base text-slate-900">{selectedDept.sections?.length || 1}</strong>
                  </div>
                </div>

                {/* Faculty List */}
                <div>
                  <h4 className="font-bold text-slate-800 text-xs mb-1.5 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Department Faculty ({selectedDeptFaculty.length})</span>
                  </h4>
                  {selectedDeptFaculty.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic p-2 bg-slate-50 rounded">No faculty currently assigned to this department.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 border rounded-lg overflow-hidden">
                      {selectedDeptFaculty.map(f => (
                        <div key={f.id} className="p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-slate-900">{f.name}</span>
                            <span className="text-[10px] text-muted-foreground block">{f.email}</span>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">
                            {f.designation || 'Faculty Member'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Students List */}
                <div>
                  <h4 className="font-bold text-slate-800 text-xs mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>Enrolled Students ({selectedDeptStudents.length})</span>
                  </h4>
                  {selectedDeptStudents.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic p-2 bg-slate-50 rounded">No students currently enrolled in this department.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 border rounded-lg max-h-48 overflow-y-auto">
                      {selectedDeptStudents.map(s => (
                        <div key={s.id} className="p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-slate-900">{s.name}</span>
                            <span className="text-[10px] text-muted-foreground block">
                              ID: {s.student_id || s.email} • {s.class_name || 'Year 1'}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50">
                            Active
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
