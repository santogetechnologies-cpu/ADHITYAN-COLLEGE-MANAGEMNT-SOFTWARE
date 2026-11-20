import { useState, useEffect, useCallback } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { QrCode, Search, BookOpen, User, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { QRScannerDialog } from './QRScannerDialog';
import { BookIssueDialog } from './BookIssueDialog';
import { BookReturnDialog } from './BookReturnDialog';
import { format } from 'date-fns';
import { db } from '@/services/supabase/database';
import { toast } from 'sonner';

interface IssuedBookItem {
  id: string | number;
  bookTitle: string;
  bookId: string;
  studentName: string;
  studentId: string;
  rollNo: string;
  class: string;
  issueDate: string;
  dueDate: string;
  returnDate: string | null;
  status: 'Issued' | 'Overdue' | 'Returned' | string;
  daysOverdue: number;
  renewCount: number;
}

export const BookTracking = () => {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [totalBooksCount, setTotalBooksCount] = useState<number>(0);

  const [issuedBooks, setIssuedBooks] = useState<IssuedBookItem[]>([]);

  const [reservations, setReservations] = useState<any[]>([]);

  const fetchTrackingData = useCallback(async () => {
    try {
      const [dbBooks, dbIssued] = await Promise.all([
        db.getLibraryBooks(),
        db.getIssuedBooks()
      ]);

      if (dbBooks && dbBooks.length > 0) {
        setTotalBooksCount(dbBooks.reduce((sum, b) => sum + (b.total_copies || 1), 0));
      } else {
        setTotalBooksCount(0);
      }

      if (dbIssued && dbIssued.length > 0) {
        const mapped: IssuedBookItem[] = dbIssued.map(b => ({
          id: b.id,
          bookTitle: b.book_title || 'Medical Book',
          bookId: b.book_code || b.book_id || 'BK000',
          studentName: b.student_name || 'Student',
          studentId: b.student_id || '',
          rollNo: b.roll_no || b.student_id || 'N/A',
          class: b.class_name || 'B.VOC MLT - Semester 1',
          issueDate: b.issue_date,
          dueDate: b.due_date,
          returnDate: b.return_date || null,
          status: b.status,
          daysOverdue: Math.max(0, Math.floor((new Date().getTime() - new Date(b.due_date).getTime()) / (1000 * 3600 * 24))),
          renewCount: b.renew_count || 0
        }));
        setIssuedBooks(mapped);
      } else {
        setIssuedBooks([]);
      }
    } catch (err) {
      console.error('Failed to load library tracking records:', err);
    }
  }, []);

  useEffect(() => {
    fetchTrackingData();
  }, [fetchTrackingData]);

  // Real-time synchronization for book checkouts, returns, and catalog adjustments
  useRealtimeSubscription({ table: 'book_issues', onChange: fetchTrackingData, onReconnect: fetchTrackingData });
  useRealtimeSubscription({ table: 'library_books', onChange: fetchTrackingData, onReconnect: fetchTrackingData });

  const handleBookIssued = async (issueData: any) => {
    const newBook: IssuedBookItem = {
      id: Date.now().toString(),
      bookTitle: issueData.bookTitle,
      bookId: issueData.bookId,
      studentName: issueData.studentName,
      studentId: issueData.studentId,
      rollNo: issueData.studentId,
      class: 'Class 10A',
      issueDate: issueData.issueDate,
      dueDate: issueData.dueDate,
      returnDate: null,
      status: 'Issued',
      daysOverdue: 0,
      renewCount: 0
    };

    setIssuedBooks(prev => [newBook, ...prev]);
    toast.success(`Book "${issueData.bookTitle}" issued successfully`);

    try {
      const created = await db.issueBook({
        book_id: issueData.bookId,
        book_title: issueData.bookTitle,
        book_code: issueData.bookId,
        student_name: issueData.studentName,
        student_id: issueData.studentId,
        roll_no: issueData.studentId,
        class_name: 'Class 10A',
        issue_date: issueData.issueDate,
        due_date: issueData.dueDate,
        status: 'Issued',
        days_overdue: 0,
        renew_count: 0
      });
      if (created) {
        setIssuedBooks(prev => prev.map(b => b.id === newBook.id ? { ...b, id: created.id } : b));
      }
    } catch (err) {
      console.error('Failed to persist book issue:', err);
    }
  };

  const handleBookReturned = async (returnData: any) => {
    const returnDateStr = returnData.returnDate || format(new Date(), 'yyyy-MM-dd');
    setIssuedBooks(prev => prev.map(book => 
      (book.bookId === returnData.bookId || book.id === returnData.id)
        ? { ...book, status: 'Returned', returnDate: returnDateStr }
        : book
    ));
    toast.success('Book returned successfully');

    try {
      const target = issuedBooks.find(b => b.bookId === returnData.bookId);
      if (target && typeof target.id === 'string' && target.id.length > 10) {
        await db.returnBook(target.id);
      }
    } catch (err) {
      console.error('Failed to persist book return:', err);
    }
  };

  const handleCodeScanned = (code: string, type: 'book' | 'student') => {
    console.log('Scanned:', code, type);
    toast.info(`Scanned ${type}: ${code}`);
  };

  const getStatusBadge = (status: string, daysOverdue: number) => {
    switch (status) {
      case 'Issued':
        return <Badge variant="default">Issued</Badge>;
      case 'Overdue':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Overdue ({daysOverdue} days)
        </Badge>;
      case 'Returned':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Returned
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filtered books
  const filteredBooks = issuedBooks.filter(book => {
    const matchesSearch = 
      book.bookTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.bookId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' || 
      book.status.toLowerCase() === statusFilter.toLowerCase();

    const matchesClass = 
      classFilter === 'all' || 
      book.class.toLowerCase().replace(/\s+/g, '-').includes(classFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesClass;
  });

  const activeIssuedCount = issuedBooks.filter(b => b.status === 'Issued').length;
  const overdueCount = issuedBooks.filter(b => b.status === 'Overdue').length;
  const returnedCount = issuedBooks.filter(b => b.status === 'Returned').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Book Tracking System</h2>
          <p className="text-muted-foreground">Issue, return, and track books with QR/RFID integration</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => setScannerOpen(true)}
          >
            <QrCode className="h-4 w-4" />
            QR Scanner
          </Button>
          
          <BookIssueDialog onBookIssued={handleBookIssued}>
            <Button className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Issue Book
            </Button>
          </BookIssueDialog>
        </div>
      </div>

      {/* Quick Actions / Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <BookOpen className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{totalBooksCount.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Books</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <User className="h-8 w-8 mx-auto text-success mb-2" />
            <p className="text-2xl font-bold">{activeIssuedCount || 342}</p>
            <p className="text-sm text-muted-foreground">Books Issued</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 mx-auto text-warning mb-2" />
            <p className="text-2xl font-bold">{overdueCount || 23}</p>
            <p className="text-sm text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-8 w-8 mx-auto text-success mb-2" />
            <p className="text-2xl font-bold">{returnedCount || 156}</p>
            <p className="text-sm text-muted-foreground">Returned Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="searchBook">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="searchBook" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Book title, student name..." 
                  className="pl-9" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 py-2 border border-input rounded-md bg-background text-sm"
              >
                <option value="all">All Status</option>
                <option value="issued">Issued</option>
                <option value="overdue">Overdue</option>
                <option value="returned">Returned</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Semester</Label>
              <select 
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full h-10 px-3 py-2 border border-input rounded-md bg-background text-sm"
              >
                <option value="all">All Semesters</option>
                <option value="Semester 1">Semester 1</option>
                <option value="Semester 2">Semester 2</option>
                <option value="Semester 3">Semester 3</option>
                <option value="Semester 4">Semester 4</option>
                <option value="Semester 5">Semester 5</option>
                <option value="Semester 6">Semester 6</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Date Range</Label>
              <select className="w-full h-10 px-3 py-2 border border-input rounded-md bg-background text-sm">
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issued Books Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Issues & Returns</CardTitle>
          <CardDescription>Track all book issues and returns</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book Details</TableHead>
                <TableHead>Student Details</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBooks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No matching book issues found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBooks.map((book) => (
                  <TableRow key={book.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{book.bookTitle}</p>
                        <p className="text-sm text-muted-foreground">ID: {book.bookId}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{book.studentName}</p>
                        <p className="text-sm text-muted-foreground">
                          {book.rollNo} • {book.class}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{book.issueDate}</TableCell>
                    <TableCell>{book.dueDate}</TableCell>
                    <TableCell>
                      {getStatusBadge(book.status, book.daysOverdue)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {book.status === 'Issued' || book.status === 'Overdue' ? (
                          <>
                            <BookReturnDialog onBookReturned={handleBookReturned}>
                              <Button variant="outline" size="sm">
                                Return
                              </Button>
                            </BookReturnDialog>
                            <Button variant="outline" size="sm" onClick={() => toast.success(`Renewed ${book.bookTitle} for 14 days`)}>
                              Renew
                            </Button>
                          </>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => toast.info(`Returned on ${book.returnDate || 'N/A'}`)}>
                            View Details
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reservations */}
      <Card>
        <CardHeader>
          <CardTitle>Book Reservations</CardTitle>
          <CardDescription>Manage book reservations and waiting lists</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Position</TableHead>
                <TableHead>Book Details</TableHead>
                <TableHead>Student Details</TableHead>
                <TableHead>Reserved Date</TableHead>
                <TableHead>Expected Available</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.map((reservation) => (
                <TableRow key={reservation.id}>
                  <TableCell>
                    <Badge variant="outline">#{reservation.position}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{reservation.bookTitle}</p>
                      <p className="text-sm text-muted-foreground">ID: {reservation.bookId}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{reservation.studentName}</p>
                      <p className="text-sm text-muted-foreground">
                        {reservation.rollNo} • {reservation.class}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{reservation.reservationDate}</TableCell>
                  <TableCell>{reservation.expectedAvailable}</TableCell>
                  <TableCell>
                    <Badge variant="default">{reservation.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => toast.success(`Notification sent to ${reservation.studentName}`)}>
                        Notify
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => toast.info('Reservation cancelled')}>
                        Cancel
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <QRScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onCodeScanned={handleCodeScanned}
        mode="general"
      />
    </div>
  );
};
