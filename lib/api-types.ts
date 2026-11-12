export type DiscoverItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  isSecret: boolean;
  unlocked: boolean;
  /** AMENITY slugs this spot has, in sortOrder. */
  amenities: string[];
  paid: boolean;
  /** STYLE slugs this spot has, in sortOrder. */
  styleTags: string[];
  filters: Record<string, boolean | number>;
  helpfulCount: number;
  ratingAvg: number | null;
  ratingCount: number;
  hero: string | null;
  distanceMeters: number | null;
  isFavorite: boolean;
  favoriteCount: number;
};
