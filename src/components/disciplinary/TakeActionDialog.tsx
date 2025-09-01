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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface TakeActionDialogProps {
  incident: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionTaken: (incidentId: number, action: string) => void;
}

export const TakeActionDialog = ({ incident, open, onOpenChange, onActionTaken }: TakeActionDialogProps) => {
  const [actionData, setActionData] = useState({
    actionType: '',
    actionDetails: '',
    followUpRequired: false,
    parentNotification: false,
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!actionData.actionType || !actionData.actionDetails) {
      toast({
        title: "Error",
        description: "Please select an action type and provide details.",
        variant: "destructive",
      });
      return;
    }

    const actionSummary = `${actionData.actionType}: ${actionData.actionDetails}`;
    onActionTaken(incident.id, actionSummary);
    
    toast({
      title: "Success",
      description: "Action recorded successfully!",
    });
    
    setActionData({
      actionType: '',
      actionDetails: '',
      followUpRequired: false,
      parentNotification: false,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Take Action on Incident</DialogTitle>
          <DialogDescription>
            Record the disciplinary action taken for {incident?.studentName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="actionType">Action Type *</Label>
            <Select value={actionData.actionType} onValueChange={(value) => setActionData({ ...actionData, actionType: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select action type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Verbal Warning">Verbal Warning</SelectItem>
                <SelectItem value="Written Warning">Written Warning</SelectItem>
                <SelectItem value="Detention">Detention</SelectItem>
                <SelectItem value="Suspension">Suspension</SelectItem>
                <SelectItem value="Parent Meeting">Parent Meeting</SelectItem>
                <SelectItem value="Counseling Session">Counseling Session</SelectItem>
                <SelectItem value="Community Service">Community Service</SelectItem>
                <SelectItem value="Referral to Principal">Referral to Principal</SelectItem>
                <SelectItem value="No Action Required">No Action Required</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="actionDetails">Action Details *</Label>
            <Textarea
              id="actionDetails"
              value={actionData.actionDetails}
              onChange={(e) => setActionData({ ...actionData, actionDetails: e.target.value })}
              placeholder="Describe the specific action taken, duration, conditions, etc."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="followUp">Follow-up Actions</Label>
            <Select 
              value={actionData.followUpRequired ? 'yes' : 'no'} 
              onValueChange={(value) => setActionData({ ...actionData, followUpRequired: value === 'yes' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Follow-up required?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No Follow-up Required</SelectItem>
                <SelectItem value="yes">Follow-up Required</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="parentNotification">Parent Notification</Label>
            <Select 
              value={actionData.parentNotification ? 'yes' : 'no'} 
              onValueChange={(value) => setActionData({ ...actionData, parentNotification: value === 'yes' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Notify parents?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No Parent Notification</SelectItem>
                <SelectItem value="yes">Notify Parents</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Record Action</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};