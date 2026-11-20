import { createClient } from '@supabase/supabase-js';

try {
  process.loadEnvFile('.env');
} catch (e) {}

const url = process.env.VITE_SUPABASE_URL || 'https://ogbbyqxulhegwvrtinib.supabase.co';
const serviceKey = process.env.SUPABASE_SECRET_KEY || '';
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const adminClient = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testAuth() {
  // 1. Try signing in with common passwords or generate session link
  const anonClient = createClient(url, anonKey);
  
  // Try default seed password first
  let { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
    email: 'admin@gmail.com',
    password: 'AdminPassword123!'
  });

  if (signInError) {
    console.log('Password sign-in failed, creating direct session token via admin API...');
    // Create an auth token / session for admin@gmail.com using admin API
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: 'admin@gmail.com'
    });
    
    if (linkError) {
      console.error('Failed to generate admin link:', linkError);
      return;
    }

    console.log('Admin user found, token generated successfully.');
    // Or set a known password for testing
    const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(
      'ed0ef274-5dd5-4775-accb-97119899cc00',
      { password: 'AdminPassword123!' }
    );
    if (updateError) {
      console.error('Failed to set password:', updateError);
    } else {
      console.log('Set password for admin@gmail.com successfully.');
      const res = await anonClient.auth.signInWithPassword({
        email: 'admin@gmail.com',
        password: 'AdminPassword123!'
      });
      console.log('Signed in as admin:', !!res.data.session, 'User ID:', res.data.user?.id);
    }
  } else {
    console.log('Signed in with password successfully. User ID:', signInData.user?.id);
  }
}

testAuth();
