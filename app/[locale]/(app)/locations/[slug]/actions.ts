"use server";

import { revalidateAllLocales } from "@/lib/revalidate";
import { prisma } from "@/lib/db";
import { requireApproved } from "@/lib/auth";
import {
  addPhotosSchema,
  ratingSchema,
  statusUpdateSchema,
  type AddPhotosInput,
  type StatusUpdateInput,
} from "@/lib/validation";
import {
  awardPoints,
  canEarnStatusUpdatePoints,
  unlockSecret,
} from "@/lib/points";
import { isLockedFor } from "@/lib/secret";

export async function addStatusUpdateAction(
  slug: string,
  input: StatusUpdateInput,
) {
  const user = await requireApproved();
  const parsed = statusUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const location = await prisma.location.findUnique({
    where: { slug },
    select: { id: true, status: true, hidden: true },
  });
  if (!location || location.status !== "PUBLISHED" || location.hidden) {
    return { ok: false, error: "Location not found" };
  }
  if (await isLockedFor(location.id, user)) {
    return { ok: false, error: "Location is locked" };
  }

  await prisma.$transaction(async (tx) => {
    const earns = await canEarnStatusUpdatePoints(tx, user.id, location.id);
    const update = await tx.statusUpdate.create({
      data: {
        locationId: location.id,
        authorId: user.id,
        body: parsed.data.body,
        kind: parsed.data.kind,
      },
    });
    if (earns) {
      await awardPoints({
        userId: user.id,
        reason: "STATUS_UPDATE",
        refType: "StatusUpdate",
        refId: update.id,
        tx,
      });
    }
  });

  revalidateAllLocales(`/locations/${slug}`);
  return { ok: true };
}

export async function toggleHelpfulAction(photoId: string, slug: string) {
  const user = await requireApproved();

  const target = await prisma.photo.findUnique({
    where: { id: photoId },
    select: {
      status: true,
      locationId: true,
      location: { select: { status: true, hidden: true } },
    },
  });
  if (
    !target ||
    target.status !== "APPROVED" ||
    target.location.status !== "PUBLISHED" ||
    target.location.hidden ||
    (await isLockedFor(target.locationId, user))
  ) {
    return { ok: false, error: "Photo not found" };
  }

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
      // Award once per (voter, photo): un-voting and voting again must not
      // mint new points.
      const voteRef = `${photo.id}:${user.id}`;
      const alreadyAwarded = await tx.pointsLedger.findFirst({
        where: { reason: "HELPFUL_RECEIVED", refType: "Helpful", refId: voteRef },
        select: { id: true },
      });
      if (photo.uploaderId !== user.id && !alreadyAwarded) {
        await awardPoints({
          userId: photo.uploaderId,
          reason: "HELPFUL_RECEIVED",
          refType: "Helpful",
          refId: voteRef,
          tx,
        });
      }
    }
  });

  revalidateAllLocales(`/locations/${slug}`);
  return { ok: true };
}

export async function rateLocationAction(
  slug: string,
  formData: FormData,
) {
  const user = await requireApproved();
  const parsed = ratingSchema.safeParse({
    stars: formData.get("stars"),
    title: formData.get("title") ?? "",
    body: formData.get("body") ?? "",
  });
  if (!parsed.success) return { ok: false, error: "Invalid rating" };

  const location = await prisma.location.findUnique({
    where: { slug },
    select: { id: true, status: true, hidden: true },
  });
  if (!location || location.status !== "PUBLISHED" || location.hidden) {
    return { ok: false, error: "Not found" };
  }
  if (await isLockedFor(location.id, user)) {
    return { ok: false, error: "Location is locked" };
  }

  const title = parsed.data.title?.trim() ? parsed.data.title.trim() : null;
  const body = parsed.data.body?.trim() ? parsed.data.body.trim() : null;

  await prisma.rating.upsert({
    where: { userId_locationId: { userId: user.id, locationId: location.id } },
    update: { stars: parsed.data.stars, title, body },
    create: {
      userId: user.id,
      locationId: location.id,
      stars: parsed.data.stars,
      title,
      body,
    },
  });
  revalidateAllLocales(`/locations/${slug}`);
  return { ok: true };
}

export async function addLocationPhotosAction(
  slug: string,
  input: AddPhotosInput,
) {
  const user = await requireApproved();
  const parsed = addPhotosSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const location = await prisma.location.findUnique({
    where: { slug },
    select: { id: true, status: true, hidden: true },
  });
  if (!location || location.status !== "PUBLISHED" || location.hidden) {
    return { ok: false, error: "Location not found" };
  }
  if (await isLockedFor(location.id, user)) {
    return { ok: false, error: "Location is locked" };
  }

  await prisma.photo.createMany({
    data: parsed.data.photos.map((p) => ({
      locationId: location.id,
      uploaderId: user.id,
      cloudinaryPublicId: p.cloudinaryPublicId,
      kind: p.kind,
      width: p.width ?? null,
      height: p.height ?? null,
      caption: p.caption ?? null,
      status: "PENDING" as const,
    })),
  });

  revalidateAllLocales(`/locations/${slug}`);
  revalidateAllLocales("/admin/submissions");
  return { ok: true, count: parsed.data.photos.length };
}

export async function unlockSecretAction(slug: string) {
  const user = await requireApproved();
  const location = await prisma.location.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!location) return { ok: false, error: "Not found" };
  const result = await unlockSecret(user.id, location.id);
  revalidateAllLocales(`/locations/${slug}`);
  return result;
}
