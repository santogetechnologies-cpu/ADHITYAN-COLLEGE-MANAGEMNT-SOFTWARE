import fs from 'fs';
import path from 'path';

const dirs = [
  'src/components/student',
  'src/components/parent',
  'src/components/teacher',
  'src/components/finance',
  'src/components/receptionist',
  'src/components/store',
  'src/components/transport',
  'src/components/hostel',
  'src/components/placement',
  'src/components/medical',
  'src/components/alumni',
  'src/components/sports',
  'src/components/reports',
  'src/components/incident'
];

interface SuspiciousItem {
  file: string;
  line: number;
  snippet: string;
  reason: string;
}

const suspicious: SuspiciousItem[] = [];

for (const d of dirs) {
  if (!fs.existsSync(d)) continue;
  const files = fs.readdirSync(d).filter(f => /\.(tsx|ts)$/.test(f));
  for (const f of files) {
    const filePath = path.join(d, f);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((l, idx) => {
      // Look for hardcoded mock arrays
      if (/const\s+\[?\w+\]?\s*(:\s*[^=]+)?\s*=\s*\[\s*\{/.test(l) && !/OFFICIAL_COURSES|NAV_ITEMS|COLUMNS|HEADERS|TABS|ROUTES/i.test(l)) {
        suspicious.push({
          file: filePath.replace(/\\/g, '/'),
          line: idx + 1,
          snippet: l.trim().substring(0, 80),
          reason: 'Hardcoded object array assignment'
        });
      }
      // Look for useState with hardcoded object array
      if (/useState\s*(<[^>]+>)?\s*\(\s*\[\s*\{/.test(l)) {
        suspicious.push({
          file: filePath.replace(/\\/g, '/'),
          line: idx + 1,
          snippet: l.trim().substring(0, 80),
          reason: 'useState initialized with hardcoded array of objects'
        });
      }
    });
  }
}

console.log(`Found ${suspicious.length} suspicious lines in role components:\n`);
suspicious.forEach(s => {
  console.log(`- ${s.file}:${s.line} [${s.reason}]: ${s.snippet}`);
});

