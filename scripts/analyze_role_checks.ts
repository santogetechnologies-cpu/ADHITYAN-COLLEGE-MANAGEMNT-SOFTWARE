import fs from 'fs';

const data = JSON.parse(fs.readFileSync('scripts/access_scan_results.json', 'utf-8'));

console.log(`Total role checks: ${data.roleChecks.length}`);

// Group by file
const byFile: Record<string, any[]> = {};
for (const item of data.roleChecks) {
  if (!byFile[item.file]) byFile[item.file] = [];
  byFile[item.file].push(item);
}

for (const [file, checks] of Object.entries(byFile)) {
  console.log(`\nFILE: ${file} (${checks.length} checks)`);
  for (const c of checks) {
    console.log(`  Line ${c.line}: ${c.snippet}`);
  }
}
