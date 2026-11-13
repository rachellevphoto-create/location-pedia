"use client";

import * as React from "react";
import Supercluster from "supercluster";
import type { DiscoverItem } from "@/lib/api-types";

/** What the map shows for the current view: single pins and count bubbles. */
export type MapNode =
  | { kind: "pin"; key: string; item: DiscoverItem; lat: number; lng: number }
  | {
      kind: "cluster";
      key: string;
      clusterId: number;
      count: number;
      lat: number;
      lng: number;
      /** Ids of the locations inside, for hover highlight. */
      ids: string[];
      /** Zoom at which this bubble splits; > MAX_ZOOM means it never does. */
      expansionZoom: number;
      /** All locations sit on the same point: open a list instead of zooming. */
      samePoint: boolean;
    };

export type MapView = { bounds: [number, number, number, number]; zoom: number };

/** Highest zoom that still clusters. Points closer than this stay grouped. */
export const MAX_ZOOM = 20;
/** Bubble radius in pixels: pins closer than this on screen are grouped. */
const RADIUS = 56;

type Props = { id: string };

export function useClusters(items: DiscoverItem[], view: MapView | null): MapNode[] {
  const byId = React.useMemo(() => new Map(items.map((it) => [it.id, it])), [items]);

  const index = React.useMemo(() => {
    const sc = new Supercluster<Props>({ radius: RADIUS, maxZoom: MAX_ZOOM });
    sc.load(
      items.map((it) => ({
        type: "Feature" as const,
        properties: { id: it.id },
        geometry: { type: "Point" as const, coordinates: [it.longitude, it.latitude] },
      })),
    );
    return sc;
  }, [items]);

  return React.useMemo(() => {
    if (!view) {
      return items.map((it) => ({
        kind: "pin" as const,
        key: it.id,
        item: it,
        lat: it.latitude,
        lng: it.longitude,
      }));
    }
    // Pad the view a little so bubbles don't pop in right at the edge.
    const [w, s, e, n] = view.bounds;
    const padX = (e - w) * 0.15;
    const padY = (n - s) * 0.15;
    const features = index.getClusters(
      [w - padX, s - padY, e + padX, n + padY],
      Math.round(view.zoom),
    );
    const nodes: MapNode[] = [];
    for (const f of features) {
      const [lng, lat] = f.geometry.coordinates;
      const p = f.properties as Props & { cluster?: boolean; cluster_id?: number; point_count?: number };
      if (p.cluster && p.cluster_id != null) {
        const leaves = index.getLeaves(p.cluster_id, Infinity);
        const coords = leaves.map((l) => l.geometry.coordinates.join(","));
        const expansionZoom = index.getClusterExpansionZoom(p.cluster_id);
        nodes.push({
          kind: "cluster",
          key: `c${p.cluster_id}`,
          clusterId: p.cluster_id,
          count: p.point_count ?? leaves.length,
          lat,
          lng,
          ids: leaves.map((l) => (l.properties as Props).id),
          expansionZoom,
          samePoint: new Set(coords).size === 1 || expansionZoom > MAX_ZOOM,
        });
      } else {
        const item = byId.get(p.id);
        if (item) nodes.push({ kind: "pin", key: item.id, item, lat, lng });
      }
    }
    return nodes;
  }, [index, byId, items, view]);
}
