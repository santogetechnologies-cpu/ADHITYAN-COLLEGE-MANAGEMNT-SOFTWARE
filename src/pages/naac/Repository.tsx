import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useNAAC } from '@/context/NAACContext';
import { 
  Upload, 
  Download, 
  Eye, 
  Trash2, 
  Search,
  Filter,
  FileText,
  FolderOpen,
  Tag
} from 'lucide-react';

const evidenceTypes = [
  'Policy Document',
  'Data Sheet',
  'Supporting Document',
  'Photograph',
  'Certificate',
  'Report',
  'Presentation',
  'Other'
];

const metricCodes = [
  '1.1.1', '1.1.2', '1.2.1', '1.2.2', '1.3.1', '1.3.2',
  '2.1.1', '2.1.2', '2.2.1', '2.2.2', '2.3.1', '2.3.2',
  '3.1.1', '3.1.2', '3.2.1', '3.2.2', '3.3.1', '3.3.2',
  '4.1.1', '4.1.2', '4.2.1', '4.2.2', '4.3.1', '4.3.2',
  '5.1.1', '5.1.2', '5.2.1', '5.2.2', '5.3.1', '5.3.2',
  '6.1.1', '6.1.2', '6.2.1', '6.2.2', '6.3.1', '6.3.2',
  '7.1.1', '7.1.2', '7.2.1', '7.2.2', '7.3.1', '7.3.2'
];

export default function Repository() {
  const { naacData, addDocument, removeDocument } = useNAAC();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCriterion, setFilterCriterion] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    criterionNumber: 1,
    metricCode: '',
    evidenceType: '',
    tags: ''
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && uploadForm.title && uploadForm.metricCode && uploadForm.evidenceType) {
      addDocument({
        title: uploadForm.title,
        filename: file.name,
        criterionNumber: uploadForm.criterionNumber,
        metricCode: uploadForm.metricCode,
        evidenceType: uploadForm.evidenceType,
        fileType: file.type.includes('pdf') ? 'PDF' : 
                  file.type.includes('image') ? 'Image' :
                  file.type.includes('word') ? 'Word' :
                  file.type.includes('excel') ? 'Excel' : 'Document',
        fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        tags: uploadForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      });
      
      setUploadForm({
        title: '',
        description: '',
        criterionNumber: 1,
        metricCode: '',
        evidenceType: '',
        tags: ''
      });
      setShowUploadForm(false);
    }
  };

  const filteredDocuments = naacData.documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.metricCode.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCriterion = filterCriterion === 'all' || 
                            doc.criterionNumber.toString() === filterCriterion;
    
    const matchesType = filterType === 'all' || doc.evidenceType === filterType;
    
    return matchesSearch && matchesCriterion && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
            <FolderOpen className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Central Repository</h1>
            <p className="text-muted-foreground">Document Management & Evidence Storage</p>
          </div>
        </div>
        <Button onClick={() => setShowUploadForm(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{naacData.documents.length}</div>
          </CardContent>
        </Card>

        {[1, 2, 3, 4, 5, 6, 7].map(criterion => (
          <Card key={criterion}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Criterion {criterion}</CardTitle>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {naacData.documents.filter(d => d.criterionNumber === criterion).length}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upload Form Modal */}
      {showUploadForm && (
        <Card>
          <CardHeader>
            <CardTitle>Upload New Document</CardTitle>
            <CardDescription>Add evidence document to the repository</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Document Title *</Label>
                <Input
                  id="title"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter document title"
                />
              </div>

              <div>
                <Label htmlFor="criterion">Criterion Number *</Label>
                <Select 
                  value={uploadForm.criterionNumber.toString()}
                  onValueChange={(value) => setUploadForm(prev => ({ ...prev, criterionNumber: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select criterion" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7].map(num => (
                      <SelectItem key={num} value={num.toString()}>
                        Criterion {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="metric">Metric Code *</Label>
                <Select 
                  value={uploadForm.metricCode}
                  onValueChange={(value) => setUploadForm(prev => ({ ...prev, metricCode: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select metric code" />
                  </SelectTrigger>
                  <SelectContent>
                    {metricCodes.filter(code => code.startsWith(uploadForm.criterionNumber.toString())).map(code => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="evidence-type">Evidence Type *</Label>
                <Select 
                  value={uploadForm.evidenceType}
                  onValueChange={(value) => setUploadForm(prev => ({ ...prev, evidenceType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select evidence type" />
                  </SelectTrigger>
                  <SelectContent>
                    {evidenceTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={uploadForm.description}
                onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description of the document"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={uploadForm.tags}
                onChange={(e) => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="e.g., policy, curriculum, academic"
              />
            </div>

            <div>
              <Label htmlFor="file">Select File *</Label>
              <input
                type="file"
                id="file"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png,.gif"
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowUploadForm(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => document.getElementById('file')?.click()}
                disabled={!uploadForm.title || !uploadForm.metricCode || !uploadForm.evidenceType}
              >
                Upload File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Document Library</CardTitle>
          <CardDescription>Search and filter documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterCriterion} onValueChange={setFilterCriterion}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by criterion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Criteria</SelectItem>
                {[1, 2, 3, 4, 5, 6, 7].map(num => (
                  <SelectItem key={num} value={num.toString()}>
                    Criterion {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {evidenceTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Documents Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Criterion</TableHead>
                <TableHead>Metric</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4" />
                      <div>
                        <div className="font-medium">{doc.title}</div>
                        <div className="text-sm text-muted-foreground">{doc.filename}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      Criterion {doc.criterionNumber}
                    </Badge>
                  </TableCell>
                  <TableCell>{doc.metricCode}</TableCell>
                  <TableCell>{doc.evidenceType}</TableCell>
                  <TableCell>{doc.uploadDate}</TableCell>
                  <TableCell>{doc.fileSize}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {doc.tags.slice(0, 2).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {doc.tags.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{doc.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeDocument(doc.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredDocuments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Search className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">No documents found matching your criteria.</p>
                      <Button variant="outline" size="sm" onClick={() => {/* Reset filters */}}>
                        Clear Filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}