import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
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
        initial={{
          title: location.title,
          description: location.description,
          directions: location.directions,
          latitude: location.latitude,
          longitude: location.longitude,
          wheelchair: fm.get("wheelchair")?.boolValue ?? false,
          publicTransport: fm.get("publicTransport")?.boolValue ?? false,
          restroom: fm.get("restroom")?.boolValue ?? false,
          changingRoom: fm.get("changingRoom")?.boolValue ?? false,
          drone: fm.get("drone")?.boolValue ?? false,
          paid: fm.get("paid")?.boolValue ?? false,
          priceMin: fm.get("priceMin")?.numValue ?? null,
          priceMax: fm.get("priceMax")?.numValue ?? null,
          styleTags,
          isSecret: fm.get("isSecret")?.boolValue ?? false,
          status: location.status,
          unlockCost: location.unlockCost,
          reviewFeedback: location.reviewFeedback,
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
