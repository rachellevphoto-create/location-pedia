"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { rateLocationAction } from "./actions";
import { useToast } from "@/components/ui/use-toast";

export function RatingBlock({
  slug,
  current,
  canRate,
}: {
  slug: string;
  current: number;
  canRate: boolean;
}) {
  const [hover, setHover] = React.useState(0);
  const [stars, setStars] = React.useState(current);
  const [pending, start] = React.useTransition();
  const { toast } = useToast();
  const showing = hover || stars;

  function rate(n: number) {
    if (!canRate) return;
    setStars(n);
    const fd = new FormData();
    fd.set("stars", String(n));
    start(async () => {
      const res = await rateLocationAction(slug, fd);
      if (res.ok) {
        toast({ title: "Thanks!", description: `You rated ${n} stars.` });
      } else {
        toast({ title: "Could not save rating", variant: "destructive" });
      }
    });
  }

  return (
    <div className="rounded-xl border p-4">
      <h3 className="font-semibold">Your rating</h3>
      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => rate(n)}
            disabled={!canRate || pending}
            aria-label={`Rate ${n} stars`}
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
      {!canRate && (
        <p className="mt-2 text-xs text-muted-foreground">
          Sign in with an approved account to rate.
        </p>
      )}
    </div>
  );
}
