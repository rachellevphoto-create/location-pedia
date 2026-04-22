import { getTranslations } from "next-intl/server";
import { Star } from "lucide-react";
import { formatDate } from "@/lib/utils";

export type ReviewItem = {
  id: string;
  stars: number;
  title: string | null;
  body: string | null;
  author: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
};

export async function ReviewsList({
  reviews,
  currentUserId,
}: {
  reviews: ReviewItem[];
  currentUserId: string | null;
}) {
  const t = await getTranslations("Rating");

  if (reviews.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("allReviews")}</h2>
        <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          {t("noReviews")}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">
        {t("allReviewsCount", { count: reviews.length })}
      </h2>
      <ul className="space-y-3">
        {reviews.map((r) => {
          const mine = r.authorId === currentUserId;
          return (
            <li
              key={r.id}
              className={`rounded-xl border p-4 ${
                mine ? "border-primary/40 bg-primary/5" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{r.author}</span>
                  {mine && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {t("yourReviewBadge")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`h-4 w-4 ${
                        r.stars >= n
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  ))}
                </div>
              </div>
              {r.title && (
                <p className="mt-2 text-sm font-semibold">{r.title}</p>
              )}
              {r.body && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {r.body}
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {formatDate(new Date(r.updatedAt))}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
