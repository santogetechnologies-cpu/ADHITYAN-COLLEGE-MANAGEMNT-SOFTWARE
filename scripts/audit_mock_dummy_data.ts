import fs from 'fs';
import path from 'path';

function searchFiles(dir: string, patterns: RegExp[]): { file: string; matches: string[] }[] {
  const results: { file: string; matches: string[] }[] = [];

  function walk(current: string) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
          walk(fullPath);
        }
      } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
        if (fullPath.includes('__tests__') || fullPath.includes('.test.') || fullPath.includes('.spec.')) continue;
        const content = fs.readFileSync(fullPath, 'utf8');
        const matchedLines: string[] = [];
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          for (const pat of patterns) {
            if (pat.test(line)) {
              matchedLines.push(`L${idx + 1}: ${line.trim()}`);
              break;
            }
          }
        });
        if (matchedLines.length > 0) {
          results.push({
            file: fullPath.replace(/\\/g, '/'),
            matches: matchedLines
          });
        }
      }
    }
  }

  walk(dir);
  return results;
}

const patterns = [
  /\bmock[a-zA-Z0-9_]*/i,
  /\bdummy[a-zA-Z0-9_]*/i,
  /\bfake[a-zA-Z0-9_]*/i,
  /\bsample[a-zA-Z0-9_]*/i,
  /\bMOCK_/i,
  /\bDUMMY_/i,
  /\bFALLBACK_/i
];

const results = searchFiles('src', patterns);
console.log(`Found ${results.length} files with potential mock/dummy patterns:\n`);
for (const r of results) {
  console.log(`=== ${r.file} (${r.matches.length} occurrences) ===`);
  r.matches.slice(0, 5).forEach(m => console.log(`   ${m}`));
  if (r.matches.length > 5) {
    console.log(`   ... and ${r.matches.length - 5} more lines`);
  }
  console.log('');
}

