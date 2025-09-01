import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { QRScannerDialog } from './QRScannerDialog';
import { BookOpen, User, CalendarIcon, QrCode, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface BookIssueDialogProps {
  children: React.ReactNode;
  onBookIssued?: (issueData: any) => void;
}

export const BookIssueDialog = ({ children, onBookIssued }: BookIssueDialogProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'scan' | 'details' | 'confirm'>('scan');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'book' | 'student'>('book');
  const [issueDate, setIssueDate] = useState<Date>(new Date());
  
  const [bookData, setBookData] = useState<{
    id: string;
    title: string;
    author: string;
    isbn: string;
    available: boolean;
  } | null>(null);
  
  const [studentData, setStudentData] = useState<{
    id: string;
    name: string;
    class: string;
    rollNo: string;
    currentBooks: number;
    maxBooks: number;
  } | null>(null);

  // Mock data lookup
  const mockBookData = {
    'BK001': { id: 'BK001', title: 'Advanced Mathematics', author: 'Dr. Smith', isbn: '978-0123456789', available: true },
    'BK002': { id: 'BK002', title: 'Modern Physics', author: 'Prof. Johnson', isbn: '978-0987654321', available: false },
    'BK003': { id: 'BK003', title: 'Chemistry Fundamentals', author: 'Dr. Brown', isbn: '978-0456789123', available: true },
    'BK004': { id: 'BK004', title: 'Organic Chemistry', author: 'Dr. Wilson', isbn: '978-0321654987', available: true }
  };

  const mockStudentData = {
    'ST001': { id: 'ST001', name: 'John Smith', class: 'Class 10A', rollNo: '2024001', currentBooks: 2, maxBooks: 5 },
    'ST002': { id: 'ST002', name: 'Emma Johnson', class: 'Class 11B', rollNo: '2024002', currentBooks: 1, maxBooks: 5 },
    'ST003': { id: 'ST003', name: 'Michael Brown', class: 'Class 10A', rollNo: '2024003', currentBooks: 0, maxBooks: 5 },
    'ST004': { id: 'ST004', name: 'Sarah Wilson', class: 'Class 12B', rollNo: '2024004', currentBooks: 4, maxBooks: 5 }
  };

  const handleCodeScanned = (code: string, type: 'book' | 'student') => {
    if (type === 'book') {
      const book = mockBookData[code as keyof typeof mockBookData];
      if (book) {
        setBookData(book);
        if (scannerMode === 'book') {
          setScannerMode('student');
          setScannerOpen(true);
        }
      }
    } else if (type === 'student') {
      const student = mockStudentData[code as keyof typeof mockStudentData];
      if (student) {
        setStudentData(student);
        setStep('details');
      }
    }
  };

  const openScanner = (mode: 'book' | 'student') => {
    setScannerMode(mode);
    setScannerOpen(true);
  };

  const handleManualBookInput = (bookId: string) => {
    const book = mockBookData[bookId as keyof typeof mockBookData];
    if (book) {
      setBookData(book);
    }
  };

  const handleManualStudentInput = (studentId: string) => {
    const student = mockStudentData[studentId as keyof typeof mockStudentData];
    if (student) {
      setStudentData(student);
      setStep('details');
    }
  };

  const handleIssueBook = () => {
    if (bookData && studentData) {
      const issueData = {
        bookId: bookData.id,
        bookTitle: bookData.title,
        studentId: studentData.id,
        studentName: studentData.name,
        issueDate: format(issueDate, 'yyyy-MM-dd'),
        dueDate: format(addDays(issueDate, 14), 'yyyy-MM-dd'),
        status: 'Issued'
      };
      
      onBookIssued?.(issueData);
      resetDialog();
      setOpen(false);
    }
  };

  const resetDialog = () => {
    setStep('scan');
    setBookData(null);
    setStudentData(null);
    setIssueDate(new Date());
    setScannerMode('book');
  };

  const canIssue = () => {
    if (!bookData || !studentData) return false;
    if (!bookData.available) return false;
    if (studentData.currentBooks >= studentData.maxBooks) return false;
    return true;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) resetDialog();
      }}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Issue New Book
            </DialogTitle>
            <DialogDescription>
              Scan or enter book and student details to issue a book
            </DialogDescription>
          </DialogHeader>

          {step === 'scan' && (
            <div className="space-y-6">
              {/* Book Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Select Book
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {bookData ? (
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                      <div>
                        <h4 className="font-semibold">{bookData.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          ID: {bookData.id} • Author: {bookData.author}
                        </p>
                        <Badge variant={bookData.available ? 'default' : 'destructive'}>
                          {bookData.available ? 'Available' : 'Not Available'}
                        </Badge>
                      </div>
                      <Button variant="outline" onClick={() => setBookData(null)}>
                        Change
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Enter Book ID (e.g., BK001)" 
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleManualBookInput((e.target as HTMLInputElement).value);
                            }
                          }}
                        />
                        <Button variant="outline" onClick={() => openScanner('book')}>
                          <QrCode className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Available books: BK001, BK003, BK004 (BK002 is unavailable)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Student Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Select Student
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {studentData ? (
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                      <div>
                        <h4 className="font-semibold">{studentData.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {studentData.rollNo} • {studentData.class}
                        </p>
                        <Badge variant="outline">
                          {studentData.currentBooks}/{studentData.maxBooks} books
                        </Badge>
                      </div>
                      <Button variant="outline" onClick={() => setStudentData(null)}>
                        Change
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Enter Student ID (e.g., ST001)" 
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleManualStudentInput((e.target as HTMLInputElement).value);
                            }
                          }}
                        />
                        <Button variant="outline" onClick={() => openScanner('student')}>
                          <QrCode className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Try: ST001, ST002, ST003, ST004
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {bookData && studentData && (
                <Button className="w-full" onClick={() => setStep('details')}>
                  Continue to Issue Details
                </Button>
              )}
            </div>
          )}

          {step === 'details' && bookData && studentData && (
            <div className="space-y-6">
              {/* Issue Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Issue Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Book</Label>
                      <div className="mt-1">
                        <p className="font-semibold">{bookData.title}</p>
                        <p className="text-sm text-muted-foreground">ID: {bookData.id}</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Student</Label>
                      <div className="mt-1">
                        <p className="font-semibold">{studentData.name}</p>
                        <p className="text-sm text-muted-foreground">{studentData.rollNo}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Issue Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal mt-2",
                              !issueDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {issueDate ? format(issueDate, "PPP") : <span>Select date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={issueDate}
                            onSelect={(date) => date && setIssueDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label>Due Date</Label>
                      <Input 
                        value={issueDate ? format(addDays(issueDate, 14), "PPP") : ''} 
                        readOnly 
                        className="mt-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Validation Checks */}
              <Card>
                <CardHeader>
                  <CardTitle>Issue Validation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    {bookData.available ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <span className={bookData.available ? 'text-green-700' : 'text-red-700'}>
                      Book is {bookData.available ? 'available' : 'not available'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {studentData.currentBooks < studentData.maxBooks ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <span className={studentData.currentBooks < studentData.maxBooks ? 'text-green-700' : 'text-red-700'}>
                      Student has {studentData.currentBooks}/{studentData.maxBooks} books 
                      {studentData.currentBooks < studentData.maxBooks ? ' (can issue more)' : ' (limit reached)'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep('scan')}>
                  Back
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleIssueBook}
                  disabled={!canIssue()}
                >
                  Issue Book
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <QRScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onCodeScanned={handleCodeScanned}
        mode="issue"
      />
    </>
  );
};