import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type LatLng = { lat: number; lng: number };
export type BBox = { minLng: number; minLat: number; maxLng: number; maxLat: number };

/**
 * Distance in meters from (lat,lng) to a Location's coords using PostGIS.
 * Returns null if `from` is not provided.
 */
export async function locationDistanceMeters(
  locationId: string,
  from?: LatLng | null,
): Promise<number | null> {
  if (!from) return null;
  const rows = await prisma.$queryRaw<{ distance_m: number }[]>`
    SELECT ST_Distance(
      ST_SetSRID(ST_MakePoint(${from.lng}, ${from.lat}), 4326)::geography,
      ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
    ) AS distance_m
    FROM "Location" WHERE id = ${locationId} LIMIT 1`;
  return rows[0]?.distance_m ?? null;
}

export type DiscoverFilters = {
  wheelchair?: boolean;
  publicTransport?: boolean;
  restroom?: boolean;
  paid?: boolean | null;
  styleTags?: string[];
  priceMin?: number | null;
  priceMax?: number | null;
  q?: string | null;
  bbox?: BBox | null;
  from?: LatLng | null;
  limit?: number;
};

export type DiscoverRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  wheelchair: boolean;
  publicTransport: boolean;
  restroom: boolean;
  paid: boolean;
  isSecret: boolean;
  styleTags: string[];
  helpfulCount: number;
  ratingAvg: number | null;
  ratingCount: number;
  hero: string | null;
  distance_m: number | null;
};

/**
 * Spatial+filter query for the discover page. Returns published locations.
 * Distance is computed when `from` is provided, otherwise null.
 */
export async function searchLocations(
  filters: DiscoverFilters,
): Promise<DiscoverRow[]> {
  const limit = Math.min(Math.max(filters.limit ?? 60, 1), 200);

  const fromLng = filters.from?.lng ?? null;
  const fromLat = filters.from?.lat ?? null;

  const wheres: Prisma.Sql[] = [Prisma.sql`l."status" = 'PUBLISHED'`];
  if (filters.wheelchair) wheres.push(Prisma.sql`l."wheelchair" = true`);
  if (filters.publicTransport)
    wheres.push(Prisma.sql`l."publicTransport" = true`);
  if (filters.restroom) wheres.push(Prisma.sql`l."restroom" = true`);
  if (filters.paid === true) wheres.push(Prisma.sql`l."paid" = true`);
  if (filters.paid === false) wheres.push(Prisma.sql`l."paid" = false`);
  if (filters.priceMin != null)
    wheres.push(Prisma.sql`COALESCE(l."priceMax", l."priceMin", 0) >= ${filters.priceMin}`);
  if (filters.priceMax != null)
    wheres.push(Prisma.sql`COALESCE(l."priceMin", l."priceMax", 0) <= ${filters.priceMax}`);
  if (filters.styleTags && filters.styleTags.length > 0) {
    wheres.push(Prisma.sql`l."styleTags" && ${filters.styleTags}::text[]`);
  }
  if (filters.q && filters.q.trim().length > 0) {
    const term = `%${filters.q.trim()}%`;
    wheres.push(Prisma.sql`(l."title" ILIKE ${term} OR l."description" ILIKE ${term})`);
  }
  if (filters.bbox) {
    const { minLng, minLat, maxLng, maxLat } = filters.bbox;
    wheres.push(Prisma.sql`l."longitude" BETWEEN ${minLng} AND ${maxLng}`);
    wheres.push(Prisma.sql`l."latitude" BETWEEN ${minLat} AND ${maxLat}`);
  }

  const whereSql = Prisma.join(wheres, " AND ");

  const distanceSelect =
    fromLat != null && fromLng != null
      ? Prisma.sql`ST_Distance(
            ST_SetSRID(ST_MakePoint(${fromLng}, ${fromLat}), 4326)::geography,
            ST_SetSRID(ST_MakePoint(l."longitude", l."latitude"), 4326)::geography
          )`
      : Prisma.sql`NULL`;

  const orderSql =
    fromLat != null && fromLng != null
      ? Prisma.sql`distance_m ASC NULLS LAST, l."createdAt" DESC`
      : Prisma.sql`l."createdAt" DESC`;

  const rows = await prisma.$queryRaw<DiscoverRow[]>`
    SELECT
      l."id", l."slug", l."title", l."description",
      l."latitude", l."longitude",
      l."wheelchair", l."publicTransport", l."restroom", l."paid",
      l."isSecret", l."styleTags",
      ${distanceSelect} AS distance_m,
      (
        SELECT COALESCE(SUM(p."helpfulCount"), 0)::int
        FROM "Photo" p WHERE p."locationId" = l."id"
      ) AS "helpfulCount",
      (
        SELECT AVG(r."stars")::float FROM "Rating" r WHERE r."locationId" = l."id"
      ) AS "ratingAvg",
      (
        SELECT COUNT(*)::int FROM "Rating" r WHERE r."locationId" = l."id"
      ) AS "ratingCount",
      (
        SELECT p."cloudinaryPublicId" FROM "Photo" p
        WHERE p."locationId" = l."id"
        ORDER BY (CASE WHEN p."kind" = 'INSPIRATION' THEN 0 ELSE 1 END), p."createdAt" ASC
        LIMIT 1
      ) AS hero
    FROM "Location" l
    WHERE ${whereSql}
    ORDER BY ${orderSql}
    LIMIT ${limit}
  `;

  return rows;
}
