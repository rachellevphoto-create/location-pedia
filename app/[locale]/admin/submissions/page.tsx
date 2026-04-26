import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { imageUrl } from "@/lib/cloudinary";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { SubmissionDecision } from "./decision";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: { status?: string };
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Admin");

  const status = (searchParams.status as any) ?? "DRAFT";
  const items = await prisma.location.findMany({
    where: { status },
    include: {
      submitter: { select: { fullName: true, email: true } },
      photos: { orderBy: { createdAt: "asc" } },
      locationFilters: { include: { filter: { select: { slug: true, category: true } } } },
      reviewFeedbacks: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { fullName: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const tabs = [
    { key: "DRAFT" as const, label: t("submissionTabDraft") },
    { key: "PENDING" as const, label: t("submissionTabPending") },
    { key: "NEEDS_REVISION" as const, label: t("submissionTabRevision") },
    { key: "PUBLISHED" as const, label: t("submissionTabPublished") },
    { key: "REJECTED" as const, label: t("submissionTabRejected") },
  ];

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("submissionsTitle")}</h1>
        <nav className="flex gap-1 text-sm">
          {tabs.map((s) => (
            <Link
              key={s.key}
              href={`/admin/submissions?status=${s.key}`}
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

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          {t("noSubmissions")}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((it) => (
            <div key={it.id} className="overflow-hidden rounded-xl border bg-card">
              <div className="grid gap-4 md:grid-cols-[200px_1fr]">
                <div className="aspect-square w-full bg-muted md:aspect-auto">
                  {it.photos[0] ? (
                    <img
                      src={imageUrl(it.photos[0].cloudinaryPublicId, {
                        width: 400,
                        height: 400,
                      })}
                      alt={it.title}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">
                        <Link
                          href={`/locations/${it.slug}`}
                          className="hover:underline"
                        >
                          {it.title}
                        </Link>
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {t("submittedBy", {
                          name: it.submitter.fullName,
                          date: formatDate(it.createdAt),
                        })}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {it.locationFilters.some((lf) => lf.filter.slug === "isSecret" && lf.boolValue) && <Badge>{t("secretBadge")}</Badge>}
                      {it.locationFilters
                        .filter((lf) => lf.filter.category === "STYLE" && lf.boolValue)
                        .slice(0, 3)
                        .map((lf) => (
                          <Badge key={lf.filter.slug} variant="secondary">
                            {lf.filter.slug}
                          </Badge>
                        ))}
                    </div>
                  </div>
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {it.description}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>
                      {it.latitude.toFixed(4)}, {it.longitude.toFixed(4)}
                    </span>
                    {it.locationFilters.some((lf) => lf.filter.slug === "wheelchair" && lf.boolValue) && <span>{t("tagAccessible")}</span>}
                    {it.locationFilters.some((lf) => lf.filter.slug === "publicTransport" && lf.boolValue) && <span>{t("tagTransit")}</span>}
                    {it.locationFilters.some((lf) => lf.filter.slug === "restroom" && lf.boolValue) && <span>{t("tagRestroom")}</span>}
                    {it.locationFilters.some((lf) => lf.filter.slug === "paid" && lf.boolValue) && <span>{t("tagPaid")}</span>}
                    <span>{t("photosCount", { count: it.photos.length })}</span>
                  </div>
                  {it.reviewFeedbacks.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        {t("feedbackHistory")}
                      </p>
                      {it.reviewFeedbacks.map((fb, idx) => (
                        <div
                          key={fb.id}
                          className={`rounded p-2 text-xs ${
                            idx === 0
                              ? "bg-amber-50 text-amber-900"
                              : "bg-muted/50 text-muted-foreground"
                          }`}
                        >
                          <span className="font-medium">
                            {fb.author.fullName}
                          </span>
                          {" · "}
                          <span>{formatDate(fb.createdAt)}</span>
                          {" · "}
                          <Badge variant="outline" className="text-[10px]">
                            {fb.decision}
                          </Badge>
                          <p className="mt-1">{fb.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <SubmissionDecision locationId={it.id} status={it.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
