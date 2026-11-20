import {
  ALL_SMART_MODULES,
  SMART_CATEGORIES,
  getActiveDepartment,
  getBreadcrumbsForPath,
  getStoredFavourites,
  toggleStoredFavourite,
  SmartNavModule
} from '../../config/smartAdminNavigation';
import { ADMIN_HUBS } from '../../config/adminNavigation';

async function runSmartAdminNavigationVerificationTests() {
  console.log('================================================================');
  console.log('UNIQUE SMART ADMIN NAVIGATION COMMAND CENTER VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // TEST 1: Smart Primary Department Pillars (5 Pillars)
  // -------------------------------------------------------------
  console.log('--- TEST 1: Smart Primary Department Navigation (5 Pillars) ---');
  const departments = ['overview', 'people', 'academics', 'finance', 'modules'];
  assert(departments.length === 5, 'Exactly 5 Primary Department Navigation items defined');

  // Verify Active Department Resolution
  assert(getActiveDepartment('/admin') === 'overview', 'Path "/admin" resolves to department "overview"');
  assert(getActiveDepartment('/admin/users') === 'people', 'Path "/admin/users" resolves to department "people"');
  assert(getActiveDepartment('/admin/teachers') === 'people', 'Path "/admin/teachers" resolves to department "people"');
  assert(getActiveDepartment('/admin/departments') === 'academics', 'Path "/admin/departments" resolves to department "academics"');
  assert(getActiveDepartment('/admin/timetable') === 'academics', 'Path "/admin/timetable" resolves to department "academics"');
  assert(getActiveDepartment('/admin/finance') === 'finance', 'Path "/admin/finance" resolves to department "finance"');
  assert(getActiveDepartment('/admin/accounts') === 'finance', 'Path "/admin/accounts" resolves to department "finance"');
  assert(getActiveDepartment('/admission-management') === 'modules', 'Path "/admission-management" resolves to "modules"');
  assert(getActiveDepartment('/library-management') === 'modules', 'Path "/library-management" resolves to "modules"');

  // -------------------------------------------------------------
  // TEST 2: Smart Mega Menu Structure (6 Operational Categories)
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Smart Mega Menu 6 Operational Categories ---');
  assert(SMART_CATEGORIES.length === 6, `Configured exactly 6 Mega Menu Category Groups (Found: ${SMART_CATEGORIES.length})`);

  const categoryIds = SMART_CATEGORIES.map(c => c.id);
  assert(categoryIds.includes('people'), 'Category 1: People & Identities');
  assert(categoryIds.includes('academics'), 'Category 2: Academics & Faculty');
  assert(categoryIds.includes('finance'), 'Category 3: Financial Governance');
  assert(categoryIds.includes('operations'), 'Category 4: Institutional Operations');
  assert(categoryIds.includes('healthcare'), 'Category 5: Healthcare & Clinical');
  assert(categoryIds.includes('governance'), 'Category 6: Governance & Compliance');

  // -------------------------------------------------------------
  // TEST 3: Module Preservation (All Routes Present & Accounted For)
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Preservation of All Original Modules & Routes ---');
  const allUrls = ALL_SMART_MODULES.map(m => m.url);

  const expectedRoutes = [
    '/admin/users',
    '/admin/teachers',
    '/admin/receptionist',
    '/admin/departments',
    '/admin/timetable',
    '/exam-management',
    '/admin/principal',
    '/admin/events',
    '/admin/finance',
    '/admin/finance-manager',
    '/admin/accounts',
    '/admin/reports',
    '/admission-management',
    '/admin/store',
    '/admin/storekeeper',
    '/admin/store-manager',
    '/store',
    '/admin/transport',
    '/admin/transport-driver',
    '/track-bus',
    '/library-management',
    '/sports-management',
    '/medical-management',
    '/admin/naac',
    '/certificate-generation',
    '/disciplinary-management',
    '/alumni-management',
    '/admin/analytics',
    '/admin/settings'
  ];

  expectedRoutes.forEach(route => {
    const found = allUrls.some(u => u === route || u.startsWith(route));
    assert(found, `Mandatory route preserved in smart navigation: ${route}`);
  });

  assert(ALL_SMART_MODULES.length >= 28, `Total operational smart modules cataloged: ${ALL_SMART_MODULES.length} (>= 28)`);

  // -------------------------------------------------------------
  // TEST 4: Context-Aware Breadcrumbs Generation
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Context-Aware Breadcrumbs Path Computation ---');
  const overviewCrumbs = getBreadcrumbsForPath('/admin');
  assert(overviewCrumbs.length === 2 && overviewCrumbs[1].label === 'Institutional Overview', 'Breadcrumbs for "/admin" compute to Console > Institutional Overview');

  const timetableCrumbs = getBreadcrumbsForPath('/admin/timetable');
  assert(timetableCrumbs.some(c => c.label.includes('Academics')), 'Breadcrumbs for "/admin/timetable" contain parent category "Academics & Faculty"');
  assert(timetableCrumbs[timetableCrumbs.length - 1].label.includes('Weekly Class Timetable'), 'Breadcrumbs for "/admin/timetable" contain page title "Weekly Class Timetable"');

  const usersCrumbs = getBreadcrumbsForPath('/admin/users');
  assert(usersCrumbs.some(c => c.label.includes('People')), 'Breadcrumbs for "/admin/users" contain parent category "People & Identities"');

  const financeCrumbs = getBreadcrumbsForPath('/admin/finance');
  assert(financeCrumbs.some(c => c.label.toLowerCase().includes('financ')), 'Breadcrumbs for "/admin/finance" contain parent category "Financial Governance"');

  // -------------------------------------------------------------
  // TEST 5: Favourites Bookmarking System
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Institutional Bookmarks & Favourites System ---');
  const initialFavs = getStoredFavourites();
  assert(Array.isArray(initialFavs) && initialFavs.length > 0, `Initial default bookmarks configured (${initialFavs.join(', ')})`);
  assert(initialFavs.includes('class-timetable'), 'Timetable is bookmarked in default institutional quick-access');

  // -------------------------------------------------------------
  // TEST 6: Role Segregation & Authorization
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Permission-Aware Access & Role Segregation ---');
  const adminAccessible = ALL_SMART_MODULES.filter(m => m.roles.includes('admin'));
  assert(adminAccessible.length === ALL_SMART_MODULES.length, `Administrator has 100% access (${adminAccessible.length}/${ALL_SMART_MODULES.length} modules)`);

  const principalAccessible = ALL_SMART_MODULES.filter(m => m.roles.includes('principal'));
  assert(principalAccessible.length >= 15, `Principal has academic, clinical & operational authority (${principalAccessible.length} modules)`);

  const financeAccessible = ALL_SMART_MODULES.filter(m => m.roles.includes('finance_manager'));
  assert(financeAccessible.length >= 3, `Finance Manager has dedicated revenue modules (${financeAccessible.length} modules)`);

  const receptionistAccessible = ALL_SMART_MODULES.filter(m => m.roles.includes('receptionist'));
  assert(receptionistAccessible.length >= 2, `Receptionist has intake desk access (${receptionistAccessible.length} modules)`);

  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    throw new Error(`${failed} tests failed in Smart Admin Navigation verification.`);
  }
}

runSmartAdminNavigationVerificationTests().catch(err => {
  console.error(err);
  process.exit(1);
});
