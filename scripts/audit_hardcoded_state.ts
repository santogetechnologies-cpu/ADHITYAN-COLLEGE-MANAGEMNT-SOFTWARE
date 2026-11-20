import fs from 'fs';
import path from 'path';

function listSourceFiles(dir: string): string[] {
  const files: string[] = [];
  function walk(current: string) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist' && entry.name !== '__tests__') {
          walk(fullPath);
        }
      } else if (entry.isFile() && /\.(tsx|ts)$/.test(entry.name)) {
        if (!entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
          files.push(fullPath.replace(/\\/g, '/'));
        }
      }
    }
  }
  walk(dir);
  return files;
}

const allFiles = listSourceFiles('src');

// Categorize pages and portals
const pageFiles = allFiles.filter(f => f.startsWith('src/pages/'));
const componentFiles = allFiles.filter(f => f.startsWith('src/components/'));

console.log(`Total Pages: ${pageFiles.length}`);
console.log(`Total Components: ${componentFiles.length}`);

// Check for pages/components that do not import supabase or any service/backend
const suspiciousFiles: { file: string; reason: string }[] = [];

for (const f of [...pageFiles, ...componentFiles]) {
  const content = fs.readFileSync(f, 'utf8');
  const hasSupabase = /supabase/i.test(content);
  const hasBackendCall = /adminBackend|api|fetch|axios|dbService/i.test(content);
  const hasState = /useState\s*(<[^>]+>)?\s*\(\s*(\[|\{)/.test(content);
  const hasHardcodedArrayWithData = /useState\s*(<[^>]+>)?\s*\(\s*\[\s*\{/.test(content);

  if (hasHardcodedArrayWithData && !hasSupabase && !hasBackendCall) {
    suspiciousFiles.push({ file: f, reason: 'Has useState with inline array of objects AND no Supabase/backend import' });
  } else if (hasHardcodedArrayWithData && (hasSupabase || hasBackendCall)) {
    suspiciousFiles.push({ file: f, reason: 'Has useState with inline array of objects (possible mock fallback)' });
  }
}

console.log(`\nFound ${suspiciousFiles.length} files with inline hardcoded state objects:\n`);
suspiciousFiles.forEach(s => console.log(`[${s.reason}] ${s.file}`));

