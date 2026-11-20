const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) { console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'); process.exit(1); }

async function checkLearningContent() {
  const res = await fetch(`${url}/rest/v1/?apikey=${key}`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const spec = await res.json() as any;
  console.log('learning_content properties:');
  console.log(spec.definitions?.learning_content?.properties);
}

checkLearningContent();
