import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  BookOpen, 
  Library, 
  Search, 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  QrCode, 
  UserCheck,
  BookmarkCheck,
  Calendar
} from 'lucide-react';
import { db } from '@/services/supabase/database';
import { LibraryCirculation, LibraryBook, Profile } from '@/types/database.types';

const IS_UUID = (v?: string | null): v is string => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export default function LibrarianDashboard() {
  const [circulations, setCirculations] = useState<LibraryCirculation[]>([]);
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issuing, setIssuing] = useState(false);

  // Issue book form
  const [formData, setFormData] = useState({
    selected_book_id: '',
    book_title: '',
    accession_no: '',
    user_name: '',
    roll_number: '',
    user_role: 'Student',
    due_days: 14,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [circData, booksData, profilesData] = await Promise.all([
        db.getLibraryCirculation(),
        db.getLibraryBooks(),
        db.getStudentDirectory().catch(() => [])
      ]);

      setCirculations(circData || []);
      setBooks(booksData || []);
      setProfiles(profilesData || []);
    } catch (err) {
      console.warn('Failed to load library circulation data:', err);
      setCirculations([]);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReturnBook = async (id: string, fine: number) => {
    const success = await db.returnLibraryBook(id, fine > 0);
    if (success) {
      await loadData();
    } else {
      setCirculations(prev => prev.map(c => c.id === id ? { ...c, return_date: new Date().toISOString().split('T')[0], fine_paid: true, status: 'Returned' } : c));
    }
  };

  const handleIssueBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIssuing(true);
      const today = new Date();
      const dueDate = new Date(today.getTime() + formData.due_days * 86400000);

      const matchedProfile = profiles.find(p => 
        (p.roll_number && p.roll_number.toLowerCase() === formData.roll_number.toLowerCase()) ||
        (p.email && p.email.toLowerCase() === formData.roll_number.toLowerCase())
      );
      const resolvedUserId = matchedProfile?.id && IS_UUID(matchedProfile.id) ? matchedProfile.id : undefined;
      const resolvedBookId = IS_UUID(formData.selected_book_id) ? formData.selected_book_id : undefined;

      const newCirc: Partial<LibraryCirculation> = {
        book_id: resolvedBookId,
        book_title: formData.book_title,
        accession_no: formData.accession_no || `ACC-${Date.now().toString().slice(-6)}`,
        user_id: resolvedUserId,
        user_name: formData.user_name || matchedProfile?.name || 'Borrower',
        user_role: formData.user_role,
        issue_date: today.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        overdue_days: 0,
        fine_amount: 0,
        fine_paid: false,
        status: 'Issued'
      };

      const res = await db.issueLibraryCirculation(newCirc);
      if (res) {
        await loadData();
        setFormData({
          selected_book_id: '',
          book_title: '',
          accession_no: '',
          user_name: '',
          roll_number: '',
          user_role: 'Student',
          due_days: 14,
        });
      }
      setIssueModalOpen(false);
    } catch (err) {
      console.error('Error issuing book:', err);
    } finally {
      setIssuing(false);
    }
  };

  const activeIssues = useMemo(() => circulations.filter(c => !c.return_date), [circulations]);
  const overdueIssues = useMemo(() => activeIssues.filter(c => c.overdue_days > 0), [activeIssues]);

  const filtered = useMemo(() => {
    if (!searchQuery) return circulations;
    const q = searchQuery.toLowerCase();
    return circulations.filter(c => 
      c.book_title.toLowerCase().includes(q) ||
      c.accession_no.toLowerCase().includes(q) ||
      c.user_name.toLowerCase().includes(q)
    );
  }, [circulations, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Directorate Banner */}
      <div className="bg-white p-5 border border-slate-200/80 rounded-2xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-[#071E47] text-white flex items-center justify-center font-bold text-base shadow-xs">
            <Library className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Central Library & Resource Circulation Desk
              </h1>
              <Badge className="bg-blue-100 text-blue-800 text-[10px] font-bold border-blue-200">
                RFID & Barcode Enabled
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Adhityan Institution of Paramedical Sciences | Central Medical & Clinical Resource Library
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          <Button variant="outline" size="sm" onClick={loadData} className="h-9 text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setIssueModalOpen(true)}
            className="h-9 text-xs font-semibold bg-[#1D61E7] hover:bg-blue-700 text-white shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Issue Book / Journal
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border-slate-200/80 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Total Cataloged Volumes</span>
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-black text-slate-900">{books.reduce((s, b: any) => s + Number(b.total_copies ?? b.copies ?? 1), 0)}</div>
            <span className="text-[11px] text-slate-500">{books.length} titles</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/80 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Currently Issued</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{activeIssues.length}</div>
            <span className="text-[11px] text-slate-500">To Students & Faculty</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/80 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Overdue Alerts</span>
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-700">{overdueIssues.length}</div>
            <span className="text-[11px] text-slate-500">₹ 5 / day fine applicable</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/80 shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Digital IEEE / DELNET</span>
              <BookmarkCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-800">Active</div>
            <span className="text-[11px] text-emerald-600 font-semibold">Campus Intranet Access</span>
          </CardContent>
        </Card>
      </div>

      {/* Circulation Ledger Table */}
      <Card className="bg-white border-slate-200/80 shadow-2xs">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Library Book Circulation Ledger ({filtered.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Track active issues, return dates, student card authorizations, and overdue fines.
            </CardDescription>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by accession # / title / student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-xs bg-slate-50/50"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="p-3">Accession No.</th>
                  <th className="p-3">Book Title</th>
                  <th className="p-3">Borrower Details</th>
                  <th className="p-3">Issue Date</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Overdue Fine</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => {
                  const isReturned = !!c.return_date;
                  const isOverdue = !isReturned && c.overdue_days > 0;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {c.accession_no}
                      </td>
                      <td className="p-3 font-semibold text-slate-900 max-w-xs truncate">
                        {c.book_title}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{c.user_name}</div>
                        <div className="text-[10px] text-slate-500">{c.user_role}</div>
                      </td>
                      <td className="p-3 font-mono text-slate-600 text-[11px]">{c.issue_date}</td>
                      <td className="p-3 font-mono text-slate-600 text-[11px]">{c.due_date}</td>
                      <td className="p-3 font-mono text-xs">
                        {c.fine_amount > 0 ? (
                          <span className="font-bold text-rose-600">₹ {c.fine_amount} ({c.overdue_days}d)</span>
                        ) : (
                          <span className="text-slate-400">₹ 0</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge
                          className={`text-[10px] font-semibold ${
                            isReturned
                              ? 'bg-slate-100 text-slate-700 border-slate-200'
                              : isOverdue
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {isReturned ? 'Returned' : isOverdue ? 'Overdue' : 'Active Issue'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        {!isReturned && (
                          <Button
                            size="sm"
                            onClick={() => handleReturnBook(c.id, c.fine_amount)}
                            className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Return Book
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Issue Book Modal */}
      <Dialog open={issueModalOpen} onOpenChange={setIssueModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span>Issue Library Book / Volume</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleIssueBook} className="space-y-3 pt-2 text-xs">
            {books.length > 0 && (
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Select Library Catalog Title</label>
                <select
                  value={formData.selected_book_id}
                  onChange={(e) => {
                    const bk = books.find(b => b.id === e.target.value);
                    if (bk) {
                      setFormData(prev => ({
                        ...prev,
                        selected_book_id: bk.id,
                        book_title: bk.title,
                        accession_no: bk.book_code || bk.isbn || prev.accession_no || `ACC-${Date.now().toString().slice(-6)}`
                      }));
                    } else {
                      setFormData(prev => ({ ...prev, selected_book_id: '' }));
                    }
                  }}
                  className="w-full h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">-- Choose from available catalog ({books.length} titles) --</option>
                  {books.map(b => (
                    <option key={b.id} value={b.id} disabled={(b.available_copies ?? 0) <= 0}>
                      {b.title} (Available: {b.available_copies ?? 0}/{b.total_copies ?? 1}) {(b.available_copies ?? 0) <= 0 ? '[OUT OF STOCK]' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Accession Barcode #</label>
              <Input
                required
                value={formData.accession_no}
                onChange={(e) => setFormData({ ...formData, accession_no: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Book Title</label>
              <Input
                required
                value={formData.book_title}
                onChange={(e) => setFormData({ ...formData, book_title: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Borrower Name</label>
                <Input
                  required
                  value={formData.user_name}
                  onChange={(e) => setFormData({ ...formData, user_name: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Student Roll / Staff ID</label>
                <Input
                  required
                  value={formData.roll_number}
                  onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Borrower Role</label>
                <select
                  value={formData.user_role}
                  onChange={(e) => setFormData({ ...formData, user_role: e.target.value })}
                  className="w-full h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="Student">Student (14 Days)</option>
                  <option value="Teacher">Teaching Faculty (30 Days)</option>
                  <option value="Staff">Non-Teaching Staff</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Loan Duration (Days)</label>
                <Input
                  type="number"
                  required
                  value={formData.due_days}
                  onChange={(e) => setFormData({ ...formData, due_days: Number(e.target.value) })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIssueModalOpen(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={issuing} className="h-8 text-xs bg-[#1D61E7] text-white">
                {issuing ? 'Processing...' : 'Authorize & Issue'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

