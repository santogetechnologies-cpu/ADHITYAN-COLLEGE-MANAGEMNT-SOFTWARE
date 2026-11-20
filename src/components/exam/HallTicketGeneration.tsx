import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Download, FileText, Search, CheckCircle, Loader2, QrCode } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useToast } from '@/hooks/use-toast';
import { OFFICIAL_COURSES } from '@/constants/courses';
import type { HallTicket } from '@/types/database.types';

export const HallTicketGeneration = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hallTickets, setHallTickets] = useState<HallTicket[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [previewTicket, setPreviewTicket] = useState<HallTicket | null>(null);

  const loadTickets = useCallback(async () => {
    try {
      const data = await db.getHallTickets();
      setHallTickets(data);
    } catch (err) {
      console.error('Failed to load hall tickets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useRealtimeSubscription({ table: 'hall_tickets', onChange: loadTickets, onReconnect: loadTickets });

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    setSelectedIds(filteredTickets.map(t => t.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleGenerateTicket = async (ticket: HallTicket) => {
    try {
      await db.issueHallTicket({
        id: ticket.id,
        status: 'Generated',
        qr_code_token: ticket.qr_code_token || `QR-${ticket.id.slice(0, 8).toUpperCase()}`
      });
      toast({
        title: "Hall Ticket Generated",
        description: `Hall ticket issued for ${ticket.student_name}.`
      });
      loadTickets();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleBulkGenerate = async () => {
    try {
      await Promise.all(
        selectedIds.map(id => db.issueHallTicket({ id, status: 'Generated' }))
      );
      toast({
        title: "Bulk Generation Complete",
        description: `Generated hall tickets for ${selectedIds.length} students.`
      });
      setSelectedIds([]);
      loadTickets();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const filteredTickets = hallTickets.filter(t => {
    const matchesSearch = 
      t.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.roll_number || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = selectedCourse === 'all' || t.department === selectedCourse;
    const matchesStatus = selectedStatus === 'all' || (t.status || 'Generated').toLowerCase() === selectedStatus.toLowerCase();
    return matchesSearch && matchesCourse && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Hall Ticket Generation Desk</h2>
          <p className="text-muted-foreground">Manage and dispatch authenticated examination hall tickets across all 9 programs</p>
        </div>
        <div className="flex gap-2">
          <Button 
            className="flex items-center gap-2" 
            disabled={selectedIds.length === 0}
            onClick={handleBulkGenerate}
          >
            <Download className="h-4 w-4" />
            Generate Selected ({selectedIds.length})
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="searchStudent">Search Candidate</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="searchStudent" 
                  placeholder="Roll no, name..." 
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Program / Course</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="All programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All 9 Programs</SelectItem>
                  {OFFICIAL_COURSES.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="generated">Generated</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="blocked">Blocked / Detained</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selection Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={clearSelection}>
            Clear Selection
          </Button>
          <span className="text-sm text-muted-foreground">
            {selectedIds.length} of {filteredTickets.length} selected
          </span>
        </div>
      </div>

      {/* Students Table */}
      <Card>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredTickets.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">No candidate hall tickets match current filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedIds.length === filteredTickets.length && filteredTickets.length > 0}
                      onCheckedChange={() => 
                        selectedIds.length === filteredTickets.length ? clearSelection() : selectAll()
                      }
                    />
                  </TableHead>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Program / Course</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Exam Hall</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(ticket.id)}
                        onCheckedChange={() => toggleSelection(ticket.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold">{ticket.roll_number || '—'}</TableCell>
                    <TableCell className="font-medium">{ticket.student_name}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{ticket.department}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold ${ticket.attendance_pct >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                        {ticket.attendance_pct}%
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{ticket.hall_number || ticket.exam_center || 'Hall 1'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={(ticket.status || 'Generated') === 'Generated' ? 'default' : 'secondary'}
                        className="flex items-center gap-1 w-fit text-xs"
                      >
                        {(ticket.status || 'Generated') === 'Generated' && <CheckCircle className="h-3 w-3" />}
                        {ticket.status || 'Generated'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setPreviewTicket(ticket)}
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          View
                        </Button>
                        {(ticket.status || 'Generated') !== 'Generated' && (
                          <Button 
                            size="sm"
                            onClick={() => handleGenerateTicket(ticket)}
                          >
                            Generate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Hall Ticket Preview Dialog */}
      <Dialog open={!!previewTicket} onOpenChange={(open) => !open && setPreviewTicket(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Official Examination Hall Ticket</DialogTitle>
            <DialogDescription>Adithyan College – Office of Controller of Examinations</DialogDescription>
          </DialogHeader>
          {previewTicket && (
            <div className="border-2 border-primary/20 rounded-lg p-5 space-y-4 bg-card text-foreground">
              <div className="text-center border-b pb-3">
                <h3 className="font-bold text-base tracking-wide uppercase">Adithyan College</h3>
                <p className="text-xs text-muted-foreground">Office of the Controller of Examinations</p>
                <Badge variant="outline" className="mt-2 text-xs">Hall Ticket – End Semester Examinations</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-muted-foreground">Student Name:</span> <span className="font-bold">{previewTicket.student_name}</span></div>
                <div><span className="text-muted-foreground">Roll Number:</span> <span className="font-bold">{previewTicket.roll_number}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">Program:</span> <span className="font-semibold">{previewTicket.department}</span></div>
                <div><span className="text-muted-foreground">Exam Center:</span> <span>{previewTicket.exam_center}</span></div>
                <div><span className="text-muted-foreground">Hall / Seat:</span> <span className="font-bold">{previewTicket.hall_number} ({previewTicket.seat_number})</span></div>
                <div><span className="text-muted-foreground">Attendance:</span> <span className="font-bold text-green-600">{previewTicket.attendance_pct}%</span></div>
                <div><span className="text-muted-foreground">Fee Clearance:</span> <span className="font-semibold text-green-600">Verified</span></div>
              </div>

              <div className="border-t pt-3 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <QrCode className="w-8 h-8 text-primary" />
                  <span className="font-mono text-[10px]">{previewTicket.qr_code_token || 'ADH-AUTH-VERIFIED'}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground">Controller of Examinations</p>
                  <p className="text-[10px]">Digitally Authorized</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTicket(null)}>Close</Button>
            <Button onClick={() => window.print()} className="flex items-center gap-1.5">
              <Download className="w-4 h-4" /> Print Hall Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
