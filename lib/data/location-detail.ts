import { prisma } from "@/lib/db";
import { SYSTEM_FILTERS } from "@/lib/filters";

type Viewer = { id: string; role?: string | null } | null;

/**
 * Everything the location detail page needs, in as few round trips as
 * possible: one query for the location, then the rest in parallel.
 *
 * Returns null when the viewer may not see the location (not published,
 * hidden, missing). For a locked premium spot, photos, updates and reviews
 * are not loaded at all, so the page cannot leak them by mistake.
 */
export async function getLocationDetail(slug: string, viewer: Viewer) {
  const isAdmin = viewer?.role === "ADMIN";
  const userId = viewer?.id ?? null;

  const location = await prisma.location.findUnique({
    where: { slug },
    include: {
      submitter: { select: { fullName: true } },
      locationFilters: {
        include: { filter: { select: { slug: true, category: true } } },
      },
    },
  });
  if (!location) return null;
  if (!isAdmin && (location.status !== "PUBLISHED" || location.hidden)) {
    return null;
  }

  const onSlugs = new Set(
    location.locationFilters.filter((lf) => lf.boolValue).map((lf) => lf.filter.slug),
  );
  const styleTags = location.locationFilters
    .filter((lf) => lf.filter.category === "STYLE" && lf.boolValue)
    .map((lf) => lf.filter.slug);
  const isSecret = onSlugs.has(SYSTEM_FILTERS.isSecret);

  const unlock =
    isSecret && userId && !isAdmin
      ? await prisma.secretUnlock.findUnique({
          where: { userId_locationId: { userId, locationId: location.id } },
          select: { id: true },
        })
      : null;
  const locked = isSecret && !isAdmin && !unlock;
  const id = location.id;
  const mine = <T>(q: () => Promise<T>, empty: T) =>
    userId ? q() : Promise.resolve(empty);
  const ifOpen = <T>(q: () => Promise<T>, empty: T) =>
    locked ? Promise.resolve(empty) : q();

  const [
    ratingStats,
    photoStats,
    photos,
    statusUpdates,
    reviews,
    myHelpful,
    myRating,
    myFavorite,
    favoriteCount,
    myPendingPhotoCount,
  ] = await Promise.all([
    prisma.rating.aggregate({
      where: { locationId: id },
      _avg: { stars: true },
      _count: true,
    }),
    prisma.photo.aggregate({
      where: { locationId: id, status: "APPROVED" },
      _sum: { helpfulCount: true },
      _count: true,
    }),
    ifOpen(
      () =>
        prisma.photo.findMany({
          where: { locationId: id, status: "APPROVED" },
          orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
          include: { uploader: { select: { fullName: true } } },
        }),
      [],
    ),
    ifOpen(
      () =>
        prisma.statusUpdate.findMany({
          where: { locationId: id },
          orderBy: { createdAt: "desc" },
          include: { author: { select: { fullName: true } } },
          take: 30,
        }),
      [],
    ),
    ifOpen(
      () =>
        prisma.rating.findMany({
          where: {
            locationId: id,
            OR: [{ body: { not: null } }, { title: { not: null } }],
          },
          include: { user: { select: { id: true, fullName: true, image: true } } },
          orderBy: { updatedAt: "desc" },
          take: 50,
        }),
      [],
    ),
    mine(
      () =>
        prisma.helpful.findMany({
          where: { userId: userId!, photo: { locationId: id } },
          select: { photoId: true },
        }),
      [],
    ),
    mine(
      () =>
        prisma.rating.findUnique({
          where: { userId_locationId: { userId: userId!, locationId: id } },
        }),
      null,
    ),
    mine(
      () =>
        prisma.favorite.findUnique({
          where: { userId_locationId: { userId: userId!, locationId: id } },
          select: { id: true },
        }),
      null,
    ),
    prisma.favorite.count({ where: { locationId: id } }),
    mine(
      () =>
        prisma.photo.count({
          where: { locationId: id, uploaderId: userId!, status: "PENDING" },
        }),
      0,
    ),
  ]);

  return {
    location,
    onSlugs,
    styleTags,
    isSecret,
    locked,
    ratingAvg: ratingStats._avg.stars,
    ratingCount: ratingStats._count,
    photoCount: photoStats._count,
    totalHelpful: photoStats._sum.helpfulCount ?? 0,
    inspirationPhotos: photos.filter((p) => p.kind === "INSPIRATION"),
    technicalPhotos: photos.filter((p) => p.kind === "TECHNICAL"),
    statusUpdates,
    reviews,
    myHelpfulIds: new Set(myHelpful.map((h) => h.photoId)),
    myRating,
    isFavorite: !!myFavorite,
    favoriteCount,
    myPendingPhotoCount,
  };
}
