// Outbound e-mail (Resend) and SMS (Twilio) senders. Each returns normally on success and throws a short, secret-free message on failure.
export interface ChannelConfig {
  email: { apiKey: string; from: string } | null;
  sms: { sid: string; token: string; from: string } | null;
}

export function channelConfig(get: (k: string) => string | undefined): ChannelConfig {
  const rk = get("RESEND_API_KEY"), from = get("MAIL_FROM");
  const sid = get("TWILIO_ACCOUNT_SID"), tok = get("TWILIO_AUTH_TOKEN"), sf = get("TWILIO_FROM");
  return {
    email: rk && from ? { apiKey: rk, from } : null,
    sms: sid && tok && sf ? { sid, token: tok, from: sf } : null,
  };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

export function emailHtml(institution: string, subject: string, body: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2 style="margin:0 0 12px">${esc(subject)}</h2><p style="white-space:pre-wrap;line-height:1.5">${esc(body)}</p><hr style="border:none;border-top:1px solid #e5e7eb"><p style="color:#6b7280;font-size:12px">${esc(institution)} — you receive this because you have an account with us. Turn e-mail alerts off from your profile.</p></div>`;
}

export async function sendEmail(cfg: NonNullable<ChannelConfig["email"]>, to: string, subject: string, body: string, institution: string): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: cfg.from, to: [to], subject, html: emailHtml(institution, subject, body), text: body }),
  });
  if (!res.ok) throw new Error(`email provider answered ${res.status}`);
}

export async function sendSms(cfg: NonNullable<ChannelConfig["sms"]>, to: string, body: string): Promise<void> {
  const form = new URLSearchParams({ To: to.startsWith("+") ? to : `+91${to}`, From: cfg.from, Body: body });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(`${cfg.sid}:${cfg.token}`), "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!res.ok) throw new Error(`sms provider answered ${res.status}`);
}

/** Constant-time string comparison for the scheduler secret. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
