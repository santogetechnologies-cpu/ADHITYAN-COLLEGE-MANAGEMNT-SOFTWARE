// First-time activation for student / parent accounts that an administrator provisioned.
//   { step: "challenge", identifier }                 -> e-mails a 6-digit OTP to the REGISTERED address
//   { step: "complete",  identifier, code, new_password } -> verifies OTP, sets the password
//
// Replaces handleFirstLoginChallenge / handleCompleteFirstLogin, which (a) returned the
// verification code in the HTTP response, (b) never checked that the account was still in
// first-login state or that it was a student/parent (so ANY account, admin included, could
// be taken over by anyone who knew its id/phone/e-mail), (c) used Math.random, and
// (d) built PostgREST .or() filters from raw user input.
//
// The OTP is generated, delivered and validated by Supabase Auth (signInWithOtp / verifyOtp),
// so no code is stored or logged by us. REQUIRES: SMTP configured in the Supabase project
// (Auth > SMTP) and the "Magic Link"/OTP e-mail template containing {{ .Token }}.
import { createClient } from "npm:@supabase/supabase-js@2";
import { json, preflight, readJson, clientIp } from "../_shared/http.ts";
import { serviceClient, rateLimit } from "../_shared/auth.ts";

const ACTIVATABLE_ROLES = ["student", "parent"];
const GENERIC = { success: true, message: "If the account is eligible, a verification code has been e-mailed to the registered address." };

function mask(email: string): string {
  return email.replace(/^(.)(.*)(@.*)$/, (_m, a, b, c) => a + "*".repeat(Math.max(2, b.length)) + c);
}

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const body = await readJson(req, 8_192);
  if (!body) return json(req, 400, { error: "Invalid request.", code: "VALIDATION_ERROR" });
  const step = String(body.step ?? (body.code ? "complete" : "challenge"));
  const identifier = String(body.identifier ?? "").trim();
  if (identifier.length < 3 || identifier.length > 64) return json(req, 400, { error: "Invalid identifier.", code: "VALIDATION_ERROR" });

  const admin = serviceClient();
  const ip = clientIp(req);
  if (!(await rateLimit(admin, `fl:ip:${ip}`, 20, 600)) ||
      !(await rateLimit(admin, `fl:id:${identifier.toLowerCase()}`, 6, 600))) {
    return json(req, 429, { error: "Too many attempts. Try again later.", code: "RATE_LIMITED" }, { "Retry-After": "600" });
  }

  const { data: email } = await admin.rpc("resolve_login_id", { p_login_id: identifier });
  const { data: profile } = email
    ? await admin.from("profiles").select("id, email, role, status, is_first_login, preferences").eq("email", email).maybeSingle()
    : { data: null };
  const eligible = !!profile && ACTIVATABLE_ROLES.includes(profile.role) && (profile.is_first_login === true || profile.preferences?.is_first_login === true) &&
    (profile.status ?? "active") === "active";

  if (step === "challenge") {
    if (eligible) {
      const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
      await anon.auth.signInWithOtp({ email: profile!.email, options: { shouldCreateUser: false } });
    }
    // Same answer whether or not the account exists / is eligible (no enumeration).
    return json(req, 200, { ...GENERIC, masked_email: eligible ? mask(profile!.email) : undefined, delivery: "email" });
  }

  if (step === "complete") {
    const code = String(body.code ?? "").trim();
    const newPassword = String(body.new_password ?? "");
    if (!/^\d{6,8}$/.test(code)) return json(req, 400, { error: "Invalid verification code.", code: "INVALID_CODE" });
    if (newPassword.length < 8 || newPassword.length > 72 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return json(req, 400, { error: "Password must be 8-72 characters and contain letters and numbers.", code: "WEAK_PASSWORD" });
    }
    if (!eligible) return json(req, 400, { error: "Invalid or expired verification code.", code: "INVALID_CODE" });

    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
    const { data: v, error: vErr } = await anon.auth.verifyOtp({ email: profile!.email, token: code, type: "email" });
    if (vErr || !v?.user || v.user.id !== profile!.id) {
      return json(req, 400, { error: "Invalid or expired verification code.", code: "INVALID_CODE" });
    }
    const { error: pErr } = await admin.auth.admin.updateUserById(profile!.id, { password: newPassword });
    if (pErr) return json(req, 500, { error: "Could not set the password.", code: "PASSWORD_UPDATE_FAILED" });
    await admin.from("profiles").update({
      is_first_login: false, requires_password_change: false,
      preferences: { ...(profile!.preferences ?? {}), is_first_login: false, first_login_completed: true },
    }).eq("id", profile!.id);
    await admin.from("audit_logs").insert({ user_id: profile!.id, user_email: profile!.email, user_role: profile!.role,
      action: "first_login_completed", entity_type: "profiles", entity_id: profile!.id }).then(() => {}, () => {});
    return json(req, 200, { success: true, message: "Password set. You can now sign in.", email: profile!.email, role: profile!.role });
  }
  return json(req, 400, { error: "Unknown step.", code: "VALIDATION_ERROR" });
});
