import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { PenTool, Calendar, Users, Award, Plus, Loader2 } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useToast } from '@/hooks/use-toast';
import { OFFICIAL_COURSES } from '@/constants/courses';
import type { AdmissionEntranceTest } from '@/types/database.types';

export const EntranceTest = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<AdmissionEntranceTest[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    test_name: '',
    course_name: OFFICIAL_COURSES[0].name,
    test_date: new Date().toISOString().split('T')[0],
    start_time: '10:00 AM',
    end_time: '01:00 PM',
    venue: 'Campus Examination Hall 1',
    max_marks: 100,
    registered_count: 0,
    qualified_count: 0
  });

  const loadTests = useCallback(async () => {
    try {
      const data = await db.getAdmissionEntranceTests();
      setTests(data);
    } catch (err) {
      console.error('Failed to load entrance tests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  useRealtimeSubscription({ table: 'admission_entrance_tests', onChange: loadTests, onReconnect: loadTests });

  const handleCreateTest = async () => {
    if (!formData.test_name.trim()) {
      toast({ title: 'Validation Error', description: 'Test name is required.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const created = await db.addAdmissionEntranceTest({
        test_name: formData.test_name.trim(),
        course_name: formData.course_name,
        test_date: formData.test_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        venue: formData.venue,
        max_marks: Number(formData.max_marks) || 100,
        registered_count: Number(formData.registered_count) || 0,
        qualified_count: Number(formData.qualified_count) || 0,
        status: 'Scheduled'
      });

      if (created) {
        toast({ title: 'Entrance Test Scheduled', description: `${formData.test_name} has been added.` });
        setIsCreateOpen(false);
        setFormData({
          test_name: '',
          course_name: OFFICIAL_COURSES[0].name,
          test_date: new Date().toISOString().split('T')[0],
          start_time: '10:00 AM',
          end_time: '01:00 PM',
          venue: 'Campus Examination Hall 1',
          max_marks: 100,
          registered_count: 0,
          qualified_count: 0
        });
        loadTests();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const scheduledCount = tests.filter(t => t.status === 'Scheduled').length;
  const completedCount = tests.filter(t => t.status === 'Completed').length;
  const totalRegistered = tests.reduce((sum, t) => sum + (t.registered_count || 0), 0);
  const totalQualified = tests.reduce((sum, t) => sum + (t.qualified_count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Entrance Test Management</h2>
          <p className="text-muted-foreground">Manage entrance tests and candidate evaluations across all 9 programs</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Schedule Entrance Test
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule Entrance Test</DialogTitle>
              <DialogDescription>Create a new admission assessment test</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label htmlFor="t-name">Test Name</Label>
                <Input
                  id="t-name"
                  value={formData.test_name}
                  onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
                  placeholder="e.g. Allied Health Common Entrance"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="t-course">Target Program / Course</Label>
                <Select
                  value={formData.course_name}
                  onValueChange={(val) => setFormData({ ...formData, course_name: val })}
                >
                  <SelectTrigger id="t-course">
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
                  <Label htmlFor="t-date">Test Date</Label>
                  <Input
                    id="t-date"
                    type="date"
                    value={formData.test_date}
                    onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="t-venue">Venue</Label>
                  <Input
                    id="t-venue"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="t-start">Start Time</Label>
                  <Input
                    id="t-start"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="t-end">End Time</Label>
                  <Input
                    id="t-end"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateTest} disabled={submitting}>
                {submitting ? 'Scheduling...' : 'Save & Schedule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <PenTool className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{loading ? '…' : scheduledCount}</p>
            <p className="text-sm text-muted-foreground">Scheduled Tests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">{loading ? '…' : totalRegistered}</p>
            <p className="text-sm text-muted-foreground">Registered Candidates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="h-8 w-8 mx-auto text-amber-500 mb-2" />
            <p className="text-2xl font-bold">{loading ? '…' : completedCount}</p>
            <p className="text-sm text-muted-foreground">Completed Tests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Award className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold">{loading ? '…' : totalQualified}</p>
            <p className="text-sm text-muted-foreground">Qualified Candidates</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entrance Tests Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : tests.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No entrance tests scheduled yet. Click "Schedule Entrance Test" above to create one.
            </p>
          ) : (
            <div className="space-y-3">
              {tests.map((test) => (
                <div key={test.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{test.test_name}</h3>
                    <p className="text-xs font-medium text-primary mt-0.5">{test.course_name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {test.test_date} • {test.start_time} - {test.end_time} • {test.venue}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Badge variant={test.status === 'Scheduled' ? 'default' : 'secondary'}>
                      {test.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
