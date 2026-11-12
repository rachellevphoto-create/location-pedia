import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Plus } from "lucide-react";
import { requireApprovedPage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { imageUrl } from "@/lib/cloudinary";
import { POINTS_VALUES } from "@/lib/points";
import { cn, formatDate } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: "bg-lime/25 text-[hsl(64.6_69.9%_18.2%)]",
  PENDING: "bg-foreground/10 text-foreground",
  NEEDS_REVISION: "bg-primary/10 text-primary",
  REJECTED: "bg-muted text-muted-foreground",
  DRAFT: "bg-muted text-muted-foreground",
};

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireApprovedPage(locale, "/profile");

  const t = await getTranslations("Profile");
  const tStatus = await getTranslations("Status");
  const tSubmit = await getTranslations("Submit");

  const [user, mySubmissions, ledger, approvedPhotos] = await Promise.all([
    prisma.user.findUnique({ where: { id: me.id } }),
    prisma.location.findMany({
      where: { submitterId: me.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        photos: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { cloudinaryPublicId: true },
        },
        reviewFeedbacks: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true },
        },
      },
    }),
    prisma.pointsLedger.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.photo.count({
      where: { uploaderId: me.id, status: "APPROVED" },
    }),
  ]);

  if (!user) redirect(`/${locale}`);

  const publishedCount = mySubmissions.filter(
    (l) => l.status === "PUBLISHED",
  ).length;
  const unlockCost = Math.abs(POINTS_VALUES.UNLOCK_SECRET);
  const canUnlock = Math.floor(Math.max(0, user.points) / unlockCost);
  const initials = user.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  function reasonLabel(reason: string) {
    const key = reason === "ADMIN_ADJUST" ? "ADMIN_ADJUSTMENT" : reason;
    try {
      return t(`reasons.${key}` as any);
    } catch {
      return reason.toLowerCase().replace(/_/g, " ");
    }
  }

  return (
    <div className="container max-w-6xl space-y-6 py-9">
      <section className="grid gap-5 md:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex items-center gap-5 rounded-2xl border bg-card p-6 md:p-7">
          <span
            aria-hidden
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground"
          >
            {initials}
          </span>
          <div className="min-w-0 space-y-1.5">
            <h1 className="truncate text-3xl font-bold tracking-tight">
              {user.fullName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("memberSince", { date: formatDate(user.createdAt, locale) })}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span
                className={cn(
                  "rounded-md px-2.5 py-0.5 text-xs font-semibold",
                  user.status === "APPROVED"
                    ? STATUS_STYLE.PUBLISHED
                    : "bg-muted text-muted-foreground",
                )}
              >
                {tStatus(`user.${user.status}` as any)}
              </span>
              <span className="rounded-md bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                {t("spotsCount", { count: publishedCount })}
              </span>
              <span className="rounded-md bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                {t("photosCount", { count: approvedPhotos })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-2 rounded-2xl bg-foreground p-6 text-background md:p-7">
          <p className="text-xs font-bold uppercase tracking-wide text-lime">
            {t("yourPoints")}
          </p>
          <p className="text-5xl font-bold tracking-tight tabular-nums">
            {user.points.toLocaleString(locale)}
          </p>
          <p className="text-sm text-background/70">
            {t("canUnlock", { count: canUnlock })}
          </p>
        </div>
      </section>

      <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-2xl border bg-card p-5 md:p-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">
              {t("yourSubmissionsTitle")}{" "}
              <span className="text-base font-normal text-muted-foreground">
                {t("submissionsTotal", { count: mySubmissions.length })}
              </span>
            </h2>
            <Link
              href="/submit"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              {tSubmit("title")}
            </Link>
          </div>
          {mySubmissions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("noSubmissions")}
            </p>
          ) : (
            <ul>
              {mySubmissions.map((l) => {
                const cover = l.photos[0];
                const feedback =
                  l.status === "NEEDS_REVISION" || l.status === "REJECTED"
                    ? l.reviewFeedbacks[0]?.body
                    : null;
                const title =
                  l.status === "PUBLISHED" ? (
                    <Link
                      href={`/locations/${l.slug}` as any}
                      className="font-semibold hover:underline"
                    >
                      {l.title}
                    </Link>
                  ) : (
                    <span className="font-semibold">{l.title}</span>
                  );
                return (
                  <li
                    key={l.id}
                    className="flex items-center gap-4 border-t py-3 first:border-t-0"
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {cover && (
                        <img
                          src={imageUrl(cover.cloudinaryPublicId, {
                            width: 112,
                            height: 112,
                          })}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="truncate text-[15px]">{title}</p>
                      <p className="line-clamp-1 text-sm text-muted-foreground">
                        {feedback
                          ? t("adminSays", { text: feedback })
                          : formatDate(l.createdAt, locale)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        STATUS_STYLE[l.status] ?? STATUS_STYLE.DRAFT,
                      )}
                    >
                      {tStatus(`location.${l.status}` as any)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5 md:p-6">
          <h2 className="text-xl font-semibold">{t("recentPointsTitle")}</h2>
          <p className="mb-2 text-sm text-muted-foreground">
            {t("recentPointsDescription")}
          </p>
          {ledger.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("noActivity")}
            </p>
          ) : (
            <ul>
              {ledger.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 border-t py-2.5 first:border-t-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm first-letter:uppercase">
                      {reasonLabel(p.reason)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(p.createdAt, locale)}
                    </p>
                  </div>
                  <span
                    dir="ltr"
                    className={cn(
                      "shrink-0 font-semibold tabular-nums",
                      p.delta >= 0 ? "text-emerald-700" : "text-primary",
                    )}
                  >
                    {p.delta >= 0 ? "+" : "−"}
                    {Math.abs(p.delta)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
