"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { LocationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { redirect } from "@/i18n/navigation";
import { requireApproved } from "@/lib/auth";
import {
  adminSubmitLocationSchema,
  submitLocationSchema,
  type SubmitLocationInput,
} from "@/lib/validation";
import { slugify } from "@/lib/utils";
import { reverseGeocode } from "@/lib/geocoding";

export type SubmitResult =
  | { ok: true; slug: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function submitLocationAction(
  input: SubmitLocationInput,
): Promise<SubmitResult> {
  const user = await requireApproved();
  const isAdmin = user.role === "ADMIN";
  const schema = isAdmin ? adminSubmitLocationSchema : submitLocationSchema;
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path.join(".");
      if (k) fieldErrors[k] = issue.message;
    }
    return { ok: false, error: "v:review", fieldErrors };
  }
  const data = parsed.data;
  const baseSlug = slugify(data.title);
  let slug = baseSlug;
  let n = 1;
  while (await prisma.location.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${baseSlug}-${n}`;
  }

  const locale = await getLocale();
  const geo = await reverseGeocode(data.latitude, data.longitude, locale).catch(
    () => null,
  );

  const filterDefs = await prisma.filterDefinition.findMany();
  const slugToId = new Map(filterDefs.map((fd) => [fd.slug, fd.id]));

  await prisma.location.create({
    data: {
      slug,
      title: data.title,
      description: data.description,
      directions: data.directions?.trim() ? data.directions.trim() : null,
      latitude: data.latitude,
      longitude: data.longitude,
      city: geo?.city ?? null,
      area: geo?.area ?? null,
      country: geo?.country ?? null,
      submitterId: user.id,
      status: LocationStatus.DRAFT,
      approvedAt: null,
      photos:
        data.photos.length > 0
          ? {
              create: data.photos.map((p) => ({
                uploaderId: user.id,
                cloudinaryPublicId: p.cloudinaryPublicId,
                kind: p.kind,
                width: p.width ?? null,
                height: p.height ?? null,
                caption: p.caption ?? null,
              })),
            }
          : undefined,
      locationFilters: {
        create: data.filters
          .filter((f) => slugToId.has(f.slug))
          .map((f) => ({
            filterId: slugToId.get(f.slug)!,
            boolValue: f.boolValue,
            numValue: f.numValue ?? null,
          })),
      },
    },
  });

  revalidatePath("/admin/submissions");
  revalidatePath("/admin/locations");
  redirect({
    href: "/submit/thanks",
    locale: locale as "he" | "en",
  });
}
