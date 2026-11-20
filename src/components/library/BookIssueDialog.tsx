import { useState, useEffect } from 'react';
import { db } from '@/services/supabase/database';
import { libraryService } from '@/services/libraryService';
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
import { toast } from '@/hooks/use-toast';

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
    rawId?: string;
  } | null>(null);
  
  const [studentData, setStudentData] = useState<{
    id: string;
    name: string;
    class: string;
    rollNo: string;
    currentBooks: number;
    maxBooks: number;
  } | null>(null);

  const [availableBooks, setAvailableBooks] = useState<any[]>([]);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);

  useEffect(() => {
    async function loadLibraryData() {
      try {
        const [books, profiles] = await Promise.all([
          db.getLibraryBooks(),
          db.getAllProfiles(),
        ]);
        setAvailableBooks(books || []);
        setAvailableStudents((profiles || []).filter(p => p.role === 'student'));
      } catch (err) {
        console.warn('Library lookup data warning:', err);
      }
    }
    loadLibraryData();
  }, [open]);

  const handleCodeScanned = (code: string, type: 'book' | 'student') => {
    if (type === 'book') {
      const book = availableBooks.find(b => 
        b.book_code?.toLowerCase() === code.toLowerCase() || 
        b.id === code || 
        b.title?.toLowerCase().includes(code.toLowerCase())
      );
      if (book) {
        setBookData({
          id: book.book_code || book.id,
          title: book.title,
          author: book.author,
          isbn: book.isbn || 'N/A',
          available: book.status === 'Available' || (book.available_copies || 0) > 0,
          rawId: book.id,
        });
        if (scannerMode === 'book') {
          setScannerMode('student');
          setScannerOpen(true);
        }
      } else {
        toast({
          title: "Book Not Found",
          description: `No book matches code "${code}" in library database.`,
          variant: "destructive"
        });
      }
    } else if (type === 'student') {
      const student = availableStudents.find(s => 
        s.id === code || 
        s.roll_number?.toLowerCase() === code.toLowerCase() || 
        s.name?.toLowerCase().includes(code.toLowerCase())
      );
      if (student) {
        setStudentData({
          id: student.id,
          name: student.name,
          class: student.class_name || 'Class',
          rollNo: student.roll_number || 'N/A',
          currentBooks: 0,
          maxBooks: 5,
        });
        setStep('details');
      } else {
        toast({
          title: "Student Not Found",
          description: `No registered student matches identifier "${code}".`,
          variant: "destructive"
        });
      }
    }
  };

  const openScanner = (mode: 'book' | 'student') => {
    setScannerMode(mode);
    setScannerOpen(true);
  };

  const handleManualBookInput = (bookId: string) => {
    const trimmed = bookId.trim();
    if (!trimmed) return;
    const book = availableBooks.find(b => 
      b.book_code?.toLowerCase() === trimmed.toLowerCase() || 
      b.id === trimmed || 
      b.title?.toLowerCase().includes(trimmed.toLowerCase())
    );
    if (book) {
      setBookData({
        id: book.book_code || book.id,
        title: book.title,
        author: book.author,
        isbn: book.isbn || 'N/A',
        available: book.status === 'Available' || (book.available_copies || 0) > 0,
        rawId: book.id,
      });
    } else {
      toast({
        title: "Book Not Found",
        description: `No book matches code "${trimmed}" in library catalog.`,
        variant: "destructive"
      });
    }
  };

  const handleManualStudentInput = (studentId: string) => {
    const trimmed = studentId.trim();
    if (!trimmed) return;
    const student = availableStudents.find(s => 
      s.id === trimmed || 
      s.roll_number?.toLowerCase() === trimmed.toLowerCase() || 
      s.name?.toLowerCase().includes(trimmed.toLowerCase())
    );
    if (student) {
      setStudentData({
        id: student.id,
        name: student.name,
        class: student.class_name || 'Class',
        rollNo: student.roll_number || 'N/A',
        currentBooks: 0,
        maxBooks: 5,
      });
      setStep('details');
    } else {
      toast({
        title: "Student Not Found",
        description: `No registered student matches "${trimmed}".`,
        variant: "destructive"
      });
    }
  };

  const handleIssueBook = async () => {
    if (bookData && studentData) {
      const issueData = {
        book_id: bookData.rawId,
        book_title: bookData.title,
        book_code: bookData.id,
        student_id: studentData.id,
        student_name: studentData.name,
        roll_no: studentData.rollNo,
        class_name: studentData.class,
        issue_date: format(issueDate, 'yyyy-MM-dd'),
        due_date: format(addDays(issueDate, 14), 'yyyy-MM-dd'),
        status: 'Issued' as const,
        days_overdue: 0,
        renew_count: 0
      };

      try {
        if (bookData.rawId && studentData.id) {
          try {
            await libraryService.issueBook(bookData.rawId, studentData.id, issueData.due_date);
          } catch (rpcErr) {
            console.warn('RPC issue_library_book fallback to db.issueBook:', rpcErr);
            await db.issueBook(issueData);
          }
        } else {
          await db.issueBook(issueData);
        }
        toast({
          title: "Book Issued Successfully",
          description: `Issued "${bookData.title}" to ${studentData.name}.`,
        });
      } catch (err: any) {
        toast({
          title: "Issue Failed",
          description: err.message || "Could not issue book.",
          variant: "destructive"
        });
      }
      
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
                          placeholder="Enter Book ID or Title" 
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
                        Search books by code or title in the library catalog.
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
                          placeholder="Enter Student Name or Roll Number" 
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
                        Search registered students by name, roll number, or identifier.
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
