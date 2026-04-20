import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const [pendingUsers, pendingLocations, totalLocations, weekUpdates, weekSignups] =
    await Promise.all([
      prisma.user.count({ where: { status: "PENDING" } }),
      prisma.location.count({ where: { status: "PENDING" } }),
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
    { label: "Pending users", value: pendingUsers, href: "/admin/users" },
    {
      label: "Pending submissions",
      value: pendingLocations,
      href: "/admin/submissions",
    },
    {
      label: "Published locations",
      value: totalLocations,
      href: "/admin/locations",
    },
    { label: "Updates posted (7d)", value: weekUpdates },
    { label: "Sign-ups (7d)", value: weekSignups },
  ];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Admin overview</h1>
        <p className="text-sm text-muted-foreground">
          Snapshot of community health and moderation queue.
        </p>
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
