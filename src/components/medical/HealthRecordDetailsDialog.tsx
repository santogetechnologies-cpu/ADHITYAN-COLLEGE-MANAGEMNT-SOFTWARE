import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { 
  User, 
  Heart, 
  Shield, 
  AlertTriangle, 
  Pill, 
  FileText, 
  Phone, 
  Calendar as CalendarIcon,
  Save,
  Edit,
  Download,
  Plus
} from 'lucide-react';

interface HealthRecordDetailsDialogProps {
  children: React.ReactNode;
  studentId?: string;
  studentName?: string;
  isEdit?: boolean;
}

export const HealthRecordDetailsDialog = ({ 
  children, 
  studentId = "CS2021001",
  studentName = "Amit Kumar Singh",
  isEdit = false 
}: HealthRecordDetailsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [lastCheckupDate, setLastCheckupDate] = useState<Date>();

  const [healthRecord, setHealthRecord] = useState({
    // Basic Information
    studentId: studentId,
    name: studentName,
    dateOfBirth: '2001-05-15',
    bloodGroup: 'O+',
    height: '175',
    weight: '68',
    bmi: '22.2',
    emergencyContact: '+91 9876543210',
    emergencyContactName: 'Raj Singh (Father)',
    
    // Medical History
    allergies: ['Peanuts', 'Dust'],
    chronicConditions: ['Asthma (Mild)'],
    medications: ['Inhaler (Salbutamol) - As needed'],
    surgeries: [],
    familyHistory: ['Diabetes (Paternal)', 'Hypertension (Maternal)'],
    
    // Vaccination Status
    vaccinations: [
      { name: 'COVID-19', status: 'Complete', lastDate: '2023-01-15', nextDue: null },
      { name: 'Hepatitis B', status: 'Complete', lastDate: '2021-06-01', nextDue: null },
      { name: 'Tetanus', status: 'Due', lastDate: '2019-03-10', nextDue: '2024-03-10' },
      { name: 'Influenza', status: 'Due', lastDate: '2023-09-15', nextDue: '2024-09-15' }
    ],
    
    // Health Alerts
    alerts: [
      { type: 'warning', message: 'Tetanus vaccination overdue', priority: 'high' },
      { type: 'info', message: 'Annual health checkup due next month', priority: 'medium' }
    ],
    
    // Insurance Details
    insuranceProvider: 'Star Health Insurance',
    policyNumber: 'SH/2023/456789',
    policyExpiryDate: '2024-12-31',
    
    // Fitness Status
    fitnessStatus: 'Fit for Sports',
    lastPhysicalExam: '2024-08-15',
    restrictions: 'Avoid extreme cold weather activities'
  });

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const vaccinationStatuses = ['Complete', 'Pending', 'Due', 'Overdue'];
  const fitnessStatuses = ['Fit for Sports', 'Fit with Restrictions', 'Temporarily Unfit', 'Medical Review Required'];

  const handleSave = () => {
    console.log('Saving health record:', healthRecord);
    setOpen(false);
  };

  const addAllergy = (allergy: string) => {
    if (allergy && !healthRecord.allergies.includes(allergy)) {
      setHealthRecord({
        ...healthRecord,
        allergies: [...healthRecord.allergies, allergy]
      });
    }
  };

  const removeAllergy = (allergyToRemove: string) => {
    setHealthRecord({
      ...healthRecord,
      allergies: healthRecord.allergies.filter(allergy => allergy !== allergyToRemove)
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Health Record - {studentName} ({studentId})
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="medical">Medical History</TabsTrigger>
            <TabsTrigger value="vaccinations">Vaccinations</TabsTrigger>
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
            <TabsTrigger value="insurance">Insurance</TabsTrigger>
            <TabsTrigger value="fitness">Fitness</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="studentId">Student ID</Label>
                      <Input
                        id="studentId"
                        value={healthRecord.studentId}
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={healthRecord.name}
                        onChange={(e) => setHealthRecord({...healthRecord, name: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={healthRecord.dateOfBirth}
                        onChange={(e) => setHealthRecord({...healthRecord, dateOfBirth: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bloodGroup">Blood Group</Label>
                      <Select 
                        value={healthRecord.bloodGroup} 
                        onValueChange={(value) => setHealthRecord({...healthRecord, bloodGroup: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select blood group" />
                        </SelectTrigger>
                        <SelectContent>
                          {bloodGroups.map((group) => (
                            <SelectItem key={group} value={group}>
                              {group}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Physical Measurements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="height">Height (cm)</Label>
                      <Input
                        id="height"
                        type="number"
                        value={healthRecord.height}
                        onChange={(e) => setHealthRecord({...healthRecord, height: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        value={healthRecord.weight}
                        onChange={(e) => setHealthRecord({...healthRecord, weight: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bmi">BMI</Label>
                      <Input
                        id="bmi"
                        value={healthRecord.bmi}
                        disabled
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Last Physical Examination</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !lastCheckupDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {lastCheckupDate ? format(lastCheckupDate, "PPP") : 
                           healthRecord.lastPhysicalExam ? healthRecord.lastPhysicalExam : "Select date"
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={lastCheckupDate}
                          onSelect={setLastCheckupDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Health Alerts */}
            {healthRecord.alerts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Health Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {healthRecord.alerts.map((alert, index) => (
                      <div 
                        key={index}
                        className={cn(
                          "p-3 rounded-lg border",
                          alert.priority === 'high' ? 'border-red-200 bg-red-50' :
                          alert.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                          'border-blue-200 bg-blue-50'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className={cn(
                              "h-4 w-4",
                              alert.priority === 'high' ? 'text-red-600' :
                              alert.priority === 'medium' ? 'text-yellow-600' :
                              'text-blue-600'
                            )} />
                            <span className="text-sm">{alert.message}</span>
                          </div>
                          <Badge variant={
                            alert.priority === 'high' ? 'destructive' :
                            alert.priority === 'medium' ? 'default' : 'secondary'
                          }>
                            {alert.priority}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="medical" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Allergies & Sensitivities
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {healthRecord.allergies.map((allergy, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="flex items-center gap-1"
                      >
                        {allergy}
                        <button
                          onClick={() => removeAllergy(allergy)}
                          className="ml-1 text-xs hover:text-red-600"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add new allergy"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addAllergy(e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <Button 
                      size="sm"
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        addAllergy(input.value);
                        input.value = '';
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Pill className="h-4 w-4" />
                    Current Medications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {healthRecord.medications.map((medication, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{medication}</span>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Medication
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Chronic Conditions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {healthRecord.chronicConditions.map((condition, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{condition}</span>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Condition
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Family Medical History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {healthRecord.familyHistory.map((history, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{history}</span>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Family History
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="vaccinations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Vaccination Record
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vaccine</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Date</TableHead>
                      <TableHead>Next Due</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {healthRecord.vaccinations.map((vaccine, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{vaccine.name}</TableCell>
                        <TableCell>
                          <Badge variant={
                            vaccine.status === 'Complete' ? 'default' :
                            vaccine.status === 'Due' ? 'secondary' :
                            vaccine.status === 'Overdue' ? 'destructive' : 'outline'
                          }>
                            {vaccine.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{vaccine.lastDate}</TableCell>
                        <TableCell>{vaccine.nextDue || 'N/A'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emergency" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Emergency Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactName">Primary Contact Name</Label>
                    <Input
                      id="emergencyContactName"
                      value={healthRecord.emergencyContactName}
                      onChange={(e) => setHealthRecord({...healthRecord, emergencyContactName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact">Primary Contact Number</Label>
                    <Input
                      id="emergencyContact"
                      value={healthRecord.emergencyContact}
                      onChange={(e) => setHealthRecord({...healthRecord, emergencyContact: e.target.value})}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Additional Emergency Contacts</h4>
                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Emergency Contact
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insurance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Insurance Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                    <Input
                      id="insuranceProvider"
                      value={healthRecord.insuranceProvider}
                      onChange={(e) => setHealthRecord({...healthRecord, insuranceProvider: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="policyNumber">Policy Number</Label>
                    <Input
                      id="policyNumber"
                      value={healthRecord.policyNumber}
                      onChange={(e) => setHealthRecord({...healthRecord, policyNumber: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="policyExpiryDate">Policy Expiry Date</Label>
                  <Input
                    id="policyExpiryDate"
                    type="date"
                    value={healthRecord.policyExpiryDate}
                    onChange={(e) => setHealthRecord({...healthRecord, policyExpiryDate: e.target.value})}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fitness" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Fitness & Sports Clearance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fitnessStatus">Current Fitness Status</Label>
                  <Select 
                    value={healthRecord.fitnessStatus} 
                    onValueChange={(value) => setHealthRecord({...healthRecord, fitnessStatus: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fitness status" />
                    </SelectTrigger>
                    <SelectContent>
                      {fitnessStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="restrictions">Activity Restrictions</Label>
                  <Textarea
                    id="restrictions"
                    value={healthRecord.restrictions}
                    onChange={(e) => setHealthRecord({...healthRecord, restrictions: e.target.value})}
                    placeholder="List any activity restrictions or recommendations"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex justify-between">
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Record
            </Button>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};