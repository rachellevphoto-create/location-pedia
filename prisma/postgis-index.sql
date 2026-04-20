-- Run this AFTER `prisma migrate dev`/`migrate deploy` has created the
-- `Location` table. This adds a GIST functional index so ST_DWithin and
-- ST_Distance queries against (longitude, latitude) can use an index.
--
--   psql "$DATABASE_URL" -f prisma/postgis-index.sql

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE INDEX IF NOT EXISTS "Location_coords_gix"
  ON "Location"
  USING GIST (
    (ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography)
  );
