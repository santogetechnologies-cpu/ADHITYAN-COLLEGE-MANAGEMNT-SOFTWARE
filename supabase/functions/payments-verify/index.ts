// POST { razorpay_order_id, razorpay_payment_id, razorpay_signature }  — the browser's "payment done" callback.
// Verifies the checkout signature AND re-reads the payment from the gateway before settling. Idempotent with the webhook.
import { json, preflight, readJson } from "../_shared/http.ts";
import { authenticate } from "../_shared/auth.ts";
import { fetchGatewayPayment, loadGatewayConfig, verifyCheckoutSignature } from "../_shared/gateway.ts";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const { caller, admin } = auth;
  const b = await readJson(req, 5_000);
  const orderId = String(b?.razorpay_order_id ?? ""), paymentId = String(b?.razorpay_payment_id ?? ""), signature = String(b?.razorpay_signature ?? "");
  const cfg = await loadGatewayConfig(admin, (k) => Deno.env.get(k));
  if (!cfg) return json(req, 503, { error: "Online payment is not configured.", code: "NOT_CONFIGURED" });
  if (!(await verifyCheckoutSignature(orderId, paymentId, signature, cfg.keySecret))) return json(req, 400, { error: "Payment signature is invalid.", code: "BAD_SIGNATURE" });

  // the order must belong to the caller (or their child)
  const { data: o } = await admin.from("payment_orders").select("id, created_by, student_id").eq("gateway_order_id", orderId).maybeSingle();
  if (!o || (o.created_by !== caller.id && o.student_id !== caller.id)) return json(req, 404, { error: "Order not found.", code: "NOT_FOUND" });

  try {
    const p = await fetchGatewayPayment(cfg, paymentId);
    if (p.order_id !== orderId) return json(req, 400, { error: "Payment does not belong to this order.", code: "MISMATCH" });
    if (p.status !== "captured") return json(req, 202, { success: false, pending: true, message: "The payment is not confirmed yet. It will be applied automatically once the bank confirms." });
    const { data, error } = await admin.rpc("payment_order_settle", { p_gateway_order_id: orderId, p_gateway_payment_id: p.id, p_amount_paise: p.amount, p_event_id: `verify:${p.id}`, p_event_type: "verify", p_payload: { source: "browser-callback" } });
    if (error) { console.error("settle", error.message); return json(req, 500, { error: "Could not apply the payment. Finance will reconcile it.", code: "SERVER_ERROR" }); }
    return json(req, data?.success ? 200 : 202, data);
  } catch (e) {
    console.error("verify", (e as Error).message);
    return json(req, 502, { error: "Could not confirm the payment with the gateway. If money was debited it will be applied automatically.", code: "GATEWAY_ERROR" });
  }
});
