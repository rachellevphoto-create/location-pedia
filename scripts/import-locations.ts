/**
 * Bulk-import locations from a JSON file into the database, as PUBLISHED
 * spots owned by the first ADMIN user. Photos given as public URLs are
 * copied into Cloudinary.
 *
 *   DATABASE_URL=... npx tsx scripts/import-locations.ts <file.json> [--go]
 *
 * Without --go it only validates and prints what it would do (dry run).
 * Safe to run twice: a location with the same title within ~50 m of an
 * existing one is skipped.
 *
 * Each item:
 * {
 *   "title": string, "description": string, "directions"?: string,
 *   "lat": number, "lng": number, "city"?: string,
 *   "styleTags"?: string[],            // STYLE slugs
 *   "amenities"?: string[],            // AMENITY slugs (e.g. "wheelchair")
 *   "wheelchair"?: boolean,            // shortcut for amenities: ["wheelchair"]
 *   "paid"?: boolean, "price"?: number | null,
 *   "photos"?: string[]                // public image URLs
 * }
 */
import { readFileSync } from "node:fs";
import { v2 as cloudinary } from "cloudinary";
import { prisma } from "@/lib/db";
import { generateSlug } from "@/lib/utils";
import { SYSTEM_FILTERS } from "@/lib/filters";

type Item = {
  title: string;
  description: string;
  directions?: string;
  lat: number;
  lng: number;
  city?: string;
  styleTags?: string[];
  amenities?: string[];
  wheelchair?: boolean;
  paid?: boolean;
  price?: number | null;
  photos?: string[];
};

const [file, flag] = process.argv.slice(2);
const GO = flag === "--go";
if (!file) {
  console.error("usage: tsx scripts/import-locations.ts <file.json> [--go]");
  process.exit(1);
}

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const folder = process.env.CLOUDINARY_UPLOAD_FOLDER ?? "locatepedia";
if (cloudName) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function validate(items: Item[], knownSlugs: Set<string>) {
  const errors: string[] = [];
  items.forEach((it, i) => {
    const where = `#${i} "${it.title}"`;
    if (!it.title || it.title.length > 120) errors.push(`${where}: bad title`);
    if (!it.description || it.description.length < 20) errors.push(`${where}: description < 20 chars`);
    if (typeof it.lat !== "number" || it.lat < 29 || it.lat > 33.5) errors.push(`${where}: lat outside Israel`);
    if (typeof it.lng !== "number" || it.lng < 34 || it.lng > 36) errors.push(`${where}: lng outside Israel`);
    for (const s of [...(it.styleTags ?? []), ...(it.amenities ?? [])]) {
      if (!knownSlugs.has(s)) errors.push(`${where}: unknown filter "${s}"`);
    }
  });
  return errors;
}

async function main() {
  const items: Item[] = JSON.parse(readFileSync(file, "utf8"));
  const defs = await prisma.filterDefinition.findMany();
  const slugToId = new Map(defs.map((d) => [d.slug, d.id]));
  const errors = validate(items, new Set(slugToId.keys()));
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", status: "APPROVED" },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) throw new Error("No approved ADMIN user to own the locations");
  if (GO && items.some((i) => i.photos?.length) && !cloudName) {
    throw new Error("Photos given but Cloudinary env vars are missing");
  }

  let created = 0;
  let skipped = 0;
  let photos = 0;
  for (const it of items) {
    // ~50 m box: same title nearby means it was imported already.
    const dupe = await prisma.location.findFirst({
      where: {
        title: it.title,
        latitude: { gte: it.lat - 0.0005, lte: it.lat + 0.0005 },
        longitude: { gte: it.lng - 0.0005, lte: it.lng + 0.0005 },
      },
      select: { id: true },
    });
    if (dupe) {
      skipped++;
      console.log(`skip (exists)  ${it.title}`);
      continue;
    }

    const filters: { slug: string; numValue?: number }[] = [];
    for (const s of it.styleTags ?? []) filters.push({ slug: s });
    const amenities = new Set(it.amenities ?? []);
    if (it.wheelchair) amenities.add("wheelchair");
    for (const s of amenities) filters.push({ slug: s });
    if (it.paid) filters.push({ slug: SYSTEM_FILTERS.paid });
    if (it.price != null) {
      filters.push({ slug: SYSTEM_FILTERS.priceMin, numValue: it.price });
      filters.push({ slug: SYSTEM_FILTERS.priceMax, numValue: it.price });
    }

    if (!GO) {
      console.log(
        `would create  ${it.title}  (${it.lat.toFixed(4)},${it.lng.toFixed(4)})  ` +
          `[${filters.map((f) => f.slug).join(", ")}]  photos=${it.photos?.length ?? 0}`,
      );
      created++;
      continue;
    }

    const uploaded: string[] = [];
    for (const url of it.photos ?? []) {
      try {
        const r = await cloudinary.uploader.upload(url, { folder, resource_type: "image" });
        uploaded.push(r.public_id);
      } catch (e) {
        console.warn(`  ! photo failed for ${it.title}: ${(e as Error).message}`);
      }
    }

    let slug = generateSlug();
    while (await prisma.location.findUnique({ where: { slug } })) slug = generateSlug();

    await prisma.location.create({
      data: {
        slug,
        title: it.title,
        description: it.description,
        directions: it.directions?.trim() || null,
        latitude: it.lat,
        longitude: it.lng,
        city: it.city?.trim() || null,
        status: "PUBLISHED",
        approvedAt: new Date(),
        submitterId: admin.id,
        locationFilters: {
          create: filters.map((f) => ({
            filterId: slugToId.get(f.slug)!,
            boolValue: true,
            numValue: f.numValue ?? null,
          })),
        },
        photos: {
          create: uploaded.map((publicId) => ({
            uploaderId: admin.id,
            kind: "INSPIRATION" as const,
            status: "APPROVED" as const,
            cloudinaryPublicId: publicId,
          })),
        },
      },
    });
    created++;
    photos += uploaded.length;
    console.log(`created  ${it.title}  photos=${uploaded.length}`);
  }
  console.log(
    `\n${GO ? "Done" : "Dry run"}: ${created} ${GO ? "created" : "to create"}, ${skipped} already there` +
      (GO ? `, ${photos} photos uploaded` : ""),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
