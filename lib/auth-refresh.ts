import { prisma } from "@/lib/db";

/**
 * The session fields that can change after sign-in (an admin approves or
 * bans the user, points are earned or spent). The jwt callback in
 * lib/auth.ts re-reads them on every server-side auth() call.
 * Returns null when the user no longer exists.
 */
export async function loadAuthFields(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true, points: true, locale: true },
  });
}
