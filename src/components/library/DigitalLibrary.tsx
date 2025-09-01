import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UploadResourceDialog } from '@/components/library/UploadResourceDialog';
import { Upload, FileText, Download, Eye, Plus, Trash2 } from 'lucide-react';

export const DigitalLibrary = () => {
  const [digitalResources, setDigitalResources] = useState([
    {
      id: 1,
      title: 'Advanced Calculus Notes',
      type: 'PDF',
      size: '2.4 MB',
      uploadedBy: 'Dr. Smith',
      uploadDate: '2024-03-10',
      downloads: 45,
      category: 'Notes',
      fileName: 'advanced_calculus_notes.pdf'
    },
    {
      id: 2,
      title: 'Physics Practical Manual',
      type: 'PDF',
      size: '5.2 MB',
      uploadedBy: 'Prof. Johnson',
      uploadDate: '2024-03-08',
      downloads: 32,
      category: 'Manual',
      fileName: 'physics_practical_manual.pdf'
    }
  ]);

  const handleResourceAdded = (newResource: any) => {
    setDigitalResources([...digitalResources, newResource]);
  };

  const handleDeleteResource = (resourceId: number) => {
    setDigitalResources(digitalResources.filter(resource => resource.id !== resourceId));
  };

  const handleDownloadResource = (resource: any) => {
    // In a real app, this would initiate actual download
    console.log('Downloading:', resource.fileName);
    // Update download count
    setDigitalResources(digitalResources.map(r => 
      r.id === resource.id 
        ? { ...r, downloads: r.downloads + 1 }
        : r
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Digital Library</h2>
          <p className="text-muted-foreground">Upload and manage e-books, notes, and papers</p>
        </div>
        <UploadResourceDialog onResourceAdded={handleResourceAdded} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload New Resource</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Resource Title</Label>
              <Input id="title" placeholder="Enter title" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select className="w-full h-10 px-3 py-2 border rounded-md">
                <option>E-Book</option>
                <option>Notes</option>
                <option>Research Paper</option>
                <option>Manual</option>
              </select>
            </div>
          </div>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Drag and drop files here or click to browse</p>
            <Button variant="outline">Choose Files</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Digital Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {digitalResources.map((resource) => (
              <div key={resource.id} className="border rounded-lg p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">{resource.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {resource.type} • {resource.size} • Uploaded by {resource.uploadedBy}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">{resource.category}</Badge>
                      <span className="text-xs text-muted-foreground">{resource.downloads} downloads</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => console.log('View:', resource.fileName)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDownloadResource(resource)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDeleteResource(resource.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};