// Drains the e-mail/SMS outbox and (optionally) runs the daily fee reminders.
// Deploy:   supabase functions deploy notifications-dispatch --no-verify-jwt
// Secrets:  DISPATCH_SECRET (any long random string) and INTEGRATION_ENC_KEY (24+ characters; encrypts provider keys saved in the app).
//           Provider keys (Resend/SendGrid/Brevo, Twilio, WhatsApp, Razorpay) are entered in the app under Settings → Integrations.
//           Legacy fallback: RESEND_API_KEY + MAIL_FROM, TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM (+ TWILIO_WHATSAPP_FROM).
// Schedule: call it every 5 minutes (Supabase Dashboard → Edge Functions → Schedule, or any cron) with header  x-dispatch-secret: <DISPATCH_SECRET>.
//           POST {"task":"reminders"} once a day if you do not use the pg_cron schedule from migration 077.
// A channel without its secrets is simply not sent (rows stay queued, nothing is lost).
import { serviceClient } from "../_shared/auth.ts";
import { loadChannelConfig, safeEqual, sendEmail, sendSms, sendWhatsApp } from "../_shared/channels.ts";

const jsonRes = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("DISPATCH_SECRET") ?? "";
  if (secret.length < 16) return jsonRes(503, { error: "DISPATCH_SECRET is not configured (min 16 characters).", code: "NOT_CONFIGURED" });
  if (!safeEqual(req.headers.get("x-dispatch-secret") ?? "", secret)) return jsonRes(401, { error: "Unauthorized.", code: "UNAUTHORIZED" });

  let task = "outbox";
  try { const b = await req.json(); if (b?.task === "reminders") task = "reminders"; } catch { /* empty body = outbox */ }
  const admin = serviceClient();

  if (task === "reminders") {
    const { data, error } = await admin.rpc("fee_reminders_auto");
    if (error) { console.error("reminders", error.message); return jsonRes(500, { error: "Could not run reminders.", code: "SERVER_ERROR" }); }
    return jsonRes(200, data);
  }

  const cfg = await loadChannelConfig(admin, (k) => Deno.env.get(k));
  const channels = [cfg.email ? "email" : null, cfg.sms ? "sms" : null, cfg.whatsapp ? "whatsapp" : null].filter(Boolean) as string[];
  if (!channels.length) return jsonRes(200, { sent: 0, failed: 0, note: "No channel is configured; messages stay queued." });

  const { data: settings } = await admin.from("institutional_settings").select("institution_name").limit(1).maybeSingle();
  const institution = settings?.institution_name ?? "Your institution";
  const { data: rows, error } = await admin.rpc("outbox_claim", { p_limit: 40, p_channels: channels });
  if (error) { console.error("claim", error.message); return jsonRes(500, { error: "Could not read the queue.", code: "SERVER_ERROR" }); }

  let sent = 0, failed = 0;
  for (const r of rows ?? []) {
    try {
      if (r.channel === "email" && cfg.email) await sendEmail(cfg.email, r.to_address, r.subject ?? "Notification", r.body, institution);
      else if (r.channel === "sms" && cfg.sms) await sendSms(cfg.sms, r.to_address, r.body);
      else if (r.channel === "whatsapp" && cfg.whatsapp) await sendWhatsApp(cfg.whatsapp, r.to_address, r.body);
      else throw new Error("channel not configured");
      await admin.rpc("outbox_complete", { p_id: r.id, p_ok: true });
      sent++;
    } catch (e) {
      failed++;
      await admin.rpc("outbox_complete", { p_id: r.id, p_ok: false, p_error: (e as Error).message });
    }
  }
  return jsonRes(200, { sent, failed });
});
