import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BellRing } from 'lucide-react';
import { campusOpsService, ChannelStatus } from '@/services/campusOpsService';

export function NotificationChannelsPanel() {
  const { toast } = useToast();
  const [st, setSt] = useState<ChannelStatus | null>(null);
  const [form, setForm] = useState({ email: false, sms: false, whatsapp: false, autoReminders: false, reminderDays: 7 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const r = await campusOpsService.channelStatus(); setSt(r); if (r) setForm({ email: r.settings.email, sms: r.settings.sms, whatsapp: r.settings.whatsapp, autoReminders: r.settings.auto_reminders, reminderDays: r.settings.reminder_days }); }
    catch { setSt(null); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setBusy(true);
    try { await campusOpsService.saveChannelSettings(form); toast({ title: 'Delivery settings saved' }); await load(); }
    catch (e: any) { toast({ title: 'Could not save', description: e.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  const retry = async () => {
    try { const r = await campusOpsService.retryFailedMessages(); toast({ title: `${r.requeued} message(s) queued again` }); await load(); }
    catch (e: any) { toast({ title: 'Could not retry', description: e.message, variant: 'destructive' }); }
  };

  if (loading) return <div className="py-6 flex justify-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  if (!st) return null;
  const c = st.counts;
  const n = (k: string) => c[k] ?? 0;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><BellRing className="w-4 h-4" /> Delivery channels & automatic reminders</CardTitle>
        <CardDescription>Every in-app notice can also be e-mailed (normal and urgent) or texted (urgent only). People can switch either off in their own settings. Provider keys are entered under Integrations.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center justify-between gap-4 text-sm"><span><b>E-mail alerts</b><br /><span className="text-xs text-muted-foreground">Sent to the address on each account</span></span><Switch checked={form.email} onCheckedChange={v => setForm({ ...form, email: v })} /></label>
        <label className="flex items-center justify-between gap-4 text-sm"><span><b>SMS alerts</b><br /><span className="text-xs text-muted-foreground">Urgent only, to the phone number on each profile. Carrier charges apply.</span></span><Switch checked={form.sms} onCheckedChange={v => setForm({ ...form, sms: v })} /></label>
        <label className="flex items-center justify-between gap-4 text-sm"><span><b>WhatsApp alerts</b><br /><span className="text-xs text-muted-foreground">Urgent only, and only to people who switched WhatsApp on in their own settings</span></span><Switch checked={form.whatsapp} onCheckedChange={v => setForm({ ...form, whatsapp: v })} /></label>
        <label className="flex items-center justify-between gap-4 text-sm"><span><b>Automatic fee reminders</b><br /><span className="text-xs text-muted-foreground">Once a day, remind students and parents about fees due soon or overdue{st.scheduler ? '' : ' — the database scheduler (pg_cron) is not enabled, so also schedule the dispatch function with {"task":"reminders"}'}</span></span><Switch checked={form.autoReminders} onCheckedChange={v => setForm({ ...form, autoReminders: v })} /></label>
        <label className="flex items-center justify-between gap-4 text-sm"><span><b>Remind this many days before the due date</b></span><Input className="w-24" type="number" min={0} max={30} value={form.reminderDays} onChange={e => setForm({ ...form, reminderDays: Number(e.target.value) })} /></label>
        {(['email', 'sms', 'whatsapp'] as const).filter(k => form[k] && !st.providers?.[k]?.enabled).map(k => <div key={k} className="rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-xs p-2">{k === 'whatsapp' ? 'WhatsApp' : k.toUpperCase()} is switched on but no provider is connected in the app. <a className="underline" href="/integrations">Connect one under Integrations</a> (server-side secrets from the older setup still work).</div>)}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <div className="text-xs text-slate-600">Last 30 days — e-mail: {n('email:sent')} sent, {n('email:pending') + n('email:sending')} waiting, {n('email:failed')} failed · SMS: {n('sms:sent')} sent, {n('sms:pending') + n('sms:sending')} waiting, {n('sms:failed')} failed · WhatsApp: {n('whatsapp:sent')} sent, {n('whatsapp:pending') + n('whatsapp:sending')} waiting, {n('whatsapp:failed')} failed</div>
          <div className="flex gap-2">{(n('email:failed') + n('sms:failed') + n('whatsapp:failed')) > 0 && <Button size="sm" variant="outline" onClick={retry}>Retry failed</Button>}<Button size="sm" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</Button></div>
        </div>
        {st.recent_failures.length > 0 && <ul className="text-xs text-rose-700 space-y-1">{st.recent_failures.slice(0, 3).map((f, i) => <li key={i}>{f.channel} to {f.to}: {f.error}</li>)}</ul>}
      </CardContent>
    </Card>
  );
}
