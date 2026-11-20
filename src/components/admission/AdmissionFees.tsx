import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, CheckCircle, Clock, AlertCircle, Plus, Loader2, Download } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useToast } from '@/hooks/use-toast';
import { OFFICIAL_COURSES } from '@/constants/courses';
import { useCollegeCourses } from '@/hooks/useCollegeCourses';
import type { StudentFee, Profile } from '@/types/database.types';
import { StudentSearchSelect } from '@/components/shared/StudentSearchSelect';

export const AdmissionFees = () => {
  const { toast } = useToast();
  const { collegeCourses: coursesList } = useCollegeCourses();
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState<StudentFee[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<StudentFee | null>(null);

  const [formData, setFormData] = useState({
    student_name: '',
    program: OFFICIAL_COURSES[0].name,
    amount: 45000,
    paid_amount: 45000,
    payment_method: 'Online Banking',
    status: 'paid' as 'paid' | 'pending' | 'overdue'
  });

  const loadFees = useCallback(async () => {
    try {
      const [feeData, studentList] = await Promise.all([
        db.getStudentFees(),
        db.getAllStudents()
      ]);
      setFees(feeData || []);
      setStudents(studentList || []);
    } catch (err) {
      console.error('Failed to load admission fees:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFees();
  }, [loadFees]);

  useRealtimeSubscription({ table: 'student_fees', onChange: loadFees, onReconnect: loadFees });

  const handleRecordPayment = async () => {
    if (!selectedStudent) {
      toast({ title: 'Validation Error', description: 'Please select an enrolled student by Student ID or name.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const created = await db.createStudentFee({
        student_id: selectedStudent.id,
        student_name: selectedStudent.name,
        class_name: selectedStudent.class_name || selectedStudent.department || formData.program,
        term: 'Admission & 1st Year Tuition',
        total_due: Number(formData.amount) || 0,
        paid_amount: Number(formData.paid_amount) || 0,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: formData.status
      });

      if (created) {
        toast({ 
          title: 'Payment Recorded', 
          description: `Admission fee for ${selectedStudent.name} (${selectedStudent.student_id || selectedStudent.roll_number}) saved in Supabase.` 
        });
        setIsAddOpen(false);
        setSelectedStudent(null);
        setFormData({
          student_name: '',
          program: OFFICIAL_COURSES[0].name,
          amount: 45000,
          paid_amount: 45000,
          payment_method: 'Online Banking',
          status: 'paid'
        });
        loadFees();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const totalCollected = fees.reduce((sum, f) => sum + Number(f.paid_amount || 0), 0);
  const paidCount = fees.filter(f => f.status === 'paid').length;
  const pendingCount = fees.filter(f => f.status === 'pending' || f.status === 'partially_paid').length;
  const overdueCount = fees.filter(f => f.status === 'overdue').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Admission Fee Management</h2>
          <p className="text-muted-foreground">Track and record admission deposits and tuition fees across all 9 programs</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Record Admission Fee
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <CreditCard className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">₹{totalCollected.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Collected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">{loading ? '…' : paidCount}</p>
            <p className="text-sm text-muted-foreground">Fully Paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 mx-auto text-amber-500 mb-2" />
            <p className="text-2xl font-bold">{loading ? '…' : pendingCount}</p>
            <p className="text-sm text-muted-foreground">Pending / Balance Due</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 mx-auto text-red-600 mb-2" />
            <p className="text-2xl font-bold">{loading ? '…' : overdueCount}</p>
            <p className="text-sm text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fee Payment Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : fees.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No admission fee transactions recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Fee Term</TableHead>
                    <TableHead>Total Fee</TableHead>
                    <TableHead>Paid Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.map((payment) => {
                    const matchedStudent = students.find(s => s.id === payment.student_id);
                    const displayStudentId = matchedStudent?.student_id || matchedStudent?.roll_number || 'AIP-VERIFIED';

                    return (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.student_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs bg-primary/5 text-primary border-primary/30">
                            {displayStudentId}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{payment.term || 'Admission Fee'}</TableCell>
                        <TableCell>₹{Number(payment.total_due || 0).toLocaleString()}</TableCell>
                        <TableCell className="font-semibold text-green-700">₹{Number(payment.paid_amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-xs">{payment.due_date || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={payment.status === 'paid' ? 'default' : payment.status === 'overdue' ? 'destructive' : 'secondary'}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedReceipt(payment)}
                          >
                            View Receipt
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Fee Payment Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Admission Fee Payment</DialogTitle>
            <DialogDescription>Search student by permanent Student ID or Name to record payment</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Select Enrolled Student *</Label>
              <StudentSearchSelect
                value={selectedStudent?.id}
                onSelect={(st) => {
                  setSelectedStudent(st);
                  if (st?.department) {
                    setFormData(prev => ({ ...prev, program: st.department || prev.program }));
                  }
                }}
                placeholder="Search by AIP Student ID or Name..."
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="f-prog">Program / Course</Label>
              <Select
                value={formData.program}
                onValueChange={(val) => {
                  const match = coursesList.find(c => c.name === val) || OFFICIAL_COURSES.find(c => c.name === val);
                  setFormData({ 
                    ...formData, 
                    program: val,
                    amount: match ? match.tuitionFee : 45000,
                    paid_amount: match ? match.tuitionFee : 45000
                  });
                }}
              >
                <SelectTrigger id="f-prog"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {coursesList.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name} (₹{c.tuitionFee.toLocaleString()})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="f-amt">Total Fee (₹)</Label>
                <Input
                  id="f-amt"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="f-paid">Amount Paid (₹)</Label>
                <Input
                  id="f-paid"
                  type="number"
                  value={formData.paid_amount}
                  onChange={(e) => setFormData({ ...formData, paid_amount: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="f-method">Payment Mode</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(val) => setFormData({ ...formData, payment_method: val })}
                >
                  <SelectTrigger id="f-method"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Online Banking">Online Banking</SelectItem>
                    <SelectItem value="UPI / QR">UPI / QR Code</SelectItem>
                    <SelectItem value="Cash / Cheque">Cash / Cheque</SelectItem>
                    <SelectItem value="Demand Draft">Demand Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="f-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val: any) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger id="f-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={submitting}>
              {submitting ? 'Recording...' : 'Save Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Receipt Dialog */}
      <Dialog open={!!selectedReceipt} onOpenChange={(open) => !open && setSelectedReceipt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Official Fee Receipt</DialogTitle>
            <DialogDescription>Adithyan College – Finance & Admissions Desk</DialogDescription>
          </DialogHeader>
          {selectedReceipt && (
            <div className="p-4 border rounded-lg bg-card space-y-3 font-mono text-xs">
              <div className="border-b pb-2 flex justify-between">
                <span className="font-bold">Receipt ID: REC-{selectedReceipt.id.slice(0, 8).toUpperCase()}</span>
                <span className="text-muted-foreground">{new Date().toLocaleDateString()}</span>
              </div>
              <div><span className="text-muted-foreground">Student:</span> <span className="font-bold">{selectedReceipt.student_name}</span></div>
              <div><span className="text-muted-foreground">Student ID:</span> <span className="font-bold text-primary">{students.find(s => s.id === selectedReceipt.student_id)?.student_id || students.find(s => s.id === selectedReceipt.student_id)?.roll_number || 'AIP-VERIFIED'}</span></div>
              <div><span className="text-muted-foreground">Particulars:</span> {selectedReceipt.term || 'Admission Tuition Fee'}</div>
              <div className="flex justify-between py-1 border-t">
                <span>Total Fee Mandated:</span>
                <span className="font-bold">₹{Number(selectedReceipt.total_due || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span>Amount Realized:</span>
                <span className="font-bold text-green-600">₹{Number(selectedReceipt.paid_amount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold pt-1">
                <span>Current Status:</span>
                <span className="uppercase text-primary">{selectedReceipt.status}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReceipt(null)}>Close</Button>
            <Button onClick={() => window.print()} className="flex items-center gap-1.5">
              <Download className="w-4 h-4" /> Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
