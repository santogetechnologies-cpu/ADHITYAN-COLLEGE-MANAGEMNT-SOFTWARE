import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Upload, File, Image, Video, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { storageService, StorageBucket, BUCKET_CONFIGS } from '@/services/storageService';

export interface UploadedFileItem {
  id: string;
  file: File;
  name: string;
  size: string;
  type: string;
  preview?: string;
  storagePath?: string;
  publicUrl?: string;
  isUploading?: boolean;
  uploaded?: boolean;
}

interface FileUploadProps {
  onFilesChange?: (files: File[]) => void;
  onUploadComplete?: (uploaded: Array<{ path: string; publicUrl: string; file: File }>) => void;
  bucket?: StorageBucket;
  folder?: string;
  autoUpload?: boolean;
  maxFiles?: number;
  maxSizePerFile?: number; // in MB (overrides bucket max if provided)
  acceptedTypes?: string[];
  className?: string;
}

export function FileUpload({ 
  onFilesChange,
  onUploadComplete,
  bucket = 'attachments',
  folder = 'uploads',
  autoUpload = false,
  maxFiles = 5, 
  maxSizePerFile,
  acceptedTypes,
  className = ''
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploadingAny, setIsUploadingAny] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const bucketConfig = BUCKET_CONFIGS[bucket];
  const effectiveMaxSizeMB = maxSizePerFile || bucketConfig?.maxMB || 10;
  const effectiveAcceptedTypes = acceptedTypes || bucketConfig?.allowedTypes.map(t => '.' + t.split('/')[1]) || ['.pdf', '.png', '.jpg', '.jpeg'];

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.startsWith('video/')) return Video;
    if (type.includes('pdf') || type.includes('document')) return FileText;
    return File;
  };

  const validateFile = (file: File): boolean => {
    const bucketValidation = storageService.validateFile(bucket, file);
    if (!bucketValidation.valid) {
      toast({
        title: "Validation Failed",
        description: bucketValidation.error,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const uploadFileToSupabase = async (item: UploadedFileItem): Promise<UploadedFileItem> => {
    try {
      const result = await storageService.uploadFile(bucket, item.file, folder);
      return {
        ...item,
        storagePath: result.path,
        publicUrl: result.publicUrl,
        isUploading: false,
        uploaded: true,
      };
    } catch (err: any) {
      toast({
        title: "Upload Failed",
        description: err.message || `Failed to upload ${item.name}`,
        variant: "destructive",
      });
      return {
        ...item,
        isUploading: false,
        uploaded: false,
      };
    }
  };

  const addFiles = async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    
    if (files.length + fileArray.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `Maximum ${maxFiles} files allowed`,
        variant: "destructive",
      });
      return;
    }

    const validItems: UploadedFileItem[] = [];
    
    for (const file of fileArray) {
      if (validateFile(file)) {
        const fileItem: UploadedFileItem = {
          id: Date.now().toString() + Math.random().toString().slice(2, 6),
          file,
          name: file.name,
          size: formatFileSize(file.size),
          type: file.type,
          isUploading: autoUpload,
          uploaded: false,
        };

        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            fileItem.preview = e.target?.result as string;
            setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, preview: fileItem.preview } : f));
          };
          reader.readAsDataURL(file);
        }

        validItems.push(fileItem);
      }
    }

    const updated = [...files, ...validItems];
    setFiles(updated);
    onFilesChange?.(updated.map(f => f.file));

    // Handle immediate auto-upload if configured
    if (autoUpload && validItems.length > 0) {
      setIsUploadingAny(true);
      const uploadedResults: Array<{ path: string; publicUrl: string; file: File }> = [];

      for (const item of validItems) {
        const completed = await uploadFileToSupabase(item);
        setFiles(prev => prev.map(f => f.id === completed.id ? completed : f));
        if (completed.storagePath && completed.publicUrl) {
          uploadedResults.push({
            path: completed.storagePath,
            publicUrl: completed.publicUrl,
            file: completed.file,
          });
        }
      }

      setIsUploadingAny(false);
      if (uploadedResults.length > 0) {
        onUploadComplete?.(uploadedResults);
      }
    }
  };

  const removeFile = async (id: string) => {
    const target = files.find(f => f.id === id);
    if (target?.storagePath) {
      try {
        await storageService.deleteFile(bucket, target.storagePath);
      } catch (e) {
        console.warn('Storage removal note:', e);
      }
    }

    const updatedFiles = files.filter(f => f.id !== id);
    setFiles(updatedFiles);
    onFilesChange?.(updatedFiles.map(f => f.file));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = e.dataTransfer.files;
    addFiles(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      addFiles(selectedFiles);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <Card 
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          isDragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="py-8 text-center">
          <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="text-base font-semibold mb-1">Upload Documents or Media</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Drag and drop files here, or click to browse files
          </p>
          <p className="text-[11px] text-muted-foreground">
            Bucket: <code className="bg-muted px-1 py-0.5 rounded">{bucket}</code> • Max {maxFiles} files • Up to {effectiveMaxSizeMB}MB each
          </p>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={effectiveAcceptedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-xs text-muted-foreground">Attached Files ({files.length})</h4>
            {isUploadingAny && (
              <span className="text-xs text-primary flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading to Supabase...
              </span>
            )}
          </div>
          <div className="space-y-2">
            {files.map((fileItem) => {
              const IconComponent = getFileIcon(fileItem.type);
              return (
                <div
                  key={fileItem.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card text-xs"
                >
                  <div className="flex items-center space-x-3 truncate">
                    {fileItem.preview ? (
                      <img 
                        src={fileItem.preview} 
                        alt={fileItem.name}
                        className="w-9 h-9 object-cover rounded border"
                      />
                    ) : (
                      <div className="w-9 h-9 bg-muted rounded flex items-center justify-center flex-shrink-0">
                        <IconComponent className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="truncate">
                      <p className="font-medium truncate max-w-[200px] sm:max-w-xs">{fileItem.name}</p>
                      <p className="text-[10px] text-muted-foreground">{fileItem.size}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {fileItem.isUploading && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    )}
                    {fileItem.uploaded && (
                      <Badge variant="outline" className="text-[10px] gap-1 text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20">
                        <CheckCircle2 className="w-3 h-3" /> Saved
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px]">
                      {fileItem.type.split('/')[1]?.toUpperCase() || 'FILE'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(fileItem.id);
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
