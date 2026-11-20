const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) { console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'); process.exit(1); }

async function findJsonbTables() {
  const res = await fetch(`${url}/rest/v1/?apikey=${key}`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const spec = await res.json() as any;

  for (const [table, def] of Object.entries(spec.definitions || {})) {
    const props = (def as any).properties || {};
    const jsonProps = Object.entries(props).filter(([k, v]: any) => v.format === 'jsonb' || v.type === 'object' || v.type === 'array');
    if (jsonProps.length > 0) {
      console.log(`Table ${table} has JSON/JSONB:`, jsonProps.map(([k, v]: any) => `${k} (${v.format || v.type})`).join(', '));
    }
  }
}

findJsonbTables();
