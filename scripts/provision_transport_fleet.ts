import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SECRET_KEY || '';
  if (!url || !key) throw new Error('Missing Supabase configuration.');

  const supabase = createClient(url, key);

  console.log('--- 1. Provisioning Driver Account (driver@1.edu) ---');
  const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) throw listErr;

  let driverUser = usersData.users.find(u => u.email === 'driver@1.edu');
  if (!driverUser) {
    const { data: newU, error } = await supabase.auth.admin.createUser({
      email: 'driver@1.edu',
      password: 'Password@123',
      email_confirm: true,
      user_metadata: { name: 'College Transport Driver', role: 'transport_driver' }
    });
    if (error) throw error;
    driverUser = newU.user;
    console.log('Created auth user driver@1.edu:', driverUser.id);
  } else {
    console.log('driver@1.edu already exists:', driverUser.id);
  }

  const { error: profErr } = await supabase.from('profiles').upsert({
    id: driverUser.id,
    email: 'driver@1.edu',
    name: 'College Transport Driver',
    role: 'transport_driver',
    phone: '9876543218'
  });
  if (profErr) throw profErr;

  console.log('Driver profile successfully verified in profiles table.');

  console.log('--- 2. Standardizing College Fleet Vehicles ---');
  const standardVehicles = [
    {
      id: 'b1111111-1111-1111-1111-111111111111',
      vehicle_number: 'TN-38-AD-1001 (Bus #01)',
      vehicle_type: 'Bus',
      route_name: 'Route 1 - Coimbatore Junction & Cross Cut Road to Campus',
      driver_name: 'College Transport Driver',
      driver_phone: '+91 98765 43218',
      driver_id: driverUser.id,
      capacity: 45,
      occupied_seats: 28,
      status: 'active',
      current_location: 'Gandhipuram Central Bus Bay',
      eta_to_next_stop: '8 mins'
    },
    {
      id: 'b2222222-2222-2222-2222-222222222222',
      vehicle_number: 'TN-38-AD-1002 (Bus #02)',
      vehicle_type: 'Bus',
      route_name: 'Route 2 - Peelamedu, Hope College & SITRA Route',
      driver_name: 'K. Murugan (Senior Fleet Driver)',
      driver_phone: '+91 98765 43219',
      driver_id: null,
      capacity: 50,
      occupied_seats: 34,
      status: 'active',
      current_location: 'Peelamedu Signal',
      eta_to_next_stop: '12 mins'
    },
    {
      id: 'b3333333-3333-3333-3333-333333333333',
      vehicle_number: 'TN-38-AD-1003 (Bus #03)',
      vehicle_type: 'Bus',
      route_name: 'Route 3 - Pollachi, Kinathukadavu & Othakkalmandapam Route',
      driver_name: 'S. Selvam (Fleet Driver)',
      driver_phone: '+91 98765 43220',
      driver_id: null,
      capacity: 45,
      occupied_seats: 0,
      status: 'maintenance',
      current_location: 'Main Depot Workshop',
      eta_to_next_stop: 'In Service'
    }
  ];

  for (const v of standardVehicles) {
    const { error: vErr } = await supabase.from('transport_vehicles').upsert(v);
    if (vErr) throw vErr;
    console.log(`Upserted vehicle: ${v.vehicle_number}`);
  }

  console.log('--- 3. Standardizing Route Stops for Bus #01 ---');
  // Clear legacy stops for Bus 01
  await supabase.from('transport_stops').delete().eq('vehicle_id', 'b1111111-1111-1111-1111-111111111111');

  const standardStops = [
    {
      vehicle_id: 'b1111111-1111-1111-1111-111111111111',
      stop_name: 'Coimbatore Railway Junction',
      scheduled_time: '07:15 AM',
      stop_order: 1,
      status: 'Completed',
      students_count: 8
    },
    {
      vehicle_id: 'b1111111-1111-1111-1111-111111111111',
      stop_name: 'Gandhipuram Central Bus Stand',
      scheduled_time: '07:30 AM',
      stop_order: 2,
      status: 'Completed',
      students_count: 12
    },
    {
      vehicle_id: 'b1111111-1111-1111-1111-111111111111',
      stop_name: 'Lakshmi Mills Junction',
      scheduled_time: '07:45 AM',
      stop_order: 3,
      status: 'Completed',
      students_count: 5
    },
    {
      vehicle_id: 'b1111111-1111-1111-1111-111111111111',
      stop_name: 'Peelamedu Hope College Stop',
      scheduled_time: '08:00 AM',
      stop_order: 4,
      status: 'Current',
      students_count: 3
    },
    {
      vehicle_id: 'b1111111-1111-1111-1111-111111111111',
      stop_name: 'Adithyan Paramedical Campus Bay',
      scheduled_time: '08:25 AM',
      stop_order: 5,
      status: 'Upcoming',
      students_count: 0
    }
  ];

  for (const s of standardStops) {
    const { error: sErr } = await supabase.from('transport_stops').insert(s);
    if (sErr) throw sErr;
    console.log(`Inserted stop: ${s.stop_order}. ${s.stop_name} (${s.scheduled_time})`);
  }

  console.log('--- 4. Standardizing Vehicle Maintenance Records ---');
  await supabase.from('vehicle_maintenance').upsert({
    id: 'dc6d201e-4045-459b-901e-05f9bf20c9d6',
    vehicle_id: 'b1111111-1111-1111-1111-111111111111',
    item: 'Engine Oil & Lubricant Filter Replacement',
    last_change: '2026-10-25',
    next_due: '2026-11-25',
    status: 'good'
  });

  await supabase.from('vehicle_maintenance').upsert({
    id: 'e1111111-1111-1111-1111-111111111111',
    vehicle_id: 'b1111111-1111-1111-1111-111111111111',
    item: 'Brake Linings & Hydraulic Inspection',
    last_change: '2026-10-10',
    next_due: '2026-11-20',
    status: 'good'
  });

  console.log('Transport fleet & route stops successfully standardized!');
}

main().catch(err => {
  console.error('Fleet provisioning failed:', err);
  process.exit(1);
});

