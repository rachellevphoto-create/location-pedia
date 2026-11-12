import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getFilterOptions, SYSTEM_FILTERS } from "@/lib/filters";
import { imageUrl } from "@/lib/cloudinary";
import { EditLocationForm } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function AdminEditLocationPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin");

  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      photos: { orderBy: [{ kind: "asc" }, { createdAt: "asc" }] },
      locationFilters: { include: { filter: true } },
      reviewFeedbacks: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { fullName: true } } },
      },
    },
  });
  if (!location) notFound();

  const fm = new Map<string, { boolValue: boolean; numValue: number | null }>();
  for (const lf of location.locationFilters) {
    fm.set(lf.filter.slug, { boolValue: lf.boolValue, numValue: lf.numValue });
  }

  const styleTags = location.locationFilters
    .filter((lf) => lf.filter.category === "STYLE" && lf.boolValue)
    .map((lf) => lf.filter.slug);
  const filterOptions = await getFilterOptions();

  return (
    <div className="container max-w-3xl py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("editLocationTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("editLocationSubtitle")}
        </p>
      </header>
      <EditLocationForm
        id={location.id}
        filterOptions={filterOptions}
        initial={{
          title: location.title,
          description: location.description,
          directions: location.directions,
          latitude: location.latitude,
          longitude: location.longitude,
          amenities: filterOptions.amenities.filter(
            (slug) => fm.get(slug)?.boolValue,
          ),
          paid: fm.get(SYSTEM_FILTERS.paid)?.boolValue ?? false,
          priceMin: fm.get(SYSTEM_FILTERS.priceMin)?.numValue ?? null,
          priceMax: fm.get(SYSTEM_FILTERS.priceMax)?.numValue ?? null,
          styleTags,
          isSecret: fm.get(SYSTEM_FILTERS.isSecret)?.boolValue ?? false,
          status: location.status,
          unlockCost: location.unlockCost,
          feedbackHistory: location.reviewFeedbacks.map((fb) => ({
            id: fb.id,
            authorName: fb.author.fullName,
            decision: fb.decision,
            body: fb.body,
            createdAt: fb.createdAt.toISOString(),
          })),
          existingPhotos: location.photos.map((p) => ({
            id: p.id,
            cloudinaryPublicId: p.cloudinaryPublicId,
            kind: p.kind,
            previewUrl: imageUrl(p.cloudinaryPublicId, {
              width: 320,
              height: 240,
              watermark: p.kind === "INSPIRATION",
            }),
            caption: p.caption,
          })),
        }}
      />
    </div>
  );
}
