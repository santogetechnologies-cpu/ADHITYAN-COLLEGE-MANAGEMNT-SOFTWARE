import { supabase } from '../src/lib/supabase';

async function testAuditLogs() {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('action', 'publish_configuration')
    .order('created_at', { ascending: false });

  console.log('Releases in audit_logs count:', data?.length, 'Error:', error);
  if (data && data.length > 0) {
    console.log('First release row:', data[0]);
  }
}

testAuditLogs();
