import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReportIncidentDialogProps {
  onIncidentReported: (incident: any) => void;
}

export const ReportIncidentDialog = ({ onIncidentReported }: ReportIncidentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [incidentData, setIncidentData] = useState({
    studentName: '',
    studentId: '',
    class: '',
    incident: '',
    severity: '',
    reportedBy: '',
    description: '',
    location: '',
    witnesses: '',
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!incidentData.studentName || !incidentData.studentId || !incidentData.incident || !incidentData.severity) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const newIncident = {
      id: Date.now(),
      studentName: incidentData.studentName,
      studentId: incidentData.studentId,
      class: incidentData.class,
      incident: incidentData.incident,
      severity: incidentData.severity,
      reportedBy: incidentData.reportedBy || 'Anonymous',
      date: new Date().toISOString().split('T')[0],
      status: 'Pending Review',
      actionTaken: null,
      description: incidentData.description,
      location: incidentData.location,
      witnesses: incidentData.witnesses,
    };

    onIncidentReported(newIncident);
    
    toast({
      title: "Success",
      description: "Incident reported successfully!",
    });
    
    setIncidentData({
      studentName: '',
      studentId: '',
      class: '',
      incident: '',
      severity: '',
      reportedBy: '',
      description: '',
      location: '',
      witnesses: '',
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Report Incident
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report Disciplinary Incident</DialogTitle>
          <DialogDescription>
            Submit a detailed report of the disciplinary incident for review.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="studentName">Student Name *</Label>
              <Input
                id="studentName"
                value={incidentData.studentName}
                onChange={(e) => setIncidentData({ ...incidentData, studentName: e.target.value })}
                placeholder="e.g., John Smith"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentId">Student ID *</Label>
              <Input
                id="studentId"
                value={incidentData.studentId}
                onChange={(e) => setIncidentData({ ...incidentData, studentId: e.target.value })}
                placeholder="e.g., ST001"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="class">Class</Label>
              <Select value={incidentData.class} onValueChange={(value) => setIncidentData({ ...incidentData, class: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9-A">9-A</SelectItem>
                  <SelectItem value="9-B">9-B</SelectItem>
                  <SelectItem value="10-A">10-A</SelectItem>
                  <SelectItem value="10-B">10-B</SelectItem>
                  <SelectItem value="11-A">11-A</SelectItem>
                  <SelectItem value="11-B">11-B</SelectItem>
                  <SelectItem value="12-A">12-A</SelectItem>
                  <SelectItem value="12-B">12-B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="severity">Severity *</Label>
              <Select value={incidentData.severity} onValueChange={(value) => setIncidentData({ ...incidentData, severity: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Minor">Minor</SelectItem>
                  <SelectItem value="Major">Major</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="incident">Incident Type *</Label>
            <Select value={incidentData.incident} onValueChange={(value) => setIncidentData({ ...incidentData, incident: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select incident type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Disruptive behavior in class">Disruptive behavior in class</SelectItem>
                <SelectItem value="Unauthorized absence">Unauthorized absence</SelectItem>
                <SelectItem value="Bullying">Bullying</SelectItem>
                <SelectItem value="Fighting">Fighting</SelectItem>
                <SelectItem value="Cheating">Cheating</SelectItem>
                <SelectItem value="Vandalism">Vandalism</SelectItem>
                <SelectItem value="Disrespect to staff">Disrespect to staff</SelectItem>
                <SelectItem value="Smoking/Substance use">Smoking/Substance use</SelectItem>
                <SelectItem value="Theft">Theft</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reportedBy">Reported By</Label>
              <Input
                id="reportedBy"
                value={incidentData.reportedBy}
                onChange={(e) => setIncidentData({ ...incidentData, reportedBy: e.target.value })}
                placeholder="e.g., Ms. Johnson"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={incidentData.location}
                onChange={(e) => setIncidentData({ ...incidentData, location: e.target.value })}
                placeholder="e.g., Classroom 101, Playground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Detailed Description *</Label>
            <Textarea
              id="description"
              value={incidentData.description}
              onChange={(e) => setIncidentData({ ...incidentData, description: e.target.value })}
              placeholder="Provide a detailed description of what happened..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="witnesses">Witnesses</Label>
            <Input
              id="witnesses"
              value={incidentData.witnesses}
              onChange={(e) => setIncidentData({ ...incidentData, witnesses: e.target.value })}
              placeholder="List any witnesses (optional)"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Submit Report</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};