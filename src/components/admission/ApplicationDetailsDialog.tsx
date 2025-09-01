import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface ApplicationDetailsDialogProps {
  application: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate: (applicationId: number, status: string, remarks?: string) => void;
}

export const ApplicationDetailsDialog = ({ 
  application, 
  open, 
  onOpenChange, 
  onStatusUpdate 
}: ApplicationDetailsDialogProps) => {
  const [newStatus, setNewStatus] = useState('');
  const [remarks, setRemarks] = useState('');
  const { toast } = useToast();

  const handleStatusUpdate = () => {
    if (!newStatus) {
      toast({
        title: "Error",
        description: "Please select a status to update.",
        variant: "destructive",
      });
      return;
    }

    onStatusUpdate(application.id, newStatus, remarks);
    
    toast({
      title: "Success",
      description: "Application status updated successfully!",
    });
    
    setNewStatus('');
    setRemarks('');
    onOpenChange(false);
  };

  if (!application) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Submitted': return 'secondary';
      case 'Under Review': return 'default';
      case 'Approved': return 'default';
      case 'Rejected': return 'destructive';
      case 'Waitlisted': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Application Details</DialogTitle>
          <DialogDescription>
            View and manage admission application for {application.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Student Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Student Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Student Name</Label>
                <p className="font-medium">{application.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Application ID</Label>
                <p className="font-medium">{application.applicationId}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{application.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Phone</Label>
                <p className="font-medium">{application.phone || 'Not provided'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Applying for Class</Label>
                <p className="font-medium">{application.class}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Date of Birth</Label>
                <p className="font-medium">{application.dateOfBirth || 'Not provided'}</p>
              </div>
            </div>
          </div>

          {/* Parent Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Parent/Guardian Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Parent Name</Label>
                <p className="font-medium">{application.parentName || 'Not provided'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Parent Phone</Label>
                <p className="font-medium">{application.parentPhone || 'Not provided'}</p>
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Academic Information</h3>
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Previous School</Label>
                <p className="font-medium">{application.previousSchool || 'Not provided'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Address</Label>
                <p className="font-medium">{application.address || 'Not provided'}</p>
              </div>
            </div>
          </div>

          {/* Application Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Application Status</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Current Status</Label>
                <div className="mt-1">
                  <Badge variant={getStatusColor(application.status)}>
                    {application.status}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Submitted Date</Label>
                <p className="font-medium">{application.date}</p>
              </div>
            </div>
          </div>

          {/* Status Update Section */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="text-lg font-semibold">Update Status</h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="status">New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Under Review">Under Review</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                    <SelectItem value="Waitlisted">Waitlisted</SelectItem>
                    <SelectItem value="Interview Scheduled">Interview Scheduled</SelectItem>
                    <SelectItem value="Documents Required">Documents Required</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks (Optional)</Label>
                <Textarea
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any comments or notes about this status update..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleStatusUpdate}>
            Update Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};