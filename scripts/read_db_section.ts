import fs from 'fs';

const content = fs.readFileSync('src/services/supabase/database.ts', 'utf8');
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('getDigitalLibraryResources'));
if (idx !== -1) {
  console.log(lines.slice(Math.max(0, idx - 5), Math.min(lines.length, idx + 30)).join('\n'));
} else {
  console.log('Not found');
}

