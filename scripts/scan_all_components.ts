import fs from 'fs';
import path from 'path';

function scanAllComponents() {
  const dir = 'src/components';
  const suspicious: any[] = [];
  function walk(current: string) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (/\.(tsx|ts)$/.test(entry.name) && !entry.name.includes('.test.')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((l, idx) => {
          // Look for useState with hardcoded array of 2 or more objects
          if (/useState\s*(<[^>]+>)?\s*\(\s*\[\s*\{/.test(l)) {
            suspicious.push({
              file: fullPath.replace(/\\/g, '/'),
              line: idx + 1,
              snippet: l.trim().substring(0, 100)
            });
          }
        });
      }
    }
  }
  walk(dir);
  console.log(`Found ${suspicious.length} useState instances initialized with hardcoded array of objects:`);
  suspicious.forEach(s => console.log(`- ${s.file}:${s.line} -> ${s.snippet}`));
}

scanAllComponents();

