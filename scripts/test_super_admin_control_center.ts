import { handleAdminUserOperation } from '../src/server/adminBackend';
import { superAdminService } from '../src/services/superAdminService';
import { buildInitialMasterConfigState } from '../src/services/superAdminDefaults';
import { supabase } from '../src/lib/supabase';

async function runVerification() {
  console.log('================================================================');
  console.log('🚀 RUNNING SUPER ADMIN CONTROL CENTER FULL-STACK TEST SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      process.exitCode = 1;
    }
  }

  // ---------------------------------------------------------------------------
  // TEST 1: Initial Master System Configuration and 13 Roles
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: Master System Configuration & 13 Role Portals ---');
  const masterConfig = buildInitialMasterConfigState();
  const roleKeys = Object.keys(masterConfig.roles);
  
  assert(roleKeys.length >= 13, `Master config contains all 13 ERP roles (found ${roleKeys.length})`);
  assert(roleKeys.includes('admin'), 'Super Admin ("admin") role exists in master configuration');
  assert(roleKeys.includes('principal'), 'Principal role exists in master configuration');
  assert(roleKeys.includes('teacher'), 'Teacher role exists in master configuration');
  assert(roleKeys.includes('student'), 'Student role exists in master configuration');
  assert(roleKeys.includes('parent'), 'Parent role exists in master configuration');
  assert(roleKeys.includes('finance_manager'), 'Finance Manager role exists');
  assert(roleKeys.includes('store_manager'), 'Store Manager role exists');
  assert(roleKeys.includes('transport_driver'), 'Transport Driver role exists');
  assert(roleKeys.includes('receptionist'), 'Receptionist role exists');

  // Verify Admin role is protected
  const adminRole = masterConfig.roles['admin'];
  assert(adminRole.isSystemProtected === true, 'Admin role has isSystemProtected = true (cannot be deleted)');
  assert(adminRole.status === 'active', 'Admin role status is active');

  // ---------------------------------------------------------------------------
  // TEST 2: RBAC Security Guardrails in Backend (Non-Admin HTTP 403 Forbidden)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: RBAC Security Guardrails in Backend ---');
  
  // Non-admin (teacher) attempting to save config draft
  const teacherToken = 'mock-test-role:teacher:teacher-user-1';
  const blockedDraftRes = await handleAdminUserOperation(teacherToken, {
    action: 'save_system_config_draft',
    configType: 'global',
    data: { institutionName: 'Hacked Name' }
  });

  assert(blockedDraftRes.status === 403, 'Non-admin caller blocked with HTTP 403 from saving draft');

  // Non-admin attempting to publish config
  const blockedPublishRes = await handleAdminUserOperation(teacherToken, {
    action: 'publish_system_config',
    releaseVersion: 'v9.9.9',
    summary: 'Unauthorized release'
  });

  assert(blockedPublishRes.status === 403, 'Non-admin caller blocked with HTTP 403 from publishing configuration');

  // Super Admin caller authorized
  const adminToken = 'mock-test-role:admin:admin-user-1';
  const allowedDraftRes = await handleAdminUserOperation(adminToken, {
    action: 'save_system_config_draft',
    configType: 'global',
    targetRole: 'global',
    data: { testKey: 'verified_value' }
  });

  assert(allowedDraftRes.status === 200, 'Super Admin caller successfully permitted to execute configuration action');

  // ---------------------------------------------------------------------------
  // TEST 3: Pre-Flight Configuration Validator
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Pre-Flight Configuration Validator ---');
  
  // Valid configuration
  const validCheck = superAdminService.validateConfiguration(masterConfig);
  assert(validCheck.isValid === true, 'Pre-flight validation passes for valid baseline configuration');

  // Invalid configuration: tampering with admin role
  const invalidConfig1 = JSON.parse(JSON.stringify(masterConfig));
  invalidConfig1.roles['admin'].status = 'restricted';
  const invalidCheck1 = superAdminService.validateConfiguration(invalidConfig1);
  assert(invalidCheck1.isValid === false, 'Validator detects and blocks disabled Super Admin role');
  assert(invalidCheck1.errors.some((e: string) => e.includes('Super Admin')), 'Validation error specifically mentions Super Admin protection');

  // Invalid configuration: invalid attendance threshold
  const invalidConfig2 = JSON.parse(JSON.stringify(masterConfig));
  invalidConfig2.globalSettings.attendancePolicyThreshold = 150;
  const invalidCheck2 = superAdminService.validateConfiguration(invalidConfig2);
  assert(invalidCheck2.isValid === false, 'Validator detects and blocks out-of-bounds attendance threshold');

  // ---------------------------------------------------------------------------
  // TEST 4: Draft Saving, Publishing & Version Release
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Draft Saving, Publishing & Version Release ---');
  
  // Save draft
  const draftSaveRes = await superAdminService.saveDraft(
    'role',
    { ...masterConfig.roles['principal'], description: 'Updated Executive Head of College' },
    'principal',
    { email: 'admin@gmail.com' }
  );
  assert(draftSaveRes.success === true, 'Draft saved successfully via superAdminService');

  // Publish configuration
  const publishRes = await superAdminService.publishConfiguration(
    { email: 'admin@gmail.com' },
    'Automated integration test publish release'
  );
  assert(publishRes.success === true, 'Configuration published successfully');
  assert(!!publishRes.release?.release_version, `Release version generated: ${publishRes.release?.release_version}`);

  // ---------------------------------------------------------------------------
  // TEST 5: Supabase audit_logs Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: Supabase audit_logs Persistence ---');
  
  // Fetch logs
  const auditLogs = await superAdminService.getAuditLogs({ limit: 10 });
  assert(Array.isArray(auditLogs), 'getAuditLogs returns array from Supabase audit_logs table');
  console.log(`Fetched ${auditLogs.length} recent audit logs from Supabase.`);
  if (auditLogs.length > 0) {
    const latest = auditLogs[0];
    console.log(`Latest audit log: [${latest.action}] on [${latest.entity_type}] by [${latest.user_email}] at ${latest.created_at}`);
    assert(!!latest.action, 'Audit log contains valid action name');
    assert(!!latest.created_at, 'Audit log contains valid timestamp');
  }

  // ---------------------------------------------------------------------------
  // TEST 6: Backup & Disaster Recovery JSON Serialization
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 6: Backup Creation & Recovery JSON Serialization ---');
  
  const backupRes = await superAdminService.createBackup('Test_Snapshot_Suite', { email: 'admin@gmail.com' });
  assert(backupRes.success === true, 'createBackup succeeded');
  assert(typeof backupRes.backupPayload === 'string', 'backupPayload generated as valid JSON string');

  if (backupRes.backupPayload) {
    const parsedBackup = JSON.parse(backupRes.backupPayload);
    assert(parsedBackup.backupName === 'Test_Snapshot_Suite', 'Backup payload preserves backupName');
    assert(!!parsedBackup.config.roles, 'Backup payload contains full roles state');

    // Test JSON restoration
    const restoreRes = await superAdminService.restoreFromBackupJson(backupRes.backupPayload, { email: 'admin@gmail.com' });
    assert(restoreRes.success === true, 'restoreFromBackupJson successfully verified and applied snapshot');
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`🏁 TEST SUITE COMPLETED: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('✨ ALL SUPER ADMIN CONTROL CENTER TESTS PASSED PERFECTLY!');
  } else {
    console.error('⚠️ Some tests failed. Review the output above.');
  }
}

runVerification().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
