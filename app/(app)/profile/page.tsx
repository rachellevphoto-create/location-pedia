import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/profile");

  const [user, mySubmissions, ledger] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.location.findMany({
      where: { submitterId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.pointsLedger.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  if (!user) redirect("/");

  return (
    <div className="container max-w-4xl space-y-6 py-8">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">{user.fullName}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-primary">{user.points}</p>
          <p className="text-xs text-muted-foreground">points</p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your submissions</CardTitle>
            <CardDescription>{mySubmissions.length} total</CardDescription>
          </CardHeader>
          <CardContent>
            {mySubmissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You haven't submitted any locations yet.{" "}
                <Link href="/submit" className="text-primary hover:underline">
                  Submit one
                </Link>
                .
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {mySubmissions.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0"
                  >
                    <span>
                      {l.status === "PUBLISHED" ? (
                        <Link
                          href={`/locations/${l.slug}`}
                          className="font-medium hover:underline"
                        >
                          {l.title}
                        </Link>
                      ) : (
                        <span className="font-medium">{l.title}</span>
                      )}
                      <span className="block text-xs text-muted-foreground">
                        {formatDate(l.createdAt)}
                      </span>
                    </span>
                    <Badge
                      variant={
                        l.status === "PUBLISHED"
                          ? "success"
                          : l.status === "REJECTED"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {l.status.toLowerCase().replace("_", " ")}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent points</CardTitle>
            <CardDescription>Last 20 entries</CardDescription>
          </CardHeader>
          <CardContent>
            {ledger.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {ledger.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-muted-foreground">
                      {p.reason.toLowerCase().replace(/_/g, " ")}{" "}
                      <span className="text-xs">
                        {formatDate(p.createdAt)}
                      </span>
                    </span>
                    <span
                      className={
                        p.delta >= 0
                          ? "font-semibold text-emerald-600"
                          : "font-semibold text-rose-600"
                      }
                    >
                      {p.delta >= 0 ? "+" : ""}
                      {p.delta}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
