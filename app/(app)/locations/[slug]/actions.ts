"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireApproved } from "@/lib/auth";
import {
  ratingSchema,
  statusUpdateSchema,
  type StatusUpdateInput,
} from "@/lib/validation";
import { awardPoints, unlockSecret } from "@/lib/points";

export async function addStatusUpdateAction(
  slug: string,
  input: StatusUpdateInput,
) {
  const user = await requireApproved();
  const parsed = statusUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const location = await prisma.location.findUnique({
    where: { slug },
    select: { id: true, status: true },
  });
  if (!location || location.status !== "PUBLISHED") {
    return { ok: false, error: "Location not found" };
  }

  await prisma.$transaction(async (tx) => {
    const update = await tx.statusUpdate.create({
      data: {
        locationId: location.id,
        authorId: user.id,
        body: parsed.data.body,
        kind: parsed.data.kind,
      },
    });
    await awardPoints({
      userId: user.id,
      reason: "STATUS_UPDATE",
      refType: "StatusUpdate",
      refId: update.id,
      tx,
    });
  });

  revalidatePath(`/locations/${slug}`);
  return { ok: true };
}

export async function toggleHelpfulAction(photoId: string, slug: string) {
  const user = await requireApproved();

  await prisma.$transaction(async (tx) => {
    const photo = await tx.photo.findUnique({
      where: { id: photoId },
      select: { id: true, uploaderId: true },
    });
    if (!photo) return;

    const existing = await tx.helpful.findUnique({
      where: { userId_photoId: { userId: user.id, photoId } },
    });
    if (existing) {
      await tx.helpful.delete({ where: { id: existing.id } });
      await tx.photo.update({
        where: { id: photoId },
        data: { helpfulCount: { decrement: 1 } },
      });
      // Note: we don't revoke historical points to keep ledger immutable.
    } else {
      await tx.helpful.create({ data: { userId: user.id, photoId } });
      await tx.photo.update({
        where: { id: photoId },
        data: { helpfulCount: { increment: 1 } },
      });
      if (photo.uploaderId !== user.id) {
        await awardPoints({
          userId: photo.uploaderId,
          reason: "HELPFUL_RECEIVED",
          refType: "Photo",
          refId: photo.id,
          tx,
        });
      }
    }
  });

  revalidatePath(`/locations/${slug}`);
  return { ok: true };
}

export async function rateLocationAction(
  slug: string,
  formData: FormData,
) {
  const user = await requireApproved();
  const parsed = ratingSchema.safeParse({ stars: formData.get("stars") });
  if (!parsed.success) return { ok: false, error: "Invalid rating" };

  const location = await prisma.location.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!location) return { ok: false, error: "Not found" };

  await prisma.rating.upsert({
    where: { userId_locationId: { userId: user.id, locationId: location.id } },
    update: { stars: parsed.data.stars },
    create: { userId: user.id, locationId: location.id, stars: parsed.data.stars },
  });
  revalidatePath(`/locations/${slug}`);
  return { ok: true };
}

export async function unlockSecretAction(slug: string) {
  const user = await requireApproved();
  const location = await prisma.location.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!location) return { ok: false, error: "Not found" };
  const result = await unlockSecret(user.id, location.id);
  revalidatePath(`/locations/${slug}`);
  return result;
}
