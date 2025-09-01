import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/ui/file-upload';
import { useToast } from '@/hooks/use-toast';

interface AttachmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAttachmentsAdded: (files: File[]) => void;
  title?: string;
  description?: string;
  maxFiles?: number;
  maxSizePerFile?: number;
  acceptedTypes?: string[];
}

export function AttachmentDialog({
  open,
  onOpenChange,
  onAttachmentsAdded,
  title = "Attach Files",
  description = "Upload files to attach to your message or report",
  maxFiles = 5,
  maxSizePerFile = 10,
  acceptedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.txt']
}: AttachmentDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { toast } = useToast();

  const handleFilesChange = (files: File[]) => {
    setSelectedFiles(files);
  };

  const handleAttach = () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to attach",
        variant: "destructive",
      });
      return;
    }

    onAttachmentsAdded(selectedFiles);
    setSelectedFiles([]);
    onOpenChange(false);
    
    toast({
      title: "Files attached successfully",
      description: `${selectedFiles.length} file(s) have been attached`,
    });
  };

  const handleCancel = () => {
    setSelectedFiles([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <FileUpload
            onFilesChange={handleFilesChange}
            maxFiles={maxFiles}
            maxSizePerFile={maxSizePerFile}
            acceptedTypes={acceptedTypes}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleAttach} disabled={selectedFiles.length === 0}>
            Attach Files ({selectedFiles.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}