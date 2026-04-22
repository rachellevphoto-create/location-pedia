"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Bus,
  Coins,
  Heart,
  LayoutGrid,
  Loader2,
  Map as MapIcon,
  Navigation,
  Plus,
  Search,
  ShowerHead,
  Star,
  Users,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationCard } from "@/components/location-card";
import { MapSlot } from "@/components/persistent-map/slot";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import { STYLE_TAGS } from "@/lib/validation";
import type { DiscoverItem } from "@/lib/api-types";

type View = "split" | "list" | "map";

function useFilters() {
  const params = useSearchParams();
  const router = useRouter();

  const filters = React.useMemo(
    () => ({
      q: params.get("q") ?? "",
      wheelchair: params.get("wheelchair") === "1",
      publicTransport: params.get("publicTransport") === "1",
      restroom: params.get("restroom") === "1",
      drone: params.get("drone") === "1",
      paid:
        params.get("paid") === "1"
          ? true
          : params.get("paid") === "0"
            ? false
            : null,
      tags: (params.get("tags") ?? "").split(",").filter(Boolean),
      ratingMin: parseInt(params.get("ratingMin") ?? "0", 10) || 0,
      favoritesOnly: params.get("favoritesOnly") === "1",
    }),
    [params],
  );

  const set = React.useCallback(
    (next: Partial<typeof filters>) => {
      const sp = new URLSearchParams(params.toString());
      const merged = { ...filters, ...next };
      if (merged.q) sp.set("q", merged.q);
      else sp.delete("q");
      ["wheelchair", "publicTransport", "restroom", "drone"].forEach((k) => {
        if ((merged as any)[k]) sp.set(k, "1");
        else sp.delete(k);
      });
      if (merged.paid === true) sp.set("paid", "1");
      else if (merged.paid === false) sp.set("paid", "0");
      else sp.delete("paid");
      if (merged.tags.length > 0) sp.set("tags", merged.tags.join(","));
      else sp.delete("tags");
      if (merged.ratingMin > 0) sp.set("ratingMin", String(merged.ratingMin));
      else sp.delete("ratingMin");
      if (merged.favoritesOnly) sp.set("favoritesOnly", "1");
      else sp.delete("favoritesOnly");
      router.replace(`/discover?${sp.toString()}` as any);
    },
    [filters, params, router],
  );

  return { filters, set };
}

export function DiscoverClient({ loggedIn }: { loggedIn: boolean }) {
  const { filters, set } = useFilters();
  const t = useTranslations("Discover");
  const tTags = useTranslations("Tags");
  const [items, setItems] = React.useState<DiscoverItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [view, setView] = React.useState<View>("split");
  const [bbox, setBbox] = React.useState<{
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  } | null>(null);
  const [from, setFrom] = React.useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [searchInput, setSearchInput] = React.useState(filters.q);

  React.useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setFrom({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5000 },
    );
  }, []);

  React.useEffect(() => {
    setSearchInput(filters.q);
  }, [filters.q]);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const sp = new URLSearchParams();
      if (filters.q) sp.set("q", filters.q);
      if (filters.wheelchair) sp.set("wheelchair", "1");
      if (filters.publicTransport) sp.set("publicTransport", "1");
      if (filters.restroom) sp.set("restroom", "1");
      if (filters.drone) sp.set("drone", "1");
      if (filters.paid === true) sp.set("paid", "1");
      if (filters.paid === false) sp.set("paid", "0");
      if (filters.tags.length > 0) sp.set("tags", filters.tags.join(","));
      if (filters.ratingMin > 0) sp.set("ratingMin", String(filters.ratingMin));
      if (filters.favoritesOnly) sp.set("favoritesOnly", "1");
      if (from) {
        sp.set("fromLat", String(from.lat));
        sp.set("fromLng", String(from.lng));
      }
      if (bbox) {
        sp.set("minLng", String(bbox.minLng));
        sp.set("minLat", String(bbox.minLat));
        sp.set("maxLng", String(bbox.maxLng));
        sp.set("maxLat", String(bbox.maxLat));
      }
      const res = await fetch(`/api/locations?${sp.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!cancelled) {
        setItems(data.items);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [filters, bbox, from]);

  const amenityOptions: MultiSelectOption[] = [
    {
      value: "wheelchair",
      label: t("filterAccessible"),
      icon: <Users className="h-3.5 w-3.5" />,
    },
    {
      value: "publicTransport",
      label: t("filterTransport"),
      icon: <Bus className="h-3.5 w-3.5" />,
    },
    {
      value: "restroom",
      label: t("filterRestroom"),
      icon: <ShowerHead className="h-3.5 w-3.5" />,
    },
    {
      value: "drone",
      label: t("filterDrone"),
      icon: <Navigation className="h-3.5 w-3.5" />,
    },
  ];
  const selectedAmenities = [
    filters.wheelchair && "wheelchair",
    filters.publicTransport && "publicTransport",
    filters.restroom && "restroom",
    filters.drone && "drone",
  ].filter(Boolean) as string[];

  function setAmenities(next: string[]) {
    set({
      wheelchair: next.includes("wheelchair"),
      publicTransport: next.includes("publicTransport"),
      restroom: next.includes("restroom"),
      drone: next.includes("drone"),
    });
  }

  const priceOptions: MultiSelectOption[] = [
    {
      value: "free",
      label: t("filterPriceFree"),
      icon: <Coins className="h-3.5 w-3.5" />,
    },
    {
      value: "paid",
      label: t("filterPricePaid"),
      icon: <Coins className="h-3.5 w-3.5" />,
    },
  ];
  const selectedPrice =
    filters.paid === true ? ["paid"] : filters.paid === false ? ["free"] : [];

  function setPrice(next: string[]) {
    // Tri-state collapse: both selected or none selected => null (any).
    const wantsFree = next.includes("free");
    const wantsPaid = next.includes("paid");
    if (wantsFree && !wantsPaid) set({ paid: false });
    else if (wantsPaid && !wantsFree) set({ paid: true });
    else set({ paid: null });
  }

  const styleOptions: MultiSelectOption[] = STYLE_TAGS.map((tag) => ({
    value: tag,
    label: (() => {
      try {
        return tTags(tag as any);
      } catch {
        return tag;
      }
    })(),
  }));

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="border-b">
        <div className="container flex flex-wrap items-center gap-3 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              set({ q: searchInput });
            }}
            className="relative flex-1 min-w-[200px]"
          >
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="ps-9"
            />
          </form>
          <MultiSelect
            label={t("filterAmenities")}
            options={amenityOptions}
            selected={selectedAmenities}
            onChange={setAmenities}
            clearLabel={t("clearAll")}
          />
          <MultiSelect
            label={t("filterPrice")}
            options={priceOptions}
            selected={selectedPrice}
            onChange={setPrice}
            clearLabel={t("clearAll")}
          />
          <MultiSelect
            label={t("filterStyle")}
            options={styleOptions}
            selected={filters.tags}
            onChange={(next) => set({ tags: next })}
            clearLabel={t("clearAll")}
          />
          <MultiSelect
            label={t("filterRating")}
            options={[1, 2, 3, 4, 5].map((n) => ({
              value: String(n),
              ariaLabel: t("filterRatingN", { n }),
              label: (
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: n }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                    />
                  ))}
                  {n >= 2 && (
                    <Plus className="ms-0.5 h-3 w-3 text-muted-foreground" />
                  )}
                </span>
              ),
            }))}
            selected={
              filters.ratingMin > 0 ? [String(filters.ratingMin)] : []
            }
            onChange={(next) => {
              const last = next[next.length - 1] ?? "0";
              const v = parseInt(last, 10);
              set({ ratingMin: Number.isFinite(v) ? v : 0 });
            }}
            clearLabel={t("clearAll")}
          />
          <Button
            type="button"
            size="sm"
            variant={filters.favoritesOnly ? "default" : "outline"}
            onClick={() => {
              if (!loggedIn) return;
              set({ favoritesOnly: !filters.favoritesOnly });
            }}
            disabled={!loggedIn}
            title={loggedIn ? undefined : t("filterFavoritesNeedsLogin")}
            className="gap-1"
          >
            <Heart
              className={`h-4 w-4 ${filters.favoritesOnly ? "fill-current" : ""}`}
            />
            {t("filterFavoritesOnly")}
          </Button>
          <div className="ms-auto flex items-center gap-1 rounded-md border p-1 text-xs">
            <ViewBtn current={view} value="split" onClick={setView}>
              {t("viewSplit")}
            </ViewBtn>
            <ViewBtn current={view} value="list" onClick={setView}>
              <LayoutGrid className="h-4 w-4" />
            </ViewBtn>
            <ViewBtn current={view} value="map" onClick={setView}>
              <MapIcon className="h-4 w-4" />
            </ViewBtn>
          </div>
        </div>
      </div>

      <div className="grid flex-1 overflow-hidden md:grid-cols-2">
        {(view === "split" || view === "list") && (
          <div
            className={`overflow-y-auto ${view === "list" ? "md:col-span-2" : ""}`}
          >
            <div className="container py-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {loading ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />{" "}
                      {t("loadingResults")}
                    </span>
                  ) : (
                    t("resultsCount", { count: items.length })
                  )}
                </p>
              </div>
              {!loading && items.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((it) => (
                    <LocationCard key={it.id} item={it} loggedIn={loggedIn} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {(view === "split" || view === "map") && (
          <div className={view === "map" ? "md:col-span-2" : ""}>
            <MapSlot
              items={items}
              initial={from ?? undefined}
              onMoveEnd={setBbox}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ViewBtn({
  current,
  value,
  onClick,
  children,
}: {
  current: View;
  value: View;
  onClick: (v: View) => void;
  children: React.ReactNode;
}) {
  const active = current === value;
  return (
    <button
      onClick={() => onClick(value)}
      className={`rounded px-2 py-1 ${active ? "bg-primary text-primary-foreground" : ""}`}
    >
      {children}
    </button>
  );
}

function EmptyState() {
  const t = useTranslations("Discover");
  return (
    <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
      {t("emptyState")}
    </div>
  );
}
