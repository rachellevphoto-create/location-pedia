import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { imageUrl } from "@/lib/cloudinary";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { PhotoDecision } from "./photo-decision";
import type { PhotoStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminPhotosPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: { status?: string };
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Admin");

  const status = (searchParams.status as PhotoStatus) ?? "PENDING";
  const photos = await prisma.photo.findMany({
    where: { status },
    include: {
      uploader: { select: { fullName: true, email: true } },
      location: { select: { slug: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const tabs: { key: PhotoStatus; label: string }[] = [
    { key: "PENDING", label: t("photoTabPending") },
    { key: "APPROVED", label: t("photoTabApproved") },
    { key: "REJECTED", label: t("photoTabRejected") },
  ];

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("photoQueueTitle")}</h1>
        <nav className="flex gap-1 text-sm">
          {tabs.map((s) => (
            <Link
              key={s.key}
              href={`/admin/photos?status=${s.key}`}
              className={`rounded-md px-3 py-1 ${
                s.key === status
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </nav>
      </header>

      {photos.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          {t("noPhotosToReview")}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((p) => (
            <div
              key={p.id}
              className="overflow-hidden rounded-xl border bg-card"
            >
              <div className="aspect-square w-full overflow-hidden bg-muted">
                <img
                  src={imageUrl(p.cloudinaryPublicId, {
                    width: 600,
                    height: 600,
                    watermark: p.kind === "INSPIRATION",
                  })}
                  alt={p.caption ?? p.location.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/locations/${p.location.slug}`}
                    className="text-sm font-semibold hover:underline"
                  >
                    {p.location.title}
                  </Link>
                  <Badge variant="secondary" className="text-[10px]">
                    {p.kind}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("photoBy", {
                    name: p.uploader.fullName,
                    date: formatDate(p.createdAt),
                  })}
                </p>
                {p.reviewNote && (
                  <p className="rounded bg-muted/50 p-2 text-xs text-muted-foreground">
                    {p.reviewNote}
                  </p>
                )}
                {status === "PENDING" && <PhotoDecision photoId={p.id} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
