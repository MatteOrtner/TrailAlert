-- Add pending_review status for closures flagged for admin review
-- (triggered when deny votes >= 5 but recent vote pattern is mixed)
ALTER TYPE closure_status ADD VALUE IF NOT EXISTS 'pending_review';
