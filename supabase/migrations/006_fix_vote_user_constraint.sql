-- uq_vote_user was created with NULLS NOT DISTINCT, meaning all rows
-- with user_id = NULL counted as duplicates of each other per closure.
-- This blocked anonymous votes past the first one per closure.
-- Recreate with standard NULLS DISTINCT so only real user_ids are unique.

ALTER TABLE votes DROP CONSTRAINT uq_vote_user;

ALTER TABLE votes
  ADD CONSTRAINT uq_vote_user UNIQUE (closure_id, user_id);
