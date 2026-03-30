-- Replace the vote-count trigger to also auto-resolve or flag for review
-- based on the last-5-votes pattern.
--
-- Rules:
--   downvotes < 5              → no status change (just sync counts)
--   downvotes >= 5, last 5 all deny  → status = 'resolved'
--   downvotes >= 5, last 5 mixed     → status = 'pending_review'

CREATE OR REPLACE FUNCTION sync_closure_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
  target_id    uuid;
  v_downvotes  int;
  v_last5_deny int;
BEGIN
  target_id := COALESCE(NEW.closure_id, OLD.closure_id);

  -- 1. Sync vote counts
  UPDATE closures
  SET
    upvotes   = (SELECT COUNT(*) FROM votes WHERE closure_id = target_id AND vote_type = 'confirm'),
    downvotes = (SELECT COUNT(*) FROM votes WHERE closure_id = target_id AND vote_type = 'deny')
  WHERE id = target_id;

  -- 2. Read fresh downvote count
  SELECT downvotes INTO v_downvotes FROM closures WHERE id = target_id;

  -- 3. Auto-resolve check
  IF v_downvotes >= 5 THEN
    SELECT COUNT(*) INTO v_last5_deny
    FROM (
      SELECT vote_type FROM votes
      WHERE  closure_id = target_id
      ORDER  BY created_at DESC
      LIMIT  5
    ) recent
    WHERE vote_type = 'deny';

    IF v_last5_deny = 5 THEN
      -- All last 5 votes are deny → clear signal, auto-resolve
      UPDATE closures
      SET    status = 'resolved'
      WHERE  id = target_id
        AND  status <> 'resolved';
    ELSE
      -- Mixed signal → flag for admin review
      UPDATE closures
      SET    status = 'pending_review'
      WHERE  id = target_id
        AND  status NOT IN ('resolved', 'pending_review');
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger itself already exists from migration 003; no need to recreate it.
-- Just replacing the function body is enough.
