import fs from 'fs';
import path from 'path';

const dirs = [
  'src/pages',
  'src/pages/admin',
  'src/pages/teachers',
  'src/pages/naac',
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

const results = [];

for (const d of dirs) {
  if (!fs.existsSync(d)) continue;
  const files = fs.readdirSync(d).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
  for (const f of files) {
    const fullPath = path.join(d, f).replace(/\\/g, '/');
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasSupabase = content.includes('supabase') || content.includes('.from(');
    const tableMatches = [...content.matchAll(/\.from\(['"]([a-zA-Z0-9_]+)['"]\)/g)].map(m => m[1]);
    const hasToast = content.includes('toast(') || content.includes('toast.') || content.includes('useToast');
    const hasMock = content.includes('mock') || content.includes('sample') || content.includes('dummy');
    
    // Extract button labels or intentions
    const buttonMatches = [...content.matchAll(/<Button[^>]*>([\s\S]*?)<\/Button>/g)]
      .map(m => m[1].replace(/<[^>]+>/g, '').trim())
      .filter(t => t.length > 0 && t.length < 50);

    // Form inputs or submit handlers
    const hasForm = content.includes('<form') || content.includes('onSubmit') || content.includes('handleSubmit');

    results.push({
      file: fullPath,
      module: d,
      filename: f,
      hasSupabase,
      tables: Array.from(new Set(tableMatches)),
      hasToast,
      hasMock,
      hasForm,
      buttons: Array.from(new Set(buttonMatches)).slice(0, 6)
    });
  }
}

fs.writeFileSync('scripts/files_analysis.json', JSON.stringify(results, null, 2));
console.log(`Successfully analyzed ${results.length} files. Output saved to scripts/files_analysis.json`);

