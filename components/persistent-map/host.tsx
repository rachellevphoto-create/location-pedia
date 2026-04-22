"use client";

import * as React from "react";
import Map, {
  Marker,
  NavigationControl,
  Popup,
  type MapRef,
} from "react-map-gl";
import { useLocale, useTranslations } from "next-intl";
import { Lock, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { DiscoverItem } from "@/lib/api-types";
import { applyMapLanguage } from "@/lib/map-language";
import {
  usePersistentMapContext,
  usePersistentMapState,
} from "./provider";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export function PersistentMapHost() {
  const { registerHostResize } = usePersistentMapContext();
  const state = usePersistentMapState();
  const ref = React.useRef<MapRef | null>(null);
  const [popup, setPopup] = React.useState<DiscoverItem | null>(null);
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const [mounted, setMounted] = React.useState(false);
  const initialRef = React.useRef(state.initial);
  const onMoveEndRef = React.useRef(state.onMoveEnd);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    onMoveEndRef.current = state.onMoveEnd;
  }, [state.onMoveEnd]);

  React.useEffect(() => {
    if (initialRef.current == null && state.initial) {
      initialRef.current = state.initial;
      const map = ref.current?.getMap();
      if (map) {
        try {
          map.jumpTo({
            center: [state.initial.lng, state.initial.lat],
            zoom: state.initial.zoom ?? 11,
          });
        } catch {
        }
      }
    }
  }, [state.initial]);

  React.useEffect(() => {
    registerHostResize(() => {
      const map = ref.current?.getMap();
      if (map) {
        try {
          map.resize();
        } catch {
        }
      }
    });
    return () => registerHostResize(null);
  }, [registerHostResize]);

  React.useEffect(() => {
    const map = ref.current?.getMap();
    if (map) applyMapLanguage(map, locale);
  }, [locale]);

  // Drop popup if its item is no longer in the rendered set.
  React.useEffect(() => {
    if (popup && !state.items.some((it) => it.id === popup.id)) {
      setPopup(null);
    }
  }, [state.items, popup]);

  if (!TOKEN || !mounted) return null;

  const visible = state.active && state.rect != null;
  const containerStyle: React.CSSProperties = state.rect
    ? {
        position: "fixed",
        top: state.rect.top,
        left: state.rect.left,
        width: state.rect.width,
        height: state.rect.height,
        visibility: visible ? "visible" : "hidden",
        pointerEvents: visible ? "auto" : "none",
        zIndex: 10,
      }
    : {
        position: "fixed",
        top: 0,
        left: 0,
        width: 1,
        height: 1,
        visibility: "hidden",
        pointerEvents: "none",
        zIndex: -1,
      };

  const initial = initialRef.current ?? state.initial;

  return (
    <div style={containerStyle} aria-hidden={!visible}>
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
        onStyleData={(e) => applyMapLanguage(e.target, locale)}
        onMoveEnd={(e) => {
          const cb = onMoveEndRef.current;
          if (!cb) return;
          const b = e.target.getBounds();
          if (!b) return;
          cb({
            minLng: b.getWest(),
            minLat: b.getSouth(),
            maxLng: b.getEast(),
            maxLat: b.getNorth(),
          });
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" />
        {state.items.map((it) => (
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
    </div>
  );
}
