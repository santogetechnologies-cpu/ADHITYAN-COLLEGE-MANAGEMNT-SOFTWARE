// Gateway webhook. Deploy with:  supabase functions deploy payments-webhook --no-verify-jwt
// Trust comes ONLY from the HMAC signature of the raw body (the webhook secret saved under Settings → Integrations, or RAZORPAY_WEBHOOK_SECRET). Always answers 200 for events it has
// handled or can safely ignore, and 5xx when it should be retried.
import { serviceClient } from "../_shared/auth.ts";
import { loadGatewayConfig, verifyWebhookSignature } from "../_shared/gateway.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const raw = await req.text();
  if (raw.length > 200_000) return new Response("Too large", { status: 413 });
  const admin = serviceClient();
  const secret = (await loadGatewayConfig(admin, (k) => Deno.env.get(k)))?.webhookSecret ?? "";
  if (!secret) return new Response("Not configured", { status: 503 });
  if (!(await verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature") ?? "", secret))) return new Response("Bad signature", { status: 400 });

  let event: any; try { event = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400 }); }
  const eventId = req.headers.get("x-razorpay-event-id") || `${event?.event}:${event?.payload?.payment?.entity?.id ?? event?.created_at}`;
  const pay = event?.payload?.payment?.entity;
  try {
    if ((event.event === "payment.captured" || event.event === "order.paid") && (pay?.order_id || event?.payload?.order?.entity?.id)) {
      const orderId = pay?.order_id ?? event.payload.order.entity.id;
      const paymentId = pay?.id ?? "";
      const amount = pay?.amount ?? event?.payload?.order?.entity?.amount_paid;
      if (!paymentId) return new Response("ok", { status: 200 });
      const { data, error } = await admin.rpc("payment_order_settle", { p_gateway_order_id: orderId, p_gateway_payment_id: paymentId, p_amount_paise: amount, p_event_id: eventId, p_event_type: event.event, p_payload: event });
      if (error) { console.error("settle", error.message); return new Response("retry", { status: 500 }); }
      if (data?.code === "UNKNOWN_ORDER") console.warn("webhook for unknown order", orderId);
      return new Response("ok", { status: 200 });
    }
    if (event.event === "payment.failed" && pay?.order_id) {
      await admin.rpc("payment_order_fail", { p_gateway_order_id: pay.order_id, p_reason: pay.error_description ?? "Payment failed", p_event_id: eventId, p_payload: event });
      return new Response("ok", { status: 200 });
    }
    return new Response("ignored", { status: 200 });
  } catch (e) {
    console.error("webhook", (e as Error).message);
    return new Response("retry", { status: 500 });
  }
});
