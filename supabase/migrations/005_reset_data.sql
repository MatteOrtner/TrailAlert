-- Reset all closure and vote data (remove test/prop entries)
-- Votes are deleted automatically via ON DELETE CASCADE on closure_id

DELETE FROM votes;
DELETE FROM closures;
