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

interface AuditIssue {
  file: string;
  type: string;
  line: number;
  preview: string;
}

const issues: AuditIssue[] = [];

for (const f of allFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // 1. Detect hardcoded mock array definitions
    if (/const\s+(mock[A-Z0-9_]*|dummy[A-Z0-9_]*|sample[A-Z0-9_]*|demo[A-Z0-9_]*|fake[A-Z0-9_]*|initial[A-Z0-9_]*)\s*(:\s*[^=]+)?\s*=\s*\[/i.test(line)) {
      issues.push({
        file: f,
        type: 'Mock/Sample/Initial Array Definition',
        line: index + 1,
        preview: line.trim()
      });
    }

    // 2. Detect fallback to mock/dummy if backend returns empty or null
    if (/\|\|\s*(mock|dummy|sample|fallback|demo|fake)/i.test(line) || /\?\s*(\w+)\s*:\s*(mock|dummy|sample)/i.test(line)) {
      issues.push({
        file: f,
        type: 'Fallback to Mock Data',
        line: index + 1,
        preview: line.trim()
      });
    }

    // 3. Detect fake statistics or hardcoded dashboard numbers
    if (/(totalStudents|studentCount|pendingFees|activeTeachers|totalRevenue|totalCollections)\s*=\s*\d{2,}/i.test(line)) {
      issues.push({
        file: f,
        type: 'Hardcoded Numeric Metric',
        line: index + 1,
        preview: line.trim()
      });
    }
  });
}

console.log(`Found ${issues.length} audit issues:\n`);
const groupedByFile = new Map<string, AuditIssue[]>();
issues.forEach(i => {
  if (!groupedByFile.has(i.file)) groupedByFile.set(i.file, []);
  groupedByFile.get(i.file)!.push(i);
});

groupedByFile.forEach((fileIssues, file) => {
  console.log(`=== ${file} (${fileIssues.length} issues) ===`);
  fileIssues.forEach(fi => {
    console.log(`  [Line ${fi.line}] [${fi.type}]: ${fi.preview}`);
  });
  console.log('');
});

