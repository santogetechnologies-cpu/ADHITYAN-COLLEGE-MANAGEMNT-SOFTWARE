import fs from 'fs';
import path from 'path';

function findFiles(dir, exts) {
  let res = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name !== 'node_modules' && item.name !== 'dist' && item.name !== '.git') {
        res = res.concat(findFiles(full, exts));
      }
    } else if (exts.some(ext => item.name.endsWith(ext))) {
      res.push(full);
    }
  }
  return res;
}

const files = findFiles('src', ['.tsx', '.ts']);
const linkRegex = /to=["']([^"']+)["']/g;
const navRegex = /navigate\((?:["']([^"']+)["']|`([^`]+)`)/g;
const backUrlRegex = /backUrl=["']([^"']+)["']/g;
const hrefRegex = /href=["']([^"']+)["']/g;

const appRoutes = [
  '/',
  '/dashboard',
  '/dashboard/:role',
  '/principal',
  '/teacher',
  '/student',
  '/parent',
  '/message-teacher',
  '/track-bus',
  '/achievements',
  '/report-concern',
  '/store',
  '/teachers/create-assignment',
  '/teachers/message-parents',
  '/teachers/generate-report',
  '/teachers/daily-update',
  '/exam-management',
  '/library-management',
  '/admission-management',
  '/alumni-management',
  '/medical-management',
  '/certificate-generation',
  '/sports-management',
  '/disciplinary-management',
  // admin layout children
  '/admin',
  '/admin/principal',
  '/admin/finance',
  '/admin/store',
  '/admin/transport',
  '/admin/users',
  '/admin/departments',
  '/admin/teachers',
  '/admin/timetable',
  '/admin/storekeeper',
  '/admin/accounts',
  '/admin/events',
  '/admin/receptionist',
  '/admin/store-manager',
  '/admin/finance-manager',
  '/admin/transport-driver',
  '/admin/reports',
  '/admin/analytics',
  '/admin/settings',
  // naac children
  '/admin/naac',
  '/admin/naac/criterion-1',
  '/admin/naac/criterion-2',
  '/admin/naac/criterion-3',
  '/admin/naac/criterion-4',
  '/admin/naac/criterion-5',
  '/admin/naac/criterion-6',
  '/admin/naac/criterion-7',
  '/admin/naac/repository',
  '/admin/naac/reports',
  '/admin/naac/settings'
];

const found = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = linkRegex.exec(content)) !== null) {
    if (m[1].startsWith('/') && !m[1].startsWith('//')) found.push({ file, target: m[1], type: 'Link' });
  }
  while ((m = navRegex.exec(content)) !== null) {
    const target = m[1] || m[2];
    if (target && target.startsWith('/') && !target.startsWith('//')) found.push({ file, target, type: 'navigate' });
  }
  while ((m = backUrlRegex.exec(content)) !== null) {
    if (m[1].startsWith('/')) found.push({ file, target: m[1], type: 'backUrl' });
  }
  while ((m = hrefRegex.exec(content)) !== null) {
    if (m[1].startsWith('/') && !m[1].startsWith('//') && !m[1].startsWith('/lovable') && !m[1].startsWith('/assets') && !m[1].endsWith('.png') && !m[1].endsWith('.svg')) {
      found.push({ file, target: m[1], type: 'href' });
    }
  }
}

const unhandled = [];
for (const item of found) {
  // Normalize target without query string
  const cleanTarget = item.target.split('?')[0];
  const matched = appRoutes.some(r => {
    if (r === cleanTarget) return true;
    if (r.includes(':')) {
      const base = r.split('/:')[0];
      if (cleanTarget.startsWith(base + '/')) return true;
    }
    return false;
  });
  if (!matched) {
    unhandled.push(item);
  }
}

console.log('Total targets checked:', found.length);
console.log('Unmatched targets:', unhandled.length);
if (unhandled.length > 0) {
  console.log(JSON.stringify(unhandled, null, 2));
}

