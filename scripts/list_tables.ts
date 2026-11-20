import fs from 'fs';

const spec = JSON.parse(fs.readFileSync('scripts/openapi.json', 'utf8'));
const tables = Object.keys(spec.paths).map(p => p.replace('/', '')).filter(t => t && !t.includes('rpc'));
console.log('Total tables in OpenAPI spec:', tables.length);
console.log('Matching tables:', tables.filter(t => 
  t.includes('student') || 
  t.includes('attendance') || 
  t.includes('admission') || 
  t.includes('broadcast') || 
  t.includes('profile') || 
  t.includes('fee') || 
  t.includes('depart') || 
  t.includes('audit') ||
  t.includes('event') ||
  t.includes('super_admin')
));
