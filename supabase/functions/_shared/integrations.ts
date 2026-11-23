// Provider catalogue, encrypted secret storage and config loading for payments / e-mail / SMS / WhatsApp.
// Secrets are AES-GCM encrypted with a key derived from the INTEGRATION_ENC_KEY edge-function secret, so a database leak alone exposes nothing.
// Config precedence everywhere: UI-saved (enabled) settings first, then the legacy environment variables.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type Kind = "payments" | "email" | "sms" | "whatsapp";
export interface Field { key: string; label: string; required: boolean; help?: string; type?: "text" | "email" | "tel" | "number" }
export interface ProviderDef { id: string; label: string; docs?: string; publicFields: Field[]; secretFields: Field[] }

export const CATALOG: Record<Kind, { label: string; help: string; providers: ProviderDef[] }> = {
  payments: {
    label: "Online payments", help: "Lets students and parents pay fees and store orders online. Also switch it on under Finance → Payment settings.",
    providers: [{
      id: "razorpay", label: "Razorpay", docs: "https://dashboard.razorpay.com/app/keys",
      publicFields: [{ key: "key_id", label: "Key ID", required: true, help: "Starts with rzp_test_ or rzp_live_" }],
      secretFields: [
        { key: "key_secret", label: "Key secret", required: true },
        { key: "webhook_secret", label: "Webhook secret", required: false, help: "Needed so payments are recorded even if the student closes the browser. Set the same secret on the webhook in the Razorpay dashboard." },
      ],
    }],
  },
  email: {
    label: "E-mail", help: "Sends notices, reminders and receipts by e-mail.",
    providers: [
      { id: "resend", label: "Resend", docs: "https://resend.com/api-keys", publicFields: [{ key: "from", label: "Sender address", required: true, type: "email", help: "Must be on a domain verified with the provider" }, { key: "from_name", label: "Sender name", required: false }], secretFields: [{ key: "api_key", label: "API key", required: true }] },
      { id: "sendgrid", label: "SendGrid", docs: "https://app.sendgrid.com/settings/api_keys", publicFields: [{ key: "from", label: "Sender address", required: true, type: "email" }, { key: "from_name", label: "Sender name", required: false }], secretFields: [{ key: "api_key", label: "API key", required: true }] },
      { id: "brevo", label: "Brevo (Sendinblue)", docs: "https://app.brevo.com/settings/keys/api", publicFields: [{ key: "from", label: "Sender address", required: true, type: "email" }, { key: "from_name", label: "Sender name", required: false }], secretFields: [{ key: "api_key", label: "API key", required: true }] },
    ],
  },
  sms: {
    label: "SMS", help: "Texts urgent alerts. Indian numbers need DLT-registered sender and templates with most carriers.",
    providers: [{ id: "twilio", label: "Twilio", docs: "https://console.twilio.com", publicFields: [{ key: "account_sid", label: "Account SID", required: true }, { key: "from", label: "From number or sender ID", required: true, type: "tel" }], secretFields: [{ key: "auth_token", label: "Auth token", required: true }] }],
  },
  whatsapp: {
    label: "WhatsApp", help: "Sends urgent alerts on WhatsApp to people who switched it on. Business-initiated messages usually need an approved template.",
    providers: [
      { id: "twilio_whatsapp", label: "Twilio WhatsApp", docs: "https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders", publicFields: [{ key: "account_sid", label: "Account SID", required: true }, { key: "from", label: "WhatsApp sender number", required: true, type: "tel", help: "e.g. +14155238886 (sandbox) or your approved number" }], secretFields: [{ key: "auth_token", label: "Auth token", required: true }] },
      { id: "meta_whatsapp", label: "WhatsApp Cloud API (Meta)", docs: "https://developers.facebook.com/docs/whatsapp/cloud-api", publicFields: [{ key: "phone_number_id", label: "Phone number ID", required: true }, { key: "template_name", label: "Template name", required: false, help: "Approved template with one body variable. Leave empty to send plain text (works only inside the 24-hour reply window)." }, { key: "language", label: "Template language", required: false, help: "e.g. en or en_US" }], secretFields: [{ key: "access_token", label: "Permanent access token", required: true }] },
    ],
  },
};

export function providerDef(kind: string, provider: string): ProviderDef | null {
  const k = CATALOG[kind as Kind]; return k?.providers.find((p) => p.id === provider) ?? null;
}

// ---------- encryption ----------
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function aesKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode("erp-integrations:" + secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}
export function encryptionReady(env: (k: string) => string | undefined): boolean { return (env("INTEGRATION_ENC_KEY") ?? "").length >= 24; }

export async function encryptSecrets(secrets: Record<string, string>, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(secret), enc.encode(JSON.stringify(secrets))));
  const out = new Uint8Array(iv.length + ct.length); out.set(iv); out.set(ct, iv.length);
  return "v1:" + b64(out);
}
export async function decryptSecrets(cipher: string, secret: string): Promise<Record<string, string>> {
  if (!cipher.startsWith("v1:")) throw new Error("Unknown secret format.");
  const raw = unb64(cipher.slice(3));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.slice(0, 12) }, await aesKey(secret), raw.slice(12));
  return JSON.parse(dec.decode(pt));
}

// ---------- validation of a save request ----------
export interface SaveInput { kind: string; provider: string; enabled: boolean; public_config: Record<string, unknown>; secrets: Record<string, unknown> }
export type SaveResult = { ok: true; publicConfig: Record<string, string>; secrets: Record<string, string> } | { ok: false; error: string }
export function validateSave(input: SaveInput, existingSecrets: Record<string, string>): SaveResult {
  const def = providerDef(input.kind, input.provider);
  if (!def) return { ok: false, error: "Unknown provider." };
  const publicConfig: Record<string, string> = {};
  for (const f of def.publicFields) {
    const v = String(input.public_config?.[f.key] ?? "").trim();
    if (v.length > 200) return { ok: false, error: `${f.label} is too long.` };
    if (f.type === "email" && v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return { ok: false, error: `${f.label} is not a valid e-mail address.` };
    if (v) publicConfig[f.key] = v;
  }
  const secrets: Record<string, string> = {};
  for (const f of def.secretFields) {
    const given = String(input.secrets?.[f.key] ?? "").trim();   // blank = keep what is saved
    if (given.length > 500) return { ok: false, error: `${f.label} is too long.` };
    const v = given || existingSecrets[f.key] || "";
    if (v) secrets[f.key] = v;
  }
  if (input.enabled) {
    for (const f of [...def.publicFields, ...def.secretFields]) {
      if (!f.required) continue;
      const have = f.key in publicConfig || f.key in secrets;
      if (!have) return { ok: false, error: `${f.label} is required before ${def.label} can be switched on.` };
    }
  }
  return { ok: true, publicConfig, secrets };
}

// ---------- loading ----------
export interface Loaded { provider: string; publicConfig: Record<string, string>; secrets: Record<string, string> }
export async function loadIntegration(admin: SupabaseClient, kind: Kind, env: (k: string) => string | undefined): Promise<Loaded | null> {
  const key = env("INTEGRATION_ENC_KEY") ?? "";
  if (key.length < 24) return null;
  const { data } = await admin.from("integration_settings").select("provider, enabled, public_config, secret_ciphertext").eq("kind", kind).maybeSingle();
  if (!data?.enabled || !data.secret_ciphertext) return null;
  try { return { provider: data.provider, publicConfig: data.public_config ?? {}, secrets: await decryptSecrets(data.secret_ciphertext, key) }; }
  catch { console.error("integration decrypt failed for", kind); return null; }
}
