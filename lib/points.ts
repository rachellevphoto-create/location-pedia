import { Prisma, PointsReason } from "@prisma/client";
import { prisma } from "@/lib/db";

export const POINTS_VALUES: Record<PointsReason, number> = {
  SUBMIT_LOCATION: 50,
  ADD_PHOTO: 20,
  STATUS_UPDATE: 10,
  HELPFUL_RECEIVED: 2,
  UNLOCK_SECRET: -100,
  ADMIN_ADJUST: 0,
};

/** Max status updates per user per 24h that earn points. */
export const STATUS_UPDATE_DAILY_POINTS_CAP = 3;

/**
 * Status updates are cheap to post, so they only earn points when the user
 * has not hit the daily cap and has not already earned for this location in
 * the last 24h. The update itself is always saved.
 */
export async function canEarnStatusUpdatePoints(
  tx: Prisma.TransactionClient,
  userId: string,
  locationId: string,
) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const earnedToday = await tx.pointsLedger.findMany({
    where: { userId, reason: "STATUS_UPDATE", createdAt: { gte: since } },
    select: { refId: true },
  });
  if (earnedToday.length >= STATUS_UPDATE_DAILY_POINTS_CAP) return false;
  const ids = earnedToday.map((e) => e.refId).filter((x): x is string => !!x);
  if (ids.length === 0) return true;
  const sameLocation = await tx.statusUpdate.count({
    where: { id: { in: ids }, locationId },
  });
  return sameLocation === 0;
}

/**
 * Give the photo's uploader HELPFUL_RECEIVED points, once per (voter, photo).
 * Un-voting and voting again must not mint new points, and voting on your
 * own photo earns nothing. Returns true when points were given.
 */
export async function awardHelpfulOnce(
  tx: Prisma.TransactionClient,
  photo: { id: string; uploaderId: string },
  voterId: string,
) {
  if (photo.uploaderId === voterId) return false;
  const voteRef = `${photo.id}:${voterId}`;
  const already = await tx.pointsLedger.findFirst({
    where: { reason: "HELPFUL_RECEIVED", refType: "Helpful", refId: voteRef },
    select: { id: true },
  });
  if (already) return false;
  await awardPoints({
    userId: photo.uploaderId,
    reason: "HELPFUL_RECEIVED",
    refType: "Helpful",
    refId: voteRef,
    tx,
  });
  return true;
}

type AwardArgs = {
  userId: string;
  reason: PointsReason;
  delta?: number;
  refType?: string;
  refId?: string;
  tx?: Prisma.TransactionClient;
};

export async function awardPoints({
  userId,
  reason,
  delta,
  refType,
  refId,
  tx,
}: AwardArgs) {
  const client = tx ?? prisma;
  const value = delta ?? POINTS_VALUES[reason];
  if (value === 0 && reason !== "ADMIN_ADJUST") return;

  await client.pointsLedger.create({
    data: { userId, delta: value, reason, refType, refId },
  });
  await client.user.update({
    where: { id: userId },
    data: { points: { increment: value } },
  });
}

/**
 * Spend points to unlock a secret location. Returns true on success, false if
 * the user has insufficient points or has already unlocked.
 */
export async function unlockSecret(userId: string, locationId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.secretUnlock.findUnique({
      where: { userId_locationId: { userId, locationId } },
    });
    if (existing) return { ok: true, alreadyUnlocked: true };

    const location = await tx.location.findUnique({
      where: { id: locationId },
      select: { unlockCost: true, status: true, locationFilters: { include: { filter: { select: { slug: true } } } } },
    });
    const isSecret = location?.locationFilters.some((lf) => lf.filter.slug === "isSecret" && lf.boolValue) ?? false;
    if (!location || location.status !== "PUBLISHED" || !isSecret) {
      return { ok: false, error: "NOT_UNLOCKABLE" as const };
    }
    // Spend atomically: the balance check and the decrement are one UPDATE,
    // so two unlocks at the same time cannot push points below zero.
    const spent = await tx.user.updateMany({
      where: { id: userId, points: { gte: location.unlockCost } },
      data: { points: { decrement: location.unlockCost } },
    });
    if (spent.count === 0) {
      return { ok: false, error: "INSUFFICIENT_POINTS" as const };
    }

    await tx.secretUnlock.create({
      data: { userId, locationId, pointsSpent: location.unlockCost },
    });
    await tx.pointsLedger.create({
      data: {
        userId,
        delta: -location.unlockCost,
        reason: "UNLOCK_SECRET",
        refType: "Location",
        refId: locationId,
      },
    });
    return { ok: true, alreadyUnlocked: false };
  });
}
