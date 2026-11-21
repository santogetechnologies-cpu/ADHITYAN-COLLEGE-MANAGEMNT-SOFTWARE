// POST { email, password, name, role, department?, class_name?, phone? } -> { success, user }
// Admin-only account creation.
// Fixed vs previous version: the caller was recognised as admin from auth user_metadata.role,
// which every signed-in user can edit for themselves => anyone could create admin accounts.
// Now the role comes from public.profiles via _shared/auth.ts, the new role is validated against
// the known role list, and the auth user is rolled back if the profile write fails.
import { json, preflight, readJson } from "../_shared/http.ts";
import { authenticate, requireRole, KNOWN_ROLES, audit } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const denied = requireRole(req, auth.caller, ["admin"]);
  if (denied) return denied;

  const body = await readJson(req, 16_384);
  if (!body) return json(req, 400, { error: "Invalid JSON body.", code: "VALIDATION_ERROR" });
  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim();
  const role = String(body.role ?? "");
  const password = String(body.password ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !name || name.length > 200) {
    return json(req, 400, { error: "A valid email and name are required.", code: "VALIDATION_ERROR" });
  }
  if (!(KNOWN_ROLES as readonly string[]).includes(role)) {
    return json(req, 400, { error: "Unknown role.", code: "VALIDATION_ERROR" });
  }
  if (password.length < 8 || password.length > 72) {
    return json(req, 400, { error: "Password must be 8-72 characters.", code: "WEAK_PASSWORD" });
  }

  const admin = auth.admin;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { name },                 // display only; never used for authorisation
    app_metadata: { role, erp_provisioned: true },   // not user-editable; the flag tells the sign-up trigger this account is already provisioned
  });
  if (createErr || !created?.user) {
    return json(req, 400, { error: createErr?.message ?? "Could not create user.", code: "CREATE_USER_FAILED" });
  }
  const id = created.user.id;
  const { error: profErr } = await admin.from("profiles").upsert({
    id, email, name, role,
    department: body.department ?? null, class_name: body.class_name ?? null, phone: body.phone ?? null,
    status: "active", updated_at: new Date().toISOString(),
  });
  if (profErr) {
    await admin.auth.admin.deleteUser(id);   // no orphan auth user without a profile
    return json(req, 500, { error: "Profile creation failed; account rolled back.", code: "PROFILE_ERROR" });
  }
  await audit(admin, auth.caller, "create_user", "profiles", id, { role, email });
  return json(req, 200, { success: true, user: { id, email, name, role, department: body.department ?? null } });
});
