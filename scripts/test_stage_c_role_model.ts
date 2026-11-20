import fs from 'fs';
import { ROLE_CONFIGS } from '../src/config/roles';

function testRoleModel() {
  console.log('========================================================================');
  console.log('STAGE C: ROLE MODEL & PERMISSION ENFORCEMENT VERIFICATION');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} ${detail ? '(' + detail + ')' : ''}`);
      failed++;
    }
  }

  // 1. Verify super_admin is registered in ROLE_CONFIGS
  const superAdminConfig = ROLE_CONFIGS['super_admin'];
  assert(!!superAdminConfig, 'super_admin exists in ROLE_CONFIGS');
  assert(superAdminConfig?.home === '/super-admin', 'super_admin home is /super-admin');
  assert((ROLE_CONFIGS as any)['platform_super_admin'] === undefined, 'platform_super_admin is completely removed from ROLE_CONFIGS');

  // 2. Verify admin configuration
  const adminConfig = ROLE_CONFIGS['admin'];
  assert(!!adminConfig, 'admin exists in ROLE_CONFIGS');
  assert(adminConfig?.home === '/admin', 'admin home is /admin');

  // 3. Verify AuthContext has no email-prefix admin fallback
  const authContextCode = fs.readFileSync('src/context/AuthContext.tsx', 'utf-8');
  assert(!authContextCode.includes("email.startsWith('admin')"), 'AuthContext has no email.startsWith("admin") fallback');
  assert(!authContextCode.includes("email.startsWith('superadmin')"), 'AuthContext has no email.startsWith("superadmin") fallback');
  assert(authContextCode.includes("(profileData?.role || 'student') as UserRole"), 'AuthContext resolves role strictly from verified database profile row');

  // 4. Verify adminBackend restricts privileged role creation
  const adminBackendCode = fs.readFileSync('src/server/adminBackend.ts', 'utf-8');
  assert(adminBackendCode.includes("'super_admin'"), 'adminBackend ALLOWED_ROLES includes super_admin');
  assert(!adminBackendCode.includes("'platform_super_admin'"), 'adminBackend ALLOWED_ROLES does not include platform_super_admin');
  assert(adminBackendCode.includes("Only a Super Administrator can create Administrator or Super Administrator accounts"), 'adminBackend enforces super_admin requirement for admin creation');
  assert(adminBackendCode.includes("Only a Super Administrator can modify Administrator or Super Administrator accounts"), 'adminBackend enforces super_admin requirement for admin update');

  // 5. Verify 029 migration script exists and has all required tables and helpers
  const migration029 = fs.readFileSync('supabase/migrations/029_super_admin_role_and_permissions.sql', 'utf-8');
  assert(migration029.includes('CREATE TABLE IF NOT EXISTS public.role_permissions'), '029 migration creates role_permissions table');
  assert(migration029.includes('CREATE TABLE IF NOT EXISTS public.module_switches'), '029 migration creates module_switches table');
  assert(migration029.includes('CREATE TABLE IF NOT EXISTS public.approvals'), '029 migration creates approvals table');
  assert(migration029.includes('CREATE TABLE IF NOT EXISTS public.view_as_sessions'), '029 migration creates view_as_sessions table');
  assert(migration029.includes('CREATE OR REPLACE FUNCTION public.is_super_admin()'), '029 migration creates is_super_admin() SQL helper');
  assert(migration029.includes('CREATE OR REPLACE FUNCTION public.has_permission('), '029 migration creates has_permission() SQL helper');
  assert(migration029.includes('CREATE TRIGGER trg_protect_profile_security_fields'), '029 migration attaches security trigger to profiles');

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

testRoleModel();
