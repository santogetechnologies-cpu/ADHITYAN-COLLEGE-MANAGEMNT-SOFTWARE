import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

/**
 * Friendly replacements for window.confirm / window.prompt.
 *   if (!(await askConfirm('Remove this paper?', { destructive: true }))) return;
 *   const reason = await askText('Why?', { required: true, minLength: 5 });   // null when cancelled
 * <DialogHost /> is mounted once in App. Without it (tests) the browser's own dialogs are used.
 */
export interface AskOptions { title?: string; confirmLabel?: string; cancelLabel?: string; destructive?: boolean; placeholder?: string; defaultValue?: string; required?: boolean; minLength?: number; multiline?: boolean; inputType?: 'text' | 'number'; label?: string }
type Request = { kind: 'confirm' | 'text'; message: string; opts: AskOptions; resolve: (v: any) => void };
let push: ((r: Request) => void) | null = null;

export function askConfirm(message: string, opts: AskOptions = {}): Promise<boolean> {
  if (!push) return Promise.resolve(typeof window !== 'undefined' ? window.confirm(message) : false);
  return new Promise(resolve => push!({ kind: 'confirm', message, opts, resolve }));
}
export function askText(message: string, opts: AskOptions = {}): Promise<string | null> {
  if (!push) { const v = typeof window !== 'undefined' ? window.prompt(message, opts.defaultValue ?? '') : null; return Promise.resolve(v === null ? null : v.trim()); }
  return new Promise(resolve => push!({ kind: 'text', message, opts, resolve }));
}

export function DialogHost() {
  const [queue, setQueue] = useState<Request[]>([]);
  const [value, setValue] = useState('');
  useEffect(() => { push = (r) => setQueue(q => [...q, r]); return () => { push = null; }; }, []);
  const cur = queue[0];
  useEffect(() => { setValue(cur?.opts.defaultValue ?? ''); }, [cur]);
  if (!cur) return null;
  const done = (v: any) => { cur.resolve(v); setQueue(q => q.slice(1)); };
  const min = cur.opts.minLength ?? (cur.opts.required ? 1 : 0);
  const valid = cur.kind === 'confirm' || value.trim().length >= min;
  const [head, ...rest] = cur.message.split('\n');
  return (
    <Dialog open onOpenChange={o => { if (!o) done(cur.kind === 'confirm' ? false : null); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{cur.opts.title ?? (cur.kind === 'confirm' ? 'Please confirm' : 'More information needed')}</DialogTitle>
          <DialogDescription className="whitespace-pre-line">{cur.kind === 'confirm' ? cur.message : head}</DialogDescription>
        </DialogHeader>
        {cur.kind === 'text' && (
          <div className="space-y-2">
            {rest.length > 0 && <p className="text-sm text-muted-foreground whitespace-pre-line">{rest.join('\n')}</p>}
            {cur.opts.multiline ?? (cur.opts.inputType !== 'number')
              ? <Textarea autoFocus aria-label={cur.opts.label ?? head} value={value} placeholder={cur.opts.placeholder} onChange={e => setValue(e.target.value)} />
              : <Input autoFocus type={cur.opts.inputType ?? 'text'} aria-label={cur.opts.label ?? head} value={value} placeholder={cur.opts.placeholder} onChange={e => setValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && valid) done(value.trim()); }} />}
            {min > 0 && value.trim().length < min && <p className="text-xs text-muted-foreground">{min > 1 ? `At least ${min} characters.` : 'This is required.'}</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => done(cur.kind === 'confirm' ? false : null)}>{cur.opts.cancelLabel ?? 'Cancel'}</Button>
          <Button variant={cur.opts.destructive ? 'destructive' : 'default'} disabled={!valid} onClick={() => done(cur.kind === 'confirm' ? true : value.trim())}>{cur.opts.confirmLabel ?? (cur.kind === 'confirm' ? 'Confirm' : 'Continue')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
