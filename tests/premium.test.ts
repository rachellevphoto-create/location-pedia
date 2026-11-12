import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { searchLocations } from "@/lib/geo";
import { isLockedFor } from "@/lib/secret";
import { getLocationDetail } from "@/lib/data/location-detail";
import { makeFilter, makeLocation, makeUser, resetDb } from "./helpers";

// A premium spot at a precise point, and a normal spot near it.
const SECRET = { lat: 31.8097167, lng: 35.2166327 };

async function setup() {
  await makeFilter("isSecret", "SPECIAL");
  const owner = await makeUser();
  const secret = await makeLocation({
    submitterId: owner.id,
    title: "Rivka secret pool",
    lat: SECRET.lat,
    lng: SECRET.lng,
    filters: ["isSecret"],
  });
  const normal = await makeLocation({ submitterId: owner.id, title: "Open plaza", lat: 31.81, lng: 35.22 });
  await prisma.photo.create({
    data: { locationId: secret.id, uploaderId: owner.id, kind: "INSPIRATION", cloudinaryPublicId: "secret-photo" },
  });
  await prisma.statusUpdate.create({ data: { locationId: secret.id, authorId: owner.id, body: "road closed" } });
  return { owner, secret, normal };
}

const unlock = (userId: string, locationId: string) =>
  prisma.secretUnlock.create({ data: { userId, locationId, pointsSpent: 100 } });

beforeEach(resetDb);

describe("isLockedFor", () => {
  it("locks a premium spot for guests and users who did not unlock it", async () => {
    const { secret } = await setup();
    const user = await makeUser();
    expect(await isLockedFor(secret.id, null)).toBe(true);
    expect(await isLockedFor(secret.id, user)).toBe(true);
  });

  it("opens it after unlocking, and always for admins", async () => {
    const { secret } = await setup();
    const user = await makeUser();
    await unlock(user.id, secret.id);
    expect(await isLockedFor(secret.id, user)).toBe(false);
    expect(await isLockedFor(secret.id, { id: "x", role: "ADMIN" })).toBe(false);
  });

  it("never locks a normal spot", async () => {
    const { normal } = await setup();
    expect(await isLockedFor(normal.id, null)).toBe(false);
  });
});

describe("searchLocations (map + list API)", () => {
  const find = <T extends { id: string }>(rows: T[], id: string) =>
    rows.find((r) => r.id === id);

  it("rounds a locked spot's coordinates to 0.1 degree", async () => {
    const { secret } = await setup();
    const row = find(await searchLocations({}), secret.id)!;
    expect(row.locked).toBe(true);
    expect(row.latitude).toBe(31.8);
    expect(row.longitude).toBe(35.2);
  });

  it("measures distance to the rounded point, not the real one", async () => {
    const { secret } = await setup();
    // Standing exactly on the real spot must not give distance 0.
    const row = find(await searchLocations({ from: SECRET }), secret.id)!;
    expect(row.distance_m).toBeGreaterThan(1000);
  });

  it("does not match a locked spot by text search", async () => {
    const { secret } = await setup();
    expect(find(await searchLocations({ q: "Rivka" }), secret.id)).toBeUndefined();
  });

  it("does not show a locked spot in a tiny box around its real point", async () => {
    const { secret } = await setup();
    const bbox = { minLat: 31.805, maxLat: 31.815, minLng: 35.21, maxLng: 35.22 };
    expect(find(await searchLocations({ bbox }), secret.id)).toBeUndefined();
  });

  it("shows real data after unlock and to admins", async () => {
    const { secret } = await setup();
    const user = await makeUser();
    await unlock(user.id, secret.id);
    for (const filters of [{ userId: user.id }, { viewerIsAdmin: true }]) {
      const row = find(await searchLocations({ ...filters, q: "Rivka" }), secret.id)!;
      expect(row.locked).toBe(false);
      expect(row.latitude).toBeCloseTo(SECRET.lat, 6);
    }
  });
});

describe("getLocationDetail (detail page)", () => {
  it("does not load photos, updates or reviews of a locked spot", async () => {
    const { secret } = await setup();
    const d = (await getLocationDetail(secret.slug, null))!;
    expect(d.locked).toBe(true);
    expect(d.inspirationPhotos).toEqual([]);
    expect(d.statusUpdates).toEqual([]);
    expect(d.reviews).toEqual([]);
    // Counts are fine to show.
    expect(d.photoCount).toBe(1);
  });

  it("loads them once unlocked", async () => {
    const { secret } = await setup();
    const user = await makeUser();
    await unlock(user.id, secret.id);
    const d = (await getLocationDetail(secret.slug, user))!;
    expect(d.locked).toBe(false);
    expect(d.inspirationPhotos).toHaveLength(1);
    expect(d.statusUpdates).toHaveLength(1);
  });

  it("hides unpublished and hidden spots from non-admins", async () => {
    const { normal } = await setup();
    await prisma.location.update({ where: { id: normal.id }, data: { hidden: true } });
    expect(await getLocationDetail(normal.slug, null)).toBeNull();
    expect(await getLocationDetail(normal.slug, { id: "x", role: "ADMIN" })).not.toBeNull();
  });
});
