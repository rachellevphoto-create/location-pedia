"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bus, Coins, LayoutGrid, Loader2, Map as MapIcon, Search, ShowerHead, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LocationCard } from "@/components/location-card";
import { DiscoverMap } from "@/components/discover-map";
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
      paid:
        params.get("paid") === "1"
          ? true
          : params.get("paid") === "0"
            ? false
            : null,
      tags: (params.get("tags") ?? "").split(",").filter(Boolean),
    }),
    [params],
  );

  const set = React.useCallback(
    (next: Partial<typeof filters>) => {
      const sp = new URLSearchParams(params.toString());
      const merged = { ...filters, ...next };
      if (merged.q) sp.set("q", merged.q);
      else sp.delete("q");
      ["wheelchair", "publicTransport", "restroom"].forEach((k) => {
        if ((merged as any)[k]) sp.set(k, "1");
        else sp.delete(k);
      });
      if (merged.paid === true) sp.set("paid", "1");
      else if (merged.paid === false) sp.set("paid", "0");
      else sp.delete("paid");
      if (merged.tags.length > 0) sp.set("tags", merged.tags.join(","));
      else sp.delete("tags");
      router.replace(`/discover?${sp.toString()}`);
    },
    [filters, params, router],
  );

  return { filters, set };
}

export function DiscoverClient() {
  const { filters, set } = useFilters();
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
      if (filters.paid === true) sp.set("paid", "1");
      if (filters.paid === false) sp.set("paid", "0");
      if (filters.tags.length > 0) sp.set("tags", filters.tags.join(","));
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

  function toggleTag(t: string) {
    set({
      tags: filters.tags.includes(t)
        ? filters.tags.filter((x) => x !== t)
        : [...filters.tags, t],
    });
  }

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
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search locations..."
              className="pl-9"
            />
          </form>
          <FilterToggle
            on={filters.wheelchair}
            onChange={(v) => set({ wheelchair: v })}
            icon={<Users className="h-3.5 w-3.5" />}
            label="Accessible"
          />
          <FilterToggle
            on={filters.publicTransport}
            onChange={(v) => set({ publicTransport: v })}
            icon={<Bus className="h-3.5 w-3.5" />}
            label="Transport"
          />
          <FilterToggle
            on={filters.restroom}
            onChange={(v) => set({ restroom: v })}
            icon={<ShowerHead className="h-3.5 w-3.5" />}
            label="Restroom"
          />
          <PaidToggle
            value={filters.paid}
            onChange={(v) => set({ paid: v })}
          />
          <div className="ml-auto flex items-center gap-1 rounded-md border p-1 text-xs">
            <ViewBtn current={view} value="split" onClick={setView}>
              Split
            </ViewBtn>
            <ViewBtn current={view} value="list" onClick={setView}>
              <LayoutGrid className="h-4 w-4" />
            </ViewBtn>
            <ViewBtn current={view} value="map" onClick={setView}>
              <MapIcon className="h-4 w-4" />
            </ViewBtn>
          </div>
        </div>
        <div className="container -mt-1 flex flex-wrap gap-1.5 pb-3">
          {STYLE_TAGS.map((t) => (
            <button key={t} onClick={() => toggleTag(t)} className="focus:outline-none">
              <Badge variant={filters.tags.includes(t) ? "default" : "outline"}>
                {t}
              </Badge>
            </button>
          ))}
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
                      <Loader2 className="h-3 w-3 animate-spin" /> Loading...
                    </span>
                  ) : (
                    `${items.length} location${items.length === 1 ? "" : "s"}`
                  )}
                </p>
              </div>
              {!loading && items.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((it) => (
                    <LocationCard key={it.id} item={it} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {(view === "split" || view === "map") && (
          <div className={view === "map" ? "md:col-span-2" : ""}>
            <DiscoverMap
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

function FilterToggle({
  on,
  onChange,
  icon,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Button
      variant={on ? "default" : "outline"}
      size="sm"
      onClick={() => onChange(!on)}
      className="gap-1.5"
    >
      {icon}
      {label}
    </Button>
  );
}

function PaidToggle({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  const next = value === null ? true : value === true ? false : null;
  const label =
    value === null ? "Any price" : value ? "Paid only" : "Free only";
  return (
    <Button
      variant={value === null ? "outline" : "default"}
      size="sm"
      onClick={() => onChange(next)}
      className="gap-1.5"
    >
      <Coins className="h-3.5 w-3.5" />
      {label}
    </Button>
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
  return (
    <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
      No locations match your filters yet.
    </div>
  );
}
