import { NextRequest, NextResponse } from "next/server";
import { searchLocations, type DiscoverFilters } from "@/lib/geo";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { imageUrl } from "@/lib/cloudinary";

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
  const filters: DiscoverFilters = {
    wheelchair: parseBool(sp.get("wheelchair")) ?? false,
    publicTransport: parseBool(sp.get("publicTransport")) ?? false,
    restroom: parseBool(sp.get("restroom")) ?? false,
    paid: parseBool(sp.get("paid")),
    styleTags: sp.get("tags")?.split(",").filter(Boolean) ?? [],
    priceMin: parseFloatOrNull(sp.get("priceMin")),
    priceMax: parseFloatOrNull(sp.get("priceMax")),
    q: sp.get("q"),
    limit: parseFloatOrNull(sp.get("limit")) ?? undefined,
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

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const isAdmin = session?.user?.role === "ADMIN";

  const rows = await searchLocations(filters);

  // Determine which secret locations the current user has unlocked.
  const unlockedSet = new Set<string>();
  if (userId) {
    const unlocks = await prisma.secretUnlock.findMany({
      where: { userId, locationId: { in: rows.map((r) => r.id) } },
      select: { locationId: true },
    });
    for (const u of unlocks) unlockedSet.add(u.locationId);
  }

  const features = rows.map((r) => {
    const unlocked = !r.isSecret || isAdmin || unlockedSet.has(r.id);
    return {
      id: r.id,
      slug: r.slug,
      title: unlocked ? r.title : "Secret location",
      description: unlocked ? r.description : "Unlock to see details.",
      latitude: unlocked ? r.latitude : maskCoord(r.latitude),
      longitude: unlocked ? r.longitude : maskCoord(r.longitude),
      isSecret: r.isSecret,
      unlocked,
      wheelchair: r.wheelchair,
      publicTransport: r.publicTransport,
      restroom: r.restroom,
      paid: r.paid,
      styleTags: r.styleTags,
      helpfulCount: r.helpfulCount ?? 0,
      ratingAvg: r.ratingAvg,
      ratingCount: r.ratingCount,
      hero: r.hero ? imageUrl(r.hero, { width: 800, height: 600, watermark: true }) : null,
      distanceMeters: r.distance_m,
    };
  });

  return NextResponse.json({ items: features });
}

function maskCoord(n: number) {
  return Math.round(n * 10) / 10;
}
