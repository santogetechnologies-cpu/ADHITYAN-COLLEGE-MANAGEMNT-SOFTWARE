import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, AlertTriangle, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AttachmentDialog } from '@/components/shared/AttachmentDialog';
import { useToast } from '@/hooks/use-toast';

const ReportConcern = () => {
  const navigate = useNavigate();
  const [concernType, setConcernType] = useState('');
  const [priority, setPriority] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const { toast } = useToast();

  const concernTypes = [
    { value: 'academic', label: 'Academic Issue' },
    { value: 'bullying', label: 'Bullying/Harassment' },
    { value: 'safety', label: 'Safety Concern' },
    { value: 'transportation', label: 'Transportation' },
    { value: 'facility', label: 'Facility/Infrastructure' },
    { value: 'teacher', label: 'Teacher/Staff Concern' },
    { value: 'other', label: 'Other' }
  ];

  const priorities = [
    { value: 'low', label: 'Low - General inquiry' },
    { value: 'medium', label: 'Medium - Needs attention' },
    { value: 'high', label: 'High - Urgent response needed' },
    { value: 'critical', label: 'Critical - Immediate action required' }
  ];

  const handleSubmitConcern = () => {
    if (concernType && priority && subject && description) {
      // Handle concern submission logic here
      // console.log('Concern submitted:', {
      //   type: concernType,
      //   priority,
      //   subject,
      //   description,
      //   anonymous: isAnonymous,
      //   attachments: attachedFiles
      // });
      
      toast({
        title: "Concern submitted successfully",
        description: "Your concern has been submitted and will be reviewed within 24-48 hours.",
      });
      
      navigate('/dashboard');
    } else {
      toast({
        title: "Please complete all required fields",
        description: "Make sure you've filled in all required information.",
        variant: "destructive",
      });
    }
  };

  const handleAttachmentsAdded = (files: File[]) => {
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const getPriorityColor = (value: string) => {
    switch (value) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/dashboard')}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Report Concern</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your concern will be reviewed by school administration. For emergencies, please contact the school office immediately at (555) 123-4567.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Submit a Concern</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="concern-type">Type of Concern</Label>
                  <Select value={concernType} onValueChange={setConcernType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select concern type" />
                    </SelectTrigger>
                    <SelectContent>
                      {concernTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          <span className={getPriorityColor(p.value)}>
                            {p.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Brief summary of your concern"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Detailed Description</Label>
                <Textarea
                  id="description"
                  placeholder="Please provide a detailed description of your concern, including any relevant dates, times, and people involved..."
                  className="min-h-[150px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="anonymous" 
                    checked={isAnonymous}
                    onCheckedChange={(checked) => setIsAnonymous(checked === true)}
                  />
                  <Label htmlFor="anonymous" className="text-sm">
                    Submit anonymously (your identity will not be shared)
                  </Label>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setAttachmentDialogOpen(true)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Attach Evidence ({attachedFiles.length})
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Optional: Photos, documents, or other supporting files
                    </span>
                  </div>
                  
                  {attachedFiles.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {attachedFiles.length} file(s) attached: {attachedFiles.map(f => f.name).join(', ')}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleSubmitConcern} className="flex-1">
                  <Send className="h-4 w-4 mr-2" />
                  Submit Concern
                </Button>
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <h3 className="font-medium">What happens next?</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Your concern will be reviewed within 24-48 hours</li>
                  <li>• A school administrator will investigate the matter</li>
                  <li>• You will receive a follow-up response via email or phone</li>
                  <li>• For urgent matters, you may be contacted sooner</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <AttachmentDialog
        open={attachmentDialogOpen}
        onOpenChange={setAttachmentDialogOpen}
        onAttachmentsAdded={handleAttachmentsAdded}
        title="Attach Evidence"
        description="Upload photos, documents, or other files that support your concern"
        acceptedTypes={['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.txt', '.mp4', '.mov']}
        maxFiles={10}
        maxSizePerFile={25}
      />
    </div>
  );
};

export default ReportConcern;