import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Award, MapPin, PlusCircle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export async function SiteNav() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-4">
        <Link
          href={user ? "/discover" : "/"}
          className="text-lg font-bold tracking-tight"
        >
          PhotoLoc
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <Button asChild variant="ghost" size="sm">
            <Link href="/discover" className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Discover</span>
            </Link>
          </Button>
          {user?.status === "APPROVED" && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/submit" className="flex items-center gap-1.5">
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Submit</span>
              </Link>
            </Button>
          )}
          {user?.role === "ADMIN" && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin" className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            </Button>
          )}
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
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Join</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
      {user && user.status !== "APPROVED" && (
        <div className="border-t bg-amber-50 py-1.5 text-center text-xs text-amber-900">
          <Badge variant="outline" className="border-amber-300 bg-white">
            Account {user.status.toLowerCase()}
          </Badge>{" "}
          - some features are limited until your account is approved.
        </div>
      )}
    </header>
  );
}
