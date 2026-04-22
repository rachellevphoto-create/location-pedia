import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Bus,
  Coins,
  Lock,
  Navigation,
  ShowerHead,
  Star,
  Users,
  Sparkles,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { imageUrl } from "@/lib/cloudinary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { GalleryGrid } from "./gallery";
import { StatusUpdates } from "./status-updates";
import { RatingBlock } from "./rating-block";
import { UnlockButton } from "./unlock-button";
import { FavoriteButton } from "@/components/favorite-button";
import { AddPhotosDialog } from "./add-photos-dialog";
import { ReviewsList } from "./reviews-list";

export const dynamic = "force-dynamic";

export default async function LocationDetailPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug: paramSlug, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("LocationDetail");
  const tCard = await getTranslations("Card");
  const tCommon = await getTranslations("Common");
  const tTags = await getTranslations("Tags");
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const location = await prisma.location.findUnique({
    where: { slug: paramSlug },
    include: {
      submitter: { select: { fullName: true } },
      photos: {
        where: { status: "APPROVED" },
        orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
        include: { uploader: { select: { fullName: true } } },
      },
      statusUpdates: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { fullName: true } } },
        take: 30,
      },
      ratings: { select: { stars: true } },
      locationFilters: { include: { filter: { select: { slug: true, category: true } } } },
    },
  });

  const isAdmin = session?.user?.role === "ADMIN";

  if (!location || (!isAdmin && (location.status !== "PUBLISHED" || location.hidden))) {
    return notFound();
  }

  const fm = new Map<string, boolean>();
  for (const lf of location.locationFilters) {
    if (lf.boolValue) fm.set(lf.filter.slug, true);
  }
  const isSecret = fm.get("isSecret") ?? false;
  const styleTags = location.locationFilters
    .filter((lf) => lf.filter.category === "STYLE" && lf.boolValue)
    .map((lf) => lf.filter.slug);

  const unlock = userId
    ? await prisma.secretUnlock.findUnique({
        where: { userId_locationId: { userId, locationId: location.id } },
      })
    : null;
  const isUnlocked = !isSecret || isAdmin || !!unlock;

  const ratingAvg =
    location.ratings.length === 0
      ? null
      : location.ratings.reduce((a, b) => a + b.stars, 0) /
        location.ratings.length;

  const inspirationPhotos = location.photos.filter(
    (p) => p.kind === "INSPIRATION",
  );
  const technicalPhotos = location.photos.filter((p) => p.kind === "TECHNICAL");
  const hero = inspirationPhotos[0] ?? technicalPhotos[0] ?? null;

  const myHelpfulIds = userId
    ? new Set(
        (
          await prisma.helpful.findMany({
            where: {
              userId,
              photoId: { in: location.photos.map((p) => p.id) },
            },
            select: { photoId: true },
          })
        ).map((h) => h.photoId),
      )
    : new Set<string>();

  const myRating = userId
    ? await prisma.rating.findUnique({
        where: {
          userId_locationId: { userId, locationId: location.id },
        },
      })
    : null;

  const myFavorite = userId
    ? await prisma.favorite.findUnique({
        where: {
          userId_locationId: { userId, locationId: location.id },
        },
        select: { id: true },
      })
    : null;
  const favoriteCount = await prisma.favorite.count({
    where: { locationId: location.id },
  });

  const myPendingPhotoCount = userId
    ? await prisma.photo.count({
        where: {
          locationId: location.id,
          uploaderId: userId,
          status: "PENDING",
        },
      })
    : 0;

  const reviews = await prisma.rating.findMany({
    where: {
      locationId: location.id,
      OR: [
        { body: { not: null } },
        { title: { not: null } },
      ],
    },
    include: { user: { select: { id: true, fullName: true, image: true } } },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  const canContribute = !!userId && session?.user?.status === "APPROVED";

  const totalHelpful = location.photos.reduce(
    (s, p) => s + p.helpfulCount,
    0,
  );

  return (
    <article>
      <div className="relative h-[40vh] w-full overflow-hidden bg-muted">
        {hero ? (
          <img
            src={imageUrl(hero.cloudinaryPublicId, {
              width: 1600,
              height: 900,
              watermark: hero.kind === "INSPIRATION",
            })}
            alt={location.title}
            className="h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="container absolute inset-x-0 bottom-0 pb-6 text-white">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {isSecret && (
              <Badge className="bg-amber-500 text-white hover:bg-amber-500/90">
                <Sparkles className="me-1 h-3 w-3" /> {t("secretBadge")}
              </Badge>
            )}
            {styleTags.map((tag) => {
              let label = tag;
              try {
                label = tTags(tag as any);
              } catch {}
              return (
                <Badge key={tag} variant="secondary">
                  {label}
                </Badge>
              );
            })}
          </div>
          <h1 className="mt-2 text-4xl font-bold md:text-5xl">
            {location.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
            {ratingAvg != null && (
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {ratingAvg.toFixed(1)} ({location.ratings.length})
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              {fm.get("publicTransport") && (
                <Bus className="h-4 w-4" aria-label={tCard("transport")} />
              )}
              {fm.get("wheelchair") && (
                <Users className="h-4 w-4" aria-label={tCard("accessible")} />
              )}
              {fm.get("restroom") && (
                <ShowerHead
                  className="h-4 w-4"
                  aria-label={tCard("restroom")}
                />
              )}
              {fm.get("drone") && (
                <Navigation className="h-4 w-4" aria-label={tCard("drone")} />
              )}
              {fm.get("paid") && (
                <Coins className="h-4 w-4" aria-label={tCard("paid")} />
              )}
            </span>
            <span className="opacity-80">
              {t("submittedBy", { name: location.submitter.fullName })}
            </span>
          </div>
        </div>
      </div>

      <div className="container grid gap-8 py-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {location.description}
            </p>
          </section>

          <Tabs defaultValue="inspiration">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <TabsList>
                <TabsTrigger value="inspiration">
                  {t("tabInspiration", { count: inspirationPhotos.length })}
                </TabsTrigger>
                <TabsTrigger value="technical">
                  {t("tabTechnical", { count: technicalPhotos.length })}
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                {myPendingPhotoCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {t("pendingPhotoBadge", { count: myPendingPhotoCount })}
                  </span>
                )}
                {canContribute && <AddPhotosDialog slug={location.slug} />}
              </div>
            </div>
            <TabsContent value="inspiration">
              <GalleryGrid
                photos={inspirationPhotos.map((p) => ({
                  id: p.id,
                  url: imageUrl(p.cloudinaryPublicId, {
                    width: 800,
                    height: 800,
                    watermark: true,
                  }),
                  caption: p.caption,
                  uploader: p.uploader.fullName,
                  helpful: p.helpfulCount,
                  myHelpful: myHelpfulIds.has(p.id),
                }))}
                slug={location.slug}
                canHelpful={!!userId}
              />
            </TabsContent>
            <TabsContent value="technical">
              <GalleryGrid
                photos={technicalPhotos.map((p) => ({
                  id: p.id,
                  url: imageUrl(p.cloudinaryPublicId, {
                    width: 800,
                    height: 800,
                  }),
                  caption: p.caption,
                  uploader: p.uploader.fullName,
                  helpful: p.helpfulCount,
                  myHelpful: myHelpfulIds.has(p.id),
                }))}
                slug={location.slug}
                canHelpful={!!userId}
              />
            </TabsContent>
          </Tabs>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t("realtimeUpdates")}</h2>
            </div>
            <StatusUpdates
              slug={location.slug}
              canPost={!!userId && session?.user?.status === "APPROVED"}
              updates={location.statusUpdates.map((u) => ({
                id: u.id,
                body: u.body,
                kind: u.kind,
                verified: u.verified,
                author: u.author.fullName,
                createdAt: u.createdAt.toISOString(),
              }))}
            />
          </section>

          <ReviewsList
            currentUserId={userId}
            reviews={reviews.map((r) => ({
              id: r.id,
              stars: r.stars,
              title: r.title,
              body: r.body,
              author: r.user.fullName,
              authorId: r.user.id,
              createdAt: r.createdAt.toISOString(),
              updatedAt: r.updatedAt.toISOString(),
            }))}
          />
        </div>

        <aside className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border p-4">
            <div className="text-sm text-muted-foreground">
              {favoriteCount} {favoriteCount === 1 ? "favorite" : "favorites"}
            </div>
            <FavoriteButton
              locationId={location.id}
              isFavorite={!!myFavorite}
              count={favoriteCount}
              loggedIn={!!userId}
              variant="pill"
            />
          </div>

          {isSecret && !isUnlocked && (
            <UnlockButton
              slug={location.slug}
              cost={location.unlockCost}
              userPoints={session?.user?.points ?? 0}
              loggedIn={!!userId}
            />
          )}

          <div className="rounded-xl border p-4">
            <h3 className="font-semibold">{t("getThere")}</h3>
            {isUnlocked ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                </p>
                {location.directions && location.directions.trim() && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("directionsHeading")}
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {location.directions}
                    </p>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {tCommon("openIn")}
                  </span>
                  <Button asChild variant="outline" size="icon">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Google Maps"
                    >
                      <svg viewBox="0 0 92.3 132.3" className="h-5 w-5">
                        <path fill="#1a73e8" d="M60.2 2.2C55.8.8 51 0 46.1 0 32 0 19.3 6.4 10.8 16.5l21.8 18.3L60.2 2.2z" />
                        <path fill="#ea4335" d="M10.8 16.5C4.1 24.5 0 34.9 0 46.1c0 8.7 1.7 15.7 4.6 22l28-33.3L10.8 16.5z" />
                        <path fill="#4285f4" d="M46.2 28.5c9.8 0 17.7 7.9 17.7 17.7 0 4.3-1.6 8.3-4.2 11.4 0 0 13.9-16.6 27.5-32.7-5.6-10.8-15.3-19-27-22.7L32.6 34.8c3.3-3.8 8.1-6.3 13.6-6.3" />
                        <path fill="#fbbc04" d="M46.2 63.8c-9.8 0-17.7-7.9-17.7-17.7 0-4.3 1.6-8.3 4.1-11.3l-28 33.3c4.8 10.6 12.8 19.2 21 29.9l34.1-40.5c-3.3 3.9-8.1 6.3-13.5 6.3" />
                        <path fill="#34a853" d="M59.1 109.2c15.4-24.1 33.3-35 33.3-63 0-7.7-1.9-14.9-5.2-21.3L25.6 98c2.6 3.4 5.3 7.3 7.9 11.3 9.4 14.5 6.8 23.1 12.8 23.1s3.4-8.7 12.8-23.2" />
                      </svg>
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="icon">
                    <a
                      href={`https://waze.com/ul?ll=${location.latitude},${location.longitude}&navigate=yes`}
                      target="_blank"
                      rel="noreferrer"
                      title="Waze"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                        <path d="M20.54 6.63c-1.07-4.26-5.06-6.39-8.54-6.6-4.77-.3-9.31 2.51-10.85 7.01-1.16 3.39-.26 6.6.86 8.78-.07 1.67-.71 2.78-1.57 3.74-.43.49-.09 1.26.55 1.25 2.12-.05 4.36-.82 5.87-2.18 1.03.2 2.09.3 3.14.3 5.47 0 10.03-3.57 10.91-8.88.18-1.13.2-2.29-.36-3.42zm-13.04 5.1a1.37 1.37 0 1 1 0-2.74 1.37 1.37 0 0 1 0 2.74zm5 0a1.37 1.37 0 1 1 0-2.74 1.37 1.37 0 0 1 0 2.74z" />
                      </svg>
                    </a>
                  </Button>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                <Lock className="me-1 inline h-3 w-3" />
                {t("unlockToSeeCoords")}
              </p>
            )}
          </div>

          <RatingBlock
            slug={location.slug}
            current={myRating?.stars ?? 0}
            currentTitle={myRating?.title ?? ""}
            currentBody={myRating?.body ?? ""}
            canRate={!!userId && session?.user?.status === "APPROVED"}
          />

          <div className="rounded-xl border p-4 text-sm">
            <h3 className="font-semibold">{t("communityTitle")}</h3>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>{t("totalHelpful", { count: totalHelpful })}</li>
              <li>{t("totalPhotos", { count: location.photos.length })}</li>
              <li>
                {t("approvedAt", {
                  date: formatDate(location.approvedAt ?? location.createdAt),
                })}
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </article>
  );
}
