import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/locations", label: "Locations" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin");
  if (session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <div className="container flex flex-col gap-6 py-6 md:flex-row">
        <aside className="md:w-56 shrink-0">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Admin
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
