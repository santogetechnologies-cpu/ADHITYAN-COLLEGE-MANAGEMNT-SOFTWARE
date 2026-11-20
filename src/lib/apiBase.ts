/**
 * Maps the app's historical same-origin `/api/*` paths to where they actually live.
 *
 * Development: the Vite dev-server plugin (src/server/adminVitePlugin.ts) serves `/api/*`, so the
 * path is returned unchanged.
 * Production (static hosting has no `/api`): requests go to the Supabase Edge Functions
 * `<VITE_SUPABASE_URL>/functions/v1/<function>`. Set VITE_USE_EDGE_API=true to use them in dev too.
 */
const EDGE_FUNCTION_FOR_PATH: Record<string, string> = {
  '/api/admin/users': 'admin-api',
  '/api/ai/chat': 'ai-chat',
  '/api/auth/resolve-login-id': 'auth-resolve-login-id',
  '/api/auth/first-login-challenge': 'auth-first-login',
  '/api/auth/complete-first-login': 'auth-first-login',
};

export function apiUrl(path: string): string {
  const useEdge = import.meta.env.PROD || import.meta.env.VITE_USE_EDGE_API === 'true';
  const fn = EDGE_FUNCTION_FOR_PATH[path];
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!useEdge || !fn || !base) return path;
  return `${base.replace(/\/+$/, '')}/functions/v1/${fn}`;
}
