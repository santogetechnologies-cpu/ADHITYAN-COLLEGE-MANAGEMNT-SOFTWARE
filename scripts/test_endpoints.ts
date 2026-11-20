const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) { console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'); process.exit(1); }

async function testEndpoints() {
  const endpoints = [
    '/pg/query',
    '/sql',
    '/rest/v1/rpc/execute_sql',
    '/rest/v1/rpc/exec',
    '/storage/v1/bucket',
    '/auth/v1/admin/users'
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${url}${ep}`, {
        method: ep.includes('query') || ep.includes('sql') ? 'POST' : 'GET',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: ep.includes('query') || ep.includes('sql') ? JSON.stringify({ query: 'SELECT 1;' }) : undefined
      });
      console.log(`Endpoint ${ep}:`, res.status, res.statusText);
    } catch (e: any) {
      console.log(`Endpoint ${ep} error:`, e.message);
    }
  }
}

testEndpoints();
