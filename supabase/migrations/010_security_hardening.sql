-- =============================================================================
-- TrailAlert - Security hardening
-- =============================================================================
-- 1) Tighten vote RLS so users can no longer modify other users' votes.
-- 2) Remove SQL-level webhook trigger with committed secret.
--    Use Supabase Dashboard webhooks with secret headers instead.

-- ---------------------------------------------------------------------------
-- votes RLS hardening
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "votes_select_all" ON votes;
DROP POLICY IF EXISTS "votes_insert_all" ON votes;
DROP POLICY IF EXISTS "votes_update_all" ON votes;
DROP POLICY IF EXISTS "votes_delete_all" ON votes;

-- Authenticated users may only read their own vote rows.
CREATE POLICY "votes_select_own"
  ON votes FOR SELECT
  USING (user_id = auth.uid());

-- Authenticated users may only insert votes for themselves.
CREATE POLICY "votes_insert_auth_own"
  ON votes FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND user_id = auth.uid()
    AND anon_fingerprint IS NULL
  );

-- Anonymous users may insert one fingerprinted vote.
CREATE POLICY "votes_insert_anon_fingerprint"
  ON votes FOR INSERT
  WITH CHECK (
    auth.role() = 'anon'
    AND user_id IS NULL
    AND anon_fingerprint IS NOT NULL
    AND char_length(anon_fingerprint) >= 16
  );

-- Only authenticated users can update/delete their own votes.
CREATE POLICY "votes_update_auth_own"
  ON votes FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND anon_fingerprint IS NULL);

CREATE POLICY "votes_delete_auth_own"
  ON votes FOR DELETE
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Remove SQL trigger webhook with committed secret
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_notify_new_active_closure ON closures;
DROP FUNCTION IF EXISTS trigger_notify_new_closure();
