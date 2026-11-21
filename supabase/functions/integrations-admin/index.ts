// Admin-only. POST { action: "catalog" | "save" | "test" | "clear", ... } — manages provider keys for payments / e-mail / SMS / WhatsApp.
// Secrets are encrypted with INTEGRATION_ENC_KEY before they touch the database and are NEVER returned to the browser.
//   catalog -> { catalog, items, encryption_ready }
//   save    -> { kind, provider, enabled, public_config:{}, secrets:{} }   (a blank secret keeps the saved value)
//   test    -> { kind, to? }      e-mail goes to the signed-in admin unless `to` is given; SMS/WhatsApp need `to` (a phone number)
//   clear   -> { kind }
import { json, preflight, readJson } from "../_shared/http.ts";
import { authenticate, requireRole, rateLimit, audit } from "../_shared/auth.ts";
import { CATALOG, decryptSecrets, encryptSecrets, encryptionReady, providerDef, validateSave } from "../_shared/integrations.ts";
import { loadChannelConfig, sendEmail, sendSms, sendWhatsApp } from "../_shared/channels.ts";
import { loadGatewayConfig } from "../_shared/gateway.ts";

const env = (k: string) => Deno.env.get(k);
const KINDS = ["payments", "email", "sms", "whatsapp"];

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const { caller, admin } = auth;
  const denied = requireRole(req, caller, ["admin"]); if (denied) return denied;
  const b = await readJson(req, 20_000);
  const action = String(b?.action ?? "");
  const ready = encryptionReady(env);

  if (action === "catalog") {
    const { data } = await admin.from("integration_settings").select("kind, provider, enabled, public_config, secret_keys, updated_at, last_test_at, last_test_ok, last_test_message");
    return json(req, 200, { catalog: CATALOG, items: data ?? [], encryption_ready: ready });
  }
  if (!ready) return json(req, 503, { error: "Set the INTEGRATION_ENC_KEY secret (24+ random characters) on the server first. It encrypts the keys you enter here.", code: "NOT_CONFIGURED" });
  const kind = String(b?.kind ?? "");
  if (!KINDS.includes(kind)) return json(req, 400, { error: "Unknown integration.", code: "VALIDATION_ERROR" });
  const key = env("INTEGRATION_ENC_KEY")!;

  if (action === "save") {
    const provider = String(b?.provider ?? "");
    if (!providerDef(kind, provider)) return json(req, 400, { error: "Choose a provider from the list.", code: "VALIDATION_ERROR" });
    const { data: cur } = await admin.from("integration_settings").select("provider, secret_ciphertext").eq("kind", kind).maybeSingle();
    let existing: Record<string, string> = {};
    if (cur?.provider === provider && cur.secret_ciphertext) { try { existing = await decryptSecrets(cur.secret_ciphertext, key); } catch { existing = {}; } }
    const v = validateSave({ kind, provider, enabled: b?.enabled === true, public_config: b?.public_config ?? {}, secrets: b?.secrets ?? {} }, existing);
    if (!v.ok) return json(req, 400, { error: v.error, code: "VALIDATION_ERROR" });
    const cipher = Object.keys(v.secrets).length ? await encryptSecrets(v.secrets, key) : null;
    const changed = cur?.provider !== provider || JSON.stringify(Object.keys(v.secrets).sort()) !== JSON.stringify(Object.keys(existing).sort()) || Object.keys(v.secrets).some((k) => v.secrets[k] !== existing[k]);
    const { error } = await admin.from("integration_settings").upsert({
      kind, provider, enabled: b?.enabled === true, public_config: v.publicConfig, secret_ciphertext: cipher, secret_keys: Object.keys(v.secrets),
      updated_by: caller.id, updated_at: new Date().toISOString(),
      ...(changed ? { last_test_at: null, last_test_ok: null, last_test_message: null } : {}),
    }, { onConflict: "kind" });
    if (error) { console.error("integration save", error.message); return json(req, 500, { error: "Could not save.", code: "SERVER_ERROR" }); }
    await audit(admin, caller, "integration_saved", "integration_settings", kind, { provider, enabled: b?.enabled === true, secret_fields: Object.keys(v.secrets) });
    return json(req, 200, { success: true });
  }

  if (action === "clear") {
    await admin.from("integration_settings").delete().eq("kind", kind);
    await audit(admin, caller, "integration_cleared", "integration_settings", kind);
    return json(req, 200, { success: true });
  }

  if (action === "test") {
    if (!(await rateLimit(admin, `integ-test:${caller.id}`, 10, 600))) return json(req, 429, { error: "Too many tests. Wait a few minutes.", code: "RATE_LIMITED" });
    const to = String(b?.to ?? "").trim();
    let ok = false, message = "";
    try {
      if (kind === "payments") {
        const cfg = await loadGatewayConfig(admin, env);
        if (!cfg) throw new Error("Save and enable the payment keys first.");
        const res = await fetch("https://api.razorpay.com/v1/orders?count=1", { headers: { Authorization: "Basic " + btoa(`${cfg.keyId}:${cfg.keySecret}`) } });
        if (!res.ok) throw new Error(res.status === 401 ? "The gateway rejected these keys (check the Key ID and secret, and that they are for the same mode)." : `The gateway answered ${res.status}.`);
        message = `Connected as ${cfg.keyId.startsWith("rzp_live") ? "LIVE" : "test"} account.`;
      } else {
        const cfg = await loadChannelConfig(admin, env);
        const { data: inst } = await admin.from("institutional_settings").select("institution_name").limit(1).maybeSingle();
        const name = inst?.institution_name ?? "Your institution";
        if (kind === "email") {
          if (!cfg.email) throw new Error("Save and enable the e-mail settings first.");
          const dest = to || caller.email || "";
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dest)) throw new Error("Give an e-mail address to send the test to.");
          await sendEmail(cfg.email, dest, "Test message", "This is a test message from your ERP. E-mail delivery works.", name);
          message = `Test e-mail sent to ${dest}.`;
        } else {
          if (!/^\+?[0-9]{10,15}$/.test(to.replace(/[\s-]/g, ""))) throw new Error("Give the phone number to send the test to (with country code, e.g. +91…).");
          const num = to.replace(/[\s-]/g, "");
          if (kind === "sms") { if (!cfg.sms) throw new Error("Save and enable the SMS settings first."); await sendSms(cfg.sms, num, `${name}: test message. SMS delivery works.`); }
          else { if (!cfg.whatsapp) throw new Error("Save and enable the WhatsApp settings first."); await sendWhatsApp(cfg.whatsapp, num, `${name}: test message. WhatsApp delivery works.`); }
          message = `Test message sent to ${num}.`;
        }
      }
      ok = true;
    } catch (e) { message = (e as Error).message; }
    await admin.from("integration_settings").update({ last_test_at: new Date().toISOString(), last_test_ok: ok, last_test_message: message.slice(0, 300) }).eq("kind", kind);
    await audit(admin, caller, "integration_tested", "integration_settings", kind, { ok });
    return json(req, 200, { success: ok, message });
  }

  return json(req, 400, { error: "Unknown action.", code: "VALIDATION_ERROR" });
});
