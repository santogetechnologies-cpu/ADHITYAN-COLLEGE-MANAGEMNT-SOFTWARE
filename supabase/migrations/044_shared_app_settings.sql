-- =============================================================================
-- Migration 044: Shared, versioned application settings (Control Center configuration)
--
-- Problems this fixes (src/services/superAdminService.ts):
--  * the draft and the "published" configuration were kept in each browser's localStorage, so a
--    customization never reached other users or devices;
--  * the published snapshot was read back from audit_logs, which only admins can read (migration 033),
--    so every other role loaded DEFAULTS: modules an admin disabled stayed open for everyone else;
--  * release numbers came from an in-memory counter (v1.1.0 again after every reload) and rollback only
--    searched that in-memory list ("release not found" after a reload);
--  * dashboards / pages / navigation / permissions / forms / workflows were saved as drafts but never published.
--
--   app_settings          the LIVE value per key (key 'control_center'); readable by every signed-in user
--   app_setting_versions  append-only history of every publish / rollback (the release log)
--   app_setting_drafts    one shared working draft per key (admins)
-- Functions (admin only, enforced inside; EXECUTE for authenticated):
--   app_settings_draft_merge(key, patch)  atomic deep-merge into the shared draft
--   app_settings_draft_save(key, value)   replace the shared draft
--   app_settings_publish(key, value, summary)   next version number, goes live, clears the draft, audited
--   app_settings_rollback(key, version, reason) publishes the old value as a NEW version (history is kept)
-- Idempotent. Run after 043.
-- =============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY CHECK (key ~ '^[a-z][a-z0-9_]{1,60}$'),
    value JSONB NOT NULL CHECK (pg_column_size(value) < 2000000),
    version INTEGER NOT NULL DEFAULT 1,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.app_setting_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,
    version INTEGER NOT NULL,
    value JSONB NOT NULL,
    summary TEXT,
    kind TEXT NOT NULL DEFAULT 'publish' CHECK (kind IN ('publish', 'rollback')),
    rolled_back_to INTEGER,
    published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    published_by_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_app_setting_versions UNIQUE (key, version)
);
CREATE INDEX IF NOT EXISTS idx_app_setting_versions_key ON public.app_setting_versions(key, version DESC);

CREATE TABLE IF NOT EXISTS public.app_setting_drafts (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL CHECK (pg_column_size(value) < 2000000),
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_setting_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_setting_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_settings, public.app_setting_versions, public.app_setting_drafts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.app_settings TO authenticated;
GRANT SELECT ON public.app_setting_versions TO authenticated;
GRANT SELECT ON public.app_setting_drafts TO authenticated;
-- writes happen only through the functions below

DROP POLICY IF EXISTS app_settings_read ON public.app_settings;
CREATE POLICY app_settings_read ON public.app_settings FOR SELECT TO authenticated USING (TRUE);   -- config is not secret
DROP POLICY IF EXISTS app_setting_versions_read ON public.app_setting_versions;
CREATE POLICY app_setting_versions_read ON public.app_setting_versions FOR SELECT TO authenticated
    USING (public.get_current_user_role() IN ('admin', 'principal'));
DROP POLICY IF EXISTS app_setting_drafts_read ON public.app_setting_drafts;
CREATE POLICY app_setting_drafts_read ON public.app_setting_drafts FOR SELECT TO authenticated
    USING (public.get_current_user_role() = 'admin');

-- append-only history
CREATE OR REPLACE FUNCTION public.app_setting_versions_immutable()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    RAISE EXCEPTION 'APP_SETTING_VERSIONS_APPEND_ONLY: release history cannot be changed or deleted.';
END; $$;
DROP TRIGGER IF EXISTS trg_app_setting_versions_immutable ON public.app_setting_versions;
CREATE TRIGGER trg_app_setting_versions_immutable BEFORE UPDATE OR DELETE ON public.app_setting_versions
    FOR EACH ROW EXECUTE FUNCTION public.app_setting_versions_immutable();

-- ---------------------------------------------------------------------------
-- deep merge: objects merge recursively; arrays and scalars are replaced
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.jsonb_merge_deep(a JSONB, b JSONB)
RETURNS JSONB LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
    SELECT CASE
        WHEN jsonb_typeof(a) = 'object' AND jsonb_typeof(b) = 'object' THEN
            COALESCE((SELECT jsonb_object_agg(k, CASE WHEN a ? k AND b ? k THEN public.jsonb_merge_deep(a -> k, b -> k)
                                                      WHEN b ? k THEN b -> k ELSE a -> k END)
                        FROM (SELECT jsonb_object_keys(a) AS k UNION SELECT jsonb_object_keys(b)) keys), '{}'::jsonb)
        ELSE COALESCE(b, a) END
$$;

CREATE OR REPLACE FUNCTION public.app_settings_require_admin()
RETURNS UUID LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    IF auth.uid() IS NULL OR public.get_current_user_role() <> 'admin' THEN
        RAISE EXCEPTION 'FORBIDDEN: only an administrator can change application settings.' USING ERRCODE = '42501';
    END IF;
    RETURN auth.uid();
END; $$;

CREATE OR REPLACE FUNCTION public.app_settings_draft_merge(p_key TEXT, p_patch JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid UUID := public.app_settings_require_admin(); v_new JSONB;
BEGIN
    IF jsonb_typeof(p_patch) <> 'object' THEN RAISE EXCEPTION 'VALIDATION_ERROR: patch must be an object.'; END IF;
    PERFORM pg_advisory_xact_lock(hashtext('app_setting_draft:' || p_key));
    INSERT INTO public.app_setting_drafts AS d (key, value, updated_by)
    VALUES (p_key, p_patch, v_uid)
    ON CONFLICT (key) DO UPDATE SET value = public.jsonb_merge_deep(d.value, EXCLUDED.value), updated_by = v_uid, updated_at = NOW()
    RETURNING value INTO v_new;
    RETURN v_new;
END; $$;

CREATE OR REPLACE FUNCTION public.app_settings_draft_save(p_key TEXT, p_value JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid UUID := public.app_settings_require_admin();
BEGIN
    IF jsonb_typeof(p_value) <> 'object' THEN RAISE EXCEPTION 'VALIDATION_ERROR: value must be an object.'; END IF;
    PERFORM pg_advisory_xact_lock(hashtext('app_setting_draft:' || p_key));
    INSERT INTO public.app_setting_drafts (key, value, updated_by) VALUES (p_key, p_value, v_uid)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = v_uid, updated_at = NOW();
    RETURN p_value;
END; $$;

CREATE OR REPLACE FUNCTION public.app_settings_publish(p_key TEXT, p_value JSONB, p_summary TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid UUID := public.app_settings_require_admin(); v_ver INTEGER; v_email TEXT;
BEGIN
    IF jsonb_typeof(p_value) <> 'object' THEN RAISE EXCEPTION 'VALIDATION_ERROR: value must be an object.'; END IF;
    PERFORM pg_advisory_xact_lock(hashtext('app_setting:' || p_key));
    SELECT COALESCE(max(version), 0) + 1 INTO v_ver FROM public.app_setting_versions WHERE key = p_key;
    SELECT email INTO v_email FROM public.profiles WHERE id = v_uid;
    INSERT INTO public.app_setting_versions (key, version, value, summary, kind, published_by, published_by_email)
    VALUES (p_key, v_ver, p_value, NULLIF(trim(p_summary), ''), 'publish', v_uid, v_email);
    INSERT INTO public.app_settings AS s (key, value, version, updated_by) VALUES (p_key, p_value, v_ver, v_uid)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, version = EXCLUDED.version, updated_by = v_uid, updated_at = NOW();
    DELETE FROM public.app_setting_drafts WHERE key = p_key;
    INSERT INTO public.audit_logs (user_id, user_email, user_role, action, entity_type, entity_id, new_values)
    VALUES (v_uid, v_email, 'admin', 'settings_published', 'app_settings', p_key, jsonb_build_object('version', v_ver, 'summary', p_summary));
    RETURN jsonb_build_object('success', true, 'version', v_ver);
END; $$;

CREATE OR REPLACE FUNCTION public.app_settings_rollback(p_key TEXT, p_version INTEGER, p_reason TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid UUID := public.app_settings_require_admin(); v_old public.app_setting_versions%ROWTYPE; v_ver INTEGER; v_email TEXT;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('app_setting:' || p_key));
    SELECT * INTO v_old FROM public.app_setting_versions WHERE key = p_key AND version = p_version;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', format('Release %s not found.', p_version));
    END IF;
    SELECT COALESCE(max(version), 0) + 1 INTO v_ver FROM public.app_setting_versions WHERE key = p_key;
    SELECT email INTO v_email FROM public.profiles WHERE id = v_uid;
    INSERT INTO public.app_setting_versions (key, version, value, summary, kind, rolled_back_to, published_by, published_by_email)
    VALUES (p_key, v_ver, v_old.value, COALESCE(NULLIF(trim(p_reason), ''), format('Rollback to release %s', p_version)), 'rollback', p_version, v_uid, v_email);
    INSERT INTO public.app_settings AS s (key, value, version, updated_by) VALUES (p_key, v_old.value, v_ver, v_uid)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, version = EXCLUDED.version, updated_by = v_uid, updated_at = NOW();
    DELETE FROM public.app_setting_drafts WHERE key = p_key;
    INSERT INTO public.audit_logs (user_id, user_email, user_role, action, entity_type, entity_id, new_values)
    VALUES (v_uid, v_email, 'admin', 'settings_rolled_back', 'app_settings', p_key, jsonb_build_object('to_version', p_version, 'new_version', v_ver));
    RETURN jsonb_build_object('success', true, 'version', v_ver, 'rolled_back_to', p_version);
END; $$;

REVOKE ALL ON FUNCTION public.app_settings_require_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_settings_draft_merge(TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_settings_draft_save(TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_settings_publish(TEXT, JSONB, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_settings_rollback(TEXT, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_settings_draft_merge(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_settings_draft_save(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_settings_publish(TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_settings_rollback(TEXT, INTEGER, TEXT) TO authenticated;

COMMIT;
