// POST { login_id: string, expected_role?: string }  ->  { success, email }
// Public (verify_jwt = false in config.toml): the login screen needs it before sign-in.
// Hardened vs src/server/adminBackend.ts#handleResolveLoginId:
//   - exact (case-insensitive) match on login_id / student_id / roll_number only
//   - no phone/e-mail matching, no auth.users scan, no ilike filter strings
//   - rate limited per IP and per identifier; unknown ids look identical to "no email"
import { json, preflight, readJson, clientIp } from "../_shared/http.ts";
import { serviceClient, rateLimit } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const body = await readJson(req, 4_096);
  const loginId = String(body?.login_id ?? body?.identifier ?? "").trim();
  const expectedRole = body?.expected_role ? String(body.expected_role) : undefined;
  if (loginId.length < 3 || loginId.length > 64) return json(req, 400, { error: "Invalid login id.", code: "VALIDATION_ERROR" });

  const admin = serviceClient();
  const ip = clientIp(req);
  if (!(await rateLimit(admin, `resolve:ip:${ip}`, 30, 60)) ||
      !(await rateLimit(admin, `resolve:id:${loginId.toLowerCase()}`, 10, 60))) {
    return json(req, 429, { error: "Too many attempts. Try again in a minute.", code: "RATE_LIMITED" }, { "Retry-After": "60" });
  }

  const { data: email } = await admin.rpc("resolve_login_id", { p_login_id: loginId });
  if (!email) return json(req, 200, { success: false, email: null });

  if (expectedRole) {
    const { data: p } = await admin.from("profiles").select("role").eq("email", email).maybeSingle();
    if (!p || p.role !== expectedRole) return json(req, 200, { success: false, email: null });
  }
  return json(req, 200, { success: true, email });
});
