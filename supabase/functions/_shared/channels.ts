// Outbound e-mail, SMS and WhatsApp senders. Each returns normally on success and throws a short, secret-free message on failure.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { loadIntegration } from "./integrations.ts";

export type EmailCfg = { provider: "resend" | "sendgrid" | "brevo"; apiKey: string; from: string; fromName?: string };
export type SmsCfg = { provider: "twilio"; sid: string; token: string; from: string };
export type WhatsAppCfg =
  | { provider: "twilio_whatsapp"; sid: string; token: string; from: string }
  | { provider: "meta_whatsapp"; token: string; phoneId: string; template?: string; language?: string };
export interface ChannelConfig { email: EmailCfg | null; sms: SmsCfg | null; whatsapp: WhatsAppCfg | null }

/** Legacy: configuration from environment secrets only. */
export function channelConfig(get: (k: string) => string | undefined): ChannelConfig {
  const rk = get("RESEND_API_KEY"), from = get("MAIL_FROM");
  const sid = get("TWILIO_ACCOUNT_SID"), tok = get("TWILIO_AUTH_TOKEN"), sf = get("TWILIO_FROM"), wf = get("TWILIO_WHATSAPP_FROM");
  return {
    email: rk && from ? { provider: "resend", apiKey: rk, from } : null,
    sms: sid && tok && sf ? { provider: "twilio", sid, token: tok, from: sf } : null,
    whatsapp: sid && tok && wf ? { provider: "twilio_whatsapp", sid, token: tok, from: wf } : null,
  };
}

/** Settings saved in the app (encrypted) win; environment secrets are the fallback. */
export async function loadChannelConfig(admin: SupabaseClient, get: (k: string) => string | undefined): Promise<ChannelConfig> {
  const env = channelConfig(get);
  const [e, s, w] = await Promise.all([loadIntegration(admin, "email", get), loadIntegration(admin, "sms", get), loadIntegration(admin, "whatsapp", get)]);
  const email: EmailCfg | null = e && e.secrets.api_key && e.publicConfig.from && ["resend", "sendgrid", "brevo"].includes(e.provider)
    ? { provider: e.provider as EmailCfg["provider"], apiKey: e.secrets.api_key, from: e.publicConfig.from, fromName: e.publicConfig.from_name } : env.email;
  const sms: SmsCfg | null = s && s.provider === "twilio" && s.secrets.auth_token && s.publicConfig.account_sid && s.publicConfig.from
    ? { provider: "twilio", sid: s.publicConfig.account_sid, token: s.secrets.auth_token, from: s.publicConfig.from } : env.sms;
  let whatsapp: WhatsAppCfg | null = env.whatsapp;
  if (w?.provider === "twilio_whatsapp" && w.secrets.auth_token && w.publicConfig.account_sid && w.publicConfig.from)
    whatsapp = { provider: "twilio_whatsapp", sid: w.publicConfig.account_sid, token: w.secrets.auth_token, from: w.publicConfig.from };
  else if (w?.provider === "meta_whatsapp" && w.secrets.access_token && w.publicConfig.phone_number_id)
    whatsapp = { provider: "meta_whatsapp", token: w.secrets.access_token, phoneId: w.publicConfig.phone_number_id, template: w.publicConfig.template_name, language: w.publicConfig.language };
  return { email, sms, whatsapp };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

export function emailHtml(institution: string, subject: string, body: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2 style="margin:0 0 12px">${esc(subject)}</h2><p style="white-space:pre-wrap;line-height:1.5">${esc(body)}</p><hr style="border:none;border-top:1px solid #e5e7eb"><p style="color:#6b7280;font-size:12px">${esc(institution)} — you receive this because you have an account with us. Turn e-mail alerts off from your profile.</p></div>`;
}

async function expectOk(res: Response, what: string): Promise<void> { if (!res.ok) throw new Error(`${what} answered ${res.status}`); }

export async function sendEmail(cfg: EmailCfg, to: string, subject: string, body: string, institution: string): Promise<void> {
  const html = emailHtml(institution, subject, body);
  const sender = cfg.fromName ? `${cfg.fromName} <${cfg.from}>` : cfg.from;
  if (cfg.provider === "resend") {
    return expectOk(await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: sender, to: [to], subject, html, text: body }) }), "e-mail provider");
  }
  if (cfg.provider === "sendgrid") {
    return expectOk(await fetch("https://api.sendgrid.com/v3/mail/send", { method: "POST", headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ personalizations: [{ to: [{ email: to }] }], from: { email: cfg.from, ...(cfg.fromName ? { name: cfg.fromName } : {}) }, subject, content: [{ type: "text/plain", value: body }, { type: "text/html", value: html }] }) }), "e-mail provider");
  }
  return expectOk(await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": cfg.apiKey, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: { email: cfg.from, ...(cfg.fromName ? { name: cfg.fromName } : {}) }, to: [{ email: to }], subject, htmlContent: html, textContent: body }) }), "e-mail provider");
}

const e164 = (to: string) => (to.startsWith("+") ? to : `+91${to}`);

async function twilio(sid: string, token: string, form: Record<string, string>): Promise<void> {
  await expectOk(await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST", headers: { Authorization: "Basic " + btoa(`${sid}:${token}`), "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(form) }), "sms provider");
}

export async function sendSms(cfg: SmsCfg, to: string, body: string): Promise<void> {
  await twilio(cfg.sid, cfg.token, { To: e164(to), From: cfg.from, Body: body });
}

export async function sendWhatsApp(cfg: WhatsAppCfg, to: string, body: string): Promise<void> {
  if (cfg.provider === "twilio_whatsapp") {
    const from = cfg.from.startsWith("whatsapp:") ? cfg.from : `whatsapp:${e164(cfg.from)}`;
    return twilio(cfg.sid, cfg.token, { To: `whatsapp:${e164(to)}`, From: from, Body: body });
  }
  const payload = cfg.template
    ? { messaging_product: "whatsapp", to: e164(to).slice(1), type: "template", template: { name: cfg.template, language: { code: cfg.language || "en" }, components: [{ type: "body", parameters: [{ type: "text", text: body.replace(/\s*\n\s*/g, " ").slice(0, 500) }] }] } }
    : { messaging_product: "whatsapp", to: e164(to).slice(1), type: "text", text: { body } };
  await expectOk(await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(cfg.phoneId)}/messages`, { method: "POST", headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) }), "whatsapp provider");
}

/** Constant-time string comparison for the scheduler secret. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
