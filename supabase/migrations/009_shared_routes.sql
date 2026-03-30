-- Create shared_routes table
CREATE TABLE IF NOT EXISTS shared_routes (
  id          text        PRIMARY KEY,
  route_points jsonb      NOT NULL,
  file_name   text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS: enable row-level security
ALTER TABLE shared_routes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (needed for shared links)
CREATE POLICY "shared_routes_select"
  ON shared_routes FOR SELECT
  USING (true);

-- Allow anyone to insert (no login required)
CREATE POLICY "shared_routes_insert"
  ON shared_routes FOR INSERT
  WITH CHECK (true);

-- Auto-expiry (requires pg_cron extension — enable in Supabase Dashboard > Database > Extensions first):
-- SELECT cron.schedule(
--   'delete-expired-shared-routes',
--   '0 3 * * *',
--   $$DELETE FROM shared_routes WHERE created_at < now() - interval '30 days'$$
-- );
