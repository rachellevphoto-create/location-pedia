"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { rateLocationAction } from "./actions";
import { useToast } from "@/components/ui/use-toast";

export function RatingBlock({
  slug,
  current,
  currentTitle,
  currentBody,
  canRate,
}: {
  slug: string;
  current: number;
  currentTitle: string;
  currentBody: string;
  canRate: boolean;
}) {
  const [hover, setHover] = React.useState(0);
  const [stars, setStars] = React.useState(current);
  const [title, setTitle] = React.useState(currentTitle);
  const [body, setBody] = React.useState(currentBody);
  const [pending, start] = React.useTransition();
  const { toast } = useToast();
  const t = useTranslations("Rating");
  const showing = hover || stars;

  const isEdit = current > 0 || currentBody || currentTitle;

  function save() {
    if (!canRate) return;
    if (stars < 1) {
      toast({
        title: t("starsRequired"),
        variant: "destructive",
      });
      return;
    }
    const fd = new FormData();
    fd.set("stars", String(stars));
    fd.set("title", title);
    fd.set("body", body);
    start(async () => {
      const res = await rateLocationAction(slug, fd);
      if (res.ok) {
        toast({
          title: t("thanks"),
          description: t("ratedStars", { n: stars }),
        });
      } else {
        toast({ title: t("couldNotSave"), variant: "destructive" });
      }
    });
  }

  return (
    <div id="rating-block" className="rounded-xl border p-4">
      <h3 className="font-semibold">{t("yourRating")}</h3>
      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => canRate && setStars(n)}
            disabled={!canRate || pending}
            aria-label={t("rateAria", { n })}
            className="focus:outline-none"
          >
            <Star
              className={`h-6 w-6 ${
                showing >= n
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
      </div>
      {canRate ? (
        <div className="mt-3 space-y-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("titlePlaceholder")}
            maxLength={120}
            disabled={pending}
          />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("reviewPlaceholder")}
            rows={3}
            maxLength={2000}
            disabled={pending}
          />
          <Button
            onClick={save}
            disabled={pending || stars < 1}
            size="sm"
            className="w-full"
          >
            {pending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {isEdit ? t("updateReview") : t("saveReview")}
          </Button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("needsApprovedAccount")}
        </p>
      )}
    </div>
  );
}
