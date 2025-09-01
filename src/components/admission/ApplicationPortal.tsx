import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NewApplicationDialog } from '@/components/admission/NewApplicationDialog';
import { ApplicationDetailsDialog } from '@/components/admission/ApplicationDetailsDialog';
import { FileText, User, Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

export const ApplicationPortal = () => {
  const [applications, setApplications] = useState([
    { 
      id: 1, 
      name: 'John Smith', 
      email: 'john@email.com', 
      class: 'Class 11', 
      status: 'Submitted', 
      date: '2024-03-10',
      applicationId: 'APP123456',
      phone: '+1 234 567 8900',
      parentName: 'Robert Smith',
      parentPhone: '+1 234 567 8901'
    },
    { 
      id: 2, 
      name: 'Emma Johnson', 
      email: 'emma@email.com', 
      class: 'Class 9', 
      status: 'Under Review', 
      date: '2024-03-09',
      applicationId: 'APP123457',
      phone: '+1 234 567 8902',
      parentName: 'Lisa Johnson',
      parentPhone: '+1 234 567 8903'
    }
  ]);

  const [selectedApplication, setSelectedApplication] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const handleApplicationAdded = (newApplication: any) => {
    setApplications([...applications, newApplication]);
  };

  const handleStatusUpdate = (applicationId: number, status: string, remarks?: string) => {
    setApplications(applications.map(app => 
      app.id === applicationId 
        ? { ...app, status, remarks }
        : app
    ));
  };

  const handleViewApplication = (application: any) => {
    setSelectedApplication(application);
    setDetailsDialogOpen(true);
  };

  const handleDeleteApplication = (applicationId: number) => {
    setApplications(applications.filter(app => app.id !== applicationId));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Application Portal</h2>
          <p className="text-muted-foreground">Manage student admission applications</p>
        </div>
        <NewApplicationDialog onApplicationAdded={handleApplicationAdded} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">145</p>
            <p className="text-sm text-muted-foreground">Total Applications</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <User className="h-8 w-8 mx-auto text-success mb-2" />
            <p className="text-2xl font-bold">89</p>
            <p className="text-sm text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-8 w-8 mx-auto text-warning mb-2" />
            <p className="text-2xl font-bold">32</p>
            <p className="text-sm text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Applied For</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.name}</TableCell>
                  <TableCell>{app.email}</TableCell>
                  <TableCell>{app.class}</TableCell>
                  <TableCell>
                    <Badge variant={app.status === 'Submitted' ? 'default' : 'secondary'}>
                      {app.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{app.date}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewApplication(app)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteApplication(app.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ApplicationDetailsDialog
        application={selectedApplication}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
};