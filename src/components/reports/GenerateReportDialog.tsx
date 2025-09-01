import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Download, FileText, Calendar, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GenerateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incidents: any[];
}

export function GenerateReportDialog({ open, onOpenChange, incidents }: GenerateReportDialogProps) {
  const [reportType, setReportType] = useState('');
  const [selectedIncidents, setSelectedIncidents] = useState<number[]>([]);
  const [dateRange, setDateRange] = useState<any>(null);
  const [filterBy, setFilterBy] = useState('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const reportTypes = [
    { 
      value: 'summary', 
      label: 'Incident Summary Report',
      description: 'Overview of all incidents with key statistics'
    },
    { 
      value: 'detailed', 
      label: 'Detailed Incident Report',
      description: 'Complete information for selected incidents'
    },
    { 
      value: 'behavioral', 
      label: 'Behavioral Analysis Report',
      description: 'Patterns and trends in student behavior'
    },
    { 
      value: 'parent', 
      label: 'Parent Communication Report',
      description: 'Report formatted for parent communication'
    },
    { 
      value: 'administrative', 
      label: 'Administrative Report',
      description: 'Executive summary for school administration'
    }
  ];

  const handleIncidentToggle = (incidentId: number) => {
    setSelectedIncidents(prev => 
      prev.includes(incidentId)
        ? prev.filter(id => id !== incidentId)
        : [...prev, incidentId]
    );
  };

  const handleSelectAll = () => {
    const filteredIncidents = getFilteredIncidents();
    const allSelected = filteredIncidents.every(incident => 
      selectedIncidents.includes(incident.id)
    );
    
    if (allSelected) {
      setSelectedIncidents(prev => 
        prev.filter(id => !filteredIncidents.find(incident => incident.id === id))
      );
    } else {
      setSelectedIncidents(prev => [
        ...prev, 
        ...filteredIncidents.map(incident => incident.id).filter(id => !prev.includes(id))
      ]);
    }
  };

  const getFilteredIncidents = () => {
    let filtered = incidents;
    
    if (filterBy === 'pending') {
      filtered = incidents.filter(incident => incident.status === 'Pending Review');
    } else if (filterBy === 'resolved') {
      filtered = incidents.filter(incident => incident.status === 'Resolved');
    } else if (filterBy === 'high-severity') {
      filtered = incidents.filter(incident => incident.severity === 'Major' || incident.severity === 'Critical');
    }
    
    // Add date filtering if dateRange is set
    if (dateRange) {
      // This would filter by date range in a real implementation
    }
    
    return filtered;
  };

  const generateReport = async () => {
    if (!reportType) {
      toast({
        title: "Please select a report type",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    // Simulate report generation
    setTimeout(() => {
      const reportData = {
        type: reportType,
        incidents: reportType === 'detailed' ? selectedIncidents : getFilteredIncidents().map(i => i.id),
        dateRange,
        filterBy,
        generatedAt: new Date().toISOString(),
        totalIncidents: getFilteredIncidents().length,
        selectedIncidents: selectedIncidents.length
      };
      
      // In a real app, this would generate and download the actual report
      console.log('Generating report:', reportData);
      
      toast({
        title: "Report generated successfully",
        description: `Your ${reportTypes.find(rt => rt.value === reportType)?.label} has been generated and downloaded.`,
      });
      
      setIsGenerating(false);
      onOpenChange(false);
      
      // Reset form
      setReportType('');
      setSelectedIncidents([]);
      setDateRange(null);
      setFilterBy('all');
    }, 2000);
  };

  const filteredIncidents = getFilteredIncidents();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Generate Incident Report
          </DialogTitle>
          <DialogDescription>
            Create comprehensive reports for incidents, behavioral analysis, and administration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Report Type</Label>
            <div className="grid grid-cols-1 gap-3">
              {reportTypes.map((type) => (
                <Card 
                  key={type.value}
                  className={`cursor-pointer transition-colors ${
                    reportType === type.value ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setReportType(type.value)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        checked={reportType === type.value}
                        onChange={() => setReportType(type.value)}
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{type.label}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Filters */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Report Filters</Label>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Filter by Status</Label>
                <Select value={filterBy} onValueChange={setFilterBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Incidents</SelectItem>
                    <SelectItem value="pending">Pending Review Only</SelectItem>
                    <SelectItem value="resolved">Resolved Only</SelectItem>
                    <SelectItem value="high-severity">High Severity Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Date Range</Label>
                <DatePickerWithRange 
                  date={dateRange}
                  setDate={setDateRange}
                />
              </div>
            </div>
          </div>

          {/* Incident Selection (for detailed reports) */}
          {reportType === 'detailed' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Select Incidents</Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {filteredIncidents.every(incident => selectedIncidents.includes(incident.id))
                    ? 'Deselect All' 
                    : 'Select All'
                  }
                </Button>
              </div>
              
              <ScrollArea className="h-[200px] border rounded-lg p-3">
                <div className="space-y-2">
                  {filteredIncidents.map((incident) => (
                    <div 
                      key={incident.id}
                      className="flex items-center space-x-3 p-2 rounded border cursor-pointer hover:bg-muted"
                      onClick={() => handleIncidentToggle(incident.id)}
                    >
                      <Checkbox 
                        checked={selectedIncidents.includes(incident.id)}
                        onChange={() => handleIncidentToggle(incident.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{incident.studentName}</span>
                          <Badge variant="outline" className="text-xs">{incident.studentId}</Badge>
                          <Badge 
                            variant={incident.severity === 'Minor' ? 'secondary' : 'destructive'}
                            className="text-xs"
                          >
                            {incident.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{incident.incident}</p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {incident.date}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="text-sm text-muted-foreground">
                {selectedIncidents.length} of {filteredIncidents.length} incidents selected
              </div>
            </div>
          )}

          {/* Report Preview */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-sm mb-3">Report Preview</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Report Type:</span>
                  <span>{reportTypes.find(rt => rt.value === reportType)?.label || 'Not selected'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Incidents:</span>
                  <span>{filteredIncidents.length}</span>
                </div>
                {reportType === 'detailed' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Selected Incidents:</span>
                    <span>{selectedIncidents.length}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Filter:</span>
                  <span className="capitalize">{filterBy.replace('-', ' ')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={generateReport} disabled={!reportType || isGenerating}>
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}