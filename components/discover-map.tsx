"use client";

import * as React from "react";
import Map, { Marker, NavigationControl, Popup, type MapRef } from "react-map-gl";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { DiscoverItem } from "@/lib/api-types";
import { applyMapLanguage } from "@/lib/map-language";
import { MAP_STYLE, applyBrandMapStyle } from "@/lib/map-style";
import { MapPinIcon } from "@/components/map-pin";

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
  const tUnlock = useTranslations("Unlock");
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
      mapStyle={MAP_STYLE}
      onLoad={(e) => {
        applyMapLanguage(e.target, locale);
        applyBrandMapStyle(e.target);
      }}
      onStyleData={() => {
        const m = ref.current?.getMap();
        if (m) {
          applyMapLanguage(m, locale);
          applyBrandMapStyle(m);
        }
      }}
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
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setPopup(it);
          }}
        >
          <MapPinIcon locked={it.isSecret && !it.unlocked} />
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
            <div className="text-sm font-semibold">
                {popup.isSecret && !popup.unlocked ? tUnlock("secretTitle") : popup.title}
              </div>
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
