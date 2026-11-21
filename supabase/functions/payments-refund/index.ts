// POST { order_id, reason, items?: [{ student_fee_id, amount }] } — finance/admin only. Refunds the whole online payment (or the chosen
// part) at the gateway, then corrects the fee ledger. The amount is validated against the ledger BEFORE the gateway is called.
// If the gateway succeeds but the ledger update fails, the response says so; calling again is safe (the order is still Paid/Review
// and the gateway refuses a second refund of the same payment, in which case finance fixes the ledger from the Online payments tab).
import { json, preflight, readJson } from "../_shared/http.ts";
import { authenticate, requireRole, audit } from "../_shared/auth.ts";
import { loadGatewayConfig, refundGatewayPayment } from "../_shared/gateway.ts";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const { caller, admin } = auth;
  const denied = requireRole(req, caller, ["admin", "finance_manager"]); if (denied) return denied;
  const b = await readJson(req, 5_000);
  const orderId = String(b?.order_id ?? ""), reason = String(b?.reason ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(orderId) || reason.length < 5) return json(req, 400, { error: "order_id and a reason (5+ characters) are required.", code: "VALIDATION_ERROR" });
  const cfg = await loadGatewayConfig(admin, (k) => Deno.env.get(k));
  if (!cfg) return json(req, 503, { error: "Online payment is not configured.", code: "NOT_CONFIGURED" });

  const items = Array.isArray(b?.items) && b.items.length ? b.items : null;
  const { data: chk, error: chkErr } = await admin.rpc("payment_order_refund_check", { p_order: orderId, p_items: items });
  if (chkErr) { console.error("refund check", chkErr.message); return json(req, 500, { error: "Could not check the refund.", code: "SERVER_ERROR" }); }
  if (!chk?.success) return json(req, 400, { error: chk?.error ?? "Not refundable.", code: chk?.code ?? "NOT_REFUNDABLE" });
  let refundId: string;
  try {
    refundId = (await refundGatewayPayment(cfg, chk.gateway_payment_id, chk.amount_paise, { erp_order: orderId, reason: reason.slice(0, 100) })).id;
  } catch (e) {
    console.error("gateway refund", (e as Error).message);
    return json(req, 502, { error: `The gateway did not refund: ${(e as Error).message}`, code: "GATEWAY_ERROR" });
  }
  const { data, error } = await admin.rpc("payment_order_refund_apply", { p_order: orderId, p_reason: reason, p_actor: caller.id, p_gateway_refund_id: refundId, p_items: items });
  await audit(admin, caller, "online_payment_refunded", "payment_orders", orderId, { refund_id: refundId, amount: chk.amount });
  if (error || !data?.success) {
    console.error("refund apply", error?.message ?? data?.error);
    return json(req, 500, { error: `The gateway refunded (ref ${refundId}) but the fee ledger could not be updated: ${data?.error ?? error?.message}. Reverse the payments manually.`, code: "LEDGER_NOT_UPDATED", gateway_refund_id: refundId });
  }
  return json(req, 200, { success: true, gateway_refund_id: refundId });
});
