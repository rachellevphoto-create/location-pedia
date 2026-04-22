"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Heart } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { toggleFavoriteAction } from "@/app/[locale]/(app)/locations/favorite-actions";

export interface FavoriteButtonProps {
  locationId: string;
  isFavorite: boolean;
  count?: number;
  loggedIn: boolean;
  variant?: "icon" | "pill";
  className?: string;
}

export function FavoriteButton({
  locationId,
  isFavorite,
  count,
  loggedIn,
  variant = "icon",
  className,
}: FavoriteButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = React.useTransition();
  const [active, setActive] = React.useState(isFavorite);
  const [localCount, setLocalCount] = React.useState(count ?? 0);

  React.useEffect(() => {
    setActive(isFavorite);
  }, [isFavorite]);
  React.useEffect(() => {
    if (typeof count === "number") setLocalCount(count);
  }, [count]);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    if (!loggedIn) {
      const next = encodeURIComponent(pathname || "/");
      router.push(`/login?next=${next}` as never);
      return;
    }
    const optimistic = !active;
    setActive(optimistic);
    setLocalCount((c) => c + (optimistic ? 1 : -1));
    startTransition(async () => {
      const res = await toggleFavoriteAction(locationId);
      if (res.ok) {
        setActive(res.isFavorite);
        setLocalCount(res.favoriteCount);
      } else {
        setActive(!optimistic);
        setLocalCount((c) => c + (optimistic ? -1 : 1));
      }
    });
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={active}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
          active
            ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
            : "bg-background hover:bg-accent",
          className,
        )}
      >
        <Heart
          className={cn("h-4 w-4", active && "fill-rose-500 text-rose-500")}
        />
        <span>{localCount}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={active}
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/70",
        className,
      )}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-transform",
          active && "fill-rose-500 text-rose-500",
        )}
      />
    </button>
  );
}
