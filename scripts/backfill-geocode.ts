/**
 * One-shot backfill that populates Location.city/area/country for rows that
 * are missing all three. Run with:
 *
 *   npx tsx scripts/backfill-geocode.ts
 *
 * The Nominatim throttle inside lib/geocoding.ts ensures we stay under the
 * 1 req/sec rate limit, so this is safe to run for hundreds of rows.
 */
import { prisma } from "@/lib/db";
import { reverseGeocode } from "@/lib/geocoding";

async function main() {
  const rows = await prisma.location.findMany({
    where: {
      AND: [{ city: null }, { area: null }, { country: null }],
    },
    select: { id: true, slug: true, latitude: true, longitude: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`[backfill-geocode] ${rows.length} location(s) to enrich`);

  let updated = 0;
  for (const r of rows) {
    const geo = await reverseGeocode(r.latitude, r.longitude, "en").catch(
      () => null,
    );
    if (!geo) {
      console.warn(`[backfill-geocode] no result for ${r.slug}`);
      continue;
    }
    await prisma.location.update({
      where: { id: r.id },
      data: {
        city: geo.city ?? null,
        area: geo.area ?? null,
        country: geo.country ?? null,
      },
    });
    updated += 1;
    console.log(
      `[backfill-geocode] ${r.slug} -> ${geo.city ?? "?"} / ${geo.area ?? "?"} / ${geo.country ?? "?"}`,
    );
  }

  console.log(`[backfill-geocode] done; updated ${updated}/${rows.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
