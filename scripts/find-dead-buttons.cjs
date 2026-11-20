// Static scan for buttons with no click handler. Run from the repo root: node scripts/find-dead-buttons.cjs [--json]
// Output is a triage list: buttons passed as children to dialog wrappers are false positives.
const ts = require('typescript'); const fs = require('fs'); const path = require('path');
function walkDir(d, out=[]) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); const st = fs.statSync(p);
  if (st.isDirectory()) { if (!['node_modules','ui','__tests__'].includes(f)) walkDir(p, out); } else if (/\.tsx$/.test(f)) out.push(p); } return out; }
const files = walkDir('src'); const rows = [];
const TRIGGERS = /Trigger|DropdownMenuItem|CommandItem|SelectItem|TabsTrigger|Link|a$/;
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  (function visit(node, ancestors) {
    const open = ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null;
    if (open && /^(Button|button)$/.test(open.tagName.getText())) {
      const props = new Set(open.attributes.properties.map(p => p.name && p.name.getText()).filter(Boolean));
      const hasSpread = open.attributes.properties.some(p => ts.isJsxSpreadAttribute(p));
      const type = open.attributes.properties.find(p => p.name && p.name.getText() === 'type');
      const isSubmit = type && /submit/.test(type.initializer ? type.initializer.getText() : '');
      const handler = props.has('onClick') || props.has('onSubmit') || props.has('asChild') || props.has('onPointerDown') || props.has('onMouseDown');
      const insideTrigger = ancestors.some(a => TRIGGERS.test(a));
      const insideForm = ancestors.includes('form') && !type;   // a button inside a <form> with no type submits it
      const disabledLiteral = props.has('disabled');
      if (!handler && !isSubmit && !hasSpread && !insideTrigger && !insideForm) {
        const { line } = sf.getLineAndCharacterOfPosition(open.getStart());
        const label = ts.isJsxElement(node) ? node.children.map(c => c.getText()).join(' ').replace(/\s+/g,' ').slice(0,60) : '';
        rows.push({ file, line: line + 1, label });
      }
    }
    const tag = open ? open.tagName.getText() : null;
    ts.forEachChild(node, c => visit(c, tag ? [...ancestors, tag] : ancestors));
  })(sf, []);
}
const byFile = {}; rows.forEach(r => (byFile[r.file] = byFile[r.file] || []).push(r));
if (process.argv[2]==="--json") { console.log(JSON.stringify(rows)); process.exit(0); }
console.log(`${rows.length} buttons with no handler, in ${Object.keys(byFile).length} files\n`);
Object.entries(byFile).sort((a,b)=>b[1].length-a[1].length).slice(0,25).forEach(([f,r]) => { console.log(`${r.length}  ${f}`); r.slice(0,3).forEach(x => console.log(`     L${x.line}: ${x.label}`)); });
