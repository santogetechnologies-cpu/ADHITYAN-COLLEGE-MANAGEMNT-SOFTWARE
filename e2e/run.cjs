// End-to-end browser tests. Runs the REAL built app in Chromium against a FAKE backend: the bundle is built with a dead Supabase URL and
// every request to it is answered by the handlers below, so nothing touches a real project and no network is needed.
//   node e2e/run.cjs          (build + serve + test)      add --keep to reuse an existing .e2e-dist build
const { spawn, execSync } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http');
let playwright; try { playwright = require('playwright'); } catch { playwright = require('/opt/node-tools/node_modules/playwright'); }

const ROOT = path.resolve(__dirname, '..');
const FAKE = 'http://127.0.0.1:54399', PORT = 4179, BASE = `http://127.0.0.1:${PORT}`;
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (sub) => `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u({ sub, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;

const results = []; const ok = (name, cond, extra) => { results.push({ name, ok: !!cond, extra }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && extra ? '  -> ' + extra : ''}`); };

// ---------- fake backend ----------
function makeBackend(role) {
  const state = { saved: [], integration: null, calls: [] };
  const profile = { id: 'u-1', email: `${role}@college.test`, name: 'Test ' + role, role, status: 'active', login_id: role, requires_password_change: false, is_first_login: false, department: null, class_name: null, preferences: {} };
  const handler = async (route) => {
    const req = route.request(); const url = new URL(req.url()); const p = url.pathname; const method = req.method();
    const accept = req.headers()['accept'] || '';
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    state.calls.push(`${method} ${p}`);
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

async function newPage(browser, role) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const be = makeBackend(role);
  await ctx.route(`${FAKE}/**`, be.handler);
  if (role) {
    const session = { access_token: jwt('u-1'), refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'u-1', email: be.profile.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} } };
    await ctx.addInitScript((s) => { try { localStorage.setItem('adhityan-edu-auth-token', JSON.stringify(s)); } catch {} }, session);
  }
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  return { ctx, page, be, errors };
}

async function main() {
  const dist = path.join(ROOT, '.e2e-dist');
  if (!process.argv.includes('--keep') || !fs.existsSync(dist)) {
    console.log('Building test bundle against the fake backend…');
    execSync(`npx vite build --outDir .e2e-dist --emptyOutDir`, { cwd: ROOT, stdio: 'ignore', env: { ...process.env, VITE_SUPABASE_URL: FAKE, VITE_SUPABASE_PUBLISHABLE_KEY: 'e2e-test-key' } });
  }
  const server = spawn('npx', ['vite', 'preview', '--outDir', '.e2e-dist', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { await new Promise((res, rej) => http.get(BASE, r => { r.resume(); res(); }).on('error', rej)); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
  const browser = await playwright.chromium.launch();
  try {
    // 1. signed-out visitors are sent to the sign-in screen
    { const { ctx, page } = await newPage(browser, null);
      await page.goto(`${BASE}/admin/users`); await page.waitForLoadState('networkidle');
      const t = ((await page.textContent('body')) || '').replace(/\s+/g, ' ');
      ok('signed-out visit to a protected page lands on sign-in', !page.url().includes('/admin/users') && /Sign In/i.test(t), page.url() + ' | ' + t.slice(0, 80));
      ok('sign-in page has no hard-coded college name', !/Adhit[hy]an|Adithyan/.test(t));
      await ctx.close(); }

    // 2. unknown address shows the not-found page, not a blank screen
    { const { ctx, page } = await newPage(browser, null);
      await page.goto(`${BASE}/definitely-not-a-page`); await page.waitForLoadState('networkidle');
      const body = (await page.textContent('body')) || '';
      ok('unknown address shows a friendly page', body.trim().length > 20, body.slice(0, 80));
      await ctx.close(); }

    // 3. a student cannot open the integrations page
    { const { ctx, page } = await newPage(browser, 'student');
      await page.goto(`${BASE}/integrations`); await page.waitForLoadState('networkidle'); await page.waitForTimeout(500);
      ok('student is turned away from /integrations', !page.url().endsWith('/integrations'), page.url());
      await ctx.close(); }

    // 4. admin configures a provider; secrets travel only in the save request and are never shown again
    { const { ctx, page, be, errors } = await newPage(browser, 'admin');
      await page.goto(`${BASE}/integrations`); await page.waitForSelector('text=Integrations', { timeout: 15000 });
      ok('admin sees the four integration panels', (await page.locator('text=Online payments').count()) > 0 && (await page.locator('text=WhatsApp').count()) > 0);
      const panel = page.locator('div:has(> div > div > :text("Online payments"))').first();
      await page.getByLabel(/Key ID/).first().fill('rzp_test_abc123');
      await page.locator('input[type=password]').first().fill('SUPERSECRETVALUE');
      await page.getByRole('button', { name: 'Save' }).first().click();
      await page.waitForTimeout(800);
      const saved = be.state.saved[0];
      ok('save request carries the key id and the secret', saved && saved.public_config.key_id === 'rzp_test_abc123' && saved.secrets.key_secret === 'SUPERSECRETVALUE', JSON.stringify(saved));
      const html = await page.content();
      ok('the secret is not echoed back into the page', !html.includes('SUPERSECRETVALUE'));
      const pwd = await page.locator('input[type=password]').first().inputValue();
      ok('secret field is cleared after saving', pwd === '');
      ok('page shows the saved state (placeholder says saved)', (await page.locator('input[placeholder*="saved"]').count()) > 0);
      ok('webhook URL for the gateway is shown', (await page.locator('code', { hasText: '/functions/v1/payments-webhook' }).count()) > 0);
      ok('no uncaught page errors on the integrations screen', errors.length === 0, errors.join(' | '));
      await ctx.close(); }

    // 5. in-app confirmation dialog replaces the browser pop-up
    { const { ctx, page } = await newPage(browser, 'admin');
      let nativeDialog = false; page.on('dialog', d => { nativeDialog = true; d.dismiss(); });
      await page.goto(`${BASE}/integrations`); await page.waitForSelector('text=Integrations', { timeout: 15000 });
      await page.getByLabel(/Key ID/).first().fill('rzp_test_x'); await page.locator('input[type=password]').first().fill('abcdefgh'); await page.getByRole('button', { name: 'Save' }).first().click();
      await page.waitForSelector('button:has-text("Remove")', { timeout: 8000 });
      await page.getByRole('button', { name: 'Remove' }).first().click();
      await page.waitForSelector('[role=dialog]', { timeout: 5000 });
      ok('removing opens an in-app dialog with Cancel and Remove', (await page.locator('[role=dialog] button:has-text("Cancel")').count()) === 1 && (await page.locator('[role=dialog] button:has-text("Remove")').count()) === 1);
      ok('no native browser dialog was used', !nativeDialog);
      await page.locator('[role=dialog] button:has-text("Cancel")').click();
      await ctx.close(); }

    // 6. college name comes from Settings, not from code
    { const { ctx, page } = await newPage(browser, 'admin');
      await page.goto(`${BASE}/admin`); await page.waitForLoadState('networkidle'); await page.waitForTimeout(1200);
      const text = (await page.textContent('body')) || '';
      ok('admin home shows the institution name from Settings', text.includes('Lakeside College'));
      ok('no leftover hard-coded college name', !/Adhit[hy]an|Adithyan/.test(text.replace(/\s+/g, ' ')), (text.match(/Adhit[hy]an[^.]{0,20}|Adithyan[^.]{0,20}/) || [''])[0]);
      await ctx.close(); }

    // 7. phone-width layout does not scroll sideways
    { const { ctx, page } = await newPage(browser, 'admin');
      await page.setViewportSize({ width: 390, height: 800 });
      await page.goto(`${BASE}/integrations`); await page.waitForSelector('text=Integrations', { timeout: 15000 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok('integrations page fits a phone screen', overflow <= 1, 'overflow ' + overflow);
      await ctx.close(); }
  } finally { await browser.close(); server.kill(); }
  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} browser checks passed`);
  process.exit(failed.length ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(2); });
