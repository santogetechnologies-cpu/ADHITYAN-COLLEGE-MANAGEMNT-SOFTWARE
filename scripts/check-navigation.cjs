// Checks every role's menu (src/config/roles.ts) against the routes in src/App.tsx:
// route exists, the role may open it, roles.ts allows it, and no role has an empty menu.
// Run from the repo root: node scripts/check-navigation.cjs   (exit code 1 on any problem)
const ts = require('typescript'); const fs = require('fs');
const appSrc = fs.readFileSync('src/App.tsx', 'utf8');
const sf = ts.createSourceFile('App.tsx', appSrc, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const routes = [];
const attr = (node, name) => { const a = node.attributes.properties.find(p => p.name && p.name.text === name); return a && a.initializer; };
const allowedRolesIn = (node) => { let found = null; (function walk(n){ if ((ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n)) && n.tagName.getText()==='ProtectedRoute'){ const a = attr(n,'allowedRoles'); if (a && !found) found = [...a.getText().matchAll(/'([^']+)'/g)].map(m=>m[1]); } ts.forEachChild(n, walk); })(node); return found; };
function visit(node, parentPath, inheritedRoles) {
  const isEl = ts.isJsxElement(node), isSelf = ts.isJsxSelfClosingElement(node);
  if (isEl || isSelf) {
    const open = isEl ? node.openingElement : node;
    if (open.tagName.getText() === 'Route') {
      const p = attr(open, 'path'); const idx = open.attributes.properties.some(x => x.name && x.name.text==='index');
      let path = p ? p.text ?? p.getText().replace(/^["']|["']$/g,'') : (idx ? parentPath : null);
      if (path !== null && !path.startsWith('/')) path = (parentPath.replace(/\/$/,'') + '/' + path).replace(/\/+/g,'/');
      const el = attr(open, 'element');
      const own = el ? allowedRolesIn(el) : null;
      const roles = own ?? inheritedRoles;
      const redirect = el && /Navigate/.test(el.getText());
      if (path) routes.push({ path, roles, redirect: !!redirect });
      if (isEl) node.children.forEach(c => visit(c, path ?? parentPath, roles));
      return;
    }
  }
  ts.forEachChild(node, c => visit(c, parentPath, inheritedRoles));
}
visit(sf, '', null);
// ---- ROLE_CONFIGS from roles.ts via regex (simple object literals)
const rs = fs.readFileSync('src/config/roles.ts','utf8');
const cfg = {};
for (const b of rs.matchAll(/\n  (\w+): \{\n\s+role: '(\w+)',[\s\S]*?\n  \},/g)) {
  const body = b[0];
  cfg[b[1]] = { nav: [...body.matchAll(/\{ label: '([^']+)', path: '([^']+)' \}/g)].map(m => ({label:m[1],path:m[2]})),
    allowed: (body.match(/allowedRoutes: \[([^\]]*)\]/)?.[1]||'').split(',').map(s=>s.trim().replace(/['"]/g,'')).filter(Boolean), home: body.match(/home: '([^']+)'/)?.[1] };
}
const find = (path) => routes.find(r => r.path === path) || routes.find(r => r.path.includes(':') && new RegExp('^'+r.path.replace(/:[^/]+/g,'[^/]+')+'$').test(path));
let problems = 0; const out = [];
for (const [role, c] of Object.entries(cfg)) {
  if (c.nav.length === 0) { out.push(`EMPTY MENU       ${role}: no navigation items`); problems++; }
  for (const it of [...c.nav, { label: '(home)', path: c.home }]) {
    if (!it.path) continue; const base = it.path.split('?')[0]; const r = find(base);
    if (!r) { out.push(`NO SUCH ROUTE    ${role}: "${it.label}" -> ${it.path}`); problems++; continue; }
    if (r.roles && role !== 'admin' && !r.roles.includes(role)) { out.push(`ROLE BLOCKED     ${role}: "${it.label}" -> ${it.path} (route allows ${r.roles.join('/')})`); problems++; }
    if (role !== 'admin' && !c.allowed.some(p => base === p || base.startsWith(p+'/'))) { out.push(`NOT ALLOWED BY roles.ts ${role}: "${it.label}" -> ${it.path}`); problems++; }
  }
}
console.log(out.join('\n') || 'no problems'); console.log(`\n${Object.keys(cfg).length} roles, ${routes.length} routes parsed, ${problems} problems`);
process.exit(problems ? 1 : 0);
