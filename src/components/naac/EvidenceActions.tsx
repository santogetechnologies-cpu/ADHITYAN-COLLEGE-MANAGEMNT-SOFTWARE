import { Button } from '@/components/ui/button';
import { Download, Eye, Trash2 } from 'lucide-react';
import { naacService } from '@/services/naacService';
import { useNAAC, type NAACDocument } from '@/context/NAACContext';
import { useToast } from '@/hooks/use-toast';

/** View / download (short-lived signed link) / delete (coordinators only) for one evidence file. */
export function EvidenceActions({ doc }: { doc: NAACDocument }) {
  const { reload, canEdit } = useNAAC();
  const { toast } = useToast();
  const open = async (download: boolean) => {
    if (!doc.fileUrl) return toast({ title: 'No file stored for this record', description: 'It was saved before file upload was supported.', variant: 'destructive' });
    try {
      const url = await naacService.signedUrl(doc.fileUrl, download ? doc.filename : undefined);
      window.open(url, '_blank', 'noopener');
    } catch (e: any) { toast({ title: 'Could not open the file', description: e.message, variant: 'destructive' }); }
  };
  const remove = async () => {
    if (!window.confirm(`Delete "${doc.title}"? The file will be removed permanently.`)) return;
    try { await naacService.deleteEvidence(doc.id, doc.fileUrl); toast({ title: 'Document deleted' }); await reload(); }
    catch (e: any) { toast({ title: 'Not deleted', description: e.message, variant: 'destructive' }); }
  };
  return (
    <div className="flex space-x-1">
      <Button variant="ghost" size="sm" title="View" onClick={() => open(false)}><Eye className="w-4 h-4" /></Button>
      <Button variant="ghost" size="sm" title="Download" onClick={() => open(true)}><Download className="w-4 h-4" /></Button>
      {canEdit && <Button variant="ghost" size="sm" title="Delete" onClick={remove}><Trash2 className="w-4 h-4" /></Button>}
    </div>
  );
}
