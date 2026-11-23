import { Loader2 } from 'lucide-react';

/** Shown while a screen's code downloads (first visit only) so navigation never looks frozen. */
export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-500">
      <Loader2 className="w-6 h-6 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
