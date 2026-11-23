import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

/** Blocks the app until a user whose password was reset by an administrator chooses their own. */
export function ForcePasswordChange() {
  const { updatePassword, logout } = useAuth();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(null);
    if (pw.length < 8) return setErr('Use at least 8 characters.');
    if (pw !== pw2) return setErr('The two passwords do not match.');
    setBusy(true);
    const r = await updatePassword(pw);
    if (!r.success) { setBusy(false); return setErr(r.error || 'Could not change the password.'); }
    const { error } = await (supabase as any).rpc('acknowledge_password_change');
    setBusy(false);
    if (error) return setErr(error.message);
    window.location.reload();
  };

  return (
    <Dialog open>
      <DialogContent onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader><DialogTitle>Choose a new password</DialogTitle>
          <DialogDescription>Your password was set or reset by an administrator. Choose your own before continuing.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>New password</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></div>
          <div className="space-y-1"><Label>Confirm password</Label><Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></div>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => void logout()}>Sign out</Button><Button onClick={submit} disabled={busy}>Save password</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
