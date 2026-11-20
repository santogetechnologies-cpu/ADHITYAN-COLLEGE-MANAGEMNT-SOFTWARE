import fs from 'fs';

const pages = [
  'src/pages/MedicalManagement.tsx',
  'src/pages/MessageTeacher.tsx',
  'src/pages/ReportConcern.tsx',
  'src/pages/SportsManagement.tsx',
  'src/pages/Store.tsx',
  'src/pages/TrackSchoolBus.tsx',
  'src/pages/ViewAchievements.tsx',
  'src/pages/teachers/CreateAssignment.tsx',
  'src/pages/teachers/GenerateReport.tsx',
  'src/pages/teachers/MessageParents.tsx'
];

for (const p of pages) {
  const content = fs.readFileSync(p, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    if (/else\s*\{\s*set\w+\s*\(\s*\[\s*\{/.test(l) || /set\w+\s*\(\s*\[\s*\{\s*id:\s*['"]1['"]/.test(l)) {
      console.log(`[DUMMY FALLBACK] ${p}:${idx + 1} -> ${l.trim()}`);
    }
  });
}

