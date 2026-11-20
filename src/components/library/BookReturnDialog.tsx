import { useState, useEffect } from 'react';
import { db } from '@/services/supabase/database';
import { libraryService } from '@/services/libraryService';
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
import { toast } from '@/hooks/use-toast';

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
    issueId?: string;
  } | null>(null);

  const [activeIssues, setActiveIssues] = useState<any[]>([]);

  useEffect(() => {
    async function loadIssues() {
      try {
        const issues = await db.getBookIssues();
        setActiveIssues((issues || []).filter(i => i.status === 'Issued'));
      } catch (err) {
        console.warn('Load active issues warning:', err);
      }
    }
    loadIssues();
  }, [open]);

  const handleCodeScanned = (code: string, type: 'book' | 'student') => {
    if (type === 'book') {
      const match = activeIssues.find(i => 
        i.book_code?.toLowerCase() === code.toLowerCase() || 
        i.book_title?.toLowerCase().includes(code.toLowerCase()) ||
        i.id === code
      );
      if (match) {
        const due = new Date(match.due_date);
        const today = new Date();
        const diff = Math.max(0, differenceInDays(today, due));
        setIssuedBookData({
          id: match.book_code || match.id,
          title: match.book_title,
          author: 'Library Reference',
          studentId: match.student_id || 'STU',
          studentName: match.student_name,
          rollNo: match.roll_no || 'N/A',
          class: match.class_name || 'Class',
          issueDate: match.issue_date,
          dueDate: match.due_date,
          daysOverdue: diff,
          fine: diff * 5,
          issueId: match.id,
        });
        setStep('details');
      } else {
        toast({
          title: "Issued Book Not Found",
          description: `No active issued record found for book "${code}".`,
          variant: "destructive"
        });
      }
    }
  };

  const handleManualBookInput = (bookId: string) => {
    const trimmed = bookId.trim();
    if (!trimmed) return;
    const match = activeIssues.find(i => 
      i.book_code?.toLowerCase() === trimmed.toLowerCase() || 
      i.book_title?.toLowerCase().includes(trimmed.toLowerCase()) ||
      i.id === trimmed
    );
    if (match) {
      const due = new Date(match.due_date);
      const today = new Date();
      const diff = Math.max(0, differenceInDays(today, due));
      setIssuedBookData({
        id: match.book_code || match.id,
        title: match.book_title,
        author: 'Library Reference',
        studentId: match.student_id || 'STU',
        studentName: match.student_name,
        rollNo: match.roll_no || 'N/A',
        class: match.class_name || 'Class',
        issueDate: match.issue_date,
        dueDate: match.due_date,
        daysOverdue: diff,
        fine: diff * 5,
        issueId: match.id,
      });
      setStep('details');
    } else {
      toast({
        title: "Record Not Found",
        description: `No active issue record found matching "${trimmed}".`,
        variant: "destructive"
      });
    }
  };

  const calculateTotalFine = () => {
    if (!issuedBookData) return 0;
    
    let total = issuedBookData.fine;
    
    if (bookCondition === 'damaged') {
      total += 100;
    } else if (bookCondition === 'lost') {
      total += 500;
    }
    
    if (chargeFine && customFine) {
      total += parseInt(customFine) || 0;
    }
    
    return total;
  };

  const handleReturnBook = async () => {
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

      try {
        if (issuedBookData.issueId) {
          try {
            await libraryService.returnBook(issuedBookData.issueId, calculateTotalFine());
          } catch (rpcErr) {
            console.warn('RPC return_library_book fallback to db.returnBook:', rpcErr);
            await db.returnBook(issuedBookData.issueId);
          }
        }
        toast({
          title: "Book Return Processed",
          description: `Successfully recorded return for "${issuedBookData.title}".`,
        });
      } catch (err: any) {
        toast({
          title: "Return Failed",
          description: err.message || "Failed to process book return.",
          variant: "destructive"
        });
      }
      
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
                          placeholder="Enter Book ID or Title" 
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
                        {activeIssues.length > 0 
                          ? `${activeIssues.length} book(s) currently issued out in database.` 
                          : 'No books are currently issued out.'}
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
