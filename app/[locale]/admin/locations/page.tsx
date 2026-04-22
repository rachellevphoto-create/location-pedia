import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { LocationRowActions } from "./location-row-actions";

export const dynamic = "force-dynamic";

export default async function AdminLocationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Admin");
  const tStatus = await getTranslations("Status.location");

  const locations = await prisma.location.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      submitter: { select: { fullName: true } },
      _count: { select: { photos: true, statusUpdates: true } },
      locationFilters: { include: { filter: { select: { slug: true } } } },
    },
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">{t("locationsTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("locationsSubtitle")}</p>
      </header>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-start text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-start">{t("colTitle")}</th>
              <th className="p-3 text-start">{t("colStatus")}</th>
              <th className="p-3 text-start">{t("colSubmitter")}</th>
              <th className="p-3 text-start">{t("colPhotos")}</th>
              <th className="p-3 text-start">{t("colUpdates")}</th>
              <th className="p-3 text-start">{t("colCreated")}</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {locations.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-3 font-medium">
                  {l.title}
                  {l.locationFilters.some((lf) => lf.filter.slug === "isSecret" && lf.boolValue) && (
                    <Badge variant="outline" className="ms-2">
                      {t("tagSecret")}
                    </Badge>
                  )}
                  {l.hidden && (
                    <Badge variant="secondary" className="ms-2">
                      {t("hiddenBadge")}
                    </Badge>
                  )}
                </td>
                <td className="p-3">
                  <Badge
                    variant={
                      l.status === "PUBLISHED"
                        ? "success"
                        : l.status === "REJECTED"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {tStatus(l.status)}
                  </Badge>
                </td>
                <td className="p-3 text-muted-foreground">
                  {l.submitter.fullName}
                </td>
                <td className="p-3">{l._count.photos}</td>
                <td className="p-3">{l._count.statusUpdates}</td>
                <td className="p-3 text-muted-foreground">
                  {formatDate(l.createdAt)}
                </td>
                <td className="p-3 text-end">
                  <LocationRowActions
                    locationId={l.id}
                    slug={l.slug}
                    status={l.status}
                    hidden={l.hidden}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
