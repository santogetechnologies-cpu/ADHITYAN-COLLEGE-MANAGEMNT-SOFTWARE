import fs from 'fs';
import path from 'path';

function findHardcodedStats() {
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

  console.log(`Scanning ${allFiles.length} files for hardcoded numbers in stat cards...`);
  const found: { file: string; line: number; text: string }[] = [];

  const statRegex = /<p[^>]*font-bold[^>]*>\s*(\d+[\d,.]*[%kKmMbB]?|₹\d+[\d,.]*)\s*<\/p>/;

  for (const f of allFiles) {
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((l, idx) => {
      if (statRegex.test(l)) {
        found.push({ file: f, line: idx + 1, text: l.trim() });
      }
    });
  }

  console.log(`Found ${found.length} hardcoded stat elements:\n`);
  found.forEach(item => {
    console.log(`- ${item.file}:${item.line} -> ${item.text}`);
  });
}

findHardcodedStats();

