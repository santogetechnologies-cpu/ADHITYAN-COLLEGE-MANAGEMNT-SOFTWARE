// Trusted caller identification for edge functions.
//
// SECURITY: the caller's role is read from public.profiles (writable only by
// server-side code / admins, protected by the protect_profile_sensitive_columns
// trigger from migration 031). It is NEVER read from auth.users.user_metadata,
// which any signed-in user can edit about themselves
// (supabase.auth.updateUser({ data: { role: 'admin' } })).
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { json } from "./http.ts";

/** Roles that exist in the single-institution deployment. Anything else fails closed. */
export const KNOWN_ROLES = [
  "admin", "principal", "hod", "coe", "naac_coordinator", "teacher", "student", "parent",
  "finance_manager", "accountant", "financier", "receptionist", "store_manager", "storekeeper",
  "transport_driver", "driver", "hr_manager", "librarian", "hostel_warden", "placement_officer",
] as const;
export type Role = typeof KNOWN_ROLES[number];

export interface Caller {
  id: string;
  email?: string;
  role: Role;
  name?: string;
}

export function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
  if (!url || !key) throw new Error("Server misconfigured: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export type AuthResult = { ok: true; caller: Caller; admin: SupabaseClient } | { ok: false; response: Response };

export async function authenticate(req: Request): Promise<AuthResult> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return { ok: false, response: json(req, 401, { error: "Missing authorization token.", code: "UNAUTHORIZED" }) };
  }
  const admin = serviceClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) {
    return { ok: false, response: json(req, 401, { error: "Invalid or expired session.", code: "SESSION_EXPIRED" }) };
  }
  const { data: profile } = await admin
    .from("profiles").select("id, role, status, email, name").eq("id", user.id).maybeSingle();
  if (!profile || !profile.role) {
    return { ok: false, response: json(req, 403, { error: "No institutional profile for this account.", code: "NO_PROFILE" }) };
  }
  if ((profile.status ?? "active") !== "active") {
    return { ok: false, response: json(req, 403, { error: "Account is not active.", code: "ACCOUNT_INACTIVE" }) };
  }
  if (!(KNOWN_ROLES as readonly string[]).includes(profile.role)) {
    return { ok: false, response: json(req, 403, { error: "Unrecognised role.", code: "UNKNOWN_ROLE" }) };
  }
  return {
    ok: true, admin,
    caller: { id: user.id, email: profile.email ?? user.email ?? undefined, role: profile.role as Role, name: profile.name ?? undefined },
  };
}

export function requireRole(req: Request, caller: Caller, allowed: readonly string[]): Response | null {
  return allowed.includes(caller.role)
    ? null
    : json(req, 403, { error: "Access denied for your role.", code: "FORBIDDEN" });
}

/** TRUE = allowed. Fails CLOSED if the limiter itself errors. */
export async function rateLimit(admin: SupabaseClient, key: string, max: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await admin.rpc("check_rate_limit", { p_key: key, p_max: max, p_window_seconds: windowSeconds });
  if (error) return false;
  return data === true;
}

/** Best-effort audit trail; never throws. */
export async function audit(admin: SupabaseClient, caller: Caller | null, action: string, entity: string, entityId?: string, extra?: Record<string, unknown>) {
  try {
    await admin.from("audit_logs").insert({
      user_id: caller?.id ?? null, user_email: caller?.email ?? null, user_role: caller?.role ?? null,
      action, entity_type: entity, entity_id: entityId ?? null, new_values: extra ?? null,
    });
  } catch { /* audit must never break the request */ }
}
