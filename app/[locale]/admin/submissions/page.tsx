import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExternalLink } from "lucide-react";
import type { LocationStatus } from "@prisma/client";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { imageUrl } from "@/lib/cloudinary";
import { SYSTEM_FILTERS } from "@/lib/filters";
import { filterLabel } from "@/lib/filter-ui";
import { cn, formatDate } from "@/lib/utils";
import { SubmissionDecision } from "./decision";

export const dynamic = "force-dynamic";

const STATUSES: LocationStatus[] = [
  "DRAFT",
  "PENDING",
  "NEEDS_REVISION",
  "PUBLISHED",
  "REJECTED",
];

export default async function AdminSubmissionsPage({
  params,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; id?: string }>;
}) {
  const { locale } = await params;
  const searchParams = await searchParamsPromise;
  setRequestLocale(locale);

  const t = await getTranslations("Admin");
  const tTags = await getTranslations("Tags");
  const tAmenity = await getTranslations("Amenities");
  const tStatus = await getTranslations("Status.location");

  const status: LocationStatus = STATUSES.includes(
    searchParams.status as LocationStatus,
  )
    ? (searchParams.status as LocationStatus)
    : "DRAFT";

  const [items, counts] = await Promise.all([
    prisma.location.findMany({
      where: { status },
      include: {
        submitter: { select: { fullName: true, email: true } },
        photos: { orderBy: { createdAt: "asc" } },
        locationFilters: {
          include: { filter: { select: { slug: true, category: true } } },
        },
        reviewFeedbacks: {
          orderBy: { createdAt: "desc" },
          include: { author: { select: { fullName: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.location.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const countOf = (s: LocationStatus) =>
    counts.find((c) => c.status === s)?._count._all ?? 0;

  const tabs = [
    { key: "DRAFT" as const, label: t("submissionTabDraft") },
    { key: "PENDING" as const, label: t("submissionTabPending") },
    { key: "NEEDS_REVISION" as const, label: t("submissionTabRevision") },
    { key: "PUBLISHED" as const, label: t("submissionTabPublished") },
    { key: "REJECTED" as const, label: t("submissionTabRejected") },
  ];

  const selected = items.find((it) => it.id === searchParams.id) ?? items[0];

  const hasFilter = (it: (typeof items)[number], slug: string) =>
    it.locationFilters.some((lf) => lf.filter.slug === slug && lf.boolValue);
  const tagLabel = (slug: string) => {
    try {
      return tTags(slug as any);
    } catch {
      return slug;
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("submissionsTitle")}
        </h1>
        <nav
          aria-label={t("colStatus")}
          className="flex flex-wrap gap-1 rounded-lg bg-muted p-1 text-sm"
        >
          {tabs.map((s) => (
            <Link
              key={s.key}
              href={`/admin/submissions?status=${s.key}` as any}
              aria-current={s.key === status ? "page" : undefined}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-md px-3 first-letter:uppercase",
                s.key === status
                  ? "bg-background font-semibold text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
              <span className="tabular-nums opacity-70">· {countOf(s.key)}</span>
            </Link>
          ))}
        </nav>
      </header>

      {!selected ? (
        <div className="rounded-2xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          {t("noSubmissions")}
        </div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <ul
            aria-label={t("queueLabel")}
            className="max-h-[70vh] overflow-y-auto rounded-2xl border bg-card"
          >
            {items.map((it) => {
              const active = it.id === selected.id;
              return (
                <li key={it.id} className="border-b last:border-b-0">
                  <Link
                    href={`/admin/submissions?status=${status}&id=${it.id}` as any}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex items-center gap-3 border-s-[3px] px-4 py-3.5 transition-colors",
                      active
                        ? "border-s-primary bg-primary/5"
                        : "border-s-transparent hover:bg-muted/50",
                    )}
                  >
                    <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {it.photos[0] && (
                        <img
                          src={imageUrl(it.photos[0].cloudinaryPublicId, {
                            width: 96,
                            height: 96,
                          })}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {it.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {it.submitter.fullName} ·{" "}
                        {formatDate(it.createdAt, locale)}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {t("photosCount", { count: it.photos.length })}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <section
            aria-label={selected.title}
            className="space-y-5 rounded-2xl border bg-card p-5 md:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold">{selected.title}</h2>
                  {hasFilter(selected, SYSTEM_FILTERS.isSecret) && (
                    <span className="rounded-md bg-foreground px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-lime">
                      {t("secretBadge")}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("submittedBy", {
                    name: selected.submitter.fullName,
                    date: formatDate(selected.createdAt, locale),
                  })}
                </p>
              </div>
              <Link
                href={`/locations/${selected.slug}` as any}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border px-3.5 text-sm font-semibold hover:bg-muted"
              >
                {t("previewPage")}
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>

            {selected.photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {selected.photos.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="aspect-square overflow-hidden rounded-lg bg-muted"
                  >
                    <img
                      src={imageUrl(p.cloudinaryPublicId, {
                        width: 300,
                        height: 300,
                      })}
                      alt={p.caption ?? ""}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/85">
              {selected.description}
            </p>

            <dl className="grid gap-2.5 text-sm sm:grid-cols-3">
              <div className="rounded-lg bg-muted/60 p-3">
                <dt className="text-muted-foreground">{t("detailTags")}</dt>
                <dd className="mt-1 font-semibold">
                  {selected.locationFilters
                    .filter((lf) => lf.filter.category === "STYLE" && lf.boolValue)
                    .map((lf) => tagLabel(lf.filter.slug))
                    .join(", ") || "—"}
                </dd>
              </div>
              <div className="rounded-lg bg-muted/60 p-3">
                <dt className="text-muted-foreground">{t("detailAmenities")}</dt>
                <dd className="mt-1 font-semibold">
                  {[
                    ...selected.locationFilters
                      .filter((lf) => lf.filter.category === "AMENITY" && lf.boolValue)
                      .map((lf) => filterLabel(tAmenity, lf.filter.slug)),
                    hasFilter(selected, SYSTEM_FILTERS.paid) && t("tagPaid"),
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </dd>
              </div>
              <div className="rounded-lg bg-muted/60 p-3">
                <dt className="text-muted-foreground">{t("detailPin")}</dt>
                <dd className="mt-1 font-semibold">
                  <span dir="ltr">
                    {selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)}
                  </span>
                </dd>
              </div>
            </dl>

            {selected.reviewFeedbacks.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">{t("feedbackHistory")}</p>
                {selected.reviewFeedbacks.map((fb, idx) => (
                  <div
                    key={fb.id}
                    className={cn(
                      "rounded-lg p-3 text-sm",
                      idx === 0
                        ? "bg-primary/10 text-foreground"
                        : "bg-muted/50 text-muted-foreground",
                    )}
                  >
                    <p className="text-xs">
                      <span className="font-semibold">{fb.author.fullName}</span>
                      {" · "}
                      {formatDate(fb.createdAt, locale)}
                      {" · "}
                      {tStatus(fb.decision)}
                    </p>
                    <p className="mt-1">{fb.body}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-5">
              <SubmissionDecision
                key={selected.id}
                locationId={selected.id}
                status={selected.status}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
