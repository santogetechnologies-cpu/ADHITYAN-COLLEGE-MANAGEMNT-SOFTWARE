// Deletes every FILE in the project's storage buckets (SQL cannot do this: Supabase blocks direct deletes on storage tables).
// Usage:  SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service key> node supabase/maintenance/empty_storage.mjs
// It lists the buckets itself, removes all files, then removes the buckets (the migrations create them again).
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.'); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });

async function listAll(bucket, prefix = '') {
  const files = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await sb.storage.from(bucket).list(prefix, { limit: 100, offset });
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
    if (!data.length) break;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) files.push(...await listAll(bucket, path));   // a folder
      else files.push(path);
    }
    if (data.length < 100) break;
  }
  return files;
}

const { data: buckets, error } = await sb.storage.listBuckets();
if (error) { console.error('Could not list buckets:', error.message); process.exit(1); }
for (const b of buckets) {
  const files = await listAll(b.id);
  for (let i = 0; i < files.length; i += 100) {
    const { error: e } = await sb.storage.from(b.id).remove(files.slice(i, i + 100));
    if (e) { console.error(`Could not delete files in ${b.id}: ${e.message}`); process.exit(1); }
  }
  const { error: d } = await sb.storage.deleteBucket(b.id);
  console.log(`${b.id}: ${files.length} file(s) deleted${d ? ` (bucket kept: ${d.message})` : ', bucket removed'}`);
}
console.log('Storage is empty.');
