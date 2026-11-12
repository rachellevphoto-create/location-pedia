import type { FilterCategory } from "@prisma/client";
import { prisma } from "@/lib/db";

if (!process.env.DATABASE_URL?.includes("/locatepedia_test")) {
  throw new Error("Refusing to run tests: DATABASE_URL is not the test DB");
}

/** Empty every table (keeps the schema). */
export async function resetDb() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations', 'spatial_ref_sys')`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

let n = 0;
const uid = () => `${Date.now().toString(36)}${(n++).toString(36)}`;

export async function makeUser(
  data: Partial<{ role: "USER" | "ADMIN"; status: "PENDING" | "APPROVED" | "REJECTED" | "BANNED"; points: number }> = {},
) {
  return prisma.user.create({
    data: {
      email: `u${uid()}@test.local`,
      fullName: "Test User",
      role: data.role ?? "USER",
      status: data.status ?? "APPROVED",
      points: data.points ?? 0,
    },
  });
}

export async function makeFilter(slug: string, category: FilterCategory, sortOrder = 0) {
  return prisma.filterDefinition.create({ data: { slug, category, sortOrder } });
}

export async function makeLocation(opts: {
  submitterId: string;
  lat?: number;
  lng?: number;
  title?: string;
  /** Filter slugs to turn on (the FilterDefinition rows must exist). */
  filters?: string[];
  unlockCost?: number;
}) {
  const defs = opts.filters?.length
    ? await prisma.filterDefinition.findMany({ where: { slug: { in: opts.filters } } })
    : [];
  return prisma.location.create({
    data: {
      slug: `loc-${uid()}`,
      title: opts.title ?? "Test spot",
      description: "A place used by the tests.",
      latitude: opts.lat ?? 32.0853,
      longitude: opts.lng ?? 34.7818,
      status: "PUBLISHED",
      submitterId: opts.submitterId,
      unlockCost: opts.unlockCost ?? 100,
      locationFilters: { create: defs.map((d) => ({ filterId: d.id, boolValue: true })) },
    },
  });
}
