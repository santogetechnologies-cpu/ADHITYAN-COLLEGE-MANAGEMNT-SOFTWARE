// Every place the server creates a login account must mark it app_metadata.erp_provisioned = true; otherwise the database
// sign-up trigger would turn that account into a Super Admin. Run: node scripts/check-provisioning-flag.cjs
const fs = require('fs'), path = require('path');
const files = []; (function walk(d) { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.ts$/.test(n)) files.push(p); } })('supabase/functions');
files.push('src/server/adminBackend.ts');
let calls = 0, bad = [];
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/auth\.admin\.createUser\(\{/g)) {
    calls++; const block = s.slice(m.index, m.index + 700).split('});')[0];
    if (!/erp_provisioned:\s*true/.test(block)) bad.push(`${f}:${s.slice(0, m.index).split('\n').length}`);
  }
}
if (bad.length) { console.error('createUser without erp_provisioned flag:\n' + bad.join('\n')); process.exit(1); }
console.log(`PASS provisioning flag (${calls} createUser calls all carry app_metadata.erp_provisioned)`);
