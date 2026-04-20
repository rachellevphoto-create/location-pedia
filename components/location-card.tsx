"use client";

import Link from "next/link";
import {
  Bus,
  Coins,
  Heart,
  Lock,
  ShowerHead,
  Star,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceKm } from "@/lib/utils";
import type { DiscoverItem } from "@/lib/api-types";

export function LocationCard({ item }: { item: DiscoverItem }) {
  return (
    <Link
      href={`/locations/${item.slug}`}
      className="group block overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {item.hero ? (
          <img
            src={item.hero}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            No photo yet
          </div>
        )}
        {item.isSecret && !item.unlocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lock className="h-4 w-4" /> Secret - unlock with points
            </div>
          </div>
        )}
        {item.ratingAvg != null && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {item.ratingAvg.toFixed(1)}
            <span className="text-white/70">({item.ratingCount})</span>
          </div>
        )}
        {item.distanceMeters != null && (
          <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
            {formatDistanceKm(item.distanceMeters)}
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-base font-semibold">{item.title}</h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Heart className="h-3 w-3" />
            {item.helpfulCount}
          </div>
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {item.description}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {item.styleTags.slice(0, 3).map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px]">
              {t}
            </Badge>
          ))}
          <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            {item.publicTransport && (
              <Bus className="h-3.5 w-3.5" aria-label="Transport" />
            )}
            {item.wheelchair && (
              <Users className="h-3.5 w-3.5" aria-label="Accessible" />
            )}
            {item.restroom && (
              <ShowerHead className="h-3.5 w-3.5" aria-label="Restroom" />
            )}
            {item.paid && <Coins className="h-3.5 w-3.5" aria-label="Paid" />}
          </div>
        </div>
      </div>
    </Link>
  );
}
