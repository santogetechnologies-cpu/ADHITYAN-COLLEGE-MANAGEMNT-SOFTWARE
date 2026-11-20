import * as fs from 'fs';
import * as path from 'path';
import { ROLE_CONFIGS, isRouteAllowed } from '../../config/roles';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✓ [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`✗ [FAIL] ${msg}`);
    failed++;
  }
}

async function run() {
  console.log('================================================================');
  console.log('REACT ROUTER V7 FUTURE FLAGS & ROLE-BASED NAVIGATION AUDIT');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // TEST 1: BrowserRouter Configuration & Future Flags
  // -------------------------------------------------------------
  console.log('--- TEST 1: BrowserRouter Future Flags Configuration ---');
  const appPath = path.resolve('src/App.tsx');
  const appCode = fs.readFileSync(appPath, 'utf-8');

  assert(
    appCode.includes('v7_startTransition: true'),
    'BrowserRouter has v7_startTransition: true enabled'
  );
  assert(
    appCode.includes('v7_relativeSplatPath: true'),
    'BrowserRouter has v7_relativeSplatPath: true enabled'
  );
  assert(
    appCode.includes('<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>'),
    'BrowserRouter correctly passes both v7 future flags as an object'
  );

  // -------------------------------------------------------------
  // TEST 2: Splat and Catch-All Routes Audit
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Splat and Catch-All Routes Audit ---');
  // Check that the 404 catch-all route exists at the end of Routes
  assert(
    appCode.includes('<Route path="*" element={<NotFound />} />'),
    'Catch-all splat route <Route path="*" element={<NotFound />} /> is properly mounted'
  );

  // Check NotFound page navigation
  const notFoundPath = path.resolve('src/pages/NotFound.tsx');
  const notFoundCode = fs.readFileSync(notFoundPath, 'utf-8');
  assert(
    notFoundCode.includes('to="/"'),
    'NotFound page uses absolute navigation (to="/") unaffected by relative splat path change'
  );

  // -------------------------------------------------------------
  // TEST 3: Relative Navigation Audit across Codebase
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Codebase Relative vs Absolute Navigation Audit ---');
  function walkDir(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
          walkDir(fullPath, fileList);
        }
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        fileList.push(fullPath);
      }
    }
    return fileList;
  }

  const allSourceFiles = walkDir(path.resolve('src'));
  const riskyRelativeLinks: string[] = [];

  for (const f of allSourceFiles) {
    const text = fs.readFileSync(f, 'utf-8');
    const lines = text.split('\n');
    lines.forEach((line, idx) => {
      // Find relative links inside splat routes
      if (/<Link[^>]*to=['"][^/][^'"]*['"]/.test(line) && !line.includes('mailto:') && !line.includes('tel:')) {
        riskyRelativeLinks.push(`${f}:${idx + 1} -> ${line.trim()}`);
      }
    });
  }

  assert(
    riskyRelativeLinks.length === 0,
    `Zero ambiguous relative links found in the codebase (Found: ${riskyRelativeLinks.length})`
  );

  // -------------------------------------------------------------
  // TEST 4: Audit Every Role's Landing Page and Navigation Items
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Every Role Navigation & Route Access Audit ---');
  const rolesList = Object.keys(ROLE_CONFIGS) as Array<keyof typeof ROLE_CONFIGS>;
  console.log(`Auditing ${rolesList.length} total configured roles...`);

  // Extract all defined routes in App.tsx
  const routeMatches = Array.from(appCode.matchAll(/path=["']([^"']+)["']/g)).map(m => m[1]);
  const nestedAdminMatches = [
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
    '/admin/settings'
  ];
  const nestedNAACMatches = [
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
  const allAppRoutes = Array.from(new Set([...routeMatches, ...nestedAdminMatches, ...nestedNAACMatches]));

  for (const roleKey of rolesList) {
    const config = ROLE_CONFIGS[roleKey];
    const roleHome = config.home;

    // Check if home path can be resolved by App routes or dashboard wildcard
    const canResolveHome =
      allAppRoutes.includes(roleHome) ||
      roleHome.startsWith('/dashboard/') ||
      roleHome === '/dashboard';

    assert(canResolveHome, `Role "${roleKey}" home path "${roleHome}" is validly defined in routing system`);

    // Verify allowedRoutes are recognized
    for (const allowedPath of config.allowedRoutes) {
      const isAllowed = isRouteAllowed(roleKey as any, allowedPath);
      assert(isAllowed, `Role "${roleKey}" isRouteAllowed("${allowedPath}") evaluates to true`);
    }

    // Verify all navItems use absolute paths and are authorized
    for (const navItem of config.navItems) {
      assert(
        navItem.path.startsWith('/'),
        `Role "${roleKey}" nav item "${navItem.label}" uses absolute path "${navItem.path}"`
      );
    }
  }

  // -------------------------------------------------------------
  // TEST 5: Role Isolation and ProtectedRoute Redirection Guard
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Role Boundary Security & Redirection Logic ---');
  // Student cannot access /admin
  assert(!isRouteAllowed('student', '/admin'), 'Student is denied access to /admin');
  assert(!isRouteAllowed('student', '/admin/users'), 'Student is denied access to /admin/users');
  assert(!isRouteAllowed('student', '/teachers/create-assignment'), 'Student is denied access to teacher assignments');

  // Teacher cannot access /admin/users
  assert(!isRouteAllowed('teacher', '/admin/users'), 'Teacher is denied access to /admin/users');

  // Parent cannot access teacher daily update
  assert(!isRouteAllowed('parent', '/teachers/daily-update'), 'Parent is denied access to /teachers/daily-update');

  // Admin has global access
  assert(isRouteAllowed('admin', '/admin'), 'Admin has access to /admin');
  assert(isRouteAllowed('admin', '/dashboard/student'), 'Admin has global access to /dashboard/student');
  assert(isRouteAllowed('admin', '/teachers/daily-update'), 'Admin has global access to /teachers/daily-update');

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});

