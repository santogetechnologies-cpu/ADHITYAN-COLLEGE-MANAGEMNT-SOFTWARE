// Opens every menu screen of every role against an EMPTY fake backend and fails on crashes, blank pages or error screens.
// Empty data is the situation of a brand-new college, so every screen must show a sensible empty state instead of breaking.
//   node e2e/sweep.cjs [--keep] [--role=teacher]
const fs = require('fs');
const { BASE, ROOT, newPage, startApp } = require('./lib.cjs');
const rs = fs.readFileSync(`${ROOT}/src/config/roles.ts`, 'utf8');
const cfg = {};
for (const b of rs.matchAll(/\n  (\w+): \{\n\s+role: '(\w+)',[\s\S]*?\n  \},/g)) {
  const body = b[0]; const nav = [...body.matchAll(/\{ label: '([^']+)', path: '([^']+)' \}/g)].map(m => m[2]);
  cfg[b[1]] = [...new Set([body.match(/home: '([^']+)'/)?.[1], ...nav].filter(Boolean))];
}
const EXTRA = { admin: ['/student-promotion', '/student-lifecycle', '/audit-log', '/announcements', '/integrations', '/data-centre', '/student-leave', '/admin/transport', '/admin/events', '/admin/reports', '/admin/settings', '/admin/control-center'], teacher: ['/student-leave'], principal: ['/student-promotion', '/audit-log'] };
for (const [r, ps] of Object.entries(EXTRA)) if (cfg[r]) cfg[r] = [...new Set([...cfg[r], ...ps])];
const broken = process.argv.includes('--broken');   // every data call fails: screens must show an error/empty state, not crash
const only = (process.argv.find(a => a.startsWith('--role=')) || '').slice(7);
(async () => {
  const { browser, stop } = await startApp();
  const failures = []; let visited = 0;
  try {
    for (const [role, paths] of Object.entries(cfg)) {
      if (only && role !== only) continue;
      for (const p of paths) {
        const { ctx, page, errors } = await newPage(browser, role, broken);
        const dialogs = []; page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });
        try {
          await page.goto(BASE + p, { waitUntil: 'load' });
          await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
          await page.waitForTimeout(600);
          const text = ((await page.textContent('body')) || '').replace(/\s+/g, ' ');
          const reasons = [];
          if (errors.length) reasons.push('page error: ' + errors[0].slice(0, 120));
          if (text.trim().length < 40) reasons.push('blank page');
          if (/Something went wrong|Application Error|Unexpected Application Error/i.test(text)) reasons.push('error screen');
          if (dialogs.length) reasons.push('native dialog: ' + dialogs[0].slice(0, 60));
          visited++;
          if (reasons.length) { failures.push(`${role} ${p}: ${reasons.join('; ')}`); console.log(`FAIL  ${role} ${p}  -> ${reasons.join('; ')}`); }
        } catch (e) { failures.push(`${role} ${p}: ${e.message.slice(0, 100)}`); console.log(`FAIL  ${role} ${p}  -> ${e.message.slice(0, 100)}`); }
        await ctx.close();
      }
    }
  } finally { await stop(); }
  console.log(`\n${visited - failures.length}/${visited} screens opened cleanly ${broken ? 'while every data request fails' : 'on an empty database'}`);
  process.exit(failures.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
