import Link from "next/link";
import { prisma } from "@/lib/db";
import { imageUrl } from "@/lib/cloudinary";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { SubmissionDecision } from "./decision";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const status = (searchParams.status as any) ?? "PENDING";
  const items = await prisma.location.findMany({
    where: { status },
    include: {
      submitter: { select: { fullName: true, email: true } },
      photos: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Submissions</h1>
        <nav className="flex gap-1 text-sm">
          {(["PENDING", "NEEDS_REVISION", "PUBLISHED", "REJECTED"] as const).map(
            (s) => (
              <Link
                key={s}
                href={`/admin/submissions?status=${s}`}
                className={`rounded-md px-3 py-1 ${
                  s === status
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {s.toLowerCase().replace("_", " ")}
              </Link>
            ),
          )}
        </nav>
      </header>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          No submissions in this state.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((it) => (
            <div key={it.id} className="overflow-hidden rounded-xl border bg-card">
              <div className="grid gap-4 md:grid-cols-[200px_1fr]">
                <div className="aspect-square w-full bg-muted md:aspect-auto">
                  {it.photos[0] ? (
                    <img
                      src={imageUrl(it.photos[0].cloudinaryPublicId, {
                        width: 400,
                        height: 400,
                      })}
                      alt={it.title}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{it.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        by {it.submitter.fullName} - {formatDate(it.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {it.isSecret && <Badge>Secret</Badge>}
                      {it.styleTags.slice(0, 3).map((t) => (
                        <Badge key={t} variant="secondary">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {it.description}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>
                      {it.latitude.toFixed(4)}, {it.longitude.toFixed(4)}
                    </span>
                    {it.wheelchair && <span>accessible</span>}
                    {it.publicTransport && <span>transit</span>}
                    {it.restroom && <span>restroom</span>}
                    {it.paid && <span>paid</span>}
                    <span>{it.photos.length} photos</span>
                  </div>
                  {it.reviewFeedback && (
                    <p className="rounded bg-amber-50 p-2 text-xs text-amber-900">
                      Previous feedback: {it.reviewFeedback}
                    </p>
                  )}
                  <SubmissionDecision locationId={it.id} status={it.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
