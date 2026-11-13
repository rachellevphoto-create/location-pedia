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
  /** Boolean filter slugs that must be present (e.g. wheelchair, publicTransport, drone) */
  boolFilters?: string[];
  /** Tri-state paid filter: true = paid, false = free, null/undefined = any */
  paid?: boolean | null;
  styleTags?: string[];
  priceMin?: number | null;
  priceMax?: number | null;
  q?: string | null;
  bbox?: BBox | null;
  from?: LatLng | null;
  limit?: number;
  ratingMin?: number | null;
  favoritesOnly?: boolean;
  userId?: string | null;
  /** Admins see every premium spot unlocked. */
  viewerIsAdmin?: boolean;
};

export type DiscoverRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  helpfulCount: number;
  ratingAvg: number | null;
  ratingCount: number;
  hero: string | null;
  distance_m: number | null;
  filter_slugs: string[];
  filter_nums: string | null;
  /** Premium spot the viewer has not unlocked. latitude/longitude are then
   *  rounded to 0.1 degree and distance_m is measured to that rounded point. */
  locked: boolean;
};

/** Parsed filter map built from DiscoverRow raw data */
export type LocationFilterMap = Record<string, boolean | number>;

export function parseFilterRow(row: DiscoverRow): LocationFilterMap {
  const map: LocationFilterMap = {};
  for (const slug of row.filter_slugs ?? []) {
    map[slug] = true;
  }
  if (row.filter_nums) {
    try {
      const nums = JSON.parse(row.filter_nums) as Record<string, number>;
      for (const [k, v] of Object.entries(nums)) {
        map[k] = v;
      }
    } catch {}
  }
  return map;
}

/**
 * Spatial+filter query for the discover page. Returns published locations.
 * Distance is computed when `from` is provided, otherwise null.
 */
export async function searchLocations(
  filters: DiscoverFilters,
): Promise<DiscoverRow[]> {
  // The map clusters pins on the client, so send every match in view (the
  // old default of 60 silently hid the rest and the count said "60").
  const limit = Math.min(Math.max(filters.limit ?? 500, 1), 1000);

  const fromLng = filters.from?.lng ?? null;
  const fromLat = filters.from?.lat ?? null;

  const wheres: Prisma.Sql[] = [
    Prisma.sql`l."status" = 'PUBLISHED'`,
    Prisma.sql`l."hidden" = false`,
  ];

  if (filters.boolFilters && filters.boolFilters.length > 0) {
    for (const slug of filters.boolFilters) {
      wheres.push(
        Prisma.sql`EXISTS (
          SELECT 1 FROM "LocationFilter" lf
          JOIN "FilterDefinition" fd ON fd."id" = lf."filterId"
          WHERE lf."locationId" = l."id" AND fd."slug" = ${slug} AND lf."boolValue" = true
        )`,
      );
    }
  }

  if (filters.paid === true) {
    wheres.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM "LocationFilter" lf
        JOIN "FilterDefinition" fd ON fd."id" = lf."filterId"
        WHERE lf."locationId" = l."id" AND fd."slug" = 'paid' AND lf."boolValue" = true
      )`,
    );
  }
  if (filters.paid === false) {
    wheres.push(
      Prisma.sql`NOT EXISTS (
        SELECT 1 FROM "LocationFilter" lf
        JOIN "FilterDefinition" fd ON fd."id" = lf."filterId"
        WHERE lf."locationId" = l."id" AND fd."slug" = 'paid' AND lf."boolValue" = true
      )`,
    );
  }

  if (filters.priceMin != null) {
    wheres.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM "LocationFilter" lf
        JOIN "FilterDefinition" fd ON fd."id" = lf."filterId"
        WHERE lf."locationId" = l."id" AND fd."slug" = 'priceMax' AND lf."numValue" >= ${filters.priceMin}
      )`,
    );
  }
  if (filters.priceMax != null) {
    wheres.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM "LocationFilter" lf
        JOIN "FilterDefinition" fd ON fd."id" = lf."filterId"
        WHERE lf."locationId" = l."id" AND fd."slug" = 'priceMin' AND lf."numValue" <= ${filters.priceMax}
      )`,
    );
  }

  if (filters.styleTags && filters.styleTags.length > 0) {
    wheres.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM "LocationFilter" lf
        JOIN "FilterDefinition" fd ON fd."id" = lf."filterId"
        WHERE lf."locationId" = l."id" AND fd."slug" = ANY(${filters.styleTags}::text[]) AND lf."boolValue" = true
      )`,
    );
  }

  if (filters.q && filters.q.trim().length > 0) {
    const term = `%${filters.q.trim()}%`;
    // Locked premium spots never match text search: a hit would leak words
    // from their hidden title/description/area.
    wheres.push(
      Prisma.sql`NOT v.locked AND (l."title" ILIKE ${term} OR l."description" ILIKE ${term} OR l."city" ILIKE ${term} OR l."area" ILIKE ${term} OR l."country" ILIKE ${term})`,
    );
  }
  if (filters.bbox) {
    // Use the (masked) coords so zooming into a tiny box cannot pinpoint a
    // locked spot.
    const { minLng, minLat, maxLng, maxLat } = filters.bbox;
    wheres.push(Prisma.sql`v.lng BETWEEN ${minLng} AND ${maxLng}`);
    wheres.push(Prisma.sql`v.lat BETWEEN ${minLat} AND ${maxLat}`);
  }
  if (filters.favoritesOnly && filters.userId) {
    wheres.push(
      Prisma.sql`EXISTS (SELECT 1 FROM "Favorite" f WHERE f."userId" = ${filters.userId} AND f."locationId" = l."id")`,
    );
  }
  if (filters.ratingMin != null && filters.ratingMin > 0) {
    wheres.push(
      Prisma.sql`COALESCE((SELECT AVG(r."stars") FROM "Rating" r WHERE r."locationId" = l."id"), 0) >= ${filters.ratingMin}`,
    );
  }

  const whereSql = Prisma.join(wheres, " AND ");

  const lockedSql = filters.viewerIsAdmin
    ? Prisma.sql`false`
    : Prisma.sql`(
        EXISTS (
          SELECT 1 FROM "LocationFilter" lf
          JOIN "FilterDefinition" fd ON fd."id" = lf."filterId"
          WHERE lf."locationId" = l."id" AND fd."slug" = 'isSecret' AND lf."boolValue" = true
        )
        AND NOT EXISTS (
          SELECT 1 FROM "SecretUnlock" su
          WHERE su."locationId" = l."id" AND su."userId" = ${filters.userId ?? ""}
        )
      )`;

  const distanceSelect =
    fromLat != null && fromLng != null
      ? Prisma.sql`ST_Distance(
            ST_SetSRID(ST_MakePoint(${fromLng}, ${fromLat}), 4326)::geography,
            ST_SetSRID(ST_MakePoint(v.lng, v.lat), 4326)::geography
          )`
      : Prisma.sql`NULL`;

  const orderSql =
    fromLat != null && fromLng != null
      ? Prisma.sql`distance_m ASC NULLS LAST, l."createdAt" DESC`
      : Prisma.sql`l."createdAt" DESC`;

  const rows = await prisma.$queryRaw<DiscoverRow[]>`
    SELECT
      l."id", l."slug", l."title", l."description",
      v.lat AS "latitude", v.lng AS "longitude", v.locked AS "locked",
      ${distanceSelect} AS distance_m,
      (
        SELECT COALESCE(SUM(p."helpfulCount"), 0)::int
        FROM "Photo" p WHERE p."locationId" = l."id" AND p."status" = 'APPROVED'
      ) AS "helpfulCount",
      (
        SELECT AVG(r."stars")::float FROM "Rating" r WHERE r."locationId" = l."id"
      ) AS "ratingAvg",
      (
        SELECT COUNT(*)::int FROM "Rating" r WHERE r."locationId" = l."id"
      ) AS "ratingCount",
      (
        SELECT p."cloudinaryPublicId" FROM "Photo" p
        WHERE p."locationId" = l."id" AND p."status" = 'APPROVED'
        ORDER BY (CASE WHEN p."kind" = 'INSPIRATION' THEN 0 ELSE 1 END), p."createdAt" ASC
        LIMIT 1
      ) AS hero,
      COALESCE(
        (SELECT array_agg(fd."slug")
         FROM "LocationFilter" lf
         JOIN "FilterDefinition" fd ON fd."id" = lf."filterId"
         WHERE lf."locationId" = l."id" AND lf."boolValue" = true),
        ARRAY[]::text[]
      ) AS filter_slugs,
      (SELECT json_object_agg(fd."slug", lf."numValue")
       FROM "LocationFilter" lf
       JOIN "FilterDefinition" fd ON fd."id" = lf."filterId"
       WHERE lf."locationId" = l."id" AND lf."numValue" IS NOT NULL
      )::text AS filter_nums
    FROM "Location" l
    CROSS JOIN LATERAL (
      SELECT ${lockedSql} AS locked
    ) lk
    CROSS JOIN LATERAL (
      SELECT
        lk.locked AS locked,
        CASE WHEN lk.locked THEN round(l."latitude"::numeric, 1)::float8 ELSE l."latitude" END AS lat,
        CASE WHEN lk.locked THEN round(l."longitude"::numeric, 1)::float8 ELSE l."longitude" END AS lng
    ) v
    WHERE ${whereSql}
    ORDER BY ${orderSql}
    LIMIT ${limit}
  `;

  return rows;
}
