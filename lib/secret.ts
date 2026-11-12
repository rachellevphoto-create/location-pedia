import { prisma } from "@/lib/db";

/**
 * True when the location is a premium (secret) spot that this user has not
 * unlocked. Admins never see a spot as locked.
 */
export async function isLockedFor(
  locationId: string,
  user: { id: string; role?: string | null } | null,
): Promise<boolean> {
  if (user?.role === "ADMIN") return false;
  const secret = await prisma.locationFilter.findFirst({
    where: { locationId, boolValue: true, filter: { slug: "isSecret" } },
    select: { id: true },
  });
  if (!secret) return false;
  if (!user) return true;
  const unlock = await prisma.secretUnlock.findUnique({
    where: { userId_locationId: { userId: user.id, locationId } },
    select: { id: true },
  });
  return !unlock;
}
