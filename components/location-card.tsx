"use client";

import { useTranslations } from "next-intl";
import { Bus, Coins, Lock, Navigation, ShowerHead, Star, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
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
  const tUnlock = useTranslations("Unlock");
  const tagLabels = item.styleTags.slice(0, 3).map((tag) => {
    try {
      return tTags(tag as any);
    } catch {
      return tag;
    }
  });
  const locked = item.isSecret && !item.unlocked;
  const title = locked ? tUnlock("secretTitle") : item.title;

  return (
    <Link
      href={`/locations/${item.slug}` as any}
      className="group block min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
    >
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl bg-muted">
        {item.hero ? (
          <img
            src={item.hero}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            {t("noPhoto")}
          </div>
        )}
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lock className="h-4 w-4" /> {t("secret")}
            </div>
          </div>
        )}
        {item.isSecret && !locked && (
          <span className="absolute start-2.5 top-2.5 rounded-md bg-foreground px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-lime">
            {t("secret")}
          </span>
        )}
        <div className="absolute end-2.5 top-2.5">
          <FavoriteButton
            locationId={item.id}
            isFavorite={item.isFavorite}
            count={item.favoriteCount}
            loggedIn={loggedIn}
          />
        </div>
      </div>
      <div className="mt-2.5 space-y-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="line-clamp-1 text-[15px] font-semibold">
            {title}
          </h3>
          {item.ratingAvg != null && (
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" />
              {item.ratingAvg.toFixed(1)}
              <span className="font-normal text-muted-foreground">
                ({item.ratingCount})
              </span>
            </span>
          )}
        </div>
        {item.distanceMeters != null && (
          <p className="text-sm text-muted-foreground">
            {formatDistanceKm(item.distanceMeters)}
          </p>
        )}
        {tagLabels.length > 0 && (
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {tagLabels.join(" · ")}
          </p>
        )}
        <div className="flex items-center gap-2 pt-1 text-muted-foreground">
          {item.publicTransport && (
            <Bus className="h-4 w-4" aria-label={t("transport")} />
          )}
          {item.wheelchair && (
            <Users className="h-4 w-4" aria-label={t("accessible")} />
          )}
          {item.restroom && (
            <ShowerHead className="h-4 w-4" aria-label={t("restroom")} />
          )}
          {item.drone && (
            <Navigation className="h-4 w-4" aria-label={t("drone")} />
          )}
          {item.paid && <Coins className="h-4 w-4" aria-label={t("paid")} />}
        </div>
      </div>
    </Link>
  );
}
