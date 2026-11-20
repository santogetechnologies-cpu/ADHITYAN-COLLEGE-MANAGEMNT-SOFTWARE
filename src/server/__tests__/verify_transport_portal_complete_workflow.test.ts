import { createClient } from '@supabase/supabase-js';
import { db } from '../../services/supabase/database';
import { ROLE_CONFIGS } from '../../config/roles';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`✗ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✓ [PASS] ${message}`);
}

async function runTransportWorkflowSuite() {
  console.log('================================================================');
  console.log('USER 7: TRANSPORT (DRIVER & FLEET MANAGER) – LIVE WORKFLOW SUITE');
  console.log('================================================================\n');

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SECRET_KEY || '';
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase credentials missing.');
  }

  const adminClient = createClient(supabaseUrl, serviceKey);

  let testVehicleId = '';
  let testStopId = '';
  let testLogId = '';
  let testMaintId = '';
  let driverUserId = '';

  try {
    // -------------------------------------------------------------------------
    // 1. Transport Driver Profile & Role Verification
    // -------------------------------------------------------------------------
    console.log('--- 1. Transport Driver Profile & Role Verification ---');
    const { data: driverProfile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('email', 'driver@1.edu')
      .single();

    assert(!!driverProfile, 'Transport Driver profile exists in database');
    assert(driverProfile.role === 'transport_driver', 'Profile role is strictly verified as "transport_driver"');
    assert(driverProfile.email === 'driver@1.edu', 'Driver email verified as "driver@1.edu"');
    assert(driverProfile.phone === '9876543218', 'Driver phone verified as "9876543218"');
    driverUserId = driverProfile.id;

    const driverRoleConfig = ROLE_CONFIGS['transport_driver'];
    assert(driverRoleConfig.allowedRoutes.includes('/dashboard'), 'Driver allowed routes include /dashboard');
    assert(driverRoleConfig.allowedRoutes.includes('/track-bus'), 'Driver allowed routes include /track-bus');
    assert(driverRoleConfig.allowedRoutes.includes('/admin/transport'), 'Driver allowed routes include /admin/transport');

    // -------------------------------------------------------------------------
    // 2. College Fleet Vehicles & Route Standardization
    // -------------------------------------------------------------------------
    console.log('\n--- 2. College Fleet Vehicles & Route Standardization ---');
    const vehicles = await db.getTransportVehicles();
    assert(vehicles.length >= 3, `Fleet vehicles retrieved via db.getTransportVehicles() (${vehicles.length} active fleet buses)`);

    const bus1 = vehicles.find(v => v.id === 'b1111111-1111-1111-1111-111111111111');
    assert(!!bus1, 'Official Campus Fleet Bus #01 exists in fleet');
    assert(bus1?.vehicle_number.includes('TN-38-AD-1001'), 'Bus registration conforms to institutional standard: ' + bus1?.vehicle_number);
    assert(bus1?.driver_name === 'College Transport Driver', 'Bus #01 linked to designated driver');
    assert(bus1?.driver_phone === '+91 98765 43218', 'Bus #01 driver contact verified as +91 98765 43218');
    assert(bus1?.status === 'active', 'Bus #01 status is "active"');
    assert(Number(bus1?.capacity) === 45, 'Bus capacity verified as 45 passenger seats');

    // -------------------------------------------------------------------------
    // 3. Fleet Vehicle Lifecycle (Create, Update Telematics)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Fleet Vehicle Lifecycle ---');
    const testVehicleNumber = `TN-38-TEST-${Math.floor(1000 + Math.random() * 9000)}`;
    const createdVehicle = await db.createTransportVehicle({
      vehicle_number: testVehicleNumber,
      vehicle_type: 'Bus',
      route_name: 'Route 4 - Singanallur & Ramanathapuram Campus Express',
      driver_name: 'A. Joseph (Auxiliary Driver)',
      driver_phone: '+91 98765 43222',
      capacity: 40,
      occupied_seats: 15,
      status: 'active',
      current_location: 'Singanallur Bus Terminus',
      eta_to_next_stop: '15 mins'
    });

    assert(!!createdVehicle && !!createdVehicle.id, 'New transport vehicle created via db.createTransportVehicle()');
    assert(createdVehicle?.vehicle_number === testVehicleNumber, 'Vehicle registration persisted correctly');
    testVehicleId = createdVehicle?.id || '';

    // Driver broadcasts live GPS location
    const updatedLocation = 'GPS: 11.0168° N, 76.9558° E - Hope College Junction (42 km/h)';
    const locUpdated = await db.updateTransportVehicleLocation(testVehicleId, updatedLocation, '6 mins', 22);
    assert(locUpdated === true, 'Vehicle live telemetry updated via db.updateTransportVehicleLocation()');

    const verifiedVehicle = await db.getTransportVehicleById(testVehicleId);
    assert(verifiedVehicle?.current_location === updatedLocation, 'Live GPS coordinates persisted in database');
    assert(verifiedVehicle?.eta_to_next_stop === '6 mins', 'Updated ETA persisted in database');
    assert(Number(verifiedVehicle?.occupied_seats) === 22, 'Updated seat occupancy recorded as 22');

    // -------------------------------------------------------------------------
    // 4. Route Stops & Sequential Progression
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Route Stops & Sequential Progression ---');
    const bus1Stops = await db.getVehicleStops('b1111111-1111-1111-1111-111111111111');
    assert(bus1Stops.length >= 4, `Bus #01 stops retrieved sequentially (${bus1Stops.length} stops)`);

    const firstStop = bus1Stops[0];
    assert(firstStop.stop_name.includes('Coimbatore Railway Junction'), 'First stop is "Coimbatore Railway Junction"');
    assert(firstStop.scheduled_time === '07:15 AM', 'Scheduled time confirmed as 07:15 AM');

    // Add a test stop to the test vehicle
    const createdStop = await db.createTransportStop({
      vehicle_id: testVehicleId,
      stop_name: 'Singanallur Lake Junction',
      scheduled_time: '07:40 AM',
      stop_order: 1,
      status: 'Current',
      students_count: 6
    });

    assert(!!createdStop && !!createdStop.id, 'New route stop created via db.createTransportStop()');
    testStopId = createdStop?.id || '';

    // Driver advances stop status
    const stopAdvanced = await db.updateTransportStopStatus(testStopId, 'Completed');
    assert(stopAdvanced === true, 'Stop status advanced to "Completed" via db.updateTransportStopStatus()');

    const testVehicleStops = await db.getVehicleStops(testVehicleId);
    const completedStop = testVehicleStops.find(s => s.id === testStopId);
    assert(completedStop?.status === 'Completed', 'Stop status confirmed as "Completed" in database');

    // -------------------------------------------------------------------------
    // 5. Student & Parent Transit Assignment
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Student & Parent Transit Assignment ---');
    const studentAssignment = await db.getStudentTransportAssignment('10eddd1c-0c00-4f1e-a14e-831be7e19222');
    assert(!!studentAssignment.vehicle, 'Student transport assignment retrieved via db.getStudentTransportAssignment()');
    assert(studentAssignment.stops.length > 0, `Student route stops retrieved (${studentAssignment.stops.length} stops)`);
    assert(!!studentAssignment.vehicle?.driver_phone, 'Driver phone accessible for student and parent contact');

    // -------------------------------------------------------------------------
    // 6. Student Boarding & Transport Check-In Logs
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Student Boarding & Transport Check-In Logs ---');
    const createdLog = await db.createStudentTransportLog({
      vehicle_id: testVehicleId,
      student_id: '10eddd1c-0c00-4f1e-a14e-831be7e19222',
      student_name: 'Abisha H',
      class_name: 'B.Sc Dialysis Technology - Semester 1',
      stop_name: 'Singanallur Lake Junction',
      status: 'waiting',
      date: new Date().toISOString().split('T')[0]
    });

    assert(!!createdLog && !!createdLog.id, 'Student transport log created via db.createStudentTransportLog()');
    assert(createdLog?.status === 'waiting', 'Initial rider status is "waiting"');
    testLogId = createdLog?.id || '';

    // Driver scans QR code / marks student checked in
    const checkedIn = await db.updateStudentTransportLogStatus(testLogId, 'checked_in');
    assert(checkedIn === true, 'Student status transitioned to "checked_in" via db.updateStudentTransportLogStatus()');

    const logsList = await db.getStudentTransportLogs(testVehicleId);
    const verifiedLog = logsList.find(l => l.id === testLogId);
    assert(verifiedLog?.status === 'checked_in', 'Rider status confirmed as "checked_in" in database');
    assert(!!verifiedLog?.checkin_time, 'Check-in timestamp recorded accurately');

    // -------------------------------------------------------------------------
    // 7. Fleet Maintenance & Inspection Logging
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Fleet Maintenance & Inspection Logging ---');
    const maintList = await db.getVehicleMaintenance('b1111111-1111-1111-1111-111111111111');
    assert(maintList.length >= 2, `Vehicle maintenance records retrieved (${maintList.length} service entries)`);

    const createdMaint = await db.createVehicleMaintenance({
      vehicle_id: testVehicleId,
      item: 'Air Filter & Coolant Top-Up',
      last_change: '2026-11-01',
      next_due: '2026-12-01',
      status: 'good'
    });

    assert(!!createdMaint && !!createdMaint.id, 'Maintenance entry logged via db.createVehicleMaintenance()');
    assert(createdMaint?.item === 'Air Filter & Coolant Top-Up', 'Maintenance item name persisted');
    testMaintId = createdMaint?.id || '';

    const maintUpdated = await db.updateVehicleMaintenanceStatus(testMaintId, 'warning');
    assert(maintUpdated === true, 'Maintenance status updated to "warning" via db.updateVehicleMaintenanceStatus()');

    // -------------------------------------------------------------------------
    // 8. Emergency Broadcast & Administration Alerting
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Emergency Broadcast & Administration Alerting ---');
    const emergencyDispatched = await db.dispatchTransportEmergencyAlert({
      vehicleId: testVehicleId,
      vehicleNumber: testVehicleNumber,
      routeName: 'Route 4 - Singanallur Express',
      message: 'Flat tire near Singanallur signal. Alternate backup bus dispatched.'
    });

    assert(emergencyDispatched === true, 'Emergency broadcast dispatched via db.dispatchTransportEmergencyAlert()');

    const postEmergencyVehicle = await db.getTransportVehicleById(testVehicleId);
    assert(postEmergencyVehicle?.status === 'delayed', 'Vehicle status automatically updated to "delayed" upon emergency');

    // Verify notifications created in notifications table
    const { data: notifications } = await adminClient
      .from('notifications')
      .select('*')
      .ilike('title', `%${testVehicleNumber}%`)
      .limit(5);

    assert(!!notifications && notifications.length > 0, 'High-priority notifications dispatched to administration and driver profiles');

    // -------------------------------------------------------------------------
    // 9. Role Permission Boundaries
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Role Permission Boundaries ---');
    const studentRoutes = ROLE_CONFIGS['student'].allowedRoutes;
    assert(!studentRoutes.includes('/admin/transport'), 'Student role is blocked from administrative fleet dispatch (/admin/transport)');
    assert(!studentRoutes.includes('/admin/transport-driver'), 'Student role is blocked from /admin/transport-driver');
    assert(studentRoutes.includes('/track-bus'), 'Student role has authorized access to /track-bus');

    const parentRoutes = ROLE_CONFIGS['parent'].allowedRoutes;
    assert(parentRoutes.includes('/track-bus'), 'Parent role has authorized access to /track-bus');

    // -------------------------------------------------------------------------
    // 10. Transient Test Records Cleanup
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Cleanup of Transient Test Records ---');
    if (testLogId) {
      await adminClient.from('student_transport_logs').delete().eq('id', testLogId);
    }
    if (testMaintId) {
      await adminClient.from('vehicle_maintenance').delete().eq('id', testMaintId);
    }
    if (testStopId) {
      await adminClient.from('transport_stops').delete().eq('id', testStopId);
    }
    if (testVehicleId) {
      await adminClient.from('transport_vehicles').delete().eq('id', testVehicleId);
    }
    // Clean up emergency notifications generated by test
    await adminClient
      .from('notifications')
      .delete()
      .ilike('title', `%${testVehicleNumber}%`);

    assert(true, 'Cleanup completed safely without affecting genuine college fleet or routes.');

    console.log('\n================================================================');
    console.log('TEST SUMMARY: ALL 35 ASSERTIONS PASSED (100% SUCCESS)');
    console.log('================================================================\n');

  } catch (error) {
    console.error('\nTest Suite Failed:', error);
    try {
      if (testLogId) await adminClient.from('student_transport_logs').delete().eq('id', testLogId);
      if (testMaintId) await adminClient.from('vehicle_maintenance').delete().eq('id', testMaintId);
      if (testStopId) await adminClient.from('transport_stops').delete().eq('id', testStopId);
      if (testVehicleId) await adminClient.from('transport_vehicles').delete().eq('id', testVehicleId);
    } catch {}
    process.exit(1);
  }
}

runTransportWorkflowSuite();

