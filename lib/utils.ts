import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDistanceKm(meters: number | null | undefined): string {
  if (meters === null || meters === undefined) return "";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Generate a numeric slug like "1714-1538-4027". */
export function generateSlug(): string {
  const ts = Date.now().toString();
  const rand = Math.random().toString().slice(2, 6);
  return `${ts.slice(0, 4)}-${ts.slice(4, 8)}-${rand}`;
}
