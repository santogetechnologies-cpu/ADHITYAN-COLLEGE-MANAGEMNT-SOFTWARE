import fs from 'fs';

const content = fs.readFileSync('src/services/supabase/database.ts', 'utf8');

const methodsToCheck = [
  'updateNAACProgress',
  'addNAACDocument',
  'deleteNAACDocument',
  'getDigitalLibraryResources',
  'addDigitalLibraryResource',
  'deleteDigitalLibraryResource',
  'updateDigitalLibraryResource',
  'updateExamResult',
  'getInstitutionalSettings',
  'updateInstitutionalSettings'
];

for (const m of methodsToCheck) {
  const exists = content.includes(m);
  console.log(`db.${m}: ${exists ? 'EXISTS' : 'MISSING'}`);
}

