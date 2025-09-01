import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { QrCode, Scan, Search, CalendarIcon, BookOpen, User, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { QRScannerDialog } from './QRScannerDialog';
import { BookIssueDialog } from './BookIssueDialog';
import { BookReturnDialog } from './BookReturnDialog';
import { format, addDays, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

export const BookTracking = () => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [issuedBooks, setIssuedBooks] = useState([
    {
      id: 1,
      bookTitle: 'Advanced Mathematics',
      bookId: 'BK001',
      studentName: 'John Smith',
      studentId: 'ST001',
      rollNo: '2024001',
      class: 'Class 12A',
      issueDate: '2024-03-01',
      dueDate: '2024-03-15',
      returnDate: null,
      status: 'Issued',
      daysOverdue: 0,
      renewCount: 0
    },
    {
      id: 2,
      bookTitle: 'Modern Physics',
      bookId: 'BK002',
      studentName: 'Emma Johnson',
      studentId: 'ST002',
      rollNo: '2024002',
      class: 'Class 11B',
      issueDate: '2024-02-20',
      dueDate: '2024-03-05',
      returnDate: null,
      status: 'Overdue',
      daysOverdue: 10,
      renewCount: 1
    },
    {
      id: 3,
      bookTitle: 'Chemistry Fundamentals',
      bookId: 'BK003',
      studentName: 'Michael Brown',
      studentId: 'ST003',
      rollNo: '2024003',
      class: 'Class 10A',
      issueDate: '2024-02-28',
      dueDate: '2024-03-14',
      returnDate: '2024-03-12',
      status: 'Returned',
      daysOverdue: 0,
      renewCount: 0
    }
  ]);

  const [reservations] = useState([
    {
      id: 1,
      bookTitle: 'Organic Chemistry',
      bookId: 'BK004',
      studentName: 'Sarah Wilson',
      studentId: 'ST004',
      rollNo: '2024004',
      class: 'Class 12B',
      reservationDate: '2024-03-10',
      expectedAvailable: '2024-03-20',
      status: 'Active',
      position: 1
    },
    {
      id: 2,
      bookTitle: 'Advanced Mathematics',
      bookId: 'BK001',
      studentName: 'David Lee',
      studentId: 'ST005',
      rollNo: '2024005',
      class: 'Class 12A',
      reservationDate: '2024-03-12',
      expectedAvailable: '2024-03-22',
      status: 'Active',
      position: 2
    }
  ]);

  const handleBookIssued = (issueData: any) => {
    const newBook = {
      id: Date.now(),
      bookTitle: issueData.bookTitle,
      bookId: issueData.bookId,
      studentName: issueData.studentName,
      studentId: issueData.studentId,
      rollNo: issueData.studentId, // Mock roll number
      class: 'Class 10A', // Mock class
      issueDate: issueData.issueDate,
      dueDate: issueData.dueDate,
      returnDate: null,
      status: 'Issued',
      daysOverdue: 0,
      renewCount: 0
    };
    setIssuedBooks([...issuedBooks, newBook]);
  };

  const handleBookReturned = (returnData: any) => {
    setIssuedBooks(issuedBooks.map(book => 
      book.bookId === returnData.bookId 
        ? { ...book, status: 'Returned', returnDate: returnData.returnDate }
        : book
    ));
  };

  const handleCodeScanned = (code: string, type: 'book' | 'student') => {
    console.log('Scanned:', code, type);
    // Handle scanned code logic here
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <BookOpen className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">1,247</p>
            <p className="text-sm text-muted-foreground">Total Books</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <User className="h-8 w-8 mx-auto text-success mb-2" />
            <p className="text-2xl font-bold">342</p>
            <p className="text-sm text-muted-foreground">Books Issued</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 mx-auto text-warning mb-2" />
            <p className="text-2xl font-bold">23</p>
            <p className="text-sm text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-8 w-8 mx-auto text-success mb-2" />
            <p className="text-2xl font-bold">156</p>
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
                <Input id="searchBook" placeholder="Book title, student name..." className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select className="w-full h-10 px-3 py-2 border border-input rounded-md">
                <option value="all">All Status</option>
                <option value="issued">Issued</option>
                <option value="overdue">Overdue</option>
                <option value="returned">Returned</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <select className="w-full h-10 px-3 py-2 border border-input rounded-md">
                <option value="all">All Classes</option>
                <option value="class-9">Class 9</option>
                <option value="class-10">Class 10</option>
                <option value="class-11">Class 11</option>
                <option value="class-12">Class 12</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Date Range</Label>
              <select className="w-full h-10 px-3 py-2 border border-input rounded-md">
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
              {issuedBooks.map((book) => (
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
                          <Button variant="outline" size="sm">
                            Renew
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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
                      <Button variant="outline" size="sm">
                        Notify
                      </Button>
                      <Button variant="outline" size="sm">
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