import fs from 'fs';
import path from 'path';

interface RoleCheck {
  file: string;
  line: number;
  snippet: string;
  type: 'allowedRoles' | 'role_comparison' | 'admin_missing';
}

function walkDir(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        walkDir(fullPath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const allFiles = walkDir('./src');
const allowedRolesMatches: any[] = [];
const roleChecks: any[] = [];
const adminMissingChecks: any[] = [];

for (const filePath of allFiles) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    // 1. Check allowedRoles
    if (line.includes('allowedRoles')) {
      const match = line.match(/allowedRoles=\{?\[(.*?)\]\}?/);
      const rolesStr = match ? match[1] : line.trim();
      const hasAdmin = rolesStr.includes("'admin'") || rolesStr.includes('"admin"');
      allowedRolesMatches.push({
        file: filePath.replace(/\\/g, '/'),
        line: idx + 1,
        snippet: line.trim(),
        hasAdmin
      });
      if (!hasAdmin) {
        adminMissingChecks.push({
          file: filePath.replace(/\\/g, '/'),
          line: idx + 1,
          snippet: line.trim(),
          reason: 'allowedRoles does not include admin'
        });
      }
    }

    // 2. Check role === or role !==
    if (line.match(/\b(role|user\.role)\s*===/)) {
      roleChecks.push({
        file: filePath.replace(/\\/g, '/'),
        line: idx + 1,
        snippet: line.trim()
      });
    }
  });
}

console.log(`Scanned ${allFiles.length} files.`);
console.log(`Found ${allowedRolesMatches.length} allowedRoles occurrences.`);
console.log(`Found ${roleChecks.length} role === checks.`);
console.log(`Found ${adminMissingChecks.length} places where allowedRoles does not include admin:`);
adminMissingChecks.forEach(m => console.log(`  ${m.file}:${m.line} -> ${m.snippet}`));

fs.writeFileSync('scripts/access_scan_results.json', JSON.stringify({
  allowedRolesMatches,
  roleChecks,
  adminMissingChecks
}, null, 2));
