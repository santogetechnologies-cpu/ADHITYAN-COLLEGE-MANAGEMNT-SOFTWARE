// POST { items: [{ student_fee_id, amount }] }  ->  { order_id, gateway_order_id, key_id, amount_paise }
// Authenticated student/parent. The server prices and validates everything; the gateway order is created for exactly that amount.
import { json, preflight, readJson } from "../_shared/http.ts";
import { authenticate, rateLimit } from "../_shared/auth.ts";
import { createGatewayOrder, loadGatewayConfig } from "../_shared/gateway.ts";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;
  const { caller, admin } = auth;
  if (!["student", "parent"].includes(caller.role)) return json(req, 403, { error: "Only students and parents can pay online.", code: "FORBIDDEN" });
  const body = await readJson(req, 20_000);
  const storeOrder = body?.store_order_id ? String(body.store_order_id) : null;
  if (!body || (!storeOrder && !Array.isArray(body.items))) return json(req, 400, { error: "items (fees) or store_order_id is required.", code: "VALIDATION_ERROR" });
  if (storeOrder && !/^[0-9a-f-]{36}$/i.test(storeOrder)) return json(req, 400, { error: "Invalid store_order_id.", code: "VALIDATION_ERROR" });
  const cfg = await loadGatewayConfig(admin, (k) => Deno.env.get(k));
  if (!cfg) return json(req, 503, { error: "Online payment is not configured.", code: "NOT_CONFIGURED" });
  if (!(await rateLimit(admin, `pay:create:${caller.id}`, 10, 300))) return json(req, 429, { error: "Too many attempts. Wait a few minutes.", code: "RATE_LIMITED" });

  const { data: order, error } = storeOrder
    ? await admin.rpc("payment_order_create_store", { p_actor: caller.id, p_store_order: storeOrder })
    : await admin.rpc("payment_order_create", { p_actor: caller.id, p_items: body.items });
  if (error) { console.error("payment_order_create", error.message); return json(req, 500, { error: "Could not create the order.", code: "SERVER_ERROR" }); }
  if (!order?.success) return json(req, 400, { error: order?.error ?? "Order refused.", code: order?.code ?? "REFUSED" });
  try {
    const g = await createGatewayOrder(cfg, order.amount_paise, order.order_id, { erp_order: order.order_id });
    await admin.rpc("payment_order_attach", { p_order: order.order_id, p_gateway_order_id: g.id });
    return json(req, 200, { success: true, order_id: order.order_id, gateway_order_id: g.id, key_id: cfg.keyId, amount_paise: order.amount_paise });
  } catch (e) {
    console.error("gateway order", (e as Error).message);
    await admin.from("payment_orders").update({ status: "Failed", failure_reason: "Gateway order could not be created" }).eq("id", order.order_id);
    return json(req, 502, { error: "The payment gateway could not be reached. Nothing was charged.", code: "GATEWAY_ERROR" });
  }
});
