"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type ToggleFavoriteResult =
  | { ok: true; isFavorite: boolean; favoriteCount: number }
  | { ok: false; error: "UNAUTHENTICATED" | "NOT_FOUND" };

export async function toggleFavoriteAction(
  locationId: string,
): Promise<ToggleFavoriteResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "UNAUTHENTICATED" };
  }
  const userId = session.user.id;

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { id: true, slug: true, status: true, hidden: true },
  });
  if (!location || location.status !== "PUBLISHED" || location.hidden) {
    return { ok: false, error: "NOT_FOUND" };
  }

  const existing = await prisma.favorite.findUnique({
    where: { userId_locationId: { userId, locationId } },
    select: { id: true },
  });

  let isFavorite: boolean;
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    isFavorite = false;
  } else {
    await prisma.favorite.create({ data: { userId, locationId } });
    isFavorite = true;
  }

  const favoriteCount = await prisma.favorite.count({ where: { locationId } });

  revalidatePath(`/locations/${location.slug}`);

  return { ok: true, isFavorite, favoriteCount };
}
