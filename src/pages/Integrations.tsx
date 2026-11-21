import { useCallback, useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { askConfirm } from '@/lib/dialogs';
import { Plug, Loader2, CheckCircle2, XCircle, ExternalLink, Copy } from 'lucide-react';
import { integrationsService, Catalog, IntegrationItem, ProviderDef } from '@/services/integrationsService';

const ORDER = ['payments', 'email', 'sms', 'whatsapp'];

function Panel({ kind, catalog, item, onChanged }: { kind: string; catalog: Catalog[string]; item?: IntegrationItem; onChanged: () => void }) {
  const { toast } = useToast();
  const [provider, setProvider] = useState(item?.provider ?? catalog.providers[0].id);
  const def: ProviderDef = catalog.providers.find(p => p.id === provider) ?? catalog.providers[0];
  const same = item?.provider === provider;
  const [pub, setPub] = useState<Record<string, string>>(same ? item?.public_config ?? {} : {});
  const [sec, setSec] = useState<Record<string, string>>({});
  const [enabled, setEnabled] = useState(item?.enabled ?? false);
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { setPub(item?.provider === provider ? item?.public_config ?? {} : {}); setSec({}); }, [provider, item]);
  useEffect(() => { setEnabled(item?.enabled ?? false); }, [item]);

  const run = async (name: string, fn: () => Promise<any>, ok: (r: any) => string) => {
    setBusy(name);
    try { const r = await fn(); toast({ title: ok(r), variant: r?.success === false ? 'destructive' : undefined, description: r?.message }); onChanged(); }
    catch (e: any) { toast({ title: 'Could not complete that', description: e.message, variant: 'destructive' }); }
    finally { setBusy(null); }
  };
  const needsTo = kind === 'sms' || kind === 'whatsapp';
  const saved = (k: string) => same && item?.secret_keys?.includes(k);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div><CardTitle className="text-base">{catalog.label}</CardTitle><CardDescription>{catalog.help}</CardDescription></div>
          {item ? <Badge variant="outline" className={item.enabled ? 'text-emerald-700 border-emerald-300' : 'text-slate-500'}>{item.enabled ? 'On' : 'Saved, off'}</Badge> : <Badge variant="outline" className="text-slate-500">Not set up</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {catalog.providers.length > 1 && (
          <div><Label htmlFor={`${kind}-provider`}>Provider</Label>
            <select id={`${kind}-provider`} className="w-full border rounded-md h-10 px-3 text-sm bg-white" value={provider} onChange={e => setProvider(e.target.value)}>
              {catalog.providers.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>)}
        {def.docs && <a className="text-xs text-blue-700 inline-flex items-center gap-1" href={def.docs} target="_blank" rel="noreferrer noopener">Where do I find these? <ExternalLink className="w-3 h-3" /></a>}
        <div className="grid gap-3 sm:grid-cols-2">
          {def.publicFields.map(f => (
            <div key={f.key}><Label htmlFor={`${kind}-${f.key}`}>{f.label}{f.required ? ' *' : ''}</Label>
              <Input id={`${kind}-${f.key}`} type={f.type === 'email' ? 'email' : 'text'} value={pub[f.key] ?? ''} onChange={e => setPub({ ...pub, [f.key]: e.target.value })} autoComplete="off" />
              {f.help && <p className="text-xs text-muted-foreground mt-1">{f.help}</p>}</div>))}
          {def.secretFields.map(f => (
            <div key={f.key}><Label htmlFor={`${kind}-${f.key}`}>{f.label}{f.required ? ' *' : ''}</Label>
              <Input id={`${kind}-${f.key}`} type="password" value={sec[f.key] ?? ''} onChange={e => setSec({ ...sec, [f.key]: e.target.value })} autoComplete="new-password" placeholder={saved(f.key) ? '•••••••• saved — leave blank to keep' : ''} />
              {f.help && <p className="text-xs text-muted-foreground mt-1">{f.help}</p>}</div>))}
        </div>
        {kind === 'payments' && (
          <div className="rounded-md border bg-slate-50 p-3 text-xs space-y-1">
            <div className="font-semibold">Webhook (recommended)</div>
            <div>In the Razorpay dashboard add this URL and subscribe to <b>payment.captured</b>, <b>order.paid</b> and <b>payment.failed</b>, using the same webhook secret as above:</div>
            <div className="flex items-center gap-2"><code className="break-all">{integrationsService.webhookUrl()}</code>
              <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Copy webhook URL" onClick={() => { void navigator.clipboard?.writeText(integrationsService.webhookUrl()); toast({ title: 'Copied' }); }}><Copy className="w-3.5 h-3.5" /></Button></div>
            <div>Also switch on <b>Accept online payments</b> under Finance → Payment settings.</div>
          </div>)}
        <label className="flex items-center justify-between gap-4 text-sm border-t pt-3"><span><b>Use this provider</b><br /><span className="text-xs text-muted-foreground">Switch off to pause without losing the saved keys.</span></span><Switch checked={enabled} onCheckedChange={setEnabled} /></label>
        <div className="flex flex-wrap items-end gap-2">
          <Button disabled={busy !== null} onClick={() => run('save', () => integrationsService.save(kind, provider, enabled, pub, sec), () => 'Saved')}>{busy === 'save' ? 'Saving…' : 'Save'}</Button>
          {item && <>
            {needsTo ? <Input className="w-48" placeholder="Phone for the test, +91…" value={to} onChange={e => setTo(e.target.value)} aria-label="Test phone number" />
              : kind === 'email' ? <Input className="w-56" placeholder="Send test to (default: you)" value={to} onChange={e => setTo(e.target.value)} aria-label="Test e-mail" /> : null}
            <Button variant="outline" disabled={busy !== null || (needsTo && !to.trim())} onClick={() => run('test', () => integrationsService.test(kind, to.trim() || undefined), r => r.success ? 'Test passed' : 'Test failed')}>{busy === 'test' ? 'Testing…' : kind === 'payments' ? 'Test connection' : 'Send test'}</Button>
            <Button variant="ghost" className="text-rose-700" disabled={busy !== null} onClick={async () => { if (await askConfirm(`Remove the saved ${catalog.label.toLowerCase()} settings and keys?`, { title: 'Remove settings', confirmLabel: 'Remove', destructive: true })) void run('clear', () => integrationsService.clear(kind), () => 'Removed'); }}>Remove</Button></>}
        </div>
        {item?.last_test_at && <div className={`text-xs flex items-center gap-1 ${item.last_test_ok ? 'text-emerald-700' : 'text-rose-700'}`}>{item.last_test_ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}Last test {new Date(item.last_test_at).toLocaleString()}: {item.last_test_message}</div>}
      </CardContent>
    </Card>
  );
}

export default function Integrations() {
  const [data, setData] = useState<{ catalog: Catalog; items: IntegrationItem[]; encryption_ready: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { try { setData(await integrationsService.catalog()); setError(null); } catch (e: any) { setError(e.message); } }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation showBackButton={true} backUrl="/dashboard" backLabel="Back to Dashboard" />
      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div><h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Plug className="w-6 h-6" /> Integrations</h1>
          <p className="text-sm text-slate-500">Connect payments, e-mail, SMS and WhatsApp. Keys are encrypted on the server and are never shown again after saving.</p></div>
        {error ? <div className="text-sm text-red-600">{error} <Button variant="link" onClick={load}>Retry</Button></div>
          : !data ? <div className="py-10 flex justify-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /></div> : <>
          {!data.encryption_ready && <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-sm p-3">One-time server setup needed before you can save keys: set the <code>INTEGRATION_ENC_KEY</code> secret (24 or more random characters) on the Supabase project, e.g. <code>supabase secrets set INTEGRATION_ENC_KEY=…</code>. It is only used to encrypt the keys you enter here.</div>}
          {ORDER.filter(k => data.catalog[k]).map(k => <Panel key={k} kind={k} catalog={data.catalog[k]} item={data.items.find(i => i.kind === k)} onChanged={load} />)}
        </>}
      </main>
    </div>
  );
}
