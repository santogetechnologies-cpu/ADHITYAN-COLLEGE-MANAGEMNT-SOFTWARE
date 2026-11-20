import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Users, 
  Search, 
  Filter, 
  Eye, 
  GraduationCap, 
  Clock, 
  Calendar, 
  Award, 
  ShieldCheck, 
  CreditCard,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { Profile, Department, Certificate, DisciplinaryIncident } from '@/types/database.types';
import { CustomFieldsViewer } from '@/components/customizer/CustomFieldsViewer';

interface StudentsModuleProps {
  students: Profile[];
  departments: Department[];
  certificates: Certificate[];
  disciplinaryIncidents?: DisciplinaryIncident[];
}

export function StudentsModule({
  students,
  departments,
  certificates,
  disciplinaryIncidents = []
}: StudentsModuleProps) {
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = 
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase()) ||
        (s.student_id && s.student_id.toLowerCase().includes(search.toLowerCase())) ||
        (s.phone && s.phone.includes(search));

      const matchesDept = 
        selectedDept === 'all' || 
        (s.department && s.department.toLowerCase().includes(selectedDept.toLowerCase())) ||
        (s.class_name && s.class_name.toLowerCase().includes(selectedDept.toLowerCase()));

      return matchesSearch && matchesDept;
    });
  }, [students, search, selectedDept]);

  const handleOpenStudentProfile = (student: Profile) => {
    setSelectedStudent(student);
    setProfileOpen(true);
  };

  // Student specific details
  const studentCerts = useMemo(() => {
    if (!selectedStudent) return [];
    return certificates.filter(c => 
      c.student_id === selectedStudent.id || 
      c.student_name.toLowerCase() === selectedStudent.name.toLowerCase() ||
      c.roll_number === selectedStudent.student_id
    );
  }, [selectedStudent, certificates]);

  const studentIncidents = useMemo(() => {
    if (!selectedStudent) return [];
    return disciplinaryIncidents.filter(inc => 
      inc.student_name.toLowerCase() === selectedStudent.name.toLowerCase() ||
      inc.roll_no === selectedStudent.student_id
    );
  }, [selectedStudent, disciplinaryIncidents]);

  return (
    <div className="space-y-5">
      {/* Module Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span>Central Student Database ({students.length})</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Active enrolled students across all Paramedical & Allied Health degree programs
          </p>
        </div>

        {/* Search & Department Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search name, roll no, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-white"
            />
          </div>

          <Select value={selectedDept} onValueChange={setSelectedDept}>
            <SelectTrigger className="h-8 text-xs w-full sm:w-48 bg-white">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.name}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Students Table */}
      <Card className="bg-white border-slate-200 shadow-2xs overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-xs font-bold text-slate-700">Student Name & ID</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Program / Department</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Class / Year</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Contact</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-right">Profile</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-xs">
                  <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-800">No Students Found</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {students.length === 0 ? 'No student records in the database.' : 'Try adjusting your search or department filter.'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((s) => (
                <TableRow key={s.id} className="hover:bg-slate-50/70 transition-colors">
                  <TableCell className="py-2.5">
                    <div className="font-semibold text-xs text-slate-900">{s.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      ID: {s.student_id || 'ST-' + s.id.slice(0, 6).toUpperCase()}
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 text-xs text-slate-700">
                    {s.department || 'Paramedical Sciences'}
                  </TableCell>
                  <TableCell className="py-2.5 text-xs text-slate-700">
                    <Badge variant="outline" className="text-[10px] bg-slate-50 font-medium">
                      {s.class_name || 'Year 1 (Semester 1)'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2.5 text-xs text-muted-foreground">
                    <div>{s.email}</div>
                    <div className="text-[10px]">{s.phone || '—'}</div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <Badge className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border-emerald-200">
                      Enrolled
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenStudentProfile(s)}
                      className="h-7 px-2 text-xs text-primary hover:text-primary/80"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      View Dossier
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Student Profile Modal */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-xl bg-white p-6 rounded-2xl max-h-[85vh] overflow-y-auto">
          {selectedStudent && (
            <>
              <DialogHeader>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-[10px] font-bold text-emerald-700 bg-emerald-50">
                    Active Student
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    ID: {selectedStudent.student_id || selectedStudent.id.slice(0, 8)}
                  </span>
                </div>
                <DialogTitle className="text-lg font-bold text-slate-900 mt-1">
                  {selectedStudent.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {selectedStudent.department || 'Paramedical Sciences'} • {selectedStudent.class_name || 'Year 1'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-3 text-xs">
                {/* Contact & Personal Information */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block">Email Address</span>
                    <strong className="text-slate-800">{selectedStudent.email}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block">Contact Phone</span>
                    <strong className="text-slate-800">{selectedStudent.phone || '—'}</strong>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-200/60 mt-1">
                    <span className="text-[10px] text-muted-foreground uppercase block">Residential Address</span>
                    <span className="text-slate-700">{selectedStudent.address || 'On file with Admissions'}</span>
                  </div>

                  {/* Dynamic Custom Institutional Attributes */}
                  <div className="col-span-2">
                    <CustomFieldsViewer
                      customFields={(selectedStudent as any).custom_fields || (selectedStudent as any).preferences?.custom_fields}
                    />
                  </div>
                </div>

                {/* Issued Certificates */}
                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1.5 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-purple-600" />
                    <span>Issued Certificates & Bonafides ({studentCerts.length})</span>
                  </h4>
                  {studentCerts.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic p-2 bg-slate-50 rounded">No certificates issued yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {studentCerts.map(c => (
                        <div key={c.id} className="p-2 border rounded-lg flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-slate-900">{c.certificate_type}</span>
                            <span className="text-[10px] text-muted-foreground block">Purpose: {c.purpose || 'Official'}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Disciplinary Incidents (if any) */}
                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Disciplinary & Behavioral Records</span>
                  </h4>
                  {studentIncidents.length === 0 ? (
                    <p className="text-xs text-emerald-700 font-medium p-2 bg-emerald-50 rounded border border-emerald-200">
                      Clean conduct record. Zero disciplinary incidents reported.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {studentIncidents.map(inc => (
                        <div key={inc.id} className="p-2 border border-rose-200 bg-rose-50/50 rounded-lg text-xs">
                          <div className="font-semibold text-rose-900">{inc.incident}</div>
                          <div className="text-[10px] text-rose-700">Date: {inc.incident_date} • Severity: {inc.severity}</div>
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
