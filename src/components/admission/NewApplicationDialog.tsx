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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NewApplicationDialogProps {
  onApplicationAdded: (application: any) => void;
}

export const NewApplicationDialog = ({ onApplicationAdded }: NewApplicationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [applicationData, setApplicationData] = useState({
    studentName: '',
    email: '',
    phone: '',
    parentName: '',
    parentPhone: '',
    class: '',
    previousSchool: '',
    address: '',
    dateOfBirth: '',
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!applicationData.studentName || !applicationData.email || !applicationData.class) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const newApplication = {
      id: Date.now(),
      name: applicationData.studentName,
      email: applicationData.email,
      phone: applicationData.phone,
      parentName: applicationData.parentName,
      parentPhone: applicationData.parentPhone,
      class: applicationData.class,
      previousSchool: applicationData.previousSchool,
      address: applicationData.address,
      dateOfBirth: applicationData.dateOfBirth,
      status: 'Submitted',
      date: new Date().toISOString().split('T')[0],
      applicationId: `APP${Date.now().toString().slice(-6)}`,
    };

    onApplicationAdded(newApplication);
    
    toast({
      title: "Success",
      description: "Admission application submitted successfully!",
    });
    
    setApplicationData({
      studentName: '',
      email: '',
      phone: '',
      parentName: '',
      parentPhone: '',
      class: '',
      previousSchool: '',
      address: '',
      dateOfBirth: '',
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Application
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Admission Application</DialogTitle>
          <DialogDescription>
            Add a new student admission application to the system.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="studentName">Student Name *</Label>
              <Input
                id="studentName"
                value={applicationData.studentName}
                onChange={(e) => setApplicationData({ ...applicationData, studentName: e.target.value })}
                placeholder="e.g., John Smith"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={applicationData.dateOfBirth}
                onChange={(e) => setApplicationData({ ...applicationData, dateOfBirth: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={applicationData.email}
                onChange={(e) => setApplicationData({ ...applicationData, email: e.target.value })}
                placeholder="student@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Student Phone</Label>
              <Input
                id="phone"
                value={applicationData.phone}
                onChange={(e) => setApplicationData({ ...applicationData, phone: e.target.value })}
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="parentName">Parent/Guardian Name</Label>
              <Input
                id="parentName"
                value={applicationData.parentName}
                onChange={(e) => setApplicationData({ ...applicationData, parentName: e.target.value })}
                placeholder="e.g., Mary Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentPhone">Parent Phone</Label>
              <Input
                id="parentPhone"
                value={applicationData.parentPhone}
                onChange={(e) => setApplicationData({ ...applicationData, parentPhone: e.target.value })}
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="class">Applying for Class *</Label>
              <Select value={applicationData.class} onValueChange={(value) => setApplicationData({ ...applicationData, class: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pre-K">Pre-K</SelectItem>
                  <SelectItem value="Kindergarten">Kindergarten</SelectItem>
                  <SelectItem value="Class 1">Class 1</SelectItem>
                  <SelectItem value="Class 2">Class 2</SelectItem>
                  <SelectItem value="Class 3">Class 3</SelectItem>
                  <SelectItem value="Class 4">Class 4</SelectItem>
                  <SelectItem value="Class 5">Class 5</SelectItem>
                  <SelectItem value="Class 6">Class 6</SelectItem>
                  <SelectItem value="Class 7">Class 7</SelectItem>
                  <SelectItem value="Class 8">Class 8</SelectItem>
                  <SelectItem value="Class 9">Class 9</SelectItem>
                  <SelectItem value="Class 10">Class 10</SelectItem>
                  <SelectItem value="Class 11">Class 11</SelectItem>
                  <SelectItem value="Class 12">Class 12</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="previousSchool">Previous School</Label>
              <Input
                id="previousSchool"
                value={applicationData.previousSchool}
                onChange={(e) => setApplicationData({ ...applicationData, previousSchool: e.target.value })}
                placeholder="e.g., ABC Elementary School"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={applicationData.address}
              onChange={(e) => setApplicationData({ ...applicationData, address: e.target.value })}
              placeholder="Full address"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Submit Application</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};