const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) { console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'); process.exit(1); }

async function fetchSchema() {
  const res = await fetch(`${url}/rest/v1/?apikey=${key}`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });

  if (!res.ok) {
    console.error('Failed to fetch OpenAPI spec:', res.status, res.statusText);
    return;
  }

  const spec = await res.json() as any;
  const defs = Object.keys(spec.definitions || {});
  console.log(`Found ${defs.length} definitions in PostgREST schema:`);
  console.log(defs.sort().join(', '));

  // Also check RPCs
  const paths = Object.keys(spec.paths || {}).filter(p => p.startsWith('/rpc/'));
  console.log(`\nFound ${paths.length} RPC paths:`);
  console.log(paths.join(', '));
}

fetchSchema();
