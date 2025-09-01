import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { QRScannerDialog } from './QRScannerDialog';
import { BookOpen, User, QrCode, AlertTriangle, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface BookReturnDialogProps {
  children: React.ReactNode;
  onBookReturned?: (returnData: any) => void;
}

export const BookReturnDialog = ({ children, onBookReturned }: BookReturnDialogProps) => {
  const [open, setOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [step, setStep] = useState<'scan' | 'details' | 'confirm'>('scan');
  const [bookCondition, setBookCondition] = useState<'good' | 'damaged' | 'lost'>('good');
  const [returnNotes, setReturnNotes] = useState('');
  const [chargeFine, setChargeFine] = useState(false);
  const [customFine, setCustomFine] = useState('');
  
  const [issuedBookData, setIssuedBookData] = useState<{
    id: string;
    title: string;
    author: string;
    studentId: string;
    studentName: string;
    rollNo: string;
    class: string;
    issueDate: string;
    dueDate: string;
    daysOverdue: number;
    fine: number;
  } | null>(null);

  // Mock data for issued books lookup
  const mockIssuedBooks = {
    'BK001': {
      id: 'BK001',
      title: 'Advanced Mathematics',
      author: 'Dr. Smith',
      studentId: 'ST001',
      studentName: 'John Smith',
      rollNo: '2024001',
      class: 'Class 10A',
      issueDate: '2024-03-01',
      dueDate: '2024-03-15',
      daysOverdue: 0,
      fine: 0
    },
    'BK002': {
      id: 'BK002',
      title: 'Modern Physics',
      author: 'Prof. Johnson',
      studentId: 'ST002',
      studentName: 'Emma Johnson',
      rollNo: '2024002',
      class: 'Class 11B',
      issueDate: '2024-02-20',
      dueDate: '2024-03-05',
      daysOverdue: 10,
      fine: 50 // ₹5 per day
    },
    'BK003': {
      id: 'BK003',
      title: 'Chemistry Fundamentals',
      author: 'Dr. Brown',
      studentId: 'ST003',
      studentName: 'Michael Brown',
      rollNo: '2024003',
      class: 'Class 10A',
      issueDate: '2024-02-28',
      dueDate: '2024-03-14',
      daysOverdue: 1,
      fine: 5
    }
  };

  const handleCodeScanned = (code: string, type: 'book' | 'student') => {
    if (type === 'book') {
      const book = mockIssuedBooks[code as keyof typeof mockIssuedBooks];
      if (book) {
        setIssuedBookData(book);
        setStep('details');
      }
    }
  };

  const handleManualBookInput = (bookId: string) => {
    const book = mockIssuedBooks[bookId as keyof typeof mockIssuedBooks];
    if (book) {
      setIssuedBookData(book);
      setStep('details');
    }
  };

  const calculateTotalFine = () => {
    if (!issuedBookData) return 0;
    
    let total = issuedBookData.fine;
    
    // Add condition-based charges
    if (bookCondition === 'damaged') {
      total += 100; // ₹100 for damaged book
    } else if (bookCondition === 'lost') {
      total += 500; // ₹500 for lost book
    }
    
    // Add custom fine if specified
    if (chargeFine && customFine) {
      total += parseInt(customFine) || 0;
    }
    
    return total;
  };

  const handleReturnBook = () => {
    if (issuedBookData) {
      const returnData = {
        bookId: issuedBookData.id,
        bookTitle: issuedBookData.title,
        studentId: issuedBookData.studentId,
        studentName: issuedBookData.studentName,
        returnDate: format(new Date(), 'yyyy-MM-dd'),
        condition: bookCondition,
        notes: returnNotes,
        totalFine: calculateTotalFine(),
        daysOverdue: issuedBookData.daysOverdue,
        status: 'Returned'
      };
      
      onBookReturned?.(returnData);
      resetDialog();
      setOpen(false);
    }
  };

  const resetDialog = () => {
    setStep('scan');
    setIssuedBookData(null);
    setBookCondition('good');
    setReturnNotes('');
    setChargeFine(false);
    setCustomFine('');
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
              Return Book
            </DialogTitle>
            <DialogDescription>
              Scan book QR code or enter book ID to process return
            </DialogDescription>
          </DialogHeader>

          {step === 'scan' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Select Book to Return
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {issuedBookData ? (
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                      <div>
                        <h4 className="font-semibold">{issuedBookData.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          ID: {issuedBookData.id} • Issued to: {issuedBookData.studentName}
                        </p>
                        {issuedBookData.daysOverdue > 0 && (
                          <Badge variant="destructive">
                            {issuedBookData.daysOverdue} days overdue
                          </Badge>
                        )}
                      </div>
                      <Button variant="outline" onClick={() => setIssuedBookData(null)}>
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
                        <Button variant="outline" onClick={() => setScannerOpen(true)}>
                          <QrCode className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Currently issued books: BK001 (no overdue), BK002 (10 days overdue), BK003 (1 day overdue)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {issuedBookData && (
                <Button className="w-full" onClick={() => setStep('details')}>
                  Process Return
                </Button>
              )}
            </div>
          )}

          {step === 'details' && issuedBookData && (
            <div className="space-y-6">
              {/* Return Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Return Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Book</Label>
                      <div className="mt-1">
                        <p className="font-semibold">{issuedBookData.title}</p>
                        <p className="text-sm text-muted-foreground">ID: {issuedBookData.id}</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Student</Label>
                      <div className="mt-1">
                        <p className="font-semibold">{issuedBookData.studentName}</p>
                        <p className="text-sm text-muted-foreground">{issuedBookData.rollNo}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Issue Date</Label>
                      <p className="mt-1">{format(new Date(issuedBookData.issueDate), 'PPP')}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Due Date</Label>
                      <p className="mt-1">{format(new Date(issuedBookData.dueDate), 'PPP')}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Return Date</Label>
                      <p className="mt-1">{format(new Date(), 'PPP')}</p>
                    </div>
                  </div>

                  {issuedBookData.daysOverdue > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-red-700">
                        Book is {issuedBookData.daysOverdue} days overdue
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Book Condition */}
              <Card>
                <CardHeader>
                  <CardTitle>Book Condition Assessment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Label>Book Condition</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <Button
                        variant={bookCondition === 'good' ? 'default' : 'outline'}
                        onClick={() => setBookCondition('good')}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Good
                      </Button>
                      <Button
                        variant={bookCondition === 'damaged' ? 'default' : 'outline'}
                        onClick={() => setBookCondition('damaged')}
                        className="flex items-center gap-2"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        Damaged
                      </Button>
                      <Button
                        variant={bookCondition === 'lost' ? 'default' : 'outline'}
                        onClick={() => setBookCondition('lost')}
                        className="flex items-center gap-2"
                      >
                        <Clock className="h-4 w-4" />
                        Lost
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="returnNotes">Return Notes (Optional)</Label>
                    <Textarea
                      id="returnNotes"
                      placeholder="Any observations about book condition, student behavior, etc."
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Fine Calculation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Fine Calculation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {issuedBookData.daysOverdue > 0 && (
                      <div className="flex justify-between items-center">
                        <span>Overdue fine ({issuedBookData.daysOverdue} days × ₹5)</span>
                        <span className="font-semibold">₹{issuedBookData.fine}</span>
                      </div>
                    )}
                    
                    {bookCondition === 'damaged' && (
                      <div className="flex justify-between items-center">
                        <span>Damage charge</span>
                        <span className="font-semibold">₹100</span>
                      </div>
                    )}
                    
                    {bookCondition === 'lost' && (
                      <div className="flex justify-between items-center">
                        <span>Book replacement charge</span>
                        <span className="font-semibold">₹500</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <Label htmlFor="customFine">Additional fine</Label>
                      <Switch
                        id="customFine"
                        checked={chargeFine}
                        onCheckedChange={setChargeFine}
                      />
                    </div>
                    
                    {chargeFine && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Amount"
                          value={customFine}
                          onChange={(e) => setCustomFine(e.target.value)}
                          type="number"
                        />
                        <Input placeholder="Reason" />
                      </div>
                    )}

                    <div className="pt-3 border-t">
                      <div className="flex justify-between items-center text-lg font-semibold">
                        <span>Total Fine</span>
                        <span className="text-primary">₹{calculateTotalFine()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep('scan')}>
                  Back
                </Button>
                <Button className="flex-1" onClick={handleReturnBook}>
                  Complete Return
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
        mode="return"
      />
    </>
  );
};