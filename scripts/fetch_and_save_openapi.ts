import fs from 'fs';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) { console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'); process.exit(1); }

async function fetchAndSave() {
  const res = await fetch(`${url}/rest/v1/?apikey=${key}`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  if (!res.ok) {
    console.error('Failed to fetch:', res.status);
    return;
  }
  const spec = await res.json() as any;
  fs.writeFileSync('scripts/openapi.json', JSON.stringify(spec, null, 2));
  console.log('Saved openapi.json with', Object.keys(spec.definitions || {}).length, 'definitions.');

  const defs = spec.definitions || {};
  const tablesWithTenantCol: { table: string; col: string }[] = [];
  for (const t of Object.keys(defs)) {
    const props = defs[t]?.properties || {};
    for (const c of ['college_id', 'institution_id', 'tenant_id', 'college_code']) {
      if (props[c]) {
        tablesWithTenantCol.push({ table: t, col: c });
      }
    }
  }
  console.log('Tables with tenant columns:', tablesWithTenantCol);
}

fetchAndSave();
