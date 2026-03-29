-- =============================================================================
-- TrailAlert — pg_net webhook trigger for notify-new-closure Edge Function
-- =============================================================================
-- PREREQUISITE: Enable the pg_net extension in Supabase Dashboard first:
--   Database → Extensions → search "pg_net" → Enable
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_notify_new_closure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only fire for active closures
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := 'https://yczqgfacmmrlotcowsrl.supabase.co/functions/v1/notify-new-closure',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-webhook-secret', 'trailalert-webhook-2026'
    ),
    body    := row_to_json(NEW)::jsonb
  );

  RETURN NEW;
END;
$$;

-- Drop old trigger if it exists from a previous attempt
DROP TRIGGER IF EXISTS trg_notify_new_active_closure ON closures;

CREATE TRIGGER trg_notify_new_active_closure
  AFTER INSERT ON closures
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notify_new_closure();
