-- =============================================================================
-- TrailAlert — Notify-New-Closure Webhook
-- =============================================================================
--
-- OPTION A (recommended): Supabase Dashboard
-- -------------------------------------------------
-- Database → Webhooks → "Create a new hook"
--   Name:        notify-new-closure
--   Table:       public.closures
--   Events:      INSERT
--   Endpoint:    https://<project-ref>.supabase.co/functions/v1/notify-new-closure
--   HTTP Method: POST
--   Headers:     x-webhook-secret: <your-secret>
--
-- The webhook fires on every INSERT. The Edge Function itself filters
-- status != 'active' and returns 200 early, so only active closures send mail.
--
-- OPTION B: pg_net (SQL-based, if pg_net extension is enabled)
-- -------------------------------------------------
-- Enable the pg_net extension first:
--   Extensions → pg_net → Enable
--
-- Then run the statements below.
-- =============================================================================

-- Store secrets as custom settings (set via Dashboard: Settings → Vault)
-- These are referenced as current_setting('app.supabase_url') etc.
-- You can also hard-code the URL if preferred.

CREATE OR REPLACE FUNCTION trigger_notify_new_closure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url    text;
  v_secret text;
BEGIN
  -- Only fire for active closures
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  v_url    := current_setting('app.supabase_url', true)
              || '/functions/v1/notify-new-closure';
  v_secret := current_setting('app.webhook_secret', true);

  PERFORM net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',      'application/json',
      'x-webhook-secret',  v_secret
    ),
    body    := jsonb_build_object(
      'record', row_to_json(NEW)
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_active_closure
  AFTER INSERT ON closures
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notify_new_closure();

-- =============================================================================
-- Edge Function environment variables (set in Supabase Dashboard):
-- =============================================================================
--
--   SUPABASE_URL             = https://<project-ref>.supabase.co
--   SUPABASE_SERVICE_ROLE_KEY = <service-role-key>
--   RESEND_API_KEY           = re_...
--   EMAIL_FROM               = TrailAlert <noreply@trailalert.at>
--   APP_URL                  = https://trailalert.vercel.app
--   WEBHOOK_SECRET           = <random-secret-string>
--
-- Deploy the function:
--   supabase functions deploy notify-new-closure
-- =============================================================================
