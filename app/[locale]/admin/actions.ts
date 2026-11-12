"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { LocationStatus, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { awardPoints } from "@/lib/points";
import {
  sendLocationApproved,
  sendLocationRejected,
  sendLocationRevision,
  sendUserApproved,
  sendUserRejected,
} from "@/lib/email";
import {
  adminDecisionSchema,
  photoDecisionSchema,
  updateLocationSchema,
  type UpdateLocationInput,
} from "@/lib/validation";
import { reverseGeocode } from "@/lib/geocoding";

export type UpdateLocationResult =
  | { ok: true; slug: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function updateLocationAction(
  id: string,
  input: UpdateLocationInput,
): Promise<UpdateLocationResult> {
  const admin = await requireAdmin();
  const parsed = updateLocationSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path.join(".");
      if (k) fieldErrors[k] = issue.message;
    }
    return { ok: false, error: "v:review", fieldErrors };
  }
  const data = parsed.data;

  const existing = await prisma.location.findUnique({
    where: { id },
    select: { id: true, slug: true, latitude: true, longitude: true },
  });
  if (!existing) return { ok: false, error: "NOT_FOUND" };

  const coordsChanged =
    existing.latitude !== data.latitude || existing.longitude !== data.longitude;
  const locale = await getLocale();
  const geo = coordsChanged
    ? await reverseGeocode(data.latitude, data.longitude, locale).catch(
        () => null,
      )
    : null;

  const filterDefs = await prisma.filterDefinition.findMany();
  const slugToId = new Map(filterDefs.map((fd) => [fd.slug, fd.id]));

  await prisma.$transaction(async (tx) => {
    await tx.location.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        directions: data.directions?.trim() ? data.directions.trim() : null,
        latitude: data.latitude,
        longitude: data.longitude,
        ...(coordsChanged && geo
          ? {
              city: geo.city ?? null,
              area: geo.area ?? null,
              country: geo.country ?? null,
            }
          : {}),
        ...(data.unlockCost != null ? { unlockCost: data.unlockCost } : {}),
        ...(data.status
          ? {
              status: data.status as LocationStatus,
              approvedAt:
                data.status === "PUBLISHED" ? new Date() : undefined,
            }
          : {}),
      },
    });

    if (data.newFeedback?.trim()) {
      await tx.reviewFeedback.create({
        data: {
          locationId: id,
          authorId: admin.id,
          decision: (data.status as LocationStatus) ?? LocationStatus.PENDING,
          body: data.newFeedback.trim(),
        },
      });
    }

    await tx.locationFilter.deleteMany({ where: { locationId: id } });
    if (data.filters.length > 0) {
      await tx.locationFilter.createMany({
        data: data.filters
          .filter((f) => slugToId.has(f.slug))
          .map((f) => ({
            locationId: id,
            filterId: slugToId.get(f.slug)!,
            boolValue: f.boolValue,
            numValue: f.numValue ?? null,
          })),
      });
    }

    await tx.photo.deleteMany({
      where: {
        locationId: id,
        ...(data.keepPhotoIds.length > 0
          ? { id: { notIn: data.keepPhotoIds } }
          : {}),
      },
    });

    if (data.newPhotos.length > 0) {
      await tx.photo.createMany({
        data: data.newPhotos.map((p) => ({
          locationId: id,
          uploaderId: admin.id,
          cloudinaryPublicId: p.cloudinaryPublicId,
          kind: p.kind,
          width: p.width ?? null,
          height: p.height ?? null,
          caption: p.caption ?? null,
        })),
      });
    }
  });

  revalidatePath("/admin/locations");
  revalidatePath(`/locations/${existing.slug}`);
  revalidatePath("/discover");

  return { ok: true, slug: existing.slug };
}

export async function decideUserAction(
  userId: string,
  decision: "APPROVE" | "REJECT" | "BAN",
  note?: string,
) {
  await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found" };

  const next: UserStatus =
    decision === "APPROVE"
      ? "APPROVED"
      : decision === "REJECT"
        ? "REJECTED"
        : "BANNED";

  await prisma.user.update({
    where: { id: userId },
    data: {
      status: next,
      reviewNote: note ?? user.reviewNote,
      emailVerified: decision === "APPROVE" ? new Date() : user.emailVerified,
    },
  });

  const locale = await getLocale();

  let emailResult: { ok: boolean; error?: unknown; devOnly?: boolean } = {
    ok: true,
  };
  try {
    if (decision === "APPROVE") {
      emailResult = await sendUserApproved(user.email, user.fullName, locale);
    } else if (decision === "REJECT" || decision === "BAN") {
      emailResult = await sendUserRejected(
        user.email,
        user.fullName,
        note,
        locale,
      );
    }
  } catch (err) {
    console.error("[admin] decideUserAction email failed", err);
    emailResult = { ok: false, error: err };
  }

  if (!emailResult.ok) {
    console.warn(
      `[admin] User ${decision} for ${user.email} succeeded, but email failed:`,
      emailResult.error,
    );
  }

  revalidatePath("/admin/users");
  return {
    ok: true,
    emailSent: emailResult.ok,
    emailDevOnly: emailResult.devOnly ?? false,
    emailError: emailResult.ok
      ? undefined
      : extractEmailErrorMessage(emailResult.error),
  };
}

function extractEmailErrorMessage(err: unknown): string | undefined {
  if (!err) return undefined;
  if (typeof err === "string") return err;
  if (typeof err === "object") {
    const e = err as { message?: string; name?: string; statusCode?: number };
    if (e.message) return e.message;
    if (e.name) return e.name;
    if (e.statusCode) return `HTTP ${e.statusCode}`;
  }
  return String(err);
}

export async function setLocationHiddenAction(id: string, hidden: boolean) {
  await requireAdmin();
  const existing = await prisma.location.findUnique({
    where: { id },
    select: { slug: true },
  });
  if (!existing) return { ok: false, error: "NOT_FOUND" };

  await prisma.location.update({
    where: { id },
    data: { hidden },
  });

  revalidatePath("/admin/locations");
  revalidatePath("/discover");
  revalidatePath(`/locations/${existing.slug}`);
  return { ok: true };
}

export async function deleteLocationAction(id: string) {
  await requireAdmin();
  const existing = await prisma.location.findUnique({
    where: { id },
    select: { slug: true },
  });
  if (!existing) return { ok: false, error: "NOT_FOUND" };

  await prisma.location.delete({ where: { id } });

  revalidatePath("/admin/locations");
  revalidatePath("/discover");
  revalidatePath(`/locations/${existing.slug}`);
  return { ok: true };
}

export async function decideLocationAction(
  locationId: string,
  raw: unknown,
) {
  const admin = await requireAdmin();
  const parsed = adminDecisionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid decision" };

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    include: { submitter: { select: { id: true, email: true, fullName: true } } },
  });
  if (!location) return { ok: false, error: "Location not found" };

  const submitter = location.submitter;
  const locale = await getLocale();

  if (parsed.data.decision === "APPROVE" || parsed.data.decision === "APPROVE_NO_POINTS") {
    const award = parsed.data.decision === "APPROVE";
    await prisma.$transaction(async (tx) => {
      await tx.location.update({
        where: { id: locationId },
        data: {
          status: LocationStatus.PUBLISHED,
          approvedAt: new Date(),
          awardedPoints: award,
        },
      });
      if (award) {
        await awardPoints({
          userId: submitter.id,
          reason: "SUBMIT_LOCATION",
          refType: "Location",
          refId: locationId,
          tx,
        });

        const photos = await tx.photo.findMany({
          where: { locationId },
          select: { id: true, uploaderId: true },
        });
        for (const p of photos) {
          await awardPoints({
            userId: p.uploaderId,
            reason: "ADD_PHOTO",
            refType: "Photo",
            refId: p.id,
            tx,
          });
        }
      }
    });

    await sendLocationApproved({
      to: submitter.email,
      fullName: submitter.fullName,
      title: location.title,
      slug: location.slug,
      awardedPoints: award,
      locale,
    }).catch(() => null);
  } else if (parsed.data.decision === "REVISION") {
    const { feedback } = parsed.data;
    await prisma.$transaction(async (tx) => {
      await tx.location.update({
        where: { id: locationId },
        data: { status: LocationStatus.NEEDS_REVISION },
      });
      await tx.reviewFeedback.create({
        data: {
          locationId,
          authorId: admin.id,
          decision: LocationStatus.NEEDS_REVISION,
          body: feedback,
        },
      });
    });
    await sendLocationRevision({
      to: submitter.email,
      fullName: submitter.fullName,
      title: location.title,
      slug: location.slug,
      feedback,
      locale,
    }).catch(() => null);
  } else if (parsed.data.decision === "REJECT") {
    const { reason } = parsed.data;
    await prisma.$transaction(async (tx) => {
      await tx.location.update({
        where: { id: locationId },
        data: { status: LocationStatus.REJECTED },
      });
      if (reason) {
        await tx.reviewFeedback.create({
          data: {
            locationId,
            authorId: admin.id,
            decision: LocationStatus.REJECTED,
            body: reason,
          },
        });
      }
    });
    await sendLocationRejected({
      to: submitter.email,
      fullName: submitter.fullName,
      title: location.title,
      reason,
      locale,
    }).catch(() => null);
  }

  revalidatePath("/admin/submissions");
  revalidatePath("/admin/locations");
  return { ok: true };
}

export async function decidePhotoAction(photoId: string, raw: unknown) {
  await requireAdmin();
  const parsed = photoDecisionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid decision" };

  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: {
      id: true,
      status: true,
      uploaderId: true,
      location: { select: { slug: true, submitterId: true } },
    },
  });
  if (!photo) return { ok: false, error: "Photo not found" };

  if (parsed.data.decision === "APPROVE") {
    await prisma.$transaction(async (tx) => {
      await tx.photo.update({
        where: { id: photoId },
        data: { status: "APPROVED", reviewNote: null },
      });
      // Award points to uploader for an approved contribution. We always award
      // since this action only runs for pending photos that needed review.
      await awardPoints({
        userId: photo.uploaderId,
        reason: "ADD_PHOTO",
        refType: "Photo",
        refId: photo.id,
        tx,
      });
    });
  } else {
    await prisma.photo.update({
      where: { id: photoId },
      data: {
        status: "REJECTED",
        reviewNote: parsed.data.reviewNote ?? null,
      },
    });
  }

  revalidatePath("/admin/photos");
  revalidatePath("/admin/submissions");
  if (photo.location.slug) {
    revalidatePath(`/locations/${photo.location.slug}`);
  }
  revalidatePath("/discover");
  return { ok: true };
}
