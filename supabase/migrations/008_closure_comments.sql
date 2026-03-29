-- ---------------------------------------------------------------------------
-- 008 Add Closure Comments
-- ---------------------------------------------------------------------------

CREATE TABLE closure_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closure_id UUID NOT NULL REFERENCES closures(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (char_length(text) > 0 AND char_length(text) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE closure_comments ENABLE ROW LEVEL SECURITY;

-- Policies

-- Everyone can view comments
CREATE POLICY "Comments are viewable by everyone"
  ON closure_comments FOR SELECT
  USING (true);

-- Authenticated users can create comments
CREATE POLICY "Users can create comments"
  ON closure_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON closure_comments FOR DELETE
  USING (auth.uid() = user_id);
