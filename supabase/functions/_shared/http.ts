// Shared HTTP helpers for all edge functions.
// ALLOWED_ORIGINS (comma separated, e.g. "https://erp.college.edu,http://localhost:8080")
// must be set as an Edge Function secret in production. If unset, requests from any
// origin are allowed (acceptable only because every privileged endpoint requires a
// Bearer JWT and uses no cookies).

const BASE_HEADERS = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

export function corsHeaders(req: Request): Record<string, string> {
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.get("Origin") ?? "";
  if (allowed.length === 0) return { ...BASE_HEADERS, "Access-Control-Allow-Origin": "*" };
  if (allowed.includes(origin)) return { ...BASE_HEADERS, "Access-Control-Allow-Origin": origin };
  return { ...BASE_HEADERS }; // browser will block: origin not allowed
}

export function json(req: Request, status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json", "Cache-Control": "no-store", ...extra },
  });
}

/** Handles OPTIONS + non-POST. Returns a Response to short-circuit, or null to continue. */
export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response("ok", { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, 405, { error: "Method not allowed. Use POST.", code: "METHOD_NOT_ALLOWED" });
  return null;
}

export async function readJson(req: Request, maxBytes = 1_000_000): Promise<Record<string, any> | null> {
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > maxBytes) return null;
  try {
    const text = await req.text();
    if (text.length > maxBytes) return null;
    const parsed = text ? JSON.parse(text) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") || "unknown";
}
