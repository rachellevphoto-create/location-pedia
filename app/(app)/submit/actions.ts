"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LocationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireApproved } from "@/lib/auth";
import { submitLocationSchema, type SubmitLocationInput } from "@/lib/validation";
import { slugify } from "@/lib/utils";

export type SubmitResult =
  | { ok: true; slug: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function submitLocationAction(
  input: SubmitLocationInput,
): Promise<SubmitResult> {
  const user = await requireApproved();
  const parsed = submitLocationSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path.join(".");
      if (k) fieldErrors[k] = issue.message;
    }
    return { ok: false, error: "Please review the form.", fieldErrors };
  }
  const data = parsed.data;
  const baseSlug = slugify(data.title);
  let slug = baseSlug;
  let n = 1;
  while (await prisma.location.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${baseSlug}-${n}`;
  }

  await prisma.location.create({
    data: {
      slug,
      title: data.title,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
      wheelchair: data.wheelchair,
      publicTransport: data.publicTransport,
      restroom: data.restroom,
      changingRoom: data.changingRoom,
      paid: data.paid,
      priceMin: data.priceMin ?? null,
      priceMax: data.priceMax ?? null,
      styleTags: data.styleTags,
      isSecret: data.isSecret,
      submitterId: user.id,
      status: LocationStatus.PENDING,
      photos: {
        create: data.photos.map((p) => ({
          uploaderId: user.id,
          cloudinaryPublicId: p.cloudinaryPublicId,
          kind: p.kind,
          width: p.width ?? null,
          height: p.height ?? null,
          caption: p.caption ?? null,
        })),
      },
    },
  });

  revalidatePath("/admin/submissions");
  redirect("/submit/thanks");
}
