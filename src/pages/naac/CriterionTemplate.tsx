import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNAAC } from '@/context/NAACContext';
import { 
  Upload, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  Plus,
  FileText,
  CheckCircle2,
  AlertCircle,
  Calendar
} from 'lucide-react';

interface CriterionTemplateProps {
  criterionNumber: number;
  title: string;
  description: string;
  icon: React.ElementType;
}

export function CriterionTemplate({ criterionNumber, title, description, icon: Icon }: CriterionTemplateProps) {
  const { naacData, updateProgress, addDocument } = useNAAC();
  const [activeTab, setActiveTab] = useState('overview');
  
  const criterionProgress = naacData.criterionProgress.find(p => p.criterionNumber === criterionNumber);
  const criterionDocuments = naacData.documents.filter(d => d.criterionNumber === criterionNumber);

  // Mock data for metrics (this would come from API in real implementation)
  const mockMetrics = [
    {
      code: `${criterionNumber}.1.1`,
      title: 'Curriculum Planning and Implementation',
      status: 'completed',
      lastUpdated: '2024-02-20',
      evidenceCount: 3
    },
    {
      code: `${criterionNumber}.1.2`,
      title: 'Academic Flexibility',
      status: 'in-progress',
      lastUpdated: '2024-02-18',
      evidenceCount: 1
    },
    {
      code: `${criterionNumber}.2.1`,
      title: 'Student Enrollment and Profile',
      status: 'pending',
      lastUpdated: '2024-02-15',
      evidenceCount: 0
    }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Mock file upload - in real implementation, this would upload to server
      addDocument({
        title: file.name.split('.')[0],
        filename: file.name,
        criterionNumber,
        metricCode: `${criterionNumber}.1.1`,
        evidenceType: 'Supporting Document',
        fileType: file.type.includes('pdf') ? 'PDF' : 'Document',
        fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        tags: ['evidence', 'uploaded']
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Criterion {criterionNumber}: {title}
            </h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">
            {criterionProgress?.completionPercentage || 0}%
          </div>
          <p className="text-sm text-muted-foreground">Complete</p>
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Progress Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={criterionProgress?.completionPercentage || 0} className="h-3" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-success">
                  {criterionProgress?.completedMetrics || 0}
                </div>
                <p className="text-sm text-muted-foreground">Completed Metrics</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-warning">
                  {(criterionProgress?.totalMetrics || 0) - (criterionProgress?.completedMetrics || 0)}
                </div>
                <p className="text-sm text-muted-foreground">Pending Metrics</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {criterionDocuments.length}
                </div>
                <p className="text-sm text-muted-foreground">Documents Uploaded</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="forms">Data Entry</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Key Requirements</CardTitle>
                <CardDescription>Essential elements for this criterion</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockMetrics.map((metric) => (
                    <div key={metric.code} className="flex items-center justify-between p-2 rounded border">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{metric.code}</div>
                        <div className="text-sm text-muted-foreground">{metric.title}</div>
                      </div>
                      <Badge variant={
                        metric.status === 'completed' ? 'default' :
                        metric.status === 'in-progress' ? 'secondary' : 'outline'
                      }>
                        {metric.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates and changes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <div className="flex-1">
                      <p className="text-sm">Document uploaded successfully</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-4 h-4 text-warning" />
                    <div className="flex-1">
                      <p className="text-sm">Metric 1.2.1 needs attention</p>
                      <p className="text-xs text-muted-foreground">1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-4 h-4 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm">Deadline reminder set</p>
                      <p className="text-xs text-muted-foreground">3 days ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Metrics Status</CardTitle>
              <CardDescription>Track progress for all metrics in this criterion</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric Code</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Evidence</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockMetrics.map((metric) => (
                    <TableRow key={metric.code}>
                      <TableCell className="font-medium">{metric.code}</TableCell>
                      <TableCell>{metric.title}</TableCell>
                      <TableCell>
                        <Badge variant={
                          metric.status === 'completed' ? 'default' :
                          metric.status === 'in-progress' ? 'secondary' : 'outline'
                        }>
                          {metric.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{metric.evidenceCount} files</TableCell>
                      <TableCell>{metric.lastUpdated}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Evidence Documents</CardTitle>
                  <CardDescription>Upload and manage supporting documents</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.xlsx,.jpg,.png"
                  />
                  <Button 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    size="sm"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Title</TableHead>
                    <TableHead>Metric Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criterionDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4" />
                          <span>{doc.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>{doc.metricCode}</TableCell>
                      <TableCell>{doc.evidenceType}</TableCell>
                      <TableCell>{doc.uploadDate}</TableCell>
                      <TableCell>{doc.fileSize}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {criterionDocuments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No documents uploaded yet. Click "Upload Document" to add evidence.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Entry Forms</CardTitle>
              <CardDescription>Input quantitative and qualitative data for metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="academic-year">Academic Year</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select academic year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2023-24">2023-24</SelectItem>
                        <SelectItem value="2022-23">2022-23</SelectItem>
                        <SelectItem value="2021-22">2021-22</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="metric-code">Metric Code</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select metric" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockMetrics.map((metric) => (
                          <SelectItem key={metric.code} value={metric.code}>
                            {metric.code} - {metric.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="data-value">Quantitative Data</Label>
                    <Input 
                      id="data-value" 
                      type="number" 
                      placeholder="Enter numerical value"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="description">Qualitative Description</Label>
                    <Textarea 
                      id="description"
                      placeholder="Provide detailed description and context"
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="remarks">Additional Remarks</Label>
                    <Textarea 
                      id="remarks"
                      placeholder="Any additional notes or comments"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline">Save Draft</Button>
                <Button>Submit Data</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}