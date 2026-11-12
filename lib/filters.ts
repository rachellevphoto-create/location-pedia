import { cache } from "react";
import { prisma } from "@/lib/db";

/**
 * Filters with special behavior in code. Everything else (amenities and
 * style tags) is read from the FilterDefinition table, so a new row there
 * shows up in the filter bar, submit wizard, admin edit form and cards
 * without code changes. (Labels come from messages/*.json: Amenities.<slug>
 * and Tags.<slug>; an unknown slug falls back to the slug itself.)
 */
export const SYSTEM_FILTERS = {
  paid: "paid",
  priceMin: "priceMin",
  priceMax: "priceMax",
  isSecret: "isSecret",
} as const;

export type FilterOptions = {
  /** AMENITY slugs in sortOrder. */
  amenities: string[];
  /** STYLE slugs in sortOrder. */
  styles: string[];
};

/** All filter definitions, grouped. Cached per request. */
export const getFilterOptions = cache(async (): Promise<FilterOptions> => {
  const defs = await prisma.filterDefinition.findMany({
    where: { category: { in: ["AMENITY", "STYLE"] } },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { slug: "asc" }],
    select: { slug: true, category: true },
  });
  return {
    amenities: defs.filter((d) => d.category === "AMENITY").map((d) => d.slug),
    styles: defs.filter((d) => d.category === "STYLE").map((d) => d.slug),
  };
});
