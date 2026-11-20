// DEPRECATED. Replaced by the `admin-api` function (actions list_users, create_user, update_user,
// set_active_status, reset_password, delete_user, ...).
// The previous implementation authorised callers from auth user_metadata.role, which any signed-in
// user can edit (privilege escalation), so it is intentionally disabled rather than patched.
// Safe to delete from the project after deploying admin-api:  supabase functions delete admin-users
import { json, preflight } from "../_shared/http.ts";

Deno.serve((req) => {
  const pre = preflight(req); if (pre) return pre;
  return json(req, 410, { error: "This endpoint has been replaced by admin-api.", code: "GONE" });
});
