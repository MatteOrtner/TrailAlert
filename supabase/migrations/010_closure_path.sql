-- Optional path (polyline) for a closure — stores an ordered array of
-- {lat, lng} objects describing the blocked trail section.
-- NULL means only the single marker point was provided.
ALTER TABLE closures ADD COLUMN IF NOT EXISTS path_points jsonb;
