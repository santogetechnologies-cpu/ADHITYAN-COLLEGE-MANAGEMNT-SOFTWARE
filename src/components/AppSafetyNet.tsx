import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

/**
 * App-wide smoothness helpers, mounted once inside the router:
 *  - a banner while the device is offline (so a "failed" save is understood, and nothing is silently lost)
 *  - scroll back to the top when you open another screen
 *  - a friendly message for any failure that no screen handled itself (instead of nothing happening)
 */
export function AppSafetyNet() {
  const { pathname } = useLocation();
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

  useEffect(() => {
    const up = () => { setOnline(true); toast({ title: 'Back online' }); };
    const down = () => setOnline(false);
    window.addEventListener('online', up); window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);

  useEffect(() => {
    let last = 0;
    const onRejection = (e: PromiseRejectionEvent) => {
      const msg = String((e.reason && (e.reason.message || e.reason)) || '');
      if (/abort|ResizeObserver|Loading chunk|dynamically imported module/i.test(msg)) return;   // benign or handled elsewhere
      console.error('Unhandled failure:', e.reason);
      const now = Date.now(); if (now - last < 5000) return; last = now;   // never spam
      toast({ title: 'Something did not work', description: navigator.onLine ? 'Please try again. If it keeps happening, tell the office.' : 'You appear to be offline.', variant: 'destructive' });
    };
    window.addEventListener('unhandledrejection', onRejection);
    return () => window.removeEventListener('unhandledrejection', onRejection);
  }, []);

  if (online) return null;
  return (
    <div role="alert" className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white text-sm rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
      <WifiOff className="w-4 h-4" /> You are offline. Changes will not save until the connection returns.
    </div>
  );
}
