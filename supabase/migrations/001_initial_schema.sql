-- =============================================================================
-- TrailAlert - Initial Schema
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUM TYPES
-- ---------------------------------------------------------------------------

CREATE TYPE closure_type AS ENUM (
  'forestwork',
  'construction',
  'damage',
  'other'
);

CREATE TYPE closure_status AS ENUM (
  'active',
  'resolved',
  'unconfirmed'
);

CREATE TYPE severity_level AS ENUM (
  'full_closure',
  'partial',
  'warning'
);

CREATE TYPE vote_type AS ENUM (
  'confirm',
  'deny'
);

-- ---------------------------------------------------------------------------
-- 2. TABLE: closures
-- ---------------------------------------------------------------------------

CREATE TABLE closures (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude      float8        NOT NULL,
  longitude     float8        NOT NULL,
  title         text          NOT NULL,
  description   text,
  closure_type  closure_type  NOT NULL DEFAULT 'forestwork',
  status        closure_status NOT NULL DEFAULT 'unconfirmed',
  severity      severity_level NOT NULL DEFAULT 'full_closure',
  photo_url     text,
  reported_by   uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  expected_end  date,
  upvotes       int4          NOT NULL DEFAULT 0,
  downvotes     int4          NOT NULL DEFAULT 0,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now()
);

-- Geo queries
CREATE INDEX idx_closures_location ON closures (latitude, longitude);
-- Status filtering
CREATE INDEX idx_closures_status   ON closures (status);

-- ---------------------------------------------------------------------------
-- 3. TABLE: votes
-- ---------------------------------------------------------------------------

CREATE TABLE votes (
  id                uuid       PRIMARY KEY DEFAULT gen_random_uuid(),
  closure_id        uuid       NOT NULL REFERENCES closures(id) ON DELETE CASCADE,
  user_id           uuid       REFERENCES auth.users(id) ON DELETE SET NULL,
  vote_type         vote_type  NOT NULL,
  anon_fingerprint  text,
  created_at        timestamptz NOT NULL DEFAULT now(),

  -- One vote per logged-in user per closure
  CONSTRAINT uq_vote_user        UNIQUE NULLS NOT DISTINCT (closure_id, user_id),
  -- One vote per anonymous fingerprint per closure
  CONSTRAINT uq_vote_fingerprint UNIQUE NULLS NOT DISTINCT (closure_id, anon_fingerprint)
);

-- At least one of user_id or anon_fingerprint must be set
ALTER TABLE votes
  ADD CONSTRAINT chk_vote_identity
  CHECK (user_id IS NOT NULL OR anon_fingerprint IS NOT NULL);

-- ---------------------------------------------------------------------------
-- 4. TABLE: watch_areas
-- ---------------------------------------------------------------------------

CREATE TABLE watch_areas (
  id          uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  center_lat  float8    NOT NULL,
  center_lng  float8    NOT NULL,
  radius_km   float4    NOT NULL DEFAULT 10,
  name        text,
  notify_email boolean  NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_watch_areas_user ON watch_areas (user_id);

-- ---------------------------------------------------------------------------
-- 5. TRIGGER: updated_at on closures
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_closures_updated_at
  BEFORE UPDATE ON closures
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. FUNCTION + TRIGGER: sync vote counts, auto-resolve on downvote threshold
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sync_vote_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_upvotes   int4;
  v_downvotes int4;
BEGIN
  -- Recalculate from source of truth
  SELECT
    COUNT(*) FILTER (WHERE vote_type = 'confirm'),
    COUNT(*) FILTER (WHERE vote_type = 'deny')
  INTO v_upvotes, v_downvotes
  FROM votes
  WHERE closure_id = COALESCE(NEW.closure_id, OLD.closure_id);

  UPDATE closures
  SET
    upvotes   = v_upvotes,
    downvotes = v_downvotes,
    -- Auto-resolve: 3+ denials and zero confirmations
    status = CASE
      WHEN v_downvotes >= 3 AND v_upvotes = 0 THEN 'resolved'::closure_status
      ELSE status
    END
  WHERE id = COALESCE(NEW.closure_id, OLD.closure_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_votes_sync_counts
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION sync_vote_counts();

-- ---------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

ALTER TABLE closures   ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_areas ENABLE ROW LEVEL SECURITY;

-- closures ------------------------------------------------------------------

-- Anyone (anon + auth) can read all closures
CREATE POLICY "closures_select_all"
  ON closures FOR SELECT
  USING (true);

-- Anyone can report a closure (anonymous or logged-in)
CREATE POLICY "closures_insert_all"
  ON closures FOR INSERT
  WITH CHECK (true);

-- Only the reporter can edit their own closure
-- (status changes via vote are done by the SECURITY DEFINER trigger above)
CREATE POLICY "closures_update_own"
  ON closures FOR UPDATE
  USING (reported_by = auth.uid())
  WITH CHECK (reported_by = auth.uid());

-- Only the reporter can delete their own closure
CREATE POLICY "closures_delete_own"
  ON closures FOR DELETE
  USING (reported_by = auth.uid());

-- votes ---------------------------------------------------------------------

-- Anyone can read votes
CREATE POLICY "votes_select_all"
  ON votes FOR SELECT
  USING (true);

-- Anyone can cast a vote (uniqueness constraints prevent duplicates)
CREATE POLICY "votes_insert_all"
  ON votes FOR INSERT
  WITH CHECK (true);

-- watch_areas ---------------------------------------------------------------

-- Users only see their own watch areas
CREATE POLICY "watch_areas_select_own"
  ON watch_areas FOR SELECT
  USING (user_id = auth.uid());

-- Users can create watch areas for themselves only
CREATE POLICY "watch_areas_insert_own"
  ON watch_areas FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own watch areas
CREATE POLICY "watch_areas_update_own"
  ON watch_areas FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own watch areas
CREATE POLICY "watch_areas_delete_own"
  ON watch_areas FOR DELETE
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 8. REALTIME
-- ---------------------------------------------------------------------------

-- Enable realtime publication for closures (new closures, status changes)
ALTER PUBLICATION supabase_realtime ADD TABLE closures;

-- ---------------------------------------------------------------------------
-- 9. STORAGE: closure-photos bucket
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('closure-photos', 'closure-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for all photos
CREATE POLICY "closure_photos_select_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'closure-photos');

-- Authenticated users can upload photos
CREATE POLICY "closure_photos_insert_auth"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'closure-photos'
    AND auth.role() = 'authenticated'
  );

-- Users can delete their own photos
CREATE POLICY "closure_photos_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'closure-photos'
    AND owner = auth.uid()
  );
