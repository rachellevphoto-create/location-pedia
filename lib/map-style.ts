import type { Map as MapboxMap } from "mapbox-gl";

/** Calm base map so the crimson pins stand out. */
export const MAP_STYLE = "mapbox://styles/mapbox/light-v11";

/**
 * Small tweaks on top of light-v11 in the brand colors: warm ground (the
 * site background), soft lime parks, muted blue water. Each step is
 * best-effort: a layer missing from a future style version is skipped.
 */
export function applyBrandMapStyle(map: MapboxMap) {
  const set = (layer: string, prop: string, value: unknown) => {
    try {
      if (map.getLayer(layer)) map.setPaintProperty(layer, prop as never, value as never);
    } catch {
      // ignore: style still loading or property not supported
    }
  };
  set("land", "background-color", "#F6F5F1");
  set("water", "fill-color", "#D5E3E8");
  set("landuse", "fill-color", [
    "match",
    ["get", "class"],
    ["park", "grass", "pitch", "wood"],
    "#EAEDCC",
    "#EFEDE6",
  ]);
  set("national-park", "fill-color", "#EAEDCC");
}
