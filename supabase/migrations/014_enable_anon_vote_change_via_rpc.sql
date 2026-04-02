-- =============================================================================
-- TrailAlert - Allow anonymous users to change their own vote safely
-- =============================================================================
-- We keep strict RLS (anon INSERT only) and expose a narrow SECURITY DEFINER
-- function that updates/inserts only by (closure_id, anon_fingerprint).

CREATE OR REPLACE FUNCTION public.cast_or_update_anon_vote(
  p_closure_id uuid,
  p_vote_type public.vote_type,
  p_anon_fingerprint text
)
RETURNS public.votes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vote public.votes;
BEGIN
  IF p_anon_fingerprint IS NULL OR char_length(trim(p_anon_fingerprint)) < 16 THEN
    RAISE EXCEPTION 'Invalid anonymous fingerprint'
      USING ERRCODE = '22023';
  END IF;

  -- First try to update an existing anonymous vote for this closure/fingerprint.
  UPDATE public.votes
  SET vote_type = p_vote_type
  WHERE closure_id = p_closure_id
    AND user_id IS NULL
    AND anon_fingerprint = p_anon_fingerprint
  RETURNING * INTO v_vote;

  IF FOUND THEN
    RETURN v_vote;
  END IF;

  -- If none exists, insert one. ON CONFLICT protects against races.
  INSERT INTO public.votes (closure_id, user_id, vote_type, anon_fingerprint)
  VALUES (p_closure_id, NULL, p_vote_type, p_anon_fingerprint)
  ON CONFLICT (closure_id, anon_fingerprint)
  DO UPDATE SET vote_type = EXCLUDED.vote_type
  RETURNING * INTO v_vote;

  RETURN v_vote;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_or_update_anon_vote(uuid, public.vote_type, text)
TO anon, authenticated;
