import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar, User, MapPin, Eye, AlertTriangle } from 'lucide-react';

interface IncidentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: any;
}

export function ViewIncidentDetailsDialog({ open, onOpenChange, incident }: IncidentDetailsDialogProps) {
  if (!incident) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Minor': return 'secondary';
      case 'Major': return 'destructive';
      case 'Critical': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending Review': return 'destructive';
      case 'Under Investigation': return 'secondary';
      case 'Resolved': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Incident Details
          </DialogTitle>
          <DialogDescription>
            Complete information about the reported incident
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{incident.studentName}</h3>
                  <p className="text-sm text-muted-foreground">Student ID: {incident.studentId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getSeverityColor(incident.severity)}>
                    {incident.severity}
                  </Badge>
                  <Badge variant={getStatusColor(incident.status)}>
                    {incident.status}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>Class: {incident.class}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Date: {incident.date}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Incident Details */}
          <Card>
            <CardContent className="pt-6">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Incident Information
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type:</label>
                  <p className="mt-1">{incident.incident}</p>
                </div>

                {incident.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description:</label>
                    <p className="mt-1 text-sm">{incident.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Reported By:</label>
                    <p className="mt-1">{incident.reportedBy}</p>
                  </div>
                  
                  {incident.location && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Location:</label>
                      <p className="mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {incident.location}
                      </p>
                    </div>
                  )}
                </div>

                {incident.witnesses && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Witnesses:</label>
                    <p className="mt-1">{incident.witnesses}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Taken */}
          {incident.actionTaken && (
            <Card>
              <CardContent className="pt-6">
                <h4 className="font-medium mb-3">Action Taken</h4>
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm">{incident.actionTaken}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardContent className="pt-6">
              <h4 className="font-medium mb-3">Timeline</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <div className="text-sm">
                    <span className="font-medium">Incident Reported</span>
                    <span className="text-muted-foreground ml-2">{incident.date}</span>
                  </div>
                </div>
                
                {incident.status === 'Under Investigation' && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div className="text-sm">
                      <span className="font-medium">Investigation Started</span>
                      <span className="text-muted-foreground ml-2">In Progress</span>
                    </div>
                  </div>
                )}
                
                {incident.status === 'Resolved' && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="text-sm">
                      <span className="font-medium">Incident Resolved</span>
                      <span className="text-muted-foreground ml-2">{incident.date}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card>
            <CardContent className="pt-6">
              <h4 className="font-medium mb-3">Additional Information</h4>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  Incident ID: INC-{incident.id}<br />
                  Created: {incident.date}<br />
                  Last Updated: {incident.date}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}