import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";

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
  if (session.user.role !== "ADMIN") redirect(`/${locale}`);

  const t = await getTranslations("Admin");

  const links = [
    { href: "/admin", label: t("navOverview") },
    { href: "/admin/submissions", label: t("navSubmissions") },
    { href: "/admin/photos", label: t("navPhotos") },
    { href: "/admin/users", label: t("navUsers") },
    { href: "/admin/locations", label: t("navLocations") },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <div className="container flex flex-col gap-6 py-6 md:flex-row">
        <aside className="md:w-56 shrink-0">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("section")}
          </p>
          <nav className="flex flex-col gap-1 text-sm">
            {links.map((l) => (
              <Button
                key={l.href}
                asChild
                variant="ghost"
                className="justify-start"
              >
                <Link href={l.href}>{l.label}</Link>
              </Button>
            ))}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
