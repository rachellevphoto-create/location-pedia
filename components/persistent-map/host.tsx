"use client";

import * as React from "react";
import Map, {
  Marker,
  NavigationControl,
  Popup,
  type MapRef,
} from "react-map-gl";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { DiscoverItem } from "@/lib/api-types";
import { applyMapLanguage } from "@/lib/map-language";
import { MAP_STYLE, applyBrandMapStyle } from "@/lib/map-style";
import { MapClusterIcon, MapPinIcon } from "@/components/map-pin";
import { MAX_ZOOM, useClusters, type MapView } from "./use-clusters";
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
  const tUnlock = useTranslations("Unlock");
  const tMap = useTranslations("Map");
  const locale = useLocale();
  const [mounted, setMounted] = React.useState(false);
  const initialRef = React.useRef(state.initial);
  const onMoveEndRef = React.useRef(state.onMoveEnd);
  // Current bounds + zoom, used to group nearby pins into count bubbles.
  const [view, setView] = React.useState<MapView | null>(null);
  // Bubble whose places all sit on one point: shown as a list.
  const [group, setGroup] = React.useState<{
    lat: number;
    lng: number;
    items: DiscoverItem[];
  } | null>(null);
  const viewRaf = React.useRef<number | null>(null);
  const updateView = React.useCallback(() => {
    if (viewRaf.current != null) return;
    viewRaf.current = requestAnimationFrame(() => {
      viewRaf.current = null;
      const map = ref.current?.getMap();
      const b = map?.getBounds();
      if (!map || !b) return;
      setView({
        bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
        zoom: map.getZoom(),
      });
    });
  }, []);
  React.useEffect(
    () => () => {
      if (viewRaf.current != null) cancelAnimationFrame(viewRaf.current);
    },
    [],
  );
  const nodes = useClusters(state.items, view);

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
        updateView();
      }
    });
    return () => registerHostResize(null);
  }, [registerHostResize, updateView]);

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
  React.useEffect(() => setGroup(null), [state.items]);

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
        mapStyle={MAP_STYLE}
        onLoad={(e) => {
          applyMapLanguage(e.target, locale);
          applyBrandMapStyle(e.target);
          updateView();
        }}
        onMove={updateView}
        onStyleData={() => {
          const m = ref.current?.getMap();
          if (m) {
            applyMapLanguage(m, locale);
            applyBrandMapStyle(m);
          }
        }}
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
        {nodes.map((node, i) =>
          node.kind === "cluster" ? (
            <Marker
              key={node.key}
              latitude={node.lat}
              longitude={node.lng}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopup(null);
                if (node.samePoint) {
                  // Can't split by zooming: list the places instead.
                  const ids = new Set(node.ids);
                  setGroup({
                    lat: node.lat,
                    lng: node.lng,
                    items: state.items.filter((it) => ids.has(it.id)),
                  });
                  return;
                }
                setGroup(null);
                ref.current?.easeTo({
                  center: [node.lng, node.lat],
                  zoom: Math.min(node.expansionZoom, MAX_ZOOM),
                  duration: 650,
                });
              }}
            >
              <MapClusterIcon
                count={node.count}
                highlighted={!!state.highlightId && node.ids.includes(state.highlightId)}
              />
            </Marker>
          ) : (
            <Marker
              key={node.key}
              latitude={node.lat}
              longitude={node.lng}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setGroup(null);
                setPopup(node.item);
                // Glide to the pin instead of jumping.
                ref.current?.easeTo({
                  center: [node.lng, node.lat],
                  duration: 700,
                  essential: false,
                });
              }}
            >
              <MapPinIcon
                locked={node.item.isSecret && !node.item.unlocked}
                highlighted={state.highlightId === node.item.id}
                index={i}
              />
            </Marker>
          ),
        )}
        {group && (
          <Popup
            latitude={group.lat}
            longitude={group.lng}
            anchor="top"
            offset={24}
            onClose={() => setGroup(null)}
            closeOnClick={false}
            maxWidth="260px"
          >
            <div className="w-56">
              <div className="mb-1.5 text-xs font-semibold text-muted-foreground">
                {tMap("samePlaceCount", { count: group.items.length })}
              </div>
              <ul className="max-h-56 space-y-1 overflow-y-auto">
                {group.items.map((it) => (
                  <li key={it.id}>
                    <Link
                      href={`/locations/${it.slug}` as any}
                      className="block rounded-md px-1.5 py-1 text-sm hover:bg-muted"
                    >
                      {it.isSecret && !it.unlocked ? tUnlock("secretTitle") : it.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Popup>
        )}
        {popup && (
          <Popup
            latitude={popup.latitude}
            longitude={popup.longitude}
            anchor="top"
            offset={8}
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
    </div>
  );
}
