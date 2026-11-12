import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  awardHelpfulOnce,
  awardPoints,
  canEarnStatusUpdatePoints,
  STATUS_UPDATE_DAILY_POINTS_CAP,
  unlockSecret,
} from "@/lib/points";
import { makeFilter, makeLocation, makeUser, resetDb } from "./helpers";

beforeEach(resetDb);

/** Post a status update the way addStatusUpdateAction does. */
async function postUpdate(userId: string, locationId: string) {
  return prisma.$transaction(async (tx) => {
    const earns = await canEarnStatusUpdatePoints(tx, userId, locationId);
    const u = await tx.statusUpdate.create({
      data: { locationId, authorId: userId, body: "test" },
    });
    if (earns) {
      await awardPoints({ userId, reason: "STATUS_UPDATE", refType: "StatusUpdate", refId: u.id, tx });
    }
    return earns;
  });
}

const points = async (id: string) =>
  (await prisma.user.findUniqueOrThrow({ where: { id } })).points;

describe("status update points", () => {
  it("pays once per location per day", async () => {
    const user = await makeUser();
    const loc = await makeLocation({ submitterId: user.id });
    expect(await postUpdate(user.id, loc.id)).toBe(true);
    expect(await postUpdate(user.id, loc.id)).toBe(false);
    expect(await points(user.id)).toBe(10);
    // The update itself is still saved.
    expect(await prisma.statusUpdate.count({ where: { locationId: loc.id } })).toBe(2);
  });

  it(`pays at most ${STATUS_UPDATE_DAILY_POINTS_CAP} times a day`, async () => {
    const user = await makeUser();
    const results = [];
    for (let i = 0; i < STATUS_UPDATE_DAILY_POINTS_CAP + 2; i++) {
      const loc = await makeLocation({ submitterId: user.id });
      results.push(await postUpdate(user.id, loc.id));
    }
    expect(results.filter(Boolean)).toHaveLength(STATUS_UPDATE_DAILY_POINTS_CAP);
    expect(await points(user.id)).toBe(10 * STATUS_UPDATE_DAILY_POINTS_CAP);
  });

  it("pays again after 24 hours", async () => {
    const user = await makeUser();
    const loc = await makeLocation({ submitterId: user.id });
    await postUpdate(user.id, loc.id);
    await prisma.pointsLedger.updateMany({
      where: { userId: user.id },
      data: { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
    });
    expect(await postUpdate(user.id, loc.id)).toBe(true);
  });
});

describe("helpful points", () => {
  it("pays the uploader once per voter, even after un-vote and re-vote", async () => {
    const uploader = await makeUser();
    const voter = await makeUser();
    const photo = { id: "photo-1", uploaderId: uploader.id };
    const award = () => prisma.$transaction((tx) => awardHelpfulOnce(tx, photo, voter.id));
    expect(await award()).toBe(true);
    expect(await award()).toBe(false);
    expect(await award()).toBe(false);
    expect(await points(uploader.id)).toBe(2);
  });

  it("pays each different voter", async () => {
    const uploader = await makeUser();
    const photo = { id: "photo-1", uploaderId: uploader.id };
    for (let i = 0; i < 3; i++) {
      const voter = await makeUser();
      await prisma.$transaction((tx) => awardHelpfulOnce(tx, photo, voter.id));
    }
    expect(await points(uploader.id)).toBe(6);
  });

  it("does not pay for voting on your own photo", async () => {
    const uploader = await makeUser();
    const photo = { id: "photo-1", uploaderId: uploader.id };
    expect(await prisma.$transaction((tx) => awardHelpfulOnce(tx, photo, uploader.id))).toBe(false);
    expect(await points(uploader.id)).toBe(0);
  });
});

describe("unlocking a premium spot", () => {
  async function secretSpot(cost = 100) {
    await makeFilter("isSecret", "SPECIAL");
    const owner = await makeUser();
    return makeLocation({ submitterId: owner.id, filters: ["isSecret"], unlockCost: cost });
  }

  it("spends the cost and writes the ledger", async () => {
    const loc = await secretSpot(100);
    const user = await makeUser({ points: 150 });
    expect(await unlockSecret(user.id, loc.id)).toEqual({ ok: true, alreadyUnlocked: false });
    expect(await points(user.id)).toBe(50);
    const ledger = await prisma.pointsLedger.findMany({ where: { userId: user.id } });
    expect(ledger).toMatchObject([{ delta: -100, reason: "UNLOCK_SECRET" }]);
  });

  it("refuses when points are too low and changes nothing", async () => {
    const loc = await secretSpot(100);
    const user = await makeUser({ points: 99 });
    expect(await unlockSecret(user.id, loc.id)).toEqual({ ok: false, error: "INSUFFICIENT_POINTS" });
    expect(await points(user.id)).toBe(99);
    expect(await prisma.secretUnlock.count()).toBe(0);
  });

  it("does not charge twice for the same spot", async () => {
    const loc = await secretSpot(100);
    const user = await makeUser({ points: 300 });
    await unlockSecret(user.id, loc.id);
    expect(await unlockSecret(user.id, loc.id)).toEqual({ ok: true, alreadyUnlocked: true });
    expect(await points(user.id)).toBe(200);
  });

  it("never goes below zero when two unlocks run at the same time", async () => {
    await makeFilter("isSecret", "SPECIAL");
    const owner = await makeUser();
    const a = await makeLocation({ submitterId: owner.id, filters: ["isSecret"], unlockCost: 100 });
    const b = await makeLocation({ submitterId: owner.id, filters: ["isSecret"], unlockCost: 100 });
    const user = await makeUser({ points: 100 });
    const results = await Promise.all([unlockSecret(user.id, a.id), unlockSecret(user.id, b.id)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await points(user.id)).toBe(0);
    expect(await prisma.secretUnlock.count({ where: { userId: user.id } })).toBe(1);
  });

  it("refuses a spot that is not premium", async () => {
    const owner = await makeUser();
    const loc = await makeLocation({ submitterId: owner.id });
    const user = await makeUser({ points: 500 });
    expect(await unlockSecret(user.id, loc.id)).toEqual({ ok: false, error: "NOT_UNLOCKABLE" });
    expect(await points(user.id)).toBe(500);
  });
});
