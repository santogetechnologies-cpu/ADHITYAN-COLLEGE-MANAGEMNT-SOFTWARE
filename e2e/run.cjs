// End-to-end browser tests against the built app with a FAKE backend (see lib.cjs).  node e2e/run.cjs [--keep]
const { BASE, newPage, startApp, results, ok } = require('./lib.cjs');
async function main() {
  const { browser, stop } = await startApp();
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
  } finally { await stop(); }
  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} browser checks passed`);
  process.exit(failed.length ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(2); });
