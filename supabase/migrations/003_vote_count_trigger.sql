-- Keep closures.upvotes / downvotes in sync whenever a vote is
-- inserted, updated, or deleted.  This makes the counts reliable for
-- the client without needing SELECT on the votes table.

CREATE OR REPLACE FUNCTION sync_closure_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
  target_id uuid;
BEGIN
  target_id := COALESCE(NEW.closure_id, OLD.closure_id);

  UPDATE closures
  SET
    upvotes   = (SELECT COUNT(*) FROM votes WHERE closure_id = target_id AND vote_type = 'confirm'),
    downvotes = (SELECT COUNT(*) FROM votes WHERE closure_id = target_id AND vote_type = 'deny')
  WHERE id = target_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_closure_vote_counts ON votes;

CREATE TRIGGER trg_sync_closure_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION sync_closure_vote_counts();

-- Backfill existing rows so counts are correct right away
UPDATE closures c
SET
  upvotes   = (SELECT COUNT(*) FROM votes WHERE closure_id = c.id AND vote_type = 'confirm'),
  downvotes = (SELECT COUNT(*) FROM votes WHERE closure_id = c.id AND vote_type = 'deny');
