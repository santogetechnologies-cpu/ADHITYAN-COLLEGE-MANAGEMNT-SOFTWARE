import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PrintableFeeReceipt } from './PrintableFeeReceipt';
import { FeeReceipt } from '@/types/database.types';

interface FeeReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: FeeReceipt | null;
}

export function FeeReceiptModal({ open, onOpenChange, receipt }: FeeReceiptModalProps) {
  if (!receipt) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-slate-100">
        <DialogHeader className="sr-only">
          <DialogTitle>Fee Receipt</DialogTitle>
        </DialogHeader>
        <PrintableFeeReceipt receipt={receipt} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

