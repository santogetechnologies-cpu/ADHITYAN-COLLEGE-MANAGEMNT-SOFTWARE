import fs from 'fs';
import path from 'path';

function searchSetterDummyMultiLine() {
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
    const regex = /set[A-Z]\w+\s*\(\s*\[\s*\{[^}]*id:/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      console.log(`[Multi-line Setter Dummy]: ${f}:${line} -> ${match[0].replace(/\s+/g, ' ')}`);
    }
  }
}

searchSetterDummyMultiLine();

