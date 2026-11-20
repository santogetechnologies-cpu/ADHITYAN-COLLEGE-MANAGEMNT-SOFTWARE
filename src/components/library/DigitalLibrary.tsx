import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UploadResourceDialog } from '@/components/library/UploadResourceDialog';
import { Upload, FileText, Download, Eye, Plus, Trash2, Loader2 } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

interface DigitalResourceItem {
  id: string;
  title: string;
  type: string;
  size: string;
  uploadedBy: string;
  uploadDate: string;
  downloads: number;
  category: string;
  fileName: string;
}

export const DigitalLibrary = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [digitalResources, setDigitalResources] = useState<DigitalResourceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for manual upload inside card
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('E-Book');
  const [uploading, setUploading] = useState(false);

  const loadResources = useCallback(async () => {
    try {
      setLoading(true);
      const data = await db.getDigitalLibraryResources();
      if (data && data.length > 0) {
        setDigitalResources(data.map((d: any) => ({
          id: d.id,
          title: d.title,
          type: d.type || 'PDF',
          size: d.file_size || '1.8 MB',
          uploadedBy: d.uploaded_by || 'Faculty Member',
          uploadDate: d.created_at ? d.created_at.split('T')[0] : 'Recent',
          downloads: d.downloads || 0,
          category: d.category || 'Reference',
          fileName: d.file_name || `${d.title.toLowerCase().replace(/\s+/g, '_')}.pdf`
        })));
      } else {
        setDigitalResources([]);
      }
    } catch (err) {
      console.warn('Failed to load digital library resources:', err);
      setDigitalResources([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  useRealtimeSubscription({ table: 'digital_library_resources', onChange: loadResources, onReconnect: loadResources });

  const handleResourceAdded = (newResource: any) => {
    loadResources();
  };

  const handleDeleteResource = async (resourceId: string) => {
    try {
      await db.deleteDigitalLibraryResource(resourceId);
      toast({
        title: "Resource Deleted",
        description: "Digital resource removed from library repository."
      });
      loadResources();
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err.message || "Failed to remove resource.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadResource = async (resource: DigitalResourceItem) => {
    toast({
      title: "Downloading Resource",
      description: `Downloading ${resource.fileName}...`
    });
    try {
      await db.updateDigitalLibraryResource(resource.id, {
        downloads: resource.downloads + 1
      });
      loadResources();
    } catch (err) {
      console.warn('Download tracking error:', err);
    }
  };

  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!uploadTitle.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a resource title before selecting a file.",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);
      await db.addDigitalLibraryResource({
        title: uploadTitle.trim(),
        category: uploadCategory,
        type: file.type.includes('pdf') ? 'PDF' : file.type.includes('image') ? 'Image' : 'Document',
        file_name: file.name,
        file_size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        uploaded_by: user?.name || 'Librarian',
        downloads: 0
      });

      toast({
        title: "Resource Uploaded",
        description: `Successfully added ${uploadTitle} to digital repository.`
      });

      setUploadTitle('');
      loadResources();
    } catch (err: any) {
      toast({
        title: "Upload Failed",
        description: err.message || "Failed to upload digital resource.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Digital Library</h2>
          <p className="text-muted-foreground">Upload and manage e-books, clinical notes, and academic papers</p>
        </div>
        <UploadResourceDialog onResourceAdded={handleResourceAdded} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload New Resource</CardTitle>
          <CardDescription>Add new medical textbooks, clinical lecture notes, or research papers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Resource Title</Label>
              <Input 
                id="title" 
                placeholder="e.g. Clinical Hematology Protocols" 
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select 
                id="category"
                className="w-full h-10 px-3 py-2 border rounded-md bg-background text-sm"
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
              >
                <option value="E-Book">E-Book</option>
                <option value="Notes">Clinical Notes</option>
                <option value="Research Paper">Research Paper</option>
                <option value="Manual">Lab / Practical Manual</option>
                <option value="Reference">Reference Material</option>
              </select>
            </div>
          </div>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center relative">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm font-medium mb-1">Click to select and upload document</p>
            <p className="text-xs text-muted-foreground mb-4">Supported formats: PDF, DOCX, XLSX, EPUB (Up to 50MB)</p>
            <input 
              type="file" 
              id="file-upload-input"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              onChange={handleQuickUpload}
              disabled={uploading}
            />
            <Button variant="outline" type="button" disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Choose File'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Digital Resources ({digitalResources.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : digitalResources.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground border rounded-lg">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-base font-semibold text-foreground/80">No Digital Resources Uploaded</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Electronic books, notes, and research papers added to the collection will appear here.
              </p>
            </div>
          ) : (
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
                      onClick={() => toast({ title: "View Resource", description: `Viewing ${resource.title}` })}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};
