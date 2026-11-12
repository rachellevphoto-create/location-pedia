import { NextRequest, NextResponse } from "next/server";
import { searchLocations, parseFilterRow, type DiscoverFilters } from "@/lib/geo";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { imageUrl } from "@/lib/cloudinary";
import { forwardGeocode } from "@/lib/geocoding";
import { getFilterOptions, SYSTEM_FILTERS } from "@/lib/filters";

function parseBool(v: string | null): boolean | null {
  if (v === null) return null;
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return null;
}

function parseFloatOrNull(v: string | null) {
  if (v === null) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const isAdmin = session?.user?.role === "ADMIN";

  const favoritesOnly = parseBool(sp.get("favoritesOnly")) === true;
  const ratingMin = parseFloatOrNull(sp.get("ratingMin"));

  // Amenity and style slugs come from the DB; unknown slugs are ignored.
  const options = await getFilterOptions();
  const amenitySet = new Set(options.amenities);
  const styleSet = new Set(options.styles);
  const listParam = (name: string, allowed: Set<string>) =>
    (sp.get(name) ?? "").split(",").filter((s) => allowed.has(s));
  const boolFilters = listParam("amenities", amenitySet);

  const filters: DiscoverFilters = {
    boolFilters,
    paid: parseBool(sp.get("paid")),
    styleTags: listParam("tags", styleSet),
    priceMin: parseFloatOrNull(sp.get("priceMin")),
    priceMax: parseFloatOrNull(sp.get("priceMax")),
    q: sp.get("q"),
    limit: parseFloatOrNull(sp.get("limit")) ?? undefined,
    ratingMin: ratingMin != null && ratingMin > 0 ? ratingMin : null,
    favoritesOnly: favoritesOnly && !!userId,
    userId,
    viewerIsAdmin: isAdmin,
  };

  const fromLat = parseFloatOrNull(sp.get("fromLat"));
  const fromLng = parseFloatOrNull(sp.get("fromLng"));
  if (fromLat != null && fromLng != null) filters.from = { lat: fromLat, lng: fromLng };

  const minLng = parseFloatOrNull(sp.get("minLng"));
  const minLat = parseFloatOrNull(sp.get("minLat"));
  const maxLng = parseFloatOrNull(sp.get("maxLng"));
  const maxLat = parseFloatOrNull(sp.get("maxLat"));
  if (
    minLng != null &&
    minLat != null &&
    maxLng != null &&
    maxLat != null
  ) {
    filters.bbox = { minLng, minLat, maxLng, maxLat };
  }

  let rows = await searchLocations(filters);

  if (
    rows.length === 0 &&
    filters.q &&
    filters.q.trim().length >= 2 &&
    !filters.bbox
  ) {
    const fg = await forwardGeocode(filters.q.trim()).catch(() => null);
    if (fg) {
      const fallback = await searchLocations({
        ...filters,
        q: null,
        bbox: fg.bbox,
      });
      rows = fallback;
    }
  }
  const ids = rows.map((r) => r.id);

  const favoriteSet = new Set<string>();
  if (userId && ids.length > 0) {
    const favorites = await prisma.favorite.findMany({
      where: { userId, locationId: { in: ids } },
      select: { locationId: true },
    });
    for (const f of favorites) favoriteSet.add(f.locationId);
  }

  const favoriteCounts = new Map<string, number>();
  if (ids.length > 0) {
    const counts = await prisma.favorite.groupBy({
      by: ["locationId"],
      where: { locationId: { in: ids } },
      _count: { locationId: true },
    });
    for (const c of counts) {
      favoriteCounts.set(c.locationId, c._count.locationId);
    }
  }

  const features = rows.map((r) => {
    const fm = parseFilterRow(r);
    const isSecret = !!fm[SYSTEM_FILTERS.isSecret];
    // `locked` comes from SQL, which already masked coords and distance.
    const unlocked = !r.locked;
    const slugs = r.filter_slugs ?? [];

    return {
      id: r.id,
      slug: r.slug,
      // Locked: send no text at all; the client shows a translated teaser.
      title: unlocked ? r.title : "",
      description: unlocked ? r.description : "",
      latitude: r.latitude,
      longitude: r.longitude,
      isSecret,
      unlocked,
      amenities: options.amenities.filter((a) => slugs.includes(a)),
      paid: !!fm[SYSTEM_FILTERS.paid],
      styleTags: options.styles.filter((st) => slugs.includes(st)),
      filters: fm,
      helpfulCount: r.helpfulCount ?? 0,
      ratingAvg: r.ratingAvg,
      ratingCount: r.ratingCount,
      // Cloudinary URLs are public (a CSS blur is not protection), so a
      // locked spot sends no photo.
      hero:
        unlocked && r.hero
          ? imageUrl(r.hero, { width: 800, height: 600, watermark: true })
          : null,
      distanceMeters: r.distance_m,
      isFavorite: favoriteSet.has(r.id),
      favoriteCount: favoriteCounts.get(r.id) ?? 0,
    };
  });

  return NextResponse.json({ items: features });
}
