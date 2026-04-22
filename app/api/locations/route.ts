import { NextRequest, NextResponse } from "next/server";
import { searchLocations, parseFilterRow, type DiscoverFilters } from "@/lib/geo";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { imageUrl } from "@/lib/cloudinary";
import { forwardGeocode } from "@/lib/geocoding";

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

const BOOL_FILTER_PARAMS = ["wheelchair", "publicTransport", "restroom", "drone"] as const;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const isAdmin = session?.user?.role === "ADMIN";

  const favoritesOnly = parseBool(sp.get("favoritesOnly")) === true;
  const ratingMin = parseFloatOrNull(sp.get("ratingMin"));

  const boolFilters: string[] = [];
  for (const param of BOOL_FILTER_PARAMS) {
    if (parseBool(sp.get(param))) boolFilters.push(param);
  }

  const filters: DiscoverFilters = {
    boolFilters,
    paid: parseBool(sp.get("paid")),
    styleTags: sp.get("tags")?.split(",").filter(Boolean) ?? [],
    priceMin: parseFloatOrNull(sp.get("priceMin")),
    priceMax: parseFloatOrNull(sp.get("priceMax")),
    q: sp.get("q"),
    limit: parseFloatOrNull(sp.get("limit")) ?? undefined,
    ratingMin: ratingMin != null && ratingMin > 0 ? ratingMin : null,
    favoritesOnly: favoritesOnly && !!userId,
    userId,
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

  const unlockedSet = new Set<string>();
  const favoriteSet = new Set<string>();
  if (userId && ids.length > 0) {
    const [unlocks, favorites] = await Promise.all([
      prisma.secretUnlock.findMany({
        where: { userId, locationId: { in: ids } },
        select: { locationId: true },
      }),
      prisma.favorite.findMany({
        where: { userId, locationId: { in: ids } },
        select: { locationId: true },
      }),
    ]);
    for (const u of unlocks) unlockedSet.add(u.locationId);
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
    const isSecret = !!fm.isSecret;
    const unlocked = !isSecret || isAdmin || unlockedSet.has(r.id);
    const styleTags = (r.filter_slugs ?? []).filter((s) => {
      // Style tags are the ones that aren't amenity/price/special slugs
      return !["wheelchair", "publicTransport", "restroom", "changingRoom", "drone", "paid", "priceMin", "priceMax", "isSecret"].includes(s);
    });

    return {
      id: r.id,
      slug: r.slug,
      title: unlocked ? r.title : "Premium location",
      description: unlocked ? r.description : "Unlock to see details.",
      latitude: unlocked ? r.latitude : maskCoord(r.latitude),
      longitude: unlocked ? r.longitude : maskCoord(r.longitude),
      isSecret,
      unlocked,
      wheelchair: !!fm.wheelchair,
      publicTransport: !!fm.publicTransport,
      restroom: !!fm.restroom,
      paid: !!fm.paid,
      drone: !!fm.drone,
      styleTags,
      filters: fm,
      helpfulCount: r.helpfulCount ?? 0,
      ratingAvg: r.ratingAvg,
      ratingCount: r.ratingCount,
      hero: r.hero ? imageUrl(r.hero, { width: 800, height: 600, watermark: true }) : null,
      distanceMeters: r.distance_m,
      isFavorite: favoriteSet.has(r.id),
      favoriteCount: favoriteCounts.get(r.id) ?? 0,
    };
  });

  return NextResponse.json({ items: features });
}

function maskCoord(n: number) {
  return Math.round(n * 10) / 10;
}
