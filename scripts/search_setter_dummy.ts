import fs from 'fs';
import path from 'path';

function searchSetterDummy() {
  const allFiles: string[] = [];
  function walk(current: string) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!['node_modules', '.git', 'dist', '__tests__'].includes(entry.name)) walk(fullPath);
      } else if (/\.(tsx|ts)$/.test(entry.name)) {
        allFiles.push(fullPath.replace(/\\/g, '/'));
      }
    }
  }
  walk('src');

  for (const f of allFiles) {
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');
    lines.forEach((l, idx) => {
      if (/set[A-Z]\w+\s*\(\s*\[\s*\{/.test(l) && !/prev\s*=>/i.test(l)) {
        console.log(`[Setter with Object Array]: ${f}:${idx + 1} -> ${l.trim().substring(0, 100)}`);
      }
    });
  }
}

searchSetterDummy();

