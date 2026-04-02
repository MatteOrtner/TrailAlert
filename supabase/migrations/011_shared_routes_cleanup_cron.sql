-- =============================================================================
-- TrailAlert - Shared route cleanup schedule
-- =============================================================================
-- Automatically deletes shared routes older than 30 days.
-- Safe to run multiple times: existing cleanup jobs with the same name are replaced.

CREATE INDEX IF NOT EXISTS idx_shared_routes_created_at
  ON public.shared_routes (created_at);

DO $cleanup$
DECLARE
  v_job_id integer;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension
    WHERE extname = 'pg_cron'
  ) THEN
    FOR v_job_id IN
      SELECT jobid
      FROM cron.job
      WHERE jobname = 'delete-expired-shared-routes'
    LOOP
      PERFORM cron.unschedule(v_job_id);
    END LOOP;

    PERFORM cron.schedule(
      'delete-expired-shared-routes',
      '0 3 * * *',
      $sql$
      DELETE FROM public.shared_routes
      WHERE created_at < now() - interval '30 days'
      $sql$
    );
  ELSE
    RAISE NOTICE 'pg_cron extension is not enabled; shared_routes cleanup schedule skipped.';
  END IF;
END
$cleanup$;
