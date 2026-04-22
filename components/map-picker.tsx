"use client";

import * as React from "react";
import Map, { Marker, NavigationControl, type MapRef } from "react-map-gl";
import { useLocale, useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { applyMapLanguage } from "@/lib/map-language";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export function MapPicker({
  value,
  onChange,
  height = 360,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (next: { lat: number; lng: number }) => void;
  height?: number;
}) {
  const mapRef = React.useRef<MapRef | null>(null);
  const initial = value ?? { lat: 32.0853, lng: 34.7818 };
  const t = useTranslations("Map");
  const locale = useLocale();

  React.useEffect(() => {
    const map = mapRef.current?.getMap();
    if (map) applyMapLanguage(map, locale);
  }, [locale]);

  if (!TOKEN) {
    return <ManualPicker value={value} onChange={onChange} />;
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border" style={{ height }}>
        <Map
          ref={mapRef}
          mapboxAccessToken={TOKEN}
          initialViewState={{
            latitude: initial.lat,
            longitude: initial.lng,
            zoom: 12,
          }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          onLoad={(e) => applyMapLanguage(e.target, locale)}
          onStyleData={(e) => applyMapLanguage(e.target, locale)}
          onClick={(e) => onChange({ lat: e.lngLat.lat, lng: e.lngLat.lng })}
          style={{ width: "100%", height: "100%" }}
        >
          <NavigationControl position="top-right" />
          {value && (
            <Marker
              latitude={value.lat}
              longitude={value.lng}
              draggable
              onDragEnd={(e) =>
                onChange({ lat: e.lngLat.lat, lng: e.lngLat.lng })
              }
            >
              <MapPin className="h-7 w-7 text-primary drop-shadow" />
            </Marker>
          )}
        </Map>
      </div>
      <p className="text-xs text-muted-foreground">{t("pickerHelp")}</p>
      {value && <ManualPicker value={value} onChange={onChange} compact />}
    </div>
  );
}

function ManualPicker({
  value,
  onChange,
  compact = false,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (next: { lat: number; lng: number }) => void;
  compact?: boolean;
}) {
  const [lat, setLat] = React.useState(value?.lat?.toString() ?? "");
  const [lng, setLng] = React.useState(value?.lng?.toString() ?? "");
  const t = useTranslations("Map");

  const lat0 = value?.lat;
  const lng0 = value?.lng;
  React.useEffect(() => {
    if (lat0 != null && lng0 != null) {
      setLat(lat0.toFixed(6));
      setLng(lng0.toFixed(6));
    }
  }, [lat0, lng0]);

  function commit() {
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    if (Number.isFinite(la) && Number.isFinite(ln)) {
      onChange({ lat: la, lng: ln });
    }
  }

  return (
    <div className={compact ? "grid grid-cols-2 gap-2" : "space-y-2"}>
      {!compact && (
        <p className="text-sm text-muted-foreground">{t("manualHelp")}</p>
      )}
      <input
        type="number"
        step="any"
        value={lat}
        onChange={(e) => setLat(e.target.value)}
        onBlur={commit}
        placeholder={t("latitudePlaceholder")}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
      <input
        type="number"
        step="any"
        value={lng}
        onChange={(e) => setLng(e.target.value)}
        onBlur={commit}
        placeholder={t("longitudePlaceholder")}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
    </div>
  );
}
