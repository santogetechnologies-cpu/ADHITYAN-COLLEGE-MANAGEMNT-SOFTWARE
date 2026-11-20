import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, GraduationCap, Users, Shield, Copy, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AdmissionConfirmationResult } from '@/services/studentParentAuthService';

interface AdmissionSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: AdmissionConfirmationResult | null;
}

export function AdmissionSuccessDialog({
  open,
  onOpenChange,
  result,
}: AdmissionSuccessDialogProps) {
  const { toast } = useToast();

  if (!result) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to Clipboard',
      description: `${label}: ${text}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-left">
          <div className="mx-auto sm:mx-0 w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-bold">Admission Confirmed Successfully</DialogTitle>
          <DialogDescription>
            Official institutional enrollment confirmed. Login accounts generated with First Login Password Setup required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Student Account Details */}
          <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-blue-600" /> Student Credentials
              </span>
              <Badge className="bg-blue-600 text-white text-[10px]">First Login Required</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground block">Student Name:</span>
                <span className="font-semibold text-foreground">{result.student.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Program Enrolled:</span>
                <span className="font-semibold text-foreground truncate block">{result.student.department}</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-blue-200">
              <div>
                <span className="text-[10px] text-muted-foreground block font-mono">PERMANENT STUDENT ID</span>
                <span className="font-mono font-bold text-blue-800 text-base">{result.student.student_id}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-blue-600 hover:text-blue-700"
                onClick={() => copyToClipboard(result.student.student_id, 'Student ID')}
              >
                <Copy className="w-3.5 h-3.5 mr-1" /> Copy
              </Button>
            </div>
          </div>

          {/* Parent Account Details */}
          <div className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-600" /> Parent / Guardian Account
              </span>
              <Badge variant="outline" className={result.parent.is_reused ? 'border-amber-300 bg-amber-50 text-amber-800 text-[10px]' : 'border-purple-300 bg-purple-100 text-purple-800 text-[10px]'}>
                {result.parent.is_reused ? 'Reused Existing Parent' : 'New Parent Account'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground block">Parent Name:</span>
                <span className="font-semibold text-foreground">{result.parent.name} ({result.parent.relationship})</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Status:</span>
                <span className="font-semibold text-foreground">
                  {result.parent.is_reused ? 'Linked to Sibling Account' : 'First Login Required'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-purple-200">
              <div>
                <span className="text-[10px] text-muted-foreground block font-mono">PERMANENT PARENT ID</span>
                <span className="font-mono font-bold text-purple-800 text-base">{result.parent.parent_id}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-purple-600 hover:text-purple-700"
                onClick={() => copyToClipboard(result.parent.parent_id, 'Parent ID')}
              >
                <Copy className="w-3.5 h-3.5 mr-1" /> Copy
              </Button>
            </div>
          </div>

          {/* First Login Instructions */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-600" /> Next Step: First-Time Login
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Student can access the Student Portal using their Student ID, registered mobile, or email. Parent can sign in using their Parent ID. Both users will set their personal permanent password on first login.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full bg-[#1D61E7] hover:bg-blue-700 text-white font-semibold">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

