-- =============================================================================
-- Migration 034: DB-backed rate limiting for unauthenticated edge endpoints
-- (auth-resolve-login-id, auth-first-login). Edge instances do not share
-- memory, so limits must live in the database. service_role only.
-- Idempotent. Run after 033.
-- =============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
    key          TEXT PRIMARY KEY,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hits         INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;      -- no policies: nobody but service_role
REVOKE ALL ON public.auth_rate_limits FROM PUBLIC, anon, authenticated;

-- Returns TRUE when the call is allowed, FALSE when the limit is exceeded.
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key TEXT, p_max INTEGER, p_window_seconds INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_hits INTEGER;
BEGIN
    IF p_key IS NULL OR p_max < 1 OR p_window_seconds < 1 THEN
        RETURN FALSE;
    END IF;
    INSERT INTO public.auth_rate_limits AS r (key, window_start, hits)
    VALUES (left(p_key, 200), NOW(), 1)
    ON CONFLICT (key) DO UPDATE
        SET hits = CASE WHEN r.window_start < NOW() - make_interval(secs => p_window_seconds)
                        THEN 1 ELSE r.hits + 1 END,
            window_start = CASE WHEN r.window_start < NOW() - make_interval(secs => p_window_seconds)
                                THEN NOW() ELSE r.window_start END
    RETURNING hits INTO v_hits;
    RETURN v_hits <= p_max;
END;
$$;
REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- Housekeeping helper (call from a scheduled job if desired)
CREATE OR REPLACE FUNCTION public.purge_auth_rate_limits()
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
    WITH d AS (DELETE FROM public.auth_rate_limits WHERE window_start < NOW() - INTERVAL '1 day' RETURNING 1)
    SELECT count(*)::INTEGER FROM d;
$$;
REVOKE ALL ON FUNCTION public.purge_auth_rate_limits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_auth_rate_limits() TO service_role;

COMMIT;
