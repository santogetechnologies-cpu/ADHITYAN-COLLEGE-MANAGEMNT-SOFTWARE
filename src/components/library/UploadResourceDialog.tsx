import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UploadResourceDialogProps {
  onResourceAdded: (resource: any) => void;
}

export const UploadResourceDialog = ({ onResourceAdded }: UploadResourceDialogProps) => {
  const [open, setOpen] = useState(false);
  const [resourceData, setResourceData] = useState({
    title: '',
    author: '',
    category: '',
    type: '',
    description: '',
    subject: '',
    class: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resourceData.title || !resourceData.category || !selectedFile) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and select a file.",
        variant: "destructive",
      });
      return;
    }

    // Simulate file upload
    const newResource = {
      id: Date.now(),
      title: resourceData.title,
      author: resourceData.author || 'Unknown',
      category: resourceData.category,
      type: selectedFile.type.includes('pdf') ? 'PDF' : 
            selectedFile.type.includes('image') ? 'Image' :
            selectedFile.type.includes('video') ? 'Video' :
            'Document',
      size: `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`,
      uploadedBy: 'Current User', // In real app, get from auth context
      uploadDate: new Date().toISOString().split('T')[0],
      downloads: 0,
      fileName: selectedFile.name,
      description: resourceData.description,
      subject: resourceData.subject,
      class: resourceData.class,
    };

    onResourceAdded(newResource);
    
    toast({
      title: "Success",
      description: "Resource uploaded successfully!",
    });
    
    setResourceData({
      title: '',
      author: '',
      category: '',
      type: '',
      description: '',
      subject: '',
      class: '',
    });
    setSelectedFile(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload Resource
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Digital Resource</DialogTitle>
          <DialogDescription>
            Add a new digital resource to the library collection.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Resource Title *</Label>
              <Input
                id="title"
                value={resourceData.title}
                onChange={(e) => setResourceData({ ...resourceData, title: e.target.value })}
                placeholder="e.g., Advanced Calculus Notes"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="author">Author/Creator</Label>
              <Input
                id="author"
                value={resourceData.author}
                onChange={(e) => setResourceData({ ...resourceData, author: e.target.value })}
                placeholder="e.g., Dr. Smith"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={resourceData.category} onValueChange={(value) => setResourceData({ ...resourceData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="E-Book">E-Book</SelectItem>
                  <SelectItem value="Notes">Notes</SelectItem>
                  <SelectItem value="Research Paper">Research Paper</SelectItem>
                  <SelectItem value="Manual">Manual</SelectItem>
                  <SelectItem value="Video Lecture">Video Lecture</SelectItem>
                  <SelectItem value="Presentation">Presentation</SelectItem>
                  <SelectItem value="Question Bank">Question Bank</SelectItem>
                  <SelectItem value="Solution Manual">Solution Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Select value={resourceData.subject} onValueChange={(value) => setResourceData({ ...resourceData, subject: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mathematics">Mathematics</SelectItem>
                  <SelectItem value="Physics">Physics</SelectItem>
                  <SelectItem value="Chemistry">Chemistry</SelectItem>
                  <SelectItem value="Biology">Biology</SelectItem>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="History">History</SelectItem>
                  <SelectItem value="Geography">Geography</SelectItem>
                  <SelectItem value="Computer Science">Computer Science</SelectItem>
                  <SelectItem value="Economics">Economics</SelectItem>
                  <SelectItem value="Political Science">Political Science</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="class">Target Class/Grade</Label>
            <Select value={resourceData.class} onValueChange={(value) => setResourceData({ ...resourceData, class: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Class 9">Class 9</SelectItem>
                <SelectItem value="Class 10">Class 10</SelectItem>
                <SelectItem value="Class 11">Class 11</SelectItem>
                <SelectItem value="Class 12">Class 12</SelectItem>
                <SelectItem value="All Classes">All Classes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={resourceData.description}
              onChange={(e) => setResourceData({ ...resourceData, description: e.target.value })}
              placeholder="Brief description of the resource content..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">File Upload *</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              {selectedFile ? (
                <div className="space-y-2">
                  <FileText className="h-8 w-8 mx-auto text-primary" />
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    Remove File
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">Drag and drop files here or click to browse</p>
                  <Input
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.mp4,.avi,.mov"
                    className="hidden"
                    id="file-upload"
                  />
                  <Button type="button" variant="outline" asChild>
                    <label htmlFor="file-upload" className="cursor-pointer">
                      Choose Files
                    </label>
                  </Button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Upload Resource</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};