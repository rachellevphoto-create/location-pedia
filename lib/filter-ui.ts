import {
  Bus,
  CircleCheck,
  Navigation,
  Shirt,
  ShowerHead,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Icons for known amenity slugs; new amenities get a generic check icon. */
const AMENITY_ICONS: Record<string, LucideIcon> = {
  wheelchair: Users,
  publicTransport: Bus,
  restroom: ShowerHead,
  changingRoom: Shirt,
  drone: Navigation,
};

export function amenityIcon(slug: string): LucideIcon {
  return AMENITY_ICONS[slug] ?? CircleCheck;
}

/**
 * Translate a filter slug, falling back to the slug itself when there is no
 * message for it yet (e.g. a filter just added in the DB). Works with both
 * useTranslations and getTranslations.
 */
export function filterLabel(
  t: { has: (key: string) => boolean; (key: string): string },
  slug: string,
): string {
  return t.has(slug) ? t(slug) : slug;
}
