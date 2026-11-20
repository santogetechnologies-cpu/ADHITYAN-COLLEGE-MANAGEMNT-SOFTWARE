import fs from 'fs';
import path from 'path';

function inspectDashboards() {
  const dashboardDir = 'src/components/dashboards';
  const files = fs.readdirSync(dashboardDir).filter(f => f.endsWith('.tsx'));
  
  console.log(`Found ${files.length} dashboard files in ${dashboardDir}:\n`);
  for (const f of files) {
    const fullPath = path.join(dashboardDir, f);
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasSupabase = /supabase|db\./i.test(content);
    const hasUseStateArray = /useState\s*(<[^>]+>)?\s*\(\s*\[\s*\{/.test(content);
    const lines = content.split('\n').length;
    console.log(`- ${f} (${lines} lines): Supabase/DB = ${hasSupabase}, Has hardcoded array in useState = ${hasUseStateArray}`);
  }
}

inspectDashboards();

