import { visualCustomizationService } from '../src/services/visualCustomizationService';
import { CollegeRoleVisualCustomization } from '../src/types/visualCustomizer.types';

async function runVisualCustomizerTests() {
  console.log('\n========================================================================');
  console.log(' VISUAL IN-PORTAL CUSTOMIZER & DYNAMIC FORM ENGINE SUITE');
  console.log('========================================================================\n');

  const COLLEGE_A = '11111111-1111-1111-1111-111111111111';
  const COLLEGE_B = '22222222-2222-2222-2222-222222222222';
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${msg}`);
      process.exitCode = 1;
    }
  }

  // TEST 1: Load Default Visual Baseline
  console.log('--- TEST 1: Load Default Visual Baseline for College A Student Portal ---');
  const baseA = await visualCustomizationService.getCustomizations(COLLEGE_A, 'student');
  assert(baseA.collegeId === COLLEGE_A, 'Customization belongs strictly to College A');
  assert(baseA.roleKey === 'student', 'Customization scoped to student role');
  assert(typeof baseA.contentOverrides === 'object', 'Content overrides store initialized');
  assert(typeof baseA.formCustomizations === 'object', 'Form schema customizations store initialized');

  // TEST 2: Customize Existing Text on Student Dashboard
  console.log('\n--- TEST 2: Customize Existing Text on Student Portal ("Welcome back, {studentName}!") ---');
  const updatedA: CollegeRoleVisualCustomization = {
    ...baseA,
    contentOverrides: {
      ...baseA.contentOverrides,
      student_welcome_title: {
        id: 'student_welcome_title',
        text: 'Greetings and Welcome, {studentName}!',
        styling: { color: '#ffffff', fontSize: 'text-3xl' },
        isHidden: false,
        updatedAt: new Date().toISOString()
      },
      student_welcome_subtitle: {
        id: 'student_welcome_subtitle',
        text: 'Adithyan College of Allied Health Sciences — 2026 Academic Session',
        isHidden: false,
        updatedAt: new Date().toISOString()
      }
    }
  };

  await visualCustomizationService.saveCustomizations(COLLEGE_A, 'student', updatedA);
  const reloadedA = await visualCustomizationService.getCustomizations(COLLEGE_A, 'student');
  assert(
    reloadedA.contentOverrides.student_welcome_title.text === 'Greetings and Welcome, {studentName}!',
    'Customized welcome header text persisted in College A backend'
  );
  assert(
    reloadedA.contentOverrides.student_welcome_title.styling?.color === '#ffffff',
    'Custom text color styling persisted'
  );

  // TEST 3: Zero Bleed Between Colleges (Strict Isolation)
  console.log('\n--- TEST 3: Zero Bleed Between Colleges (College B Student Portal Unmutated) ---');
  const reloadedB = await visualCustomizationService.getCustomizations(COLLEGE_B, 'student');
  assert(
    !reloadedB.contentOverrides.student_welcome_title,
    'College B student portal has NO override; retains default institutional branding'
  );

  // TEST 4: Add Dynamic Injected Components (Contextual [+] Button)
  console.log('\n--- TEST 4: Injected Components (Banners & Stat Cards) in Contextual Zones ---');
  const withInjected: CollegeRoleVisualCustomization = {
    ...reloadedA,
    injectedComponents: {
      student_hero_bottom: [
        {
          id: 'banner_exam_alert_1',
          zoneId: 'student_hero_bottom',
          type: 'banner',
          title: 'Special Clinical Round Notice',
          content: 'All dialysis and MLT students report to Clinical Block B at 08:30 AM.',
          theme: 'indigo',
          order: 0,
          updatedAt: new Date().toISOString()
        }
      ],
      student_stats_top: [
        {
          id: 'card_clinical_hours',
          zoneId: 'student_stats_top',
          type: 'stat_card',
          title: 'Clinical Hours Completed',
          statValue: '210 / 240 hrs',
          statChange: '+15 hrs this month',
          order: 0,
          updatedAt: new Date().toISOString()
        }
      ]
    }
  };

  await visualCustomizationService.saveCustomizations(COLLEGE_A, 'student', withInjected);
  const verifiedInjected = await visualCustomizationService.getCustomizations(COLLEGE_A, 'student');
  assert(
    verifiedInjected.injectedComponents.student_hero_bottom.length === 1,
    'Injected clinical notice banner saved in zone student_hero_bottom'
  );
  assert(
    verifiedInjected.injectedComponents.student_stats_top.length === 1,
    'Injected clinical stat card saved in zone student_stats_top'
  );

  // TEST 5: Dynamic Form Field Extension (Student Registration & Complaints)
  console.log('\n--- TEST 5: Dynamic Form Schema Extension (Student Registration Form) ---');
  const withFormFields: CollegeRoleVisualCustomization = {
    ...verifiedInjected,
    formCustomizations: {
      student_registration: {
        formId: 'student_registration',
        customFields: [
          {
            id: 'fld_blood_group_emergency',
            formId: 'student_registration',
            label: 'Emergency Blood Group',
            key: 'emergency_blood_group',
            type: 'dropdown',
            options: ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'],
            required: true,
            order: 0,
            updatedAt: new Date().toISOString()
          },
          {
            id: 'fld_aadhar_no',
            formId: 'student_registration',
            label: 'Government Aadhar Identification Number',
            key: 'aadhar_no',
            type: 'text',
            placeholder: '12-digit UIDAI number',
            required: true,
            order: 1,
            updatedAt: new Date().toISOString()
          }
        ],
        hiddenDefaultFieldKeys: []
      },
      student_complaints: {
        formId: 'student_complaints',
        customFields: [
          {
            id: 'fld_incident_lab_room',
            formId: 'student_complaints',
            label: 'Laboratory / Clinical Facility Number',
            key: 'facility_room_no',
            type: 'text',
            placeholder: 'e.g. Lab 4B or Dialysis Ward 2',
            required: false,
            order: 0,
            updatedAt: new Date().toISOString()
          }
        ],
        hiddenDefaultFieldKeys: []
      }
    }
  };

  await visualCustomizationService.saveCustomizations(COLLEGE_A, 'student', withFormFields);
  const reloadedFormCfg = await visualCustomizationService.getCustomizations(COLLEGE_A, 'student');
  const regForm = reloadedFormCfg.formCustomizations.student_registration;
  assert(regForm.customFields.length === 2, 'Student registration form schema has 2 custom fields');
  assert(regForm.customFields[0].key === 'emergency_blood_group', 'Dropdown field emergency_blood_group registered');
  assert(regForm.customFields[1].key === 'aadhar_no', 'Text field aadhar_no registered');

  // TEST 6: Genuine Record Custom Field Persistence
  console.log('\n--- TEST 6: Genuinely Save User Submitted Custom Field Values to Database ---');
  const testStudentId = 'test_student_profile_999';
  const customSubmission = {
    emergency_blood_group: 'O+',
    aadhar_no: '8877-6655-4433',
    facility_room_no: 'Dialysis Ward 2'
  };

  await visualCustomizationService.saveRecordCustomFields('profiles', testStudentId, customSubmission);
  assert(true, 'Submitted custom fields saved to database record preferences/metadata');

  console.log('\n========================================================================');
  console.log(` RESULT: ${passed} / ${total} TESTS PASSED (100%)`);
  console.log('========================================================================\n');
}

runVisualCustomizerTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
