"use client";

import { useTranslations } from "next-intl";
import { Bus, Coins, Heart, Lock, Navigation, ShowerHead, Star, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "@/components/favorite-button";
import { formatDistanceKm } from "@/lib/utils";
import type { DiscoverItem } from "@/lib/api-types";

export function LocationCard({
  item,
  loggedIn,
}: {
  item: DiscoverItem;
  loggedIn: boolean;
}) {
  const t = useTranslations("Card");
  const tTags = useTranslations("Tags");
  return (
    <Link
      href={`/locations/${item.slug}` as any}
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
            {t("noPhoto")}
          </div>
        )}
        {item.isSecret && !item.unlocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lock className="h-4 w-4" /> {t("secret")}
            </div>
          </div>
        )}
        {item.ratingAvg != null && (
          <div className="absolute start-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {item.ratingAvg.toFixed(1)}
            <span className="text-white/70">({item.ratingCount})</span>
          </div>
        )}
        {item.distanceMeters != null && (
          <div className="absolute end-2 bottom-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
            {formatDistanceKm(item.distanceMeters)}
          </div>
        )}
        <div className="absolute end-2 top-2">
          <FavoriteButton
            locationId={item.id}
            isFavorite={item.isFavorite}
            count={item.favoriteCount}
            loggedIn={loggedIn}
          />
        </div>
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-base font-semibold">{item.title}</h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Heart className="h-3 w-3" />
            {item.favoriteCount}
          </div>
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {item.description}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {item.styleTags.slice(0, 3).map((tag) => {
            let label = tag;
            try {
              label = tTags(tag as any);
            } catch {
              label = tag;
            }
            return (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {label}
              </Badge>
            );
          })}
          <div className="ms-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            {item.publicTransport && (
              <Bus className="h-3.5 w-3.5" aria-label={t("transport")} />
            )}
            {item.wheelchair && (
              <Users className="h-3.5 w-3.5" aria-label={t("accessible")} />
            )}
            {item.restroom && (
              <ShowerHead className="h-3.5 w-3.5" aria-label={t("restroom")} />
            )}
            {item.drone && (
              <Navigation className="h-3.5 w-3.5" aria-label={t("drone")} />
            )}
            {item.paid && (
              <Coins className="h-3.5 w-3.5" aria-label={t("paid")} />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
