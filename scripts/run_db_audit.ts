import fs from 'fs';
import path from 'path';

// 1. Load Live Schema
const liveDefs = JSON.parse(fs.readFileSync('scripts/_live_schema.json', 'utf-8'));
const liveTables = Object.keys(liveDefs).sort();

// Helper to extract table columns from live definitions
const liveTableColumns: Record<string, string[]> = {};
for (const [tbl, def] of Object.entries(liveDefs)) {
  const props = (def as any).properties || {};
  liveTableColumns[tbl] = Object.keys(props).sort();
}

// 2. Scan Migration Files
const migrationsDir = 'supabase/migrations';
const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql') && f !== 'all_migrations.sql').sort();

const migrationTables = new Set<string>();
const tableRegex = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-zA-Z0-9_]+)/gi;

for (const f of migrationFiles) {
  const content = fs.readFileSync(path.join(migrationsDir, f), 'utf-8');
  let match;
  while ((match = tableRegex.exec(content)) !== null) {
    migrationTables.add(match[1].toLowerCase());
  }
}

// 3. Scan Codebase for Table References
const srcDir = 'src';
const codeTables = new Set<string>();
const codeQueries: Array<{ file: string; table: string; line: number }> = [];
const tableColumnsReferenced: Record<string, Set<string>> = {};

function scanDir(dir: string) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      scanDir(full);
    } else if (/\.(ts|tsx)$/.test(f)) {
      const content = fs.readFileSync(full, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        // match .from('table_name') or .from<Type>('table_name')
        const fromMatch = /\.from(?:<[^>]+>)?\(['"]([a-zA-Z0-9_]+)['"]\)/g;
        let m;
        while ((m = fromMatch.exec(line)) !== null) {
          const tbl = m[1].toLowerCase();
          codeTables.add(tbl);
          codeQueries.push({ file: full, table: tbl, line: idx + 1 });
        }
      });
    }
  }
}
scanDir(srcDir);

// Also scan scripts/ for query targets
scanDir('scripts');

// 4. Analysis
const allKnownTables = Array.from(new Set([...liveTables, ...migrationTables, ...codeTables])).sort();

const inLiveNotMigration = liveTables.filter(t => !migrationTables.has(t));
const inMigrationNotLive = Array.from(migrationTables).filter(t => !liveTables.includes(t));
const inCodeNotLive = Array.from(codeTables).filter(t => !liveTables.includes(t));
const inLiveNotCode = liveTables.filter(t => !codeTables.has(t));

const report = {
  summary: {
    totalLiveTables: liveTables.length,
    totalMigrationTables: migrationTables.size,
    totalCodeReferencedTables: codeTables.size,
    totalUnionTables: allKnownTables.length,
  },
  tablesReferencedInCodeMissingInLive: inCodeNotLive,
  tablesInMigrationMissingInLive: inMigrationNotLive,
  tablesInLiveNotReferencedInCode: inLiveNotCode,
  liveTablesList: liveTables,
  migrationTablesList: Array.from(migrationTables).sort(),
  codeReferencedTablesList: Array.from(codeTables).sort(),
  liveTableColumns
};

fs.writeFileSync('scripts/_audit_comparison.json', JSON.stringify(report, null, 2));
console.log('AUDIT ANALYSIS COMPLETE:');
console.log(JSON.stringify(report.summary, null, 2));
console.log('\n--- CODE REFERENCED TABLES MISSING IN LIVE SUPABASE ---');
console.log(inCodeNotLive);
console.log('\n--- MIGRATION TABLES MISSING IN LIVE SUPABASE ---');
console.log(inMigrationNotLive);
