-- votes table was missing DELETE and UPDATE policies.
-- RLS silently blocked these operations (no error, 0 rows affected),
-- causing vote removal and switching to appear to succeed on the client
-- while the DB row stayed unchanged.

-- Anyone can remove a vote (anon fingerprint deduplication is client-side)
CREATE POLICY "votes_delete_all"
  ON votes FOR DELETE
  USING (true);

-- Anyone can change their vote type (unique constraint prevents abuse)
CREATE POLICY "votes_update_all"
  ON votes FOR UPDATE
  USING (true)
  WITH CHECK (true);
