import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminLocationsPage() {
  const locations = await prisma.location.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      submitter: { select: { fullName: true } },
      _count: { select: { photos: true, statusUpdates: true } },
    },
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Locations</h1>
        <p className="text-sm text-muted-foreground">
          All published, pending, and rejected locations.
        </p>
      </header>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Status</th>
              <th className="p-3">Submitter</th>
              <th className="p-3">Photos</th>
              <th className="p-3">Updates</th>
              <th className="p-3">Created</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {locations.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-3 font-medium">
                  {l.title}
                  {l.isSecret && (
                    <Badge variant="outline" className="ml-2">
                      secret
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
                    {l.status.toLowerCase().replace("_", " ")}
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
                <td className="p-3 text-right">
                  {l.status === "PUBLISHED" && (
                    <Link
                      href={`/locations/${l.slug}`}
                      className="text-primary hover:underline"
                    >
                      view
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
