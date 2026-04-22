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
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { points: true },
    });
    if (!user || user.points < location.unlockCost) {
      return { ok: false, error: "INSUFFICIENT_POINTS" as const };
    }

    await tx.secretUnlock.create({
      data: { userId, locationId, pointsSpent: location.unlockCost },
    });
    await awardPoints({
      userId,
      reason: "UNLOCK_SECRET",
      delta: -location.unlockCost,
      refType: "Location",
      refId: locationId,
      tx,
    });
    return { ok: true, alreadyUnlocked: false };
  });
}
