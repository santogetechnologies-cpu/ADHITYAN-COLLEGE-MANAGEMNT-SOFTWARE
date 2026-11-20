import fs from 'fs';

const spec = JSON.parse(fs.readFileSync('scripts/openapi.json', 'utf8'));
const defs = spec.definitions || {};

const tablesWithCollegeId: string[] = [];
const allTables = Object.keys(defs);

for (const table of allTables) {
  const props = defs[table]?.properties || {};
  if (props.college_id || props.institution_id || props.tenant_id) {
    tablesWithCollegeId.push(table);
  }
}

console.log(`Checked ${allTables.length} tables.`);
console.log('Tables with college_id / institution_id / tenant_id:', tablesWithCollegeId);
