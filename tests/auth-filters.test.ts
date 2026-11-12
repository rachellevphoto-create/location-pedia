import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { loadAuthFields } from "@/lib/auth-refresh";
import { getFilterOptions } from "@/lib/filters";
import { amenityIcon, filterLabel } from "@/lib/filter-ui";
import { makeFilter, makeUser, resetDb } from "./helpers";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));

beforeEach(resetDb);

describe("auth: status is read fresh from the DB", () => {
  it("sees an admin's ban, approval and points change right away", async () => {
    const user = await makeUser({ status: "PENDING" });
    expect((await loadAuthFields(user.id))?.status).toBe("PENDING");

    await prisma.user.update({ where: { id: user.id }, data: { status: "APPROVED", points: 40 } });
    expect(await loadAuthFields(user.id)).toMatchObject({ status: "APPROVED", points: 40 });

    await prisma.user.update({ where: { id: user.id }, data: { status: "BANNED" } });
    expect((await loadAuthFields(user.id))?.status).toBe("BANNED");
  });

  it("returns null for a deleted user (the session is dropped)", async () => {
    const user = await makeUser();
    await prisma.user.delete({ where: { id: user.id } });
    expect(await loadAuthFields(user.id)).toBeNull();
  });
});

describe("filters come from the DB", () => {
  it("groups amenities and styles in sortOrder, and leaves out system filters", async () => {
    await makeFilter("restroom", "AMENITY", 2);
    await makeFilter("wheelchair", "AMENITY", 0);
    await makeFilter("parking", "AMENITY", 1); // new one, no code for it
    await makeFilter("urban", "STYLE", 1);
    await makeFilter("nature", "STYLE", 0);
    await makeFilter("paid", "PRICE");
    await makeFilter("isSecret", "SPECIAL");
    expect(await getFilterOptions()).toEqual({
      amenities: ["wheelchair", "parking", "restroom"],
      styles: ["nature", "urban"],
    });
  });

  it("labels a new filter with its slug until it has a translation", () => {
    const t = Object.assign((k: string) => `T:${k}`, { has: (k: string) => k === "wheelchair" });
    expect(filterLabel(t, "wheelchair")).toBe("T:wheelchair");
    expect(filterLabel(t, "parking")).toBe("parking");
  });

  it("gives a new amenity a generic icon", () => {
    expect(amenityIcon("parking")).toBeTruthy();
    expect(amenityIcon("parking")).not.toBe(amenityIcon("wheelchair"));
  });
});

describe("revalidateAllLocales", () => {
  it("revalidates the path in every language", async () => {
    const { revalidateAllLocales } = await import("@/lib/revalidate");
    revalidatePath.mockClear();
    revalidateAllLocales("/discover", "/");
    expect(revalidatePath.mock.calls.map((c) => c[0])).toEqual(["/he/discover", "/en/discover", "/he", "/en"]);
  });
});
