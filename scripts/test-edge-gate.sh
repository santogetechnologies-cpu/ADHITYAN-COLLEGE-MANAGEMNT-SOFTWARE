#!/usr/bin/env bash
# Type-checks the edge functions against real supabase-js types and runs the admin-api authorization-gate tests.
# Needs node + npm + network. Deno is NOT required. Usage: scripts/test-edge-gate.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
W="$(mktemp -d)"; trap 'rm -rf "$W"' EXIT
cd "$W" && npm init -y >/dev/null && npm i @supabase/supabase-js@2 typescript >/dev/null 2>&1
mkdir fn && cp -r "$ROOT"/supabase/functions/{_shared,admin-api,admin-create-user,auth-resolve-login-id,auth-first-login,payments-create-order,payments-verify,payments-webhook,notifications-dispatch,integrations-admin,payments-refund} fn/
cat > fn/deno.d.ts <<'D'
declare const Deno: { env: { get(k: string): string | undefined }; serve(h: (r: Request) => Response | Promise<Response>): void };
D
find fn -name '*.ts' ! -name deno.d.ts | xargs sed -i -E 's#"npm:@supabase/supabase-js@2"#"@supabase/supabase-js"#; s#from "(\.{1,2}/[^"]+)\.ts"#from "\1"#'
cat > tsconfig.json <<'D'
{ "compilerOptions": { "target":"ES2022","module":"ESNext","moduleResolution":"Bundler","strict":true,"noEmit":true,"skipLibCheck":true,"lib":["ES2022","DOM"],"noImplicitAny":false,"types":[] }, "include":["fn/**/*.ts"] }
D
echo "== type-check"; npx tsc -p tsconfig.json
echo "== authorization gate"
find fn -name '*.ts' ! -name deno.d.ts | xargs sed -i -E 's#from "(\.{1,2}/[^"]+)"#from "\1.js"#; s#\.js\.js#.js#g'
echo '{"type":"commonjs"}' > fn/package.json
cat > tsconfig.cjs.json <<'D'
{ "compilerOptions": { "target":"ES2022","module":"node16","moduleResolution":"node16","strict":false,"outDir":"out","rootDir":"fn","skipLibCheck":true,"lib":["ES2022","DOM"],"types":[] }, "include":["fn/_shared/*.ts","fn/deno.d.ts"] }
D
npx tsc -p tsconfig.cjs.json
cp "$ROOT/supabase/tests/admin_api_gate.test.cjs" . && node admin_api_gate.test.cjs ./out/_shared/admin_backend.js
cp "$ROOT/supabase/tests/gateway_signature.test.cjs" . && node gateway_signature.test.cjs ./out/_shared/gateway.js
cp "$ROOT/supabase/tests/channels.test.cjs" . && node channels.test.cjs ./out/_shared
(cd "$ROOT" && node scripts/check-provisioning-flag.cjs)
