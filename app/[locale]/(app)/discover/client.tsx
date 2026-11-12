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
  X,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationCard } from "@/components/location-card";
import { MapSlot } from "@/components/persistent-map/slot";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import { STYLE_TAGS } from "@/lib/validation";
import type { DiscoverItem } from "@/lib/api-types";

type View = "split" | "list" | "map";

const MAP_MIN = 320;
const MAP_DEFAULT = 480;
const LIST_MIN = 360;
const MAP_WIDTH_KEY = "discover.mapWidth";

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
  const layoutRef = React.useRef<HTMLDivElement>(null);
  const [mapWidth, setMapWidthRaw] = React.useState(MAP_DEFAULT);

  const setMapWidth = React.useCallback((w: number) => {
    const total = layoutRef.current?.clientWidth ?? 0;
    const max = Math.max(MAP_MIN, total - LIST_MIN);
    setMapWidthRaw(Math.round(Math.min(max, Math.max(MAP_MIN, w))));
  }, []);

  React.useEffect(() => {
    try {
      const saved = parseInt(localStorage.getItem(MAP_WIDTH_KEY) ?? "", 10);
      if (Number.isFinite(saved)) setMapWidth(saved);
    } catch {}
  }, [setMapWidth]);

  React.useEffect(() => {
    try {
      localStorage.setItem(MAP_WIDTH_KEY, String(mapWidth));
    } catch {}
  }, [mapWidth]);

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

  const chips: { key: string; label: string; remove: () => void }[] = [];
  if (filters.q) {
    chips.push({ key: "q", label: `“${filters.q}”`, remove: () => set({ q: "" }) });
  }
  amenityOptions.forEach((o) => {
    if (selectedAmenities.includes(o.value)) {
      chips.push({
        key: o.value,
        label: String(o.label),
        remove: () => set({ [o.value]: false } as any),
      });
    }
  });
  if (filters.paid !== null) {
    chips.push({
      key: "paid",
      label: filters.paid ? t("filterPricePaid") : t("filterPriceFree"),
      remove: () => set({ paid: null }),
    });
  }
  filters.tags.forEach((tag) => {
    const opt = styleOptions.find((o) => o.value === tag);
    chips.push({
      key: `tag-${tag}`,
      label: String(opt?.label ?? tag),
      remove: () => set({ tags: filters.tags.filter((x) => x !== tag) }),
    });
  });
  if (filters.ratingMin > 0) {
    chips.push({
      key: "rating",
      label: t("filterRatingN", { n: filters.ratingMin }),
      remove: () => set({ ratingMin: 0 }),
    });
  }
  if (filters.favoritesOnly) {
    chips.push({
      key: "fav",
      label: t("filterFavoritesOnly"),
      remove: () => set({ favoritesOnly: false }),
    });
  }
  function clearAll() {
    setSearchInput("");
    set({
      q: "",
      wheelchair: false,
      publicTransport: false,
      restroom: false,
      drone: false,
      paid: null,
      tags: [],
      ratingMin: 0,
      favoritesOnly: false,
    });
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="border-b bg-card">
        <div className="container flex flex-wrap items-center gap-2.5 py-3.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              set({ q: searchInput });
            }}
            className="relative min-w-[220px] flex-1"
          >
            <Search className="absolute start-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="h-11 rounded-lg bg-background ps-10"
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
                      className="h-3.5 w-3.5 fill-primary text-primary"
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
            variant="outline"
            aria-pressed={filters.favoritesOnly}
            onClick={() => {
              if (!loggedIn) return;
              set({ favoritesOnly: !filters.favoritesOnly });
            }}
            disabled={!loggedIn}
            title={loggedIn ? undefined : t("filterFavoritesNeedsLogin")}
            className={cn(
              "h-11 gap-1.5 rounded-lg px-3.5",
              filters.favoritesOnly &&
                "border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background",
            )}
          >
            <Heart
              className={cn("h-4 w-4", filters.favoritesOnly && "fill-current")}
            />
            {t("filterFavoritesOnly")}
          </Button>
          <div
            role="group"
            aria-label={t("viewLabel")}
            className="ms-auto flex items-center rounded-lg bg-muted p-1"
          >
            <ViewBtn current={view} value="split" onClick={setView}>
              {t("viewSplit")}
            </ViewBtn>
            <ViewBtn current={view} value="list" onClick={setView}>
              <LayoutGrid className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{t("viewList")}</span>
            </ViewBtn>
            <ViewBtn current={view} value="map" onClick={setView}>
              <MapIcon className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{t("viewMap")}</span>
            </ViewBtn>
          </div>
        </div>
        {chips.length > 0 && (
          <div className="container flex flex-wrap items-center gap-2 pb-3 text-sm">
            {chips.map((c) => (
              <span
                key={c.key}
                className="inline-flex items-center gap-1 rounded-full bg-muted py-1 pe-1 ps-3"
              >
                {c.label}
                <button
                  type="button"
                  onClick={c.remove}
                  aria-label={t("removeFilter", { label: c.label })}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={clearAll}
              className="px-1 py-1 font-semibold text-primary hover:underline"
            >
              {t("clearAll")}
            </button>
          </div>
        )}
      </div>

      <div
        ref={layoutRef}
        className="flex min-h-0 flex-1 flex-col md:flex-row"
      >
        {(view === "split" || view === "list") && (
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
            <div className="container py-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-lg font-semibold">
                  {loading ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-normal text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
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
                <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-4 gap-y-7">
                  {items.map((it) => (
                    <LocationCard key={it.id} item={it} loggedIn={loggedIn} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {view === "split" && (
          <MapResizer
            width={mapWidth}
            onChange={setMapWidth}
            onReset={() => setMapWidth(MAP_DEFAULT)}
            label={t("resizeMap")}
          />
        )}
        {(view === "split" || view === "map") && (
          <div
            className={cn(
              view === "map"
                ? "min-h-0 flex-1"
                : "h-[45vh] shrink-0 md:h-auto md:w-[var(--map-w)]",
            )}
            style={
              view === "split"
                ? ({ "--map-w": `${mapWidth}px` } as React.CSSProperties)
                : undefined
            }
          >
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

function MapResizer({
  width,
  onChange,
  onReset,
  label,
}: {
  width: number;
  onChange: (w: number) => void;
  onReset: () => void;
  label: string;
}) {
  const drag = React.useRef<{ x: number; w: number; rtl: boolean } | null>(
    null,
  );
  const [active, setActive] = React.useState(false);

  function isRtl(el: Element) {
    return getComputedStyle(el).direction === "rtl";
  }
  function end() {
    drag.current = null;
    setActive(false);
  }

  return (
    <button
      type="button"
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={MAP_MIN}
      title={label}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, w: width, rtl: isRtl(e.currentTarget) };
        setActive(true);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.x;
        // Map sits on the inline end: right in LTR, left in RTL.
        onChange(d.rtl ? d.w + dx : d.w - dx);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onDoubleClick={onReset}
      onKeyDown={(e) => {
        const step = isRtl(e.currentTarget) ? -40 : 40;
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          onChange(width + step);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          onChange(width - step);
        }
      }}
      className="group relative hidden w-6 shrink-0 cursor-col-resize touch-none select-none items-center justify-center focus-visible:outline-none md:flex"
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-border transition-colors group-hover:bg-primary group-focus-visible:bg-primary",
          active && "bg-primary",
        )}
      />
      <span
        aria-hidden
        className={cn(
          "relative flex h-11 w-3.5 flex-col items-center justify-center gap-[3px] rounded-md border bg-background shadow-sm group-focus-visible:ring-2 group-focus-visible:ring-ring",
          active && "border-primary",
        )}
      >
        <span className="h-1 w-1 rounded-full bg-muted-foreground" />
        <span className="h-1 w-1 rounded-full bg-muted-foreground" />
        <span className="h-1 w-1 rounded-full bg-muted-foreground" />
      </span>
    </button>
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
      type="button"
      aria-pressed={active}
      onClick={() => onClick(value)}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
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
