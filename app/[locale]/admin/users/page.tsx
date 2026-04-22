import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { UserActions } from "./user-actions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: { status?: string };
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Admin");
  const tStatus = await getTranslations("Status.user");

  const status = (searchParams.status as any) ?? "PENDING";
  const users = await prisma.user.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const tabs = ["PENDING", "APPROVED", "REJECTED", "BANNED"] as const;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("usersTitle")}</h1>
        <nav className="flex gap-1 text-sm">
          {tabs.map((s) => (
            <Link
              key={s}
              href={`/admin/users?status=${s}`}
              className={`rounded-md px-3 py-1 ${
                s === status ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {tStatus(s)}
            </Link>
          ))}
        </nav>
      </header>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-start text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-start">{t("colUser")}</th>
              <th className="p-3 text-start">{t("colPhone")}</th>
              <th className="p-3 text-start">{t("colTeacher")}</th>
              <th className="p-3 text-start">{t("colPortfolio")}</th>
              <th className="p-3 text-start">{t("colJoined")}</th>
              <th className="p-3 text-end">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3">
                  <div className="font-medium">{u.fullName}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                  {u.role === "ADMIN" && (
                    <Badge variant="outline" className="mt-1">
                      {t("adminBadge")}
                    </Badge>
                  )}
                </td>
                <td className="p-3 text-muted-foreground">{u.phone ?? "-"}</td>
                <td className="p-3 text-muted-foreground">
                  {u.teacherOrSchool ?? "-"}
                </td>
                <td className="p-3">
                  {u.portfolioUrl ? (
                    <a
                      href={u.portfolioUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {t("viewLink")}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="p-3 text-muted-foreground">
                  {formatDate(u.createdAt)}
                </td>
                <td className="p-3 text-end">
                  <UserActions userId={u.id} status={u.status} />
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted-foreground">
                  {t("noUsers")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
