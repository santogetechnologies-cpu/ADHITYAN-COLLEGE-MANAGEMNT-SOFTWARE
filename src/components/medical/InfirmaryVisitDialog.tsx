import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { 
  User, 
  Clock, 
  Heart, 
  Thermometer, 
  Activity, 
  Pill, 
  FileText, 
  Calendar as CalendarIcon,
  Save,
  Search,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface InfirmaryVisitDialogProps {
  children: React.ReactNode;
  isEdit?: boolean;
  visitId?: string;
}

export const InfirmaryVisitDialog = ({ 
  children, 
  isEdit = false,
  visitId 
}: InfirmaryVisitDialogProps) => {
  const [open, setOpen] = useState(false);
  const [visitDate, setVisitDate] = useState<Date>(new Date());
  const [followUpDate, setFollowUpDate] = useState<Date>();

  const [visitData, setVisitData] = useState({
    // Patient Information
    patientId: '',
    patientName: '',
    patientType: 'student', // student, faculty, staff
    class: '',
    department: '',
    
    // Visit Details
    visitTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    chiefComplaint: '',
    symptoms: [] as string[],
    duration: '',
    severity: '',
    
    // Vital Signs
    temperature: '',
    bloodPressure: '',
    pulse: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    weight: '',
    height: '',
    
    // Assessment
    clinicalFindings: '',
    provisionalDiagnosis: '',
    treatmentPlan: '',
    medicationsPrescribed: [] as any[],
    
    // Disposition
    disposition: '', // discharged, referred, admitted, follow-up
    referralTo: '',
    followUpRequired: false,
    followUpInstructions: '',
    
    // Staff
    attendingStaff: 'Dr. Meera Patel',
    nurseAssisting: 'Nurse Kavita',
    
    // Emergency
    isEmergency: false,
    parentNotified: false,
    emergencyContactCalled: false,
    
    // Additional Notes
    additionalNotes: '',
    restrictions: '',
    returnToActivity: 'immediate' // immediate, restricted, after-followup
  });

  const commonSymptoms = [
    'Fever', 'Headache', 'Nausea', 'Vomiting', 'Diarrhea', 'Cough', 'Sore Throat',
    'Body Ache', 'Fatigue', 'Dizziness', 'Chest Pain', 'Abdominal Pain', 'Joint Pain',
    'Skin Rash', 'Difficulty Breathing', 'Loss of Appetite', 'Constipation'
  ];

  const severityLevels = [
    { value: 'mild', label: 'Mild', color: 'text-green-600' },
    { value: 'moderate', label: 'Moderate', color: 'text-yellow-600' },
    { value: 'severe', label: 'Severe', color: 'text-red-600' }
  ];

  const dispositionOptions = [
    { value: 'discharged', label: 'Discharged - Return to Activities' },
    { value: 'rest', label: 'Discharged - Rest Advised' },
    { value: 'referred', label: 'Referred to External Doctor' },
    { value: 'follow-up', label: 'Follow-up Required' },
    { value: 'admitted', label: 'Admitted for Observation' }
  ];

  const returnToActivityOptions = [
    { value: 'immediate', label: 'Immediate Return' },
    { value: 'after-rest', label: 'After Rest Period' },
    { value: 'after-followup', label: 'After Follow-up' },
    { value: 'medical-clearance', label: 'Medical Clearance Required' }
  ];

  const handleSymptomChange = (symptom: string, checked: boolean) => {
    if (checked) {
      setVisitData({
        ...visitData,
        symptoms: [...visitData.symptoms, symptom]
      });
    } else {
      setVisitData({
        ...visitData,
        symptoms: visitData.symptoms.filter(s => s !== symptom)
      });
    }
  };

  const addMedication = () => {
    const newMedication = {
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: ''
    };
    setVisitData({
      ...visitData,
      medicationsPrescribed: [...visitData.medicationsPrescribed, newMedication]
    });
  };

  const updateMedication = (index: number, field: string, value: string) => {
    const updatedMedications = [...visitData.medicationsPrescribed];
    updatedMedications[index] = {
      ...updatedMedications[index],
      [field]: value
    };
    setVisitData({
      ...visitData,
      medicationsPrescribed: updatedMedications
    });
  };

  const searchPatient = async (searchTerm: string) => {
    // Mock patient search - in real app, this would search the database
    if (searchTerm === 'CS2021001' || searchTerm.toLowerCase().includes('amit')) {
      setVisitData({
        ...visitData,
        patientId: 'CS2021001',
        patientName: 'Amit Kumar Singh',
        patientType: 'student',
        class: 'CSE - 3rd Year',
        department: 'Computer Science'
      });
    }
  };

  const handleSave = () => {
    console.log('Saving infirmary visit:', visitData);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            {isEdit ? `Edit Visit - ${visitId}` : 'New Infirmary Visit'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient Search & Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="patientSearch">Search Patient (ID or Name)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="patientSearch"
                      placeholder="Enter student ID or name"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          searchPatient(e.currentTarget.value);
                        }
                      }}
                    />
                    <Button 
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('patientSearch') as HTMLInputElement;
                        searchPatient(input.value);
                      }}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {visitData.patientName && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <Label className="text-sm text-muted-foreground">Patient ID</Label>
                    <p className="font-medium">{visitData.patientId}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Name</Label>
                    <p className="font-medium">{visitData.patientName}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Type</Label>
                    <Badge variant="outline">{visitData.patientType}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Class/Department</Label>
                    <p className="font-medium">{visitData.class || visitData.department}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visit Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Visit Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Visit Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !visitDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {visitDate ? format(visitDate, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={visitDate}
                          onSelect={setVisitDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visitTime">Time</Label>
                    <Input
                      id="visitTime"
                      type="time"
                      value={visitData.visitTime}
                      onChange={(e) => setVisitData({...visitData, visitTime: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chiefComplaint">Chief Complaint</Label>
                  <Textarea
                    id="chiefComplaint"
                    value={visitData.chiefComplaint}
                    onChange={(e) => setVisitData({...visitData, chiefComplaint: e.target.value})}
                    placeholder="Main reason for visit"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration of Symptoms</Label>
                    <Input
                      id="duration"
                      value={visitData.duration}
                      onChange={(e) => setVisitData({...visitData, duration: e.target.value})}
                      placeholder="e.g., 2 days, 1 week"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="severity">Severity</Label>
                    <Select value={visitData.severity} onValueChange={(value) => setVisitData({...visitData, severity: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        {severityLevels.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            <span className={level.color}>{level.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Symptoms</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {commonSymptoms.map((symptom) => (
                      <div key={symptom} className="flex items-center space-x-2">
                        <Checkbox
                          id={symptom}
                          checked={visitData.symptoms.includes(symptom)}
                          onCheckedChange={(checked) => handleSymptomChange(symptom, checked as boolean)}
                        />
                        <Label htmlFor={symptom} className="text-sm">{symptom}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vital Signs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Vital Signs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="temperature">Temperature (°F)</Label>
                    <Input
                      id="temperature"
                      value={visitData.temperature}
                      onChange={(e) => setVisitData({...visitData, temperature: e.target.value})}
                      placeholder="98.6"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pulse">Pulse (bpm)</Label>
                    <Input
                      id="pulse"
                      value={visitData.pulse}
                      onChange={(e) => setVisitData({...visitData, pulse: e.target.value})}
                      placeholder="72"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bloodPressure">Blood Pressure</Label>
                    <Input
                      id="bloodPressure"
                      value={visitData.bloodPressure}
                      onChange={(e) => setVisitData({...visitData, bloodPressure: e.target.value})}
                      placeholder="120/80"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="respiratoryRate">Respiratory Rate</Label>
                    <Input
                      id="respiratoryRate"
                      value={visitData.respiratoryRate}
                      onChange={(e) => setVisitData({...visitData, respiratoryRate: e.target.value})}
                      placeholder="16"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="oxygenSaturation">O2 Saturation (%)</Label>
                    <Input
                      id="oxygenSaturation"
                      value={visitData.oxygenSaturation}
                      onChange={(e) => setVisitData({...visitData, oxygenSaturation: e.target.value})}
                      placeholder="98"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      value={visitData.weight}
                      onChange={(e) => setVisitData({...visitData, weight: e.target.value})}
                      placeholder="65"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isEmergency">Emergency Case</Label>
                    <Switch
                      id="isEmergency"
                      checked={visitData.isEmergency}
                      onCheckedChange={(checked) => setVisitData({...visitData, isEmergency: checked})}
                    />
                  </div>

                  {visitData.isEmergency && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium text-red-900">Emergency Protocol</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="parentNotified" className="text-sm">Parent/Guardian Notified</Label>
                          <Switch
                            id="parentNotified"
                            checked={visitData.parentNotified}
                            onCheckedChange={(checked) => setVisitData({...visitData, parentNotified: checked})}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="emergencyContactCalled" className="text-sm">Emergency Contact Called</Label>
                          <Switch
                            id="emergencyContactCalled"
                            checked={visitData.emergencyContactCalled}
                            onCheckedChange={(checked) => setVisitData({...visitData, emergencyContactCalled: checked})}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assessment & Treatment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Assessment & Treatment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clinicalFindings">Clinical Findings</Label>
                  <Textarea
                    id="clinicalFindings"
                    value={visitData.clinicalFindings}
                    onChange={(e) => setVisitData({...visitData, clinicalFindings: e.target.value})}
                    placeholder="Physical examination findings"
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provisionalDiagnosis">Provisional Diagnosis</Label>
                  <Textarea
                    id="provisionalDiagnosis"
                    value={visitData.provisionalDiagnosis}
                    onChange={(e) => setVisitData({...visitData, provisionalDiagnosis: e.target.value})}
                    placeholder="Diagnosis or suspected condition"
                    rows={4}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="treatmentPlan">Treatment Plan</Label>
                <Textarea
                  id="treatmentPlan"
                  value={visitData.treatmentPlan}
                  onChange={(e) => setVisitData({...visitData, treatmentPlan: e.target.value})}
                  placeholder="Treatment provided and recommendations"
                  rows={3}
                />
              </div>

              {/* Medications */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Medications Prescribed</Label>
                  <Button type="button" onClick={addMedication} size="sm">
                    <Pill className="h-4 w-4 mr-2" />
                    Add Medication
                  </Button>
                </div>

                {visitData.medicationsPrescribed.map((medication, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2 p-3 border rounded-lg">
                    <Input
                      placeholder="Medication name"
                      value={medication.name}
                      onChange={(e) => updateMedication(index, 'name', e.target.value)}
                    />
                    <Input
                      placeholder="Dosage"
                      value={medication.dosage}
                      onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                    />
                    <Input
                      placeholder="Frequency"
                      value={medication.frequency}
                      onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                    />
                    <Input
                      placeholder="Duration"
                      value={medication.duration}
                      onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                    />
                    <Input
                      placeholder="Instructions"
                      value={medication.instructions}
                      onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Disposition */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Disposition & Follow-up
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="disposition">Disposition</Label>
                  <Select value={visitData.disposition} onValueChange={(value) => setVisitData({...visitData, disposition: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select disposition" />
                    </SelectTrigger>
                    <SelectContent>
                      {dispositionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="returnToActivity">Return to Activities</Label>
                  <Select value={visitData.returnToActivity} onValueChange={(value) => setVisitData({...visitData, returnToActivity: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select return status" />
                    </SelectTrigger>
                    <SelectContent>
                      {returnToActivityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(visitData.disposition === 'referred' || visitData.disposition === 'follow-up') && (
                <div className="space-y-4">
                  {visitData.disposition === 'referred' && (
                    <div className="space-y-2">
                      <Label htmlFor="referralTo">Referred To</Label>
                      <Input
                        id="referralTo"
                        value={visitData.referralTo}
                        onChange={(e) => setVisitData({...visitData, referralTo: e.target.value})}
                        placeholder="Doctor name or hospital"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Label htmlFor="followUpRequired">Follow-up Required</Label>
                    <Switch
                      id="followUpRequired"
                      checked={visitData.followUpRequired}
                      onCheckedChange={(checked) => setVisitData({...visitData, followUpRequired: checked})}
                    />
                  </div>

                  {visitData.followUpRequired && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Follow-up Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !followUpDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {followUpDate ? format(followUpDate, "PPP") : "Select date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={followUpDate}
                              onSelect={setFollowUpDate}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="followUpInstructions">Follow-up Instructions</Label>
                        <Textarea
                          id="followUpInstructions"
                          value={visitData.followUpInstructions}
                          onChange={(e) => setVisitData({...visitData, followUpInstructions: e.target.value})}
                          placeholder="Instructions for follow-up visit"
                          rows={3}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="additionalNotes">Additional Notes</Label>
                <Textarea
                  id="additionalNotes"
                  value={visitData.additionalNotes}
                  onChange={(e) => setVisitData({...visitData, additionalNotes: e.target.value})}
                  placeholder="Any additional observations or notes"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="attendingStaff">Attending Staff</Label>
                  <Input
                    id="attendingStaff"
                    value={visitData.attendingStaff}
                    onChange={(e) => setVisitData({...visitData, attendingStaff: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nurseAssisting">Nurse Assisting</Label>
                  <Input
                    id="nurseAssisting"
                    value={visitData.nurseAssisting}
                    onChange={(e) => setVisitData({...visitData, nurseAssisting: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <div className="flex justify-between">
          <div className="flex gap-2">
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Print Visit Summary
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              {isEdit ? 'Update Visit' : 'Save Visit Record'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};