import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  GraduationCap, 
  Search, 
  BookOpen, 
  Clock, 
  Calendar, 
  Eye, 
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Profile, Department, StaffLeaveApplication } from '@/types/database.types';

interface FacultyModuleProps {
  faculty: Profile[];
  departments: Department[];
  leaves: StaffLeaveApplication[];
}

export function FacultyModule({
  faculty,
  departments,
  leaves
}: FacultyModuleProps) {
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedFaculty, setSelectedFaculty] = useState<Profile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filteredFaculty = useMemo(() => {
    return faculty.filter(f => {
      const matchesSearch = 
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.email.toLowerCase().includes(search.toLowerCase()) ||
        (f.department && f.department.toLowerCase().includes(search.toLowerCase()));

      const matchesDept = 
        selectedDept === 'all' || 
        (f.department && f.department.toLowerCase().includes(selectedDept.toLowerCase())) ||
        (f.assigned_classes && f.assigned_classes.some((c: string) => c.toLowerCase().includes(selectedDept.toLowerCase())));

      return matchesSearch && matchesDept;
    });
  }, [faculty, search, selectedDept]);

  const handleOpenDetails = (member: Profile) => {
    setSelectedFaculty(member);
    setModalOpen(true);
  };

  const facultyLeaves = useMemo(() => {
    if (!selectedFaculty) return [];
    return leaves.filter(l => 
      l.user_id === selectedFaculty.id || 
      l.staff_name.toLowerCase() === selectedFaculty.name.toLowerCase()
    );
  }, [selectedFaculty, leaves]);

  return (
    <div className="space-y-5">
      {/* Module Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-600" />
            <span>Faculty & Academic Staff ({faculty.length})</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Teaching faculty, clinical lab preceptors, and department professors
          </p>
        </div>

        {/* Search & Department Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search faculty name or email..."
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

      {/* Faculty Table */}
      <Card className="bg-white border-slate-200 shadow-2xs overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-xs font-bold text-slate-700">Faculty Name</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Designation</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Department</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Assigned Classes</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-right">Workload</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFaculty.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-xs">
                  <GraduationCap className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-800">No Faculty Records Found</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {faculty.length === 0 ? 'No faculty accounts in the database.' : 'Try adjusting your search or department filter.'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredFaculty.map((f) => {
                const assigned = f.assigned_classes || [];
                const hasPendingLeave = leaves.some(l => 
                  (l.user_id === f.id || l.staff_name.toLowerCase() === f.name.toLowerCase()) && 
                  (l.status === 'Pending_Principal' || l.status === 'Pending_HOD')
                );

                return (
                  <TableRow key={f.id} className="hover:bg-slate-50/70 transition-colors">
                    <TableCell className="py-2.5">
                      <div className="font-semibold text-xs text-slate-900">{f.name}</div>
                      <div className="text-[10px] text-muted-foreground">{f.email}</div>
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-slate-700">
                      {f.designation || 'Faculty Member'}
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-slate-700">
                      {f.department || 'Paramedical Sciences'}
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-slate-700">
                      {assigned.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {assigned.slice(0, 2).map((c: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-[9px] bg-slate-50 py-0 px-1">
                              {c}
                            </Badge>
                          ))}
                          {assigned.length > 2 && (
                            <Badge variant="secondary" className="text-[9px] py-0 px-1">
                              +{assigned.length - 2} more
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">None assigned</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5">
                      {hasPendingLeave ? (
                        <Badge className="text-[10px] font-semibold bg-amber-100 text-amber-800 border-amber-200">
                          Leave Pending
                        </Badge>
                      ) : (
                        <Badge className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border-emerald-200">
                          Active Duty
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDetails(f)}
                        className="h-7 px-2 text-xs text-primary hover:text-primary/80"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Faculty Details Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl bg-white p-6 rounded-2xl max-h-[85vh] overflow-y-auto">
          {selectedFaculty && (
            <>
              <DialogHeader>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs font-bold text-emerald-700 bg-emerald-50">
                    {selectedFaculty.designation || 'Faculty Member'}
                  </Badge>
                </div>
                <DialogTitle className="text-lg font-bold text-slate-900 mt-1">
                  {selectedFaculty.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {selectedFaculty.department || 'Paramedical Sciences'} • {selectedFaculty.email}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-3 text-xs">
                {/* Contact & Professional Info */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block">Official Email</span>
                    <strong className="text-slate-800">{selectedFaculty.email}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block">Phone Contact</span>
                    <strong className="text-slate-800">{selectedFaculty.phone || 'On file'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block">Designation</span>
                    <strong className="text-slate-800">{selectedFaculty.designation || 'Faculty'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block">Department</span>
                    <strong className="text-slate-800">{selectedFaculty.department || 'Paramedical'}</strong>
                  </div>
                </div>

                {/* Assigned Classes */}
                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1.5 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>Assigned Classes & Teaching Roster ({(selectedFaculty.assigned_classes || []).length})</span>
                  </h4>
                  {(selectedFaculty.assigned_classes || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground italic p-2 bg-slate-50 rounded">No classes currently assigned.</p>
                  ) : (
                    <div className="space-y-1">
                      {selectedFaculty.assigned_classes?.map((c: string, idx: number) => (
                        <div key={idx} className="p-2 border rounded-lg bg-slate-50 text-xs font-semibold text-slate-800">
                          {c}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Leave Applications History */}
                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Leave Requests & Sanctions ({facultyLeaves.length})</span>
                  </h4>
                  {facultyLeaves.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic p-2 bg-slate-50 rounded">No leave requests on record.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {facultyLeaves.map(l => (
                        <div key={l.id} className="p-2 border rounded-lg flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-slate-900">{l.leave_type} ({l.total_days} days)</span>
                            <span className="text-[10px] text-muted-foreground block">{l.start_date} to {l.end_date} • {l.reason}</span>
                          </div>
                          <Badge variant="outline" className={`text-[10px] ${l.status === 'Approved' ? 'bg-emerald-50 text-emerald-800' : l.status === 'Rejected' ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-800'}`}>
                            {l.status}
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
