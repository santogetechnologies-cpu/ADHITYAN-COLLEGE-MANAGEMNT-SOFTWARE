import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Trophy, Medal, Award, Plus, Loader2 } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useToast } from '@/hooks/use-toast';
import { OFFICIAL_COURSES } from '@/constants/courses';
import type { AdmissionMeritEntry } from '@/types/database.types';

export const MeritList = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [meritList, setMeritList] = useState<AdmissionMeritEntry[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('All');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    student_name: '',
    course_name: OFFICIAL_COURSES[0].name,
    merit_score: 90,
    rank: 1,
    category: 'General',
    status: 'Selected' as 'Selected' | 'Waitlist' | 'Admitted'
  });

  const loadMerit = useCallback(async () => {
    try {
      const data = await db.getAdmissionMeritLists();
      setMeritList(data);
    } catch (err) {
      console.error('Failed to load merit list:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMerit();
  }, [loadMerit]);

  useRealtimeSubscription({ table: 'admission_merit_lists', onChange: loadMerit, onReconnect: loadMerit });

  const handleAddCandidate = async () => {
    if (!formData.student_name.trim()) {
      toast({ title: 'Validation Error', description: 'Student name is required.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const created = await db.addAdmissionMeritEntry({
        student_name: formData.student_name.trim(),
        course_name: formData.course_name,
        merit_score: Number(formData.merit_score) || 0,
        rank: Number(formData.rank) || 1,
        category: formData.category,
        status: formData.status
      });

      if (created) {
        toast({ title: 'Candidate Added', description: `${formData.student_name} added to merit list.` });
        setIsAddOpen(false);
        setFormData({
          student_name: '',
          course_name: OFFICIAL_COURSES[0].name,
          merit_score: 90,
          rank: meritList.length + 1,
          category: 'General',
          status: 'Selected'
        });
        loadMerit();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'Selected' | 'Waitlist' | 'Admitted') => {
    try {
      await db.updateMeritStatus(id, status);
      toast({ title: 'Status Updated', description: `Candidate status changed to ${status}.` });
      loadMerit();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const filteredList = selectedCourse === 'All' 
    ? meritList 
    : meritList.filter(m => m.course_name === selectedCourse);

  const selectedCount = meritList.filter(m => m.status === 'Selected' || m.status === 'Admitted').length;
  const waitlistCount = meritList.filter(m => m.status === 'Waitlist').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Merit List & Seat Allocation</h2>
          <p className="text-muted-foreground">Official rank lists and candidate seat allocations for all 9 programs</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Candidate to Merit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Candidate to Merit List</DialogTitle>
              <DialogDescription>Rank and allocate seat for applicant</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label htmlFor="m-name">Student Full Name</Label>
                <Input
                  id="m-name"
                  value={formData.student_name}
                  onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                  placeholder="e.g. Priya Sundaram"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="m-course">Program / Course</Label>
                <Select
                  value={formData.course_name}
                  onValueChange={(val) => setFormData({ ...formData, course_name: val })}
                >
                  <SelectTrigger id="m-course">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OFFICIAL_COURSES.map(c => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="m-score">Merit Score (out of 100)</Label>
                  <Input
                    id="m-score"
                    type="number"
                    step="0.1"
                    value={formData.merit_score}
                    onChange={(e) => setFormData({ ...formData, merit_score: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="m-rank">Rank</Label>
                  <Input
                    id="m-rank"
                    type="number"
                    value={formData.rank}
                    onChange={(e) => setFormData({ ...formData, rank: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="m-cat">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(val) => setFormData({ ...formData, category: val })}
                  >
                    <SelectTrigger id="m-cat"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="General">General</SelectItem>
                      <SelectItem value="OBC">OBC</SelectItem>
                      <SelectItem value="SC/ST">SC/ST</SelectItem>
                      <SelectItem value="Management">Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="m-status">Allocation Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val: any) => setFormData({ ...formData, status: val })}
                  >
                    <SelectTrigger id="m-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Selected">Selected</SelectItem>
                      <SelectItem value="Waitlist">Waitlist</SelectItem>
                      <SelectItem value="Admitted">Admitted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAddCandidate} disabled={submitting}>
                {submitting ? 'Adding...' : 'Add to Merit List'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Trophy className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{loading ? '…' : meritList.length}</p>
            <p className="text-sm text-muted-foreground">Ranked Candidates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Medal className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">{loading ? '…' : selectedCount}</p>
            <p className="text-sm text-muted-foreground">Selected / Admitted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Award className="h-8 w-8 mx-auto text-amber-500 mb-2" />
            <p className="text-2xl font-bold">{loading ? '…' : waitlistCount}</p>
            <p className="text-sm text-muted-foreground">Waitlisted</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle>Institutional Merit List</CardTitle>
          <div className="w-full sm:w-72">
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All 9 Programs</SelectItem>
                {OFFICIAL_COURSES.map(c => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredList.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No merit entries found for this program filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Program / Course</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredList.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-bold">#{student.rank}</TableCell>
                      <TableCell className="font-medium">{student.student_name}</TableCell>
                      <TableCell>{student.merit_score}/100</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{student.course_name}</TableCell>
                      <TableCell className="text-xs">{student.category || 'General'}</TableCell>
                      <TableCell>
                        <Badge variant={student.status === 'Selected' ? 'default' : student.status === 'Admitted' ? 'outline' : 'secondary'}>
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {student.status === 'Selected' ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs"
                            onClick={() => handleUpdateStatus(student.id, 'Admitted')}
                          >
                            Mark Admitted
                          </Button>
                        ) : student.status === 'Waitlist' ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs"
                            onClick={() => handleUpdateStatus(student.id, 'Selected')}
                          >
                            Promote
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Finalized</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
