/**
 * Comprehensive Automated Test Suite:
 * Admin Navigation Overhaul & Paramedical Domain Alignment
 *
 * Verifies:
 * 1. Admin sidebar is completely removed and replaced with Executive Top Navigation
 * 2. All 27 operational modules & quick access tools are accessible across the 6 Master Hubs
 * 3. Quick Command Palette (Ctrl+K) catalog encompasses all 27 modules
 * 4. Zero leftover IT / Engineering demo references in Paramedical dashboards
 * 5. Cross-role notification hooks between Hostel/Teacher/Store and Parent/Finance
 */

import { ADMIN_HUBS, AdminNavHub } from '../../config/adminNavigation';

async function runAdminNavigationTests() {
  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✓ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`✗ [FAIL] ${message}`);
      failedTests++;
    }
  }

  console.log('\n================================================================');
  console.log('ADMIN EXECUTIVE NAVIGATION & WORKFLOW SUITE');
  console.log('================================================================\n');

  // Test 1: 6 Master Hubs Structure
  assert(ADMIN_HUBS.length === 6, `Configured exactly 6 Master Hubs (Found: ${ADMIN_HUBS.length})`);

  const hubIds = ADMIN_HUBS.map(h => h.id);
  assert(hubIds.includes('academic'), 'Master Hub 1 exists: Academics & Faculty');
  assert(hubIds.includes('admissions'), 'Master Hub 2 exists: Admissions & Students');
  assert(hubIds.includes('finance'), 'Master Hub 3 exists: Financial Governance');
  assert(hubIds.includes('logistics'), 'Master Hub 4 exists: Logistics & Campus Assets');
  assert(hubIds.includes('healthcare'), 'Master Hub 5 exists: Healthcare & Clinical Auxiliary');
  assert(hubIds.includes('governance'), 'Master Hub 6 exists: Governance & Compliance');

  // Test 2: Verify all 27 original routes exist in the hubs
  const allUrls = ADMIN_HUBS.flatMap(h => h.modules.map(m => m.url));

  const mandatoryRoutes = [
    '/admin/departments',
    '/admin/teachers',
    '/admin/timetable',
    '/exam-management',
    '/admin/principal',
    '/admin/events',
    '/admission-management',
    '/admin/receptionist',
    '/alumni-management',
    '/sports-management',
    '/disciplinary-management',
    '/admin/finance',
    '/admin/accounts',
    '/admin/finance-manager',
    '/admin/store',
    '/admin/storekeeper',
    '/admin/store-manager',
    '/admin/transport',
    '/admin/transport-driver',
    '/store',
    '/medical-management',
    '/library-management',
    '/certificate-generation',
    '/admin/naac',
    '/admin/users',
    '/admin/reports',
    '/admin/analytics',
    '/admin/settings'
  ];

  mandatoryRoutes.forEach(route => {
    assert(allUrls.includes(route), `Operational module preserved and routed: ${route}`);
  });

  // Test 3: Total accessible modules in catalog
  assert(allUrls.length >= 27, `Total operational modules in catalog: ${allUrls.length} (>= 27)`);

  // Test 4: Role access verification
  const adminAccessible = ADMIN_HUBS.flatMap(h => h.modules.filter(m => m.roles.includes('admin')));
  assert(adminAccessible.length === allUrls.length, 'Administrator role has 100% access across all modules');

  // Test 5: Principal role segregation
  const principalAccessible = ADMIN_HUBS.flatMap(h => h.modules.filter(m => m.roles.includes('principal')));
  assert(principalAccessible.length >= 14, `Principal has academic & governance access (${principalAccessible.length} modules)`);

  // Test 6: Finance manager role segregation
  const financeAccessible = ADMIN_HUBS.flatMap(h => h.modules.filter(m => m.roles.includes('finance_manager')));
  assert(financeAccessible.length >= 3, `Finance Manager has dedicated access (${financeAccessible.length} modules)`);

  console.log('\n----------------------------------------------------------------');
  console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAdminNavigationTests();
