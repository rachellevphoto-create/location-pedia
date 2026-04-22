import type { Map as MapboxMap } from "mapbox-gl";

const lastApplied = new WeakMap<MapboxMap, string>();

export function applyMapLanguage(map: MapboxMap, locale: string) {
  if (lastApplied.get(map) === locale) return;

  const m = map as unknown as { setLanguage?: (l: string) => void };
  if (typeof m.setLanguage === "function") {
    try {
      m.setLanguage(locale);
      lastApplied.set(map, locale);
      return;
    } catch {
    }
  }

  try {
    const style = map.getStyle();
    if (!style?.layers || style.layers.length === 0) return;
    const field = ["coalesce", ["get", `name_${locale}`], ["get", "name"]];
    let didApply = false;
    for (const layer of style.layers) {
      if (
        layer.type === "symbol" &&
        layer.layout &&
        (layer.layout as { ["text-field"]?: unknown })["text-field"] !== undefined
      ) {
        try {
          map.setLayoutProperty(layer.id, "text-field", field as unknown as string);
          didApply = true;
        } catch {
        }
      }
    }
    if (didApply) lastApplied.set(map, locale);
  } catch {
  }
}
