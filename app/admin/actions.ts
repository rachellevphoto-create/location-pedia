"use server";

import { revalidatePath } from "next/cache";
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
import { adminDecisionSchema } from "@/lib/validation";

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

  if (decision === "APPROVE") {
    await sendUserApproved(user.email, user.fullName).catch(() => null);
  } else if (decision === "REJECT" || decision === "BAN") {
    await sendUserRejected(user.email, user.fullName, note).catch(() => null);
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function decideLocationAction(
  locationId: string,
  raw: unknown,
) {
  await requireAdmin();
  const parsed = adminDecisionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid decision" };

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    include: { submitter: { select: { id: true, email: true, fullName: true } } },
  });
  if (!location) return { ok: false, error: "Location not found" };

  const submitter = location.submitter;

  if (parsed.data.decision === "APPROVE" || parsed.data.decision === "APPROVE_NO_POINTS") {
    const award = parsed.data.decision === "APPROVE";
    await prisma.$transaction(async (tx) => {
      await tx.location.update({
        where: { id: locationId },
        data: {
          status: LocationStatus.PUBLISHED,
          approvedAt: new Date(),
          awardedPoints: award,
          reviewFeedback: null,
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
    }).catch(() => null);
  } else if (parsed.data.decision === "REVISION") {
    await prisma.location.update({
      where: { id: locationId },
      data: {
        status: LocationStatus.NEEDS_REVISION,
        reviewFeedback: parsed.data.feedback,
      },
    });
    await sendLocationRevision({
      to: submitter.email,
      fullName: submitter.fullName,
      title: location.title,
      slug: location.slug,
      feedback: parsed.data.feedback,
    }).catch(() => null);
  } else if (parsed.data.decision === "REJECT") {
    await prisma.location.update({
      where: { id: locationId },
      data: { status: LocationStatus.REJECTED, reviewFeedback: parsed.data.reason ?? null },
    });
    await sendLocationRejected({
      to: submitter.email,
      fullName: submitter.fullName,
      title: location.title,
      reason: parsed.data.reason,
    }).catch(() => null);
  }

  revalidatePath("/admin/submissions");
  revalidatePath("/admin/locations");
  return { ok: true };
}
