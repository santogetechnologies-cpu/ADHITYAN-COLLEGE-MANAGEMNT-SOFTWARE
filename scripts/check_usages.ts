import fs from 'fs';
import path from 'path';

function searchUsage(componentName: string) {
  const files: string[] = [];
  function walk(current: string) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!['node_modules', '.git', 'dist'].includes(entry.name)) walk(fullPath);
      } else if (/\.(tsx|ts)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes(componentName)) {
          files.push(fullPath.replace(/\\/g, '/'));
        }
      }
    }
  }
  walk('src');
  console.log(`Usages of "${componentName}":`, files);
}

searchUsage('ExamWorkflows');
searchUsage('GradingInterface');
searchUsage('DigitalLibrary');
searchUsage('DigitalCatalog');
searchUsage('StaffPayrollEngine');
searchUsage('AILearningVenture');
searchUsage('ComprehensiveAdmissionDialog');

