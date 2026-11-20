import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Helper to load env vars from .env or .env.local if not already in process.env
function loadLocalEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...rest] = trimmed.split('=');
          const value = rest.join('=').trim().replace(/^["']|["']$/g, '');
          if (key && !process.env[key.trim()]) {
            process.env[key.trim()] = value;
          }
        }
      });
    }
  }
}

loadLocalEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ogbbyqxulhegwvrtinib.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!serviceRoleKey) {
  console.error('\n========================================================================');
  console.error('❌ [SEED ERROR] Missing SUPABASE_SERVICE_ROLE_KEY!');
  console.error('------------------------------------------------------------------------');
  console.error('To run the administrative seed script to provision the 13 auth users');
  console.error('and database tables, provide your Supabase service_role key as follows:');
  console.error('\nIn PowerShell:');
  console.error('  $env:SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"; npx tsx scripts/seed.ts');
  console.error('\nIn Bash:');
  console.error('  SUPABASE_SERVICE_ROLE_KEY="your_service_role_key" npx tsx scripts/seed.ts');
  console.error('========================================================================\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// The 13 Institutional Users as specified in docs/ROLE_MATRIX.md
const USERS_TO_SEED = [
  {
    email: 'admin@adhityan.edu.in',
    password: 'Adhityan@Admin2026!',
    name: 'Dr. R. Adhithyan',
    role: 'admin',
    department: 'Central Administration',
  },
  {
    email: 'principal@adhityan.edu.in',
    password: 'Principal@Adhityan2026!',
    name: 'Dr. K. Sundaram',
    role: 'principal',
    department: 'Academic Affairs',
  },
  {
    email: 'teacher@adhityan.edu.in',
    password: 'Teacher@Adhityan2026!',
    name: 'Prof. Priya Raman',
    role: 'teacher',
    department: 'B.VOC Medical Lab Technology (MLT)',
  },
  {
    email: 'student@adhityan.edu.in',
    password: 'Student@Adhityan2026!',
    name: 'Arun Kumar',
    role: 'student',
    department: 'B.VOC Medical Lab Technology (MLT)',
  },
  {
    email: 'parent@adhityan.edu.in',
    password: 'Parent@Adhityan2026!',
    name: 'G. Kumar',
    role: 'parent',
    department: 'Guardian Portal',
  },
  {
    email: 'financemanager@adhityan.edu.in',
    password: 'Finance@Adhityan2026!',
    name: 'M. Lakshmi',
    role: 'finance_manager',
    department: 'Finance & Accounts',
  },
  {
    email: 'financier@adhityan.edu.in',
    password: 'Financier@Adhityan2026!',
    name: 'S. Ramesh',
    role: 'financier',
    department: 'Fee Collection Desk',
  },
  {
    email: 'accountant@adhityan.edu.in',
    password: 'Accountant@Adhityan2026!',
    name: 'V. Anand',
    role: 'accountant',
    department: 'Ledger & Audit',
  },
  {
    email: 'storemanager@adhityan.edu.in',
    password: 'StoreManager@Adhityan2026!',
    name: 'T. Balan',
    role: 'store_manager',
    department: 'Central Store & Logistics',
  },
  {
    email: 'storekeeper@adhityan.edu.in',
    password: 'StoreKeeper@Adhityan2026!',
    name: 'K. Murugan',
    role: 'storekeeper',
    department: 'Campus Stationery & Scrubs Counter',
  },
  {
    email: 'transportdriver@adhityan.edu.in',
    password: 'Transport@Adhityan2026!',
    name: 'R. Selvam',
    role: 'transport_driver',
    department: 'Fleet & Transit Division',
  },
  {
    email: 'driver@adhityan.edu.in',
    password: 'Driver@Adhityan2026!',
    name: 'P. Muthu',
    role: 'driver',
    department: 'Fleet & Transit Division',
  },
  {
    email: 'receptionist@adhityan.edu.in',
    password: 'Reception@Adhityan2026!',
    name: 'Deepa Nathan',
    role: 'receptionist',
    department: 'Front Desk & Admissions',
  },
];

// The 9 Official College Courses
const OFFICIAL_COURSES = [
  { name: 'B.VOC Medical Lab Technology (MLT)', duration: 3, code: 'BMLT' },
  { name: 'B.VOC Dialysis Technology', duration: 3, code: 'BDT' },
  { name: 'B.VOC Radiology & Medical Imaging Technology', duration: 3, code: 'BRIT' },
  { name: 'B.VOC Cardiac Care Technology', duration: 3, code: 'BCCT' },
  { name: 'B.VOC Operation Theatre Technology', duration: 3, code: 'BOTT' },
  { name: 'B.VOC Hospital Administration (3 Years)', duration: 3, code: 'BHA3' },
  { name: 'Logistics & Supply Chain Management (1 Year)', duration: 1, code: 'LSCM1' },
  { name: 'Hospitality Management (1 Year)', duration: 1, code: 'HM1' },
  { name: 'Hospital Administration (1 Year)', duration: 1, code: 'HA1' },
];

async function seed() {
  console.log('\n🚀 Starting Adhityan College ERP Database Seeding...');
  console.log(`Connecting to: ${supabaseUrl}`);

  // 1. Provision 13 Auth Users & Profiles
  console.log('\n--- 1. Provisioning 13 Institutional Auth Users ---');
  for (const u of USERS_TO_SEED) {
    let userId: string | null = null;

    // Check if user already exists in auth
    const { data: listData } = await supabase.auth.admin.listUsers();
    const existing = listData?.users?.find(x => x.email?.toLowerCase() === u.email.toLowerCase());

    if (existing) {
      console.log(`  ✓ Existing user found: ${u.email} (${u.role})`);
      userId = existing.id;
      // Update password & metadata
      await supabase.auth.admin.updateUserById(userId, {
        password: u.password,
        user_metadata: { name: u.name, role: u.role, department: u.department },
      });
    } else {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: {
          name: u.name,
          role: u.role,
          department: u.department,
        },
      });

      if (createError) {
        console.error(`  ❌ Failed to create user ${u.email}:`, createError.message);
      } else if (newUser.user) {
        userId = newUser.user.id;
        console.log(`  ✨ Created auth user: ${u.email} (${u.role})`);
      }
    }

    // Upsert into profiles table
    if (userId) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        email: u.email,
        name: u.name,
        role: u.role,
        department: u.department,
        status: 'active',
      });
      if (profileError) {
        console.warn(`    ⚠️  Profile upsert note for ${u.email}:`, profileError.message);
      }
    }
  }

  // 2. Seed Official Departments
  console.log('\n--- 2. Seeding 9 Official College Courses (Departments) ---');
  for (const c of OFFICIAL_COURSES) {
    const { error: deptErr } = await supabase.from('departments').upsert(
      {
        name: c.name,
        duration: c.duration,
        code: c.code,
      },
      { onConflict: 'name' }
    );
    if (deptErr) {
      console.warn(`  ⚠️  Dept error (${c.name}):`, deptErr.message);
    } else {
      console.log(`  ✓ Department registered: ${c.name} [${c.code}]`);
    }
  }

  // 3. Seed Campus Store Products
  console.log('\n--- 3. Seeding Campus Store Products ---');
  const storeItems = [
    { name: 'Standard Clinical Lab Coat (White)', price: 650, category: 'Uniforms', stock: 120, description: '100% Cotton embroidered institutional lab coat for clinical and lab sessions.' },
    { name: 'Medical Scrub Suit Set (Hospital Blue)', price: 950, category: 'Uniforms', stock: 80, description: 'Antimicrobial unisex medical scrub suit for operation theatre and hospital rotations.' },
    { name: 'Clinical Stethoscope (Dual Head)', price: 1450, category: 'Medical Kits', stock: 45, description: 'High acoustic sensitivity stethoscope for clinical training and diagnostics.' },
    { name: 'Digital Blood Pressure Monitor', price: 1850, category: 'Medical Kits', stock: 30, description: 'Accurate upper arm automatic BP monitor for practical training.' },
    { name: 'Medical Lab Practical Record Notebook', price: 120, category: 'Stationery', stock: 200, description: '200-page spiral bound ruled record book for laboratory experiments.' },
    { name: 'Scientific Multi-Function Calculator', price: 850, category: 'Electronics', stock: 50, description: 'Approved scientific calculator for medical statistics and bio-physics calculations.' },
  ];

  for (const it of storeItems) {
    await supabase.from('store_products').upsert(it, { onConflict: 'name' });
  }
  console.log(`  ✓ ${storeItems.length} Store items cataloged.`);

  // 4. Seed Transit Fleet Vehicles
  console.log('\n--- 4. Seeding Transit Fleet Vehicles ---');
  const vehicles = [
    { vehicle_number: 'TN-38-BZ-1001', route_name: 'Route 1: Coimbatore Central to Campus', driver_name: 'P. Muthu', status: 'active', current_location: 'Central Bus Stand' },
    { vehicle_number: 'TN-38-BZ-1002', route_name: 'Route 2: Gandhipuram to Campus', driver_name: 'R. Selvam', status: 'active', current_location: 'Gandhipuram Signal' },
    { vehicle_number: 'TN-38-BZ-1003', route_name: 'Route 3: Singanallur to Campus', driver_name: 'S. Velu', status: 'active', current_location: 'Singanallur Checkpost' },
  ];

  for (const v of vehicles) {
    await supabase.from('transport_vehicles').upsert(v, { onConflict: 'vehicle_number' });
  }
  console.log(`  ✓ ${vehicles.length} Transport vehicles registered.`);

  // 5. Seed Library Books
  console.log('\n--- 5. Seeding Medical & Vocational Library Books ---');
  const books = [
    { title: 'Textbook of Medical Laboratory Technology', author: 'Dr. Praful B. Godkar', isbn: '978-9381496190', category: 'MLT', copies_available: 15, total_copies: 20 },
    { title: 'Handbook of Dialysis Therapy', author: 'Allen R. Nissenson', isbn: '978-0323391542', category: 'Dialysis', copies_available: 8, total_copies: 10 },
    { title: 'Clark’s Positioning in Radiography', author: 'A. Stewart Whitley', isbn: '978-1444122350', category: 'Radiology', copies_available: 6, total_copies: 10 },
    { title: 'Principles of Hospital Administration and Planning', author: 'B.M. Sakharkar', isbn: '978-9350250426', category: 'Hospital Admin', copies_available: 12, total_copies: 15 },
  ];

  for (const b of books) {
    await supabase.from('library_books').upsert(b, { onConflict: 'isbn' });
  }
  console.log(`  ✓ ${books.length} Library books cataloged.`);

  console.log('\n========================================================================');
  console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
  console.log('------------------------------------------------------------------------');
  console.log('You can now log in using any of the 13 institutional accounts:');
  USERS_TO_SEED.forEach(u => {
    console.log(`  • Role: ${u.role.padEnd(18)} Email: ${u.email.padEnd(30)} Password: ${u.password}`);
  });
  console.log('========================================================================\n');
}

seed().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});

