// Payment gateway adapter (Razorpay). Pure Web Crypto + fetch, so it runs in Deno and Node (for tests).
// Secrets (Edge Function secrets, never in the repo or the browser):
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET

const enc = new TextEncoder();

export async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time comparison of two hex strings. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** Signature the browser checkout returns: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export async function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, keySecret: string): Promise<boolean> {
  if (!orderId || !paymentId || !signature || !keySecret) return false;
  return safeEqual(await hmacHex(keySecret, `${orderId}|${paymentId}`), signature.toLowerCase());
}

/** Webhook signature: HMAC_SHA256(raw request body, webhook_secret) from the X-Razorpay-Signature header. */
export async function verifyWebhookSignature(rawBody: string, signature: string, webhookSecret: string): Promise<boolean> {
  if (!rawBody || !signature || !webhookSecret) return false;
  return safeEqual(await hmacHex(webhookSecret, rawBody), signature.toLowerCase());
}

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { loadIntegration } from "./integrations.ts";

export interface GatewayConfig { keyId: string; keySecret: string; webhookSecret?: string }
export function gatewayConfig(env: (k: string) => string | undefined): GatewayConfig | null {
  const keyId = env("RAZORPAY_KEY_ID"); const keySecret = env("RAZORPAY_KEY_SECRET");
  return keyId && keySecret ? { keyId, keySecret } : null;
}

/** Settings saved in the app (encrypted) win; environment secrets are the fallback. */
export async function loadGatewayConfig(admin: SupabaseClient, env: (k: string) => string | undefined): Promise<GatewayConfig | null> {
  const l = await loadIntegration(admin, "payments", env);
  if (l?.provider === "razorpay" && l.publicConfig.key_id && l.secrets.key_secret) {
    return { keyId: l.publicConfig.key_id, keySecret: l.secrets.key_secret, webhookSecret: l.secrets.webhook_secret };
  }
  const e = gatewayConfig(env);
  return e ? { ...e, webhookSecret: env("RAZORPAY_WEBHOOK_SECRET") } : null;
}

const basic = (c: GatewayConfig) => "Basic " + btoa(`${c.keyId}:${c.keySecret}`);

export async function createGatewayOrder(c: GatewayConfig, amountPaise: number, receipt: string, notes: Record<string, string>): Promise<{ id: string }> {
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: basic(c) },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt: receipt.slice(0, 40), notes }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.id) throw new Error(body?.error?.description || `Gateway refused the order (${res.status}).`);
  return { id: body.id };
}

export async function fetchGatewayPayment(c: GatewayConfig, paymentId: string): Promise<{ id: string; order_id: string; amount: number; status: string }> {
  const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: basic(c) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.id) throw new Error(body?.error?.description || `Could not read the payment (${res.status}).`);
  return { id: body.id, order_id: body.order_id, amount: body.amount, status: body.status };
}

export async function refundGatewayPayment(c: GatewayConfig, paymentId: string, amountPaise: number, notes: Record<string, string>): Promise<{ id: string }> {
  const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: basic(c) }, body: JSON.stringify({ amount: amountPaise, notes }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.id) throw new Error(body?.error?.description || `Gateway refused the refund (${res.status}).`);
  return { id: body.id };
}
