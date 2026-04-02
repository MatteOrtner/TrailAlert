-- =============================================================================
-- TrailAlert - Optional closure route geometry
-- =============================================================================
-- Adds optional start/end points and route geometry for linear closures.

ALTER TABLE public.closures
  ADD COLUMN IF NOT EXISTS route_start_lat float8,
  ADD COLUMN IF NOT EXISTS route_start_lng float8,
  ADD COLUMN IF NOT EXISTS route_end_lat   float8,
  ADD COLUMN IF NOT EXISTS route_end_lng   float8,
  ADD COLUMN IF NOT EXISTS route_path      jsonb,
  ADD COLUMN IF NOT EXISTS route_distance_m int4;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'closures_route_points_all_or_none'
  ) THEN
    ALTER TABLE public.closures
      ADD CONSTRAINT closures_route_points_all_or_none
      CHECK (
        (
          route_start_lat IS NULL
          AND route_start_lng IS NULL
          AND route_end_lat IS NULL
          AND route_end_lng IS NULL
        )
        OR
        (
          route_start_lat IS NOT NULL
          AND route_start_lng IS NOT NULL
          AND route_end_lat IS NOT NULL
          AND route_end_lng IS NOT NULL
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'closures_route_points_bounds'
  ) THEN
    ALTER TABLE public.closures
      ADD CONSTRAINT closures_route_points_bounds
      CHECK (
        route_start_lat IS NULL
        OR (
          route_start_lat BETWEEN -90 AND 90
          AND route_end_lat BETWEEN -90 AND 90
          AND route_start_lng BETWEEN -180 AND 180
          AND route_end_lng BETWEEN -180 AND 180
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'closures_route_path_linestring'
  ) THEN
    ALTER TABLE public.closures
      ADD CONSTRAINT closures_route_path_linestring
      CHECK (
        route_path IS NULL
        OR (
          jsonb_typeof(route_path) = 'object'
          AND route_path->>'type' = 'LineString'
          AND jsonb_typeof(route_path->'coordinates') = 'array'
          AND jsonb_array_length(route_path->'coordinates') >= 2
        )
      );
  END IF;
END $$;
