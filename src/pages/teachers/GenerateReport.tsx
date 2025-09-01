import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Download, 
  Calendar as CalendarIcon, 
  BarChart3, 
  Users, 
  TrendingUp,
  CheckCircle,
  Clock,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'student' | 'class' | 'subject' | 'attendance' | 'performance';
  estimatedTime: string;
}

export default function GenerateReport() {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const { toast } = useToast();

  const reportTemplates: ReportTemplate[] = [
    {
      id: 'student-progress',
      name: 'Student Progress Report',
      description: 'Comprehensive report on individual student performance across all subjects',
      type: 'student',
      estimatedTime: '5-10 minutes'
    },
    {
      id: 'class-summary',
      name: 'Class Summary Report',
      description: 'Overall class performance, attendance, and behavioral insights',
      type: 'class',
      estimatedTime: '3-5 minutes'
    },
    {
      id: 'subject-analysis',
      name: 'Subject Analysis Report',
      description: 'Detailed analysis of student performance in specific subjects',
      type: 'subject',
      estimatedTime: '7-12 minutes'
    },
    {
      id: 'attendance-report',
      name: 'Attendance Report',
      description: 'Attendance patterns and trends for selected period',
      type: 'attendance',
      estimatedTime: '2-3 minutes'
    },
    {
      id: 'parent-communication',
      name: 'Parent Communication Report',
      description: 'Summary of parent interactions and communications',
      type: 'student',
      estimatedTime: '4-6 minutes'
    }
  ];

  const classes = [
    { id: '10a', name: 'Grade 10-A', students: 32 },
    { id: '10b', name: 'Grade 10-B', students: 30 },
    { id: '9b', name: 'Grade 9-B', students: 28 },
    { id: '11a', name: 'Grade 11-A', students: 35 },
  ];

  const recentReports = [
    { id: '1', name: 'Grade 10-A Monthly Progress', type: 'class', generatedOn: '2 days ago', status: 'completed' },
    { id: '2', name: 'Mathematics Subject Analysis', type: 'subject', generatedOn: '1 week ago', status: 'completed' },
    { id: '3', name: 'Attendance Summary - October', type: 'attendance', generatedOn: '3 days ago', status: 'completed' },
  ];

  const handleClassToggle = (classId: string) => {
    setSelectedClasses(prev =>
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) {
      toast({
        title: "Please select a report template",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    // Simulate report generation
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setIsGenerating(false);
          toast({
            title: "Report Generated Successfully",
            description: "Your report is ready for download."
          });
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'student': return 'bg-blue-500';
      case 'class': return 'bg-green-500';
      case 'subject': return 'bg-purple-500';
      case 'attendance': return 'bg-orange-500';
      case 'performance': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation showBackButton={true} backUrl="/dashboard" backLabel="Back to Dashboard" />
      <main className="container max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-2 mb-6">
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Generate Reports</h1>
        </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Report Generation Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerateReport} className="space-y-6">
                {/* Report Template Selection */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">Select Report Template</Label>
                  <div className="grid gap-3">
                    {reportTemplates.map((template) => (
                      <div
                        key={template.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedTemplate === template.id 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:border-muted-foreground'
                        }`}
                        onClick={() => setSelectedTemplate(template.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <div className={`w-2 h-2 rounded-full ${getTypeColor(template.type)}`} />
                              <h4 className="font-medium">{template.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {template.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {template.description}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <span className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{template.estimatedTime}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Date Range Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP") : "Select start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "PPP") : "Select end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Class Selection */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">Select Classes</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {classes.map((cls) => (
                      <div key={cls.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                        <Checkbox
                          id={cls.id}
                          checked={selectedClasses.includes(cls.id)}
                          onCheckedChange={() => handleClassToggle(cls.id)}
                        />
                        <Label htmlFor={cls.id} className="flex-1">
                          <div className="font-medium">{cls.name}</div>
                          <div className="text-sm text-muted-foreground">{cls.students} students</div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Report Options */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">Report Options</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="includeCharts" defaultChecked />
                      <Label htmlFor="includeCharts">Include charts and graphs</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="includePhotos" />
                      <Label htmlFor="includePhotos">Include student photos</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="includeComments" defaultChecked />
                      <Label htmlFor="includeComments">Include teacher comments</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="parentCopy" />
                      <Label htmlFor="parentCopy">Generate parent-friendly version</Label>
                    </div>
                  </div>
                </div>

                {/* Format Selection */}
                <div>
                  <Label htmlFor="format">Report Format</Label>
                  <Select defaultValue="pdf">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF Document</SelectItem>
                      <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                      <SelectItem value="word">Word Document</SelectItem>
                      <SelectItem value="html">HTML Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isGenerating && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Generating Report...</Label>
                      <span className="text-sm text-muted-foreground">{generationProgress}%</span>
                    </div>
                    <Progress value={generationProgress} className="w-full" />
                  </div>
                )}

                <div className="flex justify-end space-x-4">
                  <Button variant="outline" type="button" disabled={isGenerating}>
                    Preview Report
                  </Button>
                  <Button type="submit" disabled={isGenerating || !selectedTemplate}>
                    {isGenerating ? 'Generating...' : 'Generate Report'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Reports */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>Recent Reports</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentReports.map((report) => (
                  <div key={report.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm">{report.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {report.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{report.generatedOn}</p>
                    <div className="flex space-x-1">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Students</span>
                <span className="font-semibold">125</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Classes Managed</span>
                <span className="font-semibold">4</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Reports Generated</span>
                <span className="font-semibold">23</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Avg. Class Performance</span>
                <span className="font-semibold text-success">85%</span>
              </div>
            </CardContent>
          </Card>

          {/* Help & Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Report Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>💡 <strong>Best Practice:</strong> Generate reports weekly for better tracking</p>
              <p>📊 <strong>Charts:</strong> Visual data helps parents understand better</p>
              <p>📅 <strong>Date Range:</strong> Monthly reports provide comprehensive insights</p>
              <p>👥 <strong>Parent Copies:</strong> Simplified versions work better for parent communication</p>
            </CardContent>
          </Card>
        </div>
      </div>
      </main>
    </div>
  );
}