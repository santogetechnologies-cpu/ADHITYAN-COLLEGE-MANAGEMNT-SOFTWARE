// Shared helpers for the browser tests. Runs the REAL built app in Chromium against a FAKE backend: the bundle is built with a dead Supabase URL and
// every request to it is answered by the handlers below, so nothing touches a real project and no network is needed.
//   node e2e/run.cjs          (build + serve + test)      add --keep to reuse an existing .e2e-dist build
const { spawn, execSync } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http');
let playwright; try { playwright = require('playwright'); } catch { playwright = require('/opt/node-tools/node_modules/playwright'); }

const ROOT = path.resolve(__dirname, '..');
const FAKE = 'http://127.0.0.1:54399', PORT = 4179, BASE = `http://127.0.0.1:${PORT}`;
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (sub) => `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u({ sub, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;



// ---------- fake backend ----------
function makeBackend(role, failing) {
  const state = { saved: [], integration: null, calls: [] };
  const profile = { id: 'u-1', email: `${role}@college.test`, name: 'Test ' + role, role, status: 'active', login_id: role, requires_password_change: false, is_first_login: false, department: null, class_name: null, preferences: {} };
  const handler = async (route) => {
    const req = route.request(); const url = new URL(req.url()); const p = url.pathname; const method = req.method();
    const accept = req.headers()['accept'] || '';
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    state.calls.push(`${method} ${p}`);
    if (failing && !p.startsWith('/auth/') && !p.startsWith('/rest/v1/profiles') && !p.startsWith('/rest/v1/institutional_settings') && (p.startsWith('/rest/v1/') || p.startsWith('/functions/v1/') || p.startsWith('/storage/v1/'))) return json({ message: 'Simulated outage', code: 'XX000' }, 500);
    if (p.startsWith('/auth/v1/user')) return json({ id: 'u-1', email: profile.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} });
    if (p.startsWith('/rest/v1/profiles')) return json(accept.includes('pgrst.object') ? profile : [profile]);
    if (p.startsWith('/rest/v1/institutional_settings')) return json(accept.includes('pgrst.object') ? { institution_name: 'Lakeside College', institution_code: 'LKS' } : [{ institution_name: 'Lakeside College', institution_code: 'LKS' }]);
    if (p.startsWith('/functions/v1/integrations-admin')) {
      const body = JSON.parse(req.postData() || '{}');
      if (body.action === 'catalog') return json({ encryption_ready: true, items: state.integration ? [state.integration] : [], catalog: CATALOG });
      if (body.action === 'save') {
        state.saved.push(body);
        state.integration = { kind: body.kind, provider: body.provider, enabled: body.enabled, public_config: body.public_config, secret_keys: Object.keys(body.secrets).filter(k => body.secrets[k]), updated_at: new Date().toISOString(), last_test_at: null, last_test_ok: null, last_test_message: null };
        return json({ success: true });
      }
      if (body.action === 'test') return json({ success: true, message: 'Connected as test account.' });
      return json({ success: true });
    }
    if (p.startsWith('/rest/v1/rpc/')) return json(accept.includes('pgrst.object') ? {} : []);
    if (p.startsWith('/rest/v1/') || p.startsWith('/storage/v1/')) return json(accept.includes('pgrst.object') ? null : []);
    return json({});
  };
  return { state, handler, profile };
}
const CATALOG = {
  payments: { label: 'Online payments', help: 'Lets students pay online.', providers: [{ id: 'razorpay', label: 'Razorpay', publicFields: [{ key: 'key_id', label: 'Key ID', required: true }], secretFields: [{ key: 'key_secret', label: 'Key secret', required: true }, { key: 'webhook_secret', label: 'Webhook secret', required: false }] }] },
  email: { label: 'E-mail', help: 'Sends notices.', providers: [{ id: 'resend', label: 'Resend', publicFields: [{ key: 'from', label: 'Sender address', required: true, type: 'email' }], secretFields: [{ key: 'api_key', label: 'API key', required: true }] }] },
  sms: { label: 'SMS', help: 'Texts.', providers: [{ id: 'twilio', label: 'Twilio', publicFields: [{ key: 'account_sid', label: 'Account SID', required: true }], secretFields: [{ key: 'auth_token', label: 'Auth token', required: true }] }] },
  whatsapp: { label: 'WhatsApp', help: 'WhatsApp.', providers: [{ id: 'twilio_whatsapp', label: 'Twilio WhatsApp', publicFields: [{ key: 'account_sid', label: 'Account SID', required: true }], secretFields: [{ key: 'auth_token', label: 'Auth token', required: true }] }] },
};

async function newPage(browser, role, failing) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const be = makeBackend(role, failing);
  await ctx.route(`${FAKE}/**`, be.handler);
  if (role) {
    const session = { access_token: jwt('u-1'), refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'u-1', email: be.profile.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} } };
    await ctx.addInitScript((s) => { try { localStorage.setItem('adhityan-edu-auth-token', JSON.stringify(s)); } catch {} }, session);
  }
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  return { ctx, page, be, errors };
}


async function startApp() {
  const dist = path.join(ROOT, '.e2e-dist');
  if (!process.argv.includes('--keep') || !fs.existsSync(dist)) {
    console.log('Building test bundle against the fake backend…');
    execSync(`npx vite build --outDir .e2e-dist --emptyOutDir`, { cwd: ROOT, stdio: 'ignore', env: { ...process.env, VITE_SUPABASE_URL: FAKE, VITE_SUPABASE_PUBLISHABLE_KEY: 'e2e-test-key' } });
  }
  const server = spawn('npx', ['vite', 'preview', '--outDir', '.e2e-dist', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { await new Promise((res, rej) => http.get(BASE, r => { r.resume(); res(); }).on('error', rej)); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
  const browser = await playwright.chromium.launch();
  return { browser, stop: async () => { await browser.close(); server.kill(); } };
}
const results = []; const ok = (name, cond, extra) => { results.push({ name, ok: !!cond, extra }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && extra ? '  -> ' + extra : ''}`); };
module.exports = { BASE, ROOT, newPage, startApp, results, ok, makeBackend };
