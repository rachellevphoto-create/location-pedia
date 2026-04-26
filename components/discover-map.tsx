"use client";

import * as React from "react";
import Map, { Marker, NavigationControl, Popup, type MapRef } from "react-map-gl";
import { useLocale, useTranslations } from "next-intl";
import { Lock, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { DiscoverItem } from "@/lib/api-types";
import { applyMapLanguage } from "@/lib/map-language";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export function DiscoverMap({
  items,
  initial,
  onMoveEnd,
}: {
  items: DiscoverItem[];
  initial?: { lat: number; lng: number; zoom?: number };
  onMoveEnd?: (bbox: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  }) => void;
}) {
  const ref = React.useRef<MapRef | null>(null);
  const [popup, setPopup] = React.useState<DiscoverItem | null>(null);
  const t = useTranslations("Map");
  const tCommon = useTranslations("Common");
  const locale = useLocale();

  React.useEffect(() => {
    const map = ref.current?.getMap();
    if (map) applyMapLanguage(map, locale);
  }, [locale]);

  if (!TOKEN) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted p-6 text-center text-sm text-muted-foreground">
        {t("tokenMissingHelp")}
      </div>
    );
  }

  return (
    <Map
      ref={ref}
      mapboxAccessToken={TOKEN}
      initialViewState={{
        latitude: initial?.lat ?? 32.0853,
        longitude: initial?.lng ?? 34.7818,
        zoom: initial?.zoom ?? 11,
      }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      onLoad={(e) => applyMapLanguage(e.target, locale)}
      onStyleData={() => { const m = ref.current?.getMap(); if (m) applyMapLanguage(m, locale); }}
      onMoveEnd={(e) => {
        const b = e.target.getBounds();
        if (!b) return;
        onMoveEnd?.({
          minLng: b.getWest(),
          minLat: b.getSouth(),
          maxLng: b.getEast(),
          maxLat: b.getNorth(),
        });
      }}
      style={{ width: "100%", height: "100%" }}
    >
      <NavigationControl position="top-right" />
      {items.map((it) => (
        <Marker
          key={it.id}
          latitude={it.latitude}
          longitude={it.longitude}
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setPopup(it);
          }}
        >
          <div
            className={`flex h-9 w-9 -translate-y-2 items-center justify-center rounded-full border-2 border-white shadow-md ${
              it.isSecret && !it.unlocked
                ? "bg-amber-500 text-white"
                : "bg-primary text-white"
            }`}
          >
            {it.isSecret && !it.unlocked ? (
              <Lock className="h-4 w-4" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
          </div>
        </Marker>
      ))}
      {popup && (
        <Popup
          latitude={popup.latitude}
          longitude={popup.longitude}
          anchor="top"
          onClose={() => setPopup(null)}
          closeOnClick={false}
        >
          <div className="w-48 space-y-1">
            <div className="text-sm font-semibold">{popup.title}</div>
            <div className="line-clamp-2 text-xs text-muted-foreground">
              {popup.description}
            </div>
            <Link
              href={`/locations/${popup.slug}` as any}
              className="text-xs text-primary underline"
            >
              {tCommon("viewDetails")}
            </Link>
          </div>
        </Popup>
      )}
    </Map>
  );
}
