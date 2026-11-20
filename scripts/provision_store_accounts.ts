import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SECRET_KEY || '';
  if (!url || !key) {
    throw new Error('Missing Supabase configuration.');
  }

  const supabase = createClient(url, key);

  // 1. Provision store@1.edu
  const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) throw listErr;

  let storeUser = usersData.users.find((u) => u.email === 'store@1.edu');
  if (!storeUser) {
    const { data: newU, error } = await supabase.auth.admin.createUser({
      email: 'store@1.edu',
      password: 'Password@123',
      email_confirm: true,
      user_metadata: { full_name: 'Campus Store Manager', role: 'store_manager' },
    });
    if (error) throw error;
    storeUser = newU.user;
    console.log('Created auth user store@1.edu:', storeUser.id);
  } else {
    console.log('store@1.edu already exists:', storeUser.id);
  }

  const { error: profErr1 } = await supabase.from('profiles').upsert({
    id: storeUser.id,
    email: 'store@1.edu',
    name: 'Campus Store Manager',
    role: 'store_manager',
    phone: '9876543216',
  });
  if (profErr1) throw profErr1;

  // 2. Provision storekeeper@1.edu
  let keeperUser = usersData.users.find((u) => u.email === 'storekeeper@1.edu');
  if (!keeperUser) {
    const { data: newK, error: kErr } = await supabase.auth.admin.createUser({
      email: 'storekeeper@1.edu',
      password: 'Password@123',
      email_confirm: true,
      user_metadata: { name: 'Campus Storekeeper', role: 'storekeeper' },
    });
    if (kErr) throw kErr;
    keeperUser = newK.user;
    console.log('Created auth user storekeeper@1.edu:', keeperUser.id);
  } else {
    console.log('storekeeper@1.edu already exists:', keeperUser.id);
  }

  const { error: profErr2 } = await supabase.from('profiles').upsert({
    id: keeperUser.id,
    email: 'storekeeper@1.edu',
    name: 'Campus Storekeeper',
    role: 'storekeeper',
    phone: '9876543217',
  });
  if (profErr2) throw profErr2;

  console.log('Store accounts successfully provisioned and verified in profiles table.');
}

main().catch((err) => {
  console.error('Provisioning failed:', err);
  process.exit(1);
});
