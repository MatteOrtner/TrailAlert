-- =============================================================================
-- TrailAlert - Ops hardening + RLS cleanup
-- =============================================================================
-- 1) Remove legacy duplicate vote trigger/function.
-- 2) Harden insert policies for closures/shared_routes.
-- 3) Optimize RLS policies to avoid per-row auth() re-evaluation warnings.
-- 4) Set stable search_path on SECURITY DEFINER functions.

-- ---------------------------------------------------------------------------
-- Remove duplicate legacy vote sync trigger/function
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_votes_sync_counts ON votes;
DROP FUNCTION IF EXISTS sync_vote_counts();

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER hardening
-- ---------------------------------------------------------------------------

ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.sync_closure_vote_counts() SET search_path = public;

-- ---------------------------------------------------------------------------
-- closures INSERT policy hardening
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "closures_insert_all" ON closures;
DROP POLICY IF EXISTS "closures_insert_auth" ON closures;
DROP POLICY IF EXISTS "closures_insert_anon" ON closures;

-- Logged-in users can report closures and may attach their own user id.
CREATE POLICY "closures_insert_auth"
  ON closures FOR INSERT
  TO authenticated
  WITH CHECK (
    (reported_by = (SELECT auth.uid()) OR reported_by IS NULL)
    AND status IN ('active', 'unconfirmed', 'pending_review')
  );

-- Anonymous reporters cannot spoof user ownership.
CREATE POLICY "closures_insert_anon"
  ON closures FOR INSERT
  TO anon
  WITH CHECK (
    reported_by IS NULL
    AND status IN ('active', 'unconfirmed', 'pending_review')
  );

-- ---------------------------------------------------------------------------
-- shared_routes INSERT policy hardening
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "shared_routes_insert" ON shared_routes;

CREATE POLICY "shared_routes_insert"
  ON shared_routes FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    jsonb_typeof(route_points) = 'array'
    AND jsonb_array_length(route_points) BETWEEN 1 AND 10000
    AND char_length(btrim(file_name)) BETWEEN 1 AND 255
  );

-- ---------------------------------------------------------------------------
-- RLS policy performance tuning (auth.uid() -> (SELECT auth.uid()))
-- ---------------------------------------------------------------------------

-- closures
DROP POLICY IF EXISTS "closures_update_own" ON closures;
DROP POLICY IF EXISTS "closures_delete_own" ON closures;

CREATE POLICY "closures_update_own"
  ON closures FOR UPDATE
  TO authenticated
  USING (reported_by = (SELECT auth.uid()))
  WITH CHECK (reported_by = (SELECT auth.uid()));

CREATE POLICY "closures_delete_own"
  ON closures FOR DELETE
  TO authenticated
  USING (reported_by = (SELECT auth.uid()));

-- watch_areas
DROP POLICY IF EXISTS "watch_areas_select_own" ON watch_areas;
DROP POLICY IF EXISTS "watch_areas_insert_own" ON watch_areas;
DROP POLICY IF EXISTS "watch_areas_update_own" ON watch_areas;
DROP POLICY IF EXISTS "watch_areas_delete_own" ON watch_areas;

CREATE POLICY "watch_areas_select_own"
  ON watch_areas FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "watch_areas_insert_own"
  ON watch_areas FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "watch_areas_update_own"
  ON watch_areas FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "watch_areas_delete_own"
  ON watch_areas FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- closure_comments
DROP POLICY IF EXISTS "Users can create comments" ON closure_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON closure_comments;

CREATE POLICY "Users can create comments"
  ON closure_comments FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own comments"
  ON closure_comments FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- votes
DROP POLICY IF EXISTS "votes_select_own" ON votes;
DROP POLICY IF EXISTS "votes_insert_auth_own" ON votes;
DROP POLICY IF EXISTS "votes_insert_anon_fingerprint" ON votes;
DROP POLICY IF EXISTS "votes_update_auth_own" ON votes;
DROP POLICY IF EXISTS "votes_delete_auth_own" ON votes;

CREATE POLICY "votes_select_own"
  ON votes FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "votes_insert_auth_own"
  ON votes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND anon_fingerprint IS NULL
  );

CREATE POLICY "votes_insert_anon_fingerprint"
  ON votes FOR INSERT
  TO anon
  WITH CHECK (
    user_id IS NULL
    AND anon_fingerprint IS NOT NULL
    AND char_length(anon_fingerprint) >= 16
  );

CREATE POLICY "votes_update_auth_own"
  ON votes FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND anon_fingerprint IS NULL
  );

CREATE POLICY "votes_delete_auth_own"
  ON votes FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));
