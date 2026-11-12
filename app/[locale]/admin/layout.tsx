import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { SiteNav } from "@/components/site-nav";
import { prisma } from "@/lib/db";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/login?next=/${locale}/admin`);
  if (session.user.role !== "ADMIN" || session.user.status !== "APPROVED") {
    redirect(`/${locale}`);
  }

  const t = await getTranslations("Admin");

  const [subCount, photoCount, userCount] = await Promise.all([
    prisma.location.count({ where: { status: { in: ["DRAFT", "PENDING"] } } }),
    prisma.photo.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { status: "PENDING" } }),
  ]);

  const links = [
    { href: "/admin", label: t("navOverview") },
    { href: "/admin/submissions", label: t("navSubmissions"), count: subCount },
    { href: "/admin/photos", label: t("navPhotos"), count: photoCount },
    { href: "/admin/users", label: t("navUsers"), count: userCount },
    { href: "/admin/locations", label: t("navLocations") },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <div className="container flex flex-col gap-6 py-7 md:flex-row">
        <aside className="shrink-0 md:w-56">
          <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("section")}
          </p>
          <AdminNav links={links} />
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
