import fs from 'fs';
import path from 'path';

function inspectPages() {
  const pageDir = 'src/pages';
  function walk(current: string) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && fExt(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const hasSupabase = /supabase|db\./i.test(content);
        const hasUseStateArray = /useState\s*(<[^>]+>)?\s*\(\s*\[\s*\{/.test(content);
        const lines = content.split('\n').length;
        console.log(`- ${fullPath.replace(/\\/g, '/')} (${lines} lines): Supabase/DB = ${hasSupabase}, Has hardcoded array in useState = ${hasUseStateArray}`);
      }
    }
  }
  function fExt(n: string) { return /\.(tsx|ts)$/.test(n); }
  walk(pageDir);
}

inspectPages();

