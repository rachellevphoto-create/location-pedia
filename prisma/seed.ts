import { PrismaClient, UserRole, UserStatus, LocationStatus, FilterCategory } from "@prisma/client";
import bcrypt from "bcryptjs";
import { slugify } from "../lib/utils";

const prisma = new PrismaClient();

const FILTER_DEFS = [
  { id: "fd_wheelchair",      slug: "wheelchair",      category: FilterCategory.AMENITY,  sortOrder: 0 },
  { id: "fd_publicTransport", slug: "publicTransport", category: FilterCategory.AMENITY,  sortOrder: 1 },
  { id: "fd_restroom",        slug: "restroom",        category: FilterCategory.AMENITY,  sortOrder: 2 },
  { id: "fd_changingRoom",    slug: "changingRoom",    category: FilterCategory.AMENITY,  sortOrder: 3 },
  { id: "fd_drone",           slug: "drone",           category: FilterCategory.AMENITY,  sortOrder: 4 },
  { id: "fd_paid",            slug: "paid",            category: FilterCategory.PRICE,    sortOrder: 0 },
  { id: "fd_priceMin",        slug: "priceMin",        category: FilterCategory.PRICE,    sortOrder: 1 },
  { id: "fd_priceMax",        slug: "priceMax",        category: FilterCategory.PRICE,    sortOrder: 2 },
  { id: "fd_isSecret",        slug: "isSecret",        category: FilterCategory.SPECIAL,  sortOrder: 0 },
  { id: "fd_urban",           slug: "urban",           category: FilterCategory.STYLE,    sortOrder: 0 },
  { id: "fd_rustic",          slug: "rustic",          category: FilterCategory.STYLE,    sortOrder: 1 },
  { id: "fd_nature",          slug: "nature",          category: FilterCategory.STYLE,    sortOrder: 2 },
  { id: "fd_water",           slug: "water",           category: FilterCategory.STYLE,    sortOrder: 3 },
  { id: "fd_graffiti",        slug: "graffiti",        category: FilterCategory.STYLE,    sortOrder: 4 },
  { id: "fd_industrial",      slug: "industrial",      category: FilterCategory.STYLE,    sortOrder: 5 },
  { id: "fd_interior",        slug: "interior",        category: FilterCategory.STYLE,    sortOrder: 6 },
  { id: "fd_fashion",         slug: "fashion",         category: FilterCategory.STYLE,    sortOrder: 7 },
  { id: "fd_moody",           slug: "moody",           category: FilterCategory.STYLE,    sortOrder: 8 },
  { id: "fd_golden-hour",     slug: "golden-hour",     category: FilterCategory.STYLE,    sortOrder: 9 },
  { id: "fd_minimalist",      slug: "minimalist",      category: FilterCategory.STYLE,   sortOrder: 10 },
  { id: "fd_wedding",         slug: "wedding",         category: FilterCategory.STYLE,   sortOrder: 11 },
] as const;

type SampleLocation = {
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  filters: Record<string, boolean | number>;
};

async function main() {
  const adminEmail =
    process.env.ADMIN_BOOTSTRAP_EMAIL ?? "admin@locatepedia.local";
  const adminPassword =
    process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "changeme123!";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: UserRole.ADMIN,
      status: UserStatus.APPROVED,
    },
    create: {
      email: adminEmail,
      fullName: "Admin",
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.APPROVED,
      emailVerified: new Date(),
    },
  });

  console.log(`Admin user ready: ${admin.email}`);

  const samplePassword = await bcrypt.hash("photographer", 10);
  const photographer = await prisma.user.upsert({
    where: { email: "demo@locatepedia.local" },
    update: { status: UserStatus.APPROVED },
    create: {
      email: "demo@locatepedia.local",
      fullName: "Demo Photographer",
      passwordHash: samplePassword,
      teacherOrSchool: "LocatePedia Academy",
      portfolioUrl: "https://example.com/portfolio",
      role: UserRole.USER,
      status: UserStatus.APPROVED,
      emailVerified: new Date(),
    },
  });

  for (const fd of FILTER_DEFS) {
    await prisma.filterDefinition.upsert({
      where: { slug: fd.slug },
      update: { category: fd.category, sortOrder: fd.sortOrder },
      create: { id: fd.id, slug: fd.slug, category: fd.category, sortOrder: fd.sortOrder },
    });
  }
  console.log(`Filter definitions seeded: ${FILTER_DEFS.length}`);

  const samples: SampleLocation[] = [
    {
      title: "Old Jaffa Stone Stairs",
      description:
        "Sun-warmed limestone stairs with a sea-glimpse alcove. Great for golden-hour portraits and editorial shoots.",
      latitude: 32.0524,
      longitude: 34.7531,
      filters: { publicTransport: true, restroom: true, urban: true, rustic: true, "golden-hour": true },
    },
    {
      title: "Florentin Mural Alley",
      description:
        "Saturated street-art alley, dense color, suitable for fashion and band portraits. Tight space, bring a 35mm.",
      latitude: 32.0571,
      longitude: 34.7704,
      filters: { wheelchair: true, publicTransport: true, urban: true, graffiti: true, fashion: true },
    },
    {
      title: "Hidden Wadi Pool",
      description:
        "Secret freshwater pool fringed by ferns. Best in spring after the rains. Coordinates redacted; unlock to view.",
      latitude: 32.7,
      longitude: 35.4,
      filters: { isSecret: true, nature: true, water: true, moody: true },
    },
  ];

  const filterDefMap = new Map<string, string>();
  const allDefs = await prisma.filterDefinition.findMany();
  for (const fd of allDefs) filterDefMap.set(fd.slug, fd.id);

  for (const s of samples) {
    const slug = slugify(s.title);
    const location = await prisma.location.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        title: s.title,
        description: s.description,
        latitude: s.latitude,
        longitude: s.longitude,
        status: LocationStatus.PUBLISHED,
        approvedAt: new Date(),
        awardedPoints: true,
        submitterId: photographer.id,
      },
    });

    for (const [filterSlug, value] of Object.entries(s.filters)) {
      const filterId = filterDefMap.get(filterSlug);
      if (!filterId) continue;
      const boolValue = typeof value === "boolean" ? value : true;
      const numValue = typeof value === "number" ? value : null;
      await prisma.locationFilter.upsert({
        where: { locationId_filterId: { locationId: location.id, filterId } },
        update: { boolValue, numValue },
        create: { locationId: location.id, filterId, boolValue, numValue },
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
