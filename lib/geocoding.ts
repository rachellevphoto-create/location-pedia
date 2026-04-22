/**
 * Thin wrapper around the OpenStreetMap Nominatim API for forward and reverse
 * geocoding. Includes a small in-memory LRU cache and a per-process throttle
 * to respect the public Nominatim usage policy (max 1 request/second).
 *
 * Both helpers swallow errors and return `null` on failure; geocoding is a
 * best-effort enrichment and must never break the user-facing flow.
 */

const BASE_URL =
  process.env.NOMINATIM_BASE_URL?.replace(/\/$/, "") ||
  "https://nominatim.openstreetmap.org";
const USER_AGENT =
  process.env.NOMINATIM_USER_AGENT ||
  "LocatePedia/1.0 (contact: admin@locatepedia.local)";

const MIN_INTERVAL_MS = 1100;
let lastRequestAt = 0;

async function throttle() {
  const now = Date.now();
  const wait = lastRequestAt + MIN_INTERVAL_MS - now;
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }
  lastRequestAt = Date.now();
}

const CACHE_LIMIT = 500;
const cache = new Map<string, unknown>();
function cacheGet<T>(key: string): T | undefined {
  if (!cache.has(key)) return undefined;
  const value = cache.get(key) as T;
  cache.delete(key);
  cache.set(key, value);
  return value;
}
function cacheSet<T>(key: string, value: T) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

export type ReverseGeocodeResult = {
  city: string | null;
  area: string | null;
  country: string | null;
};

export async function reverseGeocode(
  lat: number,
  lng: number,
  locale = "en",
): Promise<ReverseGeocodeResult | null> {
  const key = `r:${locale}:${lat.toFixed(5)}:${lng.toFixed(5)}`;
  const cached = cacheGet<ReverseGeocodeResult>(key);
  if (cached) return cached;

  try {
    await throttle();
    const url = new URL(`${BASE_URL}/reverse`);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("accept-language", locale);
    url.searchParams.set("zoom", "14");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      address?: Record<string, string | undefined>;
    };
    const a = data.address ?? {};
    const city =
      a.city ?? a.town ?? a.village ?? a.municipality ?? a.hamlet ?? null;
    const area =
      a.suburb ??
      a.neighbourhood ??
      a.quarter ??
      a.city_district ??
      a.district ??
      a.county ??
      a.state_district ??
      a.state ??
      null;
    const country = a.country ?? null;
    const result: ReverseGeocodeResult = { city, area, country };
    cacheSet(key, result);
    return result;
  } catch {
    return null;
  }
}

export type ForwardGeocodeResult = {
  bbox: { minLng: number; minLat: number; maxLng: number; maxLat: number };
  displayName: string;
};

export async function forwardGeocode(
  query: string,
  locale = "en",
): Promise<ForwardGeocodeResult | null> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return null;
  const key = `f:${locale}:${trimmed.toLowerCase()}`;
  const cached = cacheGet<ForwardGeocodeResult | null>(key);
  if (cached !== undefined) return cached;

  try {
    await throttle();
    const url = new URL(`${BASE_URL}/search`);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("q", trimmed);
    url.searchParams.set("accept-language", locale);
    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) {
      cacheSet(key, null);
      return null;
    }
    const data = (await res.json()) as Array<{
      boundingbox?: [string, string, string, string];
      display_name?: string;
    }>;
    const first = data[0];
    if (!first?.boundingbox) {
      cacheSet(key, null);
      return null;
    }
    // Nominatim boundingbox: [minLat, maxLat, minLng, maxLng] as strings.
    const [minLatS, maxLatS, minLngS, maxLngS] = first.boundingbox;
    const minLat = parseFloat(minLatS);
    const maxLat = parseFloat(maxLatS);
    const minLng = parseFloat(minLngS);
    const maxLng = parseFloat(maxLngS);
    if (
      !Number.isFinite(minLat) ||
      !Number.isFinite(maxLat) ||
      !Number.isFinite(minLng) ||
      !Number.isFinite(maxLng)
    ) {
      cacheSet(key, null);
      return null;
    }
    const result: ForwardGeocodeResult = {
      bbox: { minLng, minLat, maxLng, maxLat },
      displayName: first.display_name ?? trimmed,
    };
    cacheSet(key, result);
    return result;
  } catch {
    return null;
  }
}
