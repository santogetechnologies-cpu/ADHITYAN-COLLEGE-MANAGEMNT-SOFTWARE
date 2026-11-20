import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Clock, FileText, Loader2, ExternalLink } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useToast } from '@/hooks/use-toast';
import type { AdmissionDocumentVerification } from '@/types/database.types';

export const DocumentVerification = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<AdmissionDocumentVerification[]>([]);
  const [actionDoc, setActionDoc] = useState<AdmissionDocumentVerification | null>(null);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadDocs = useCallback(async () => {
    try {
      const data = await db.getDocumentVerifications();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load document verifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  useRealtimeSubscription({ table: 'admission_document_verifications', onChange: loadDocs, onReconnect: loadDocs });

  const handleVerify = async (doc: AdmissionDocumentVerification) => {
    setUpdating(true);
    try {
      const success = await db.updateDocumentVerificationStatus(doc.id, 'Verified');
      if (success) {
        toast({
          title: "Document Verified",
          description: `${doc.student_name}'s ${doc.document_type} has been verified.`
        });
        loadDocs();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!actionDoc) return;
    setUpdating(true);
    try {
      const success = await db.updateDocumentVerificationStatus(actionDoc.id, 'Rejected', undefined, rejectReason.trim());
      if (success) {
        toast({
          title: "Document Rejected",
          description: `${actionDoc.student_name}'s document has been rejected.`
        });
        setIsRejectOpen(false);
        setActionDoc(null);
        setRejectReason('');
        loadDocs();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const verifiedCount = documents.filter(d => d.status === 'Verified').length;
  const pendingCount = documents.filter(d => d.status === 'Pending').length;
  const rejectedCount = documents.filter(d => d.status === 'Rejected').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Document Verification</h2>
        <p className="text-muted-foreground">Verify and manage admission certificates and identity records</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">{loading ? '…' : verifiedCount}</p>
            <p className="text-sm text-muted-foreground">Verified</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 mx-auto text-amber-500 mb-2" />
            <p className="text-2xl font-bold">{loading ? '…' : pendingCount}</p>
            <p className="text-sm text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <XCircle className="h-8 w-8 mx-auto text-red-600 mb-2" />
            <p className="text-2xl font-bold">{loading ? '…' : rejectedCount}</p>
            <p className="text-sm text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Document Verification Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : documents.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No documents submitted for verification yet.</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg gap-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">{doc.student_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.document_type} • Submitted: {doc.submission_date || 'Recent'}
                      </p>
                      {doc.rejection_reason && (
                        <p className="text-xs text-red-500 mt-0.5">Reason: {doc.rejection_reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Badge variant={doc.status === 'Verified' ? 'default' : doc.status === 'Rejected' ? 'destructive' : 'secondary'}>
                      {doc.status}
                    </Badge>
                    {doc.status === 'Pending' && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-green-600 hover:text-green-700"
                          onClick={() => handleVerify(doc)}
                          disabled={updating}
                        >
                          Approve
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700"
                          onClick={() => {
                            setActionDoc(doc);
                            setIsRejectOpen(true);
                          }}
                          disabled={updating}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {doc.document_url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={doc.document_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Reason Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>
              Provide a clear reason for rejecting {actionDoc?.student_name}'s {actionDoc?.document_type}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              placeholder="e.g. Blurry scan, certificate expired, or name mismatch"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={updating}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
