// POST /functions/v1/admin-api   body: { action: string, ...params }
// Single authenticated entry point for operational/admin actions. Replaces the
// dev-only POST /api/admin/users route from src/server/adminVitePlugin.ts.
import { json, preflight, readJson } from "../_shared/http.ts";
import { authenticate } from "../_shared/auth.ts";
import { handleAdminUserOperation } from "../_shared/admin_backend.ts";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const body = await readJson(req, 2_000_000);
  if (!body) return json(req, 400, { error: "Invalid JSON body.", code: "VALIDATION_ERROR" });
  const token = (req.headers.get("Authorization") ?? "").slice(7).trim();
  try {
    const result = await handleAdminUserOperation(auth.caller, body, token);
    return json(req, result.status, result.body);
  } catch (err) {
    console.error("admin-api error", (err as Error)?.message);
    return json(req, 500, { error: "Operation failed.", code: "SERVER_ERROR" });
  }
});
