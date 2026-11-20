import fs from 'fs';
import path from 'path';

const dirs = [
  'src/pages',
  'src/pages/admin',
  'src/pages/teachers',
  'src/pages/naac',
  'src/components',
  'src/components/admin',
  'src/components/admission',
  'src/components/alumni',
  'src/components/assignments',
  'src/components/chat',
  'src/components/dashboards',
  'src/components/disciplinary',
  'src/components/exam',
  'src/components/finance',
  'src/components/library',
  'src/components/medical',
  'src/components/naac',
  'src/components/roles',
  'src/components/sports',
  'src/components/store',
  'src/components/teachers',
  'src/components/wellness',
  'src/components/student'
];

for (const d of dirs) {
  if (fs.existsSync(d)) {
    const files = fs.readdirSync(d).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
    console.log(`\n=== ${d} (${files.length}) ===`);
    console.log(files.join('\n'));
  } else {
    console.log(`\n=== ${d} (NOT FOUND) ===`);
  }
}

