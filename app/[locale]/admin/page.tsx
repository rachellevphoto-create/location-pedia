import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminOverview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Admin");

  const [
    pendingUsers,
    pendingLocations,
    pendingPhotos,
    totalLocations,
    weekUpdates,
    weekSignups,
  ] = await Promise.all([
    prisma.user.count({ where: { status: "PENDING" } }),
    prisma.location.count({ where: { status: "PENDING" } }),
    prisma.photo.count({ where: { status: "PENDING" } }),
    prisma.location.count({ where: { status: "PUBLISHED" } }),
    prisma.statusUpdate.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
      },
    }),
    prisma.user.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
      },
    }),
  ]);

  const stats = [
    { label: t("statPendingUsers"), value: pendingUsers },
    { label: t("statPendingSubmissions"), value: pendingLocations },
    { label: t("statPendingPhotos"), value: pendingPhotos },
    { label: t("statPublishedLocations"), value: totalLocations },
    { label: t("statWeekUpdates"), value: weekUpdates },
    { label: t("statWeekSignups"), value: weekSignups },
  ];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">{t("overviewTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("overviewSubtitle")}</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <CardDescription>{s.label}</CardDescription>
              <CardTitle className="text-3xl">{s.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
