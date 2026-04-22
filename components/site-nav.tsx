import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Award, MapPin, PlusCircle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LocaleSwitcher } from "@/components/locale-switcher";

export async function SiteNav() {
  const session = await auth();
  const user = session?.user;
  const tNav = await getTranslations("Nav");
  const tCommon = await getTranslations("Common");
  const tStatus = await getTranslations("Status.user");

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-4">
        <Link
          href={user ? "/discover" : "/"}
          className="text-lg font-bold tracking-tight"
        >
          {tCommon("appName")}
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <Button asChild variant="ghost" size="sm">
            <Link href="/discover" className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">{tNav("discover")}</span>
            </Link>
          </Button>
          {user?.status === "APPROVED" && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/submit" className="flex items-center gap-1.5">
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">{tNav("submit")}</span>
              </Link>
            </Button>
          )}
          {user?.role === "ADMIN" && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin" className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">{tNav("admin")}</span>
              </Link>
            </Button>
          )}
          <LocaleSwitcher />
          {user ? (
            <>
              <Link
                href="/profile"
                className="hidden items-center gap-1.5 text-sm font-medium sm:flex"
              >
                <Award className="h-4 w-4 text-amber-500" />
                <span>{user.points ?? 0}</span>
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <Button type="submit" variant="ghost" size="sm">
                  {tCommon("signOut")}
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">{tCommon("signIn")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">{tCommon("join")}</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
      {user && user.status !== "APPROVED" && (
        <div className="border-t bg-amber-50 py-1.5 text-center text-xs text-amber-900">
          <Badge variant="outline" className="border-amber-300 bg-white">
            {tStatus(user.status as "PENDING" | "REJECTED" | "BANNED")}
          </Badge>{" "}
          - {tNav("accountStatusBanner")}
        </div>
      )}
    </header>
  );
}
