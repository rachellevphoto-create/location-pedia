"use client";

import * as React from "react";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { toggleHelpfulAction } from "./actions";

type Photo = {
  id: string;
  url: string;
  caption: string | null;
  uploader: string;
  helpful: number;
  myHelpful: boolean;
};

export function GalleryGrid({
  photos,
  slug,
  canHelpful,
}: {
  photos: Photo[];
  slug: string;
  canHelpful: boolean;
}) {
  const [pending, startTransition] = React.useTransition();
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const { toast } = useToast();

  if (photos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
        No photos in this gallery yet.
      </div>
    );
  }

  function onHelpful(photoId: string) {
    if (!canHelpful) {
      toast({
        title: "Sign in required",
        description: "Sign in to vote helpful.",
      });
      return;
    }
    setBusyId(photoId);
    startTransition(async () => {
      try {
        await toggleHelpfulAction(photoId, slug);
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {photos.map((p) => (
        <li
          key={p.id}
          className="overflow-hidden rounded-lg border bg-card"
        >
          <div className="aspect-square w-full overflow-hidden bg-muted">
            <img
              src={p.url}
              alt={p.caption ?? `Photo by ${p.uploader}`}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex items-center justify-between p-3 text-xs">
            <span className="text-muted-foreground">{p.uploader}</span>
            <Button
              size="sm"
              variant={p.myHelpful ? "default" : "ghost"}
              onClick={() => onHelpful(p.id)}
              disabled={busyId === p.id && pending}
              className="h-7 gap-1 px-2"
            >
              {busyId === p.id && pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Heart
                  className={`h-3.5 w-3.5 ${p.myHelpful ? "fill-current" : ""}`}
                />
              )}
              {p.helpful}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
