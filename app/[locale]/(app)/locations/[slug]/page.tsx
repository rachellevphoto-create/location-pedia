import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ArrowLeft,
  Coins,
  Lock,
  Navigation2 as NavigationIcon,
  Star,
  Sparkles,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { getLocationDetail } from "@/lib/data/location-detail";
import { getFilterOptions, SYSTEM_FILTERS } from "@/lib/filters";
import { amenityIcon, filterLabel } from "@/lib/filter-ui";
import { imageUrl } from "@/lib/cloudinary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
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
  const [t, tCard, tCommon, tTags, tAmenity, tUnlock, filterOptions, session] =
    await Promise.all([
      getTranslations("LocationDetail"),
      getTranslations("Card"),
      getTranslations("Common"),
      getTranslations("Tags"),
      getTranslations("Amenities"),
      getTranslations("Unlock"),
      getFilterOptions(),
      auth(),
    ]);
  const userId = session?.user?.id ?? null;

  const detail = await getLocationDetail(paramSlug, session?.user ?? null);
  if (!detail) return notFound();
  const {
    location,
    onSlugs,
    styleTags,
    isSecret,
    locked,
    ratingAvg,
    ratingCount,
    photoCount,
    totalHelpful,
    inspirationPhotos,
    technicalPhotos,
    statusUpdates,
    reviews,
    myHelpfulIds,
    myRating,
    isFavorite,
    favoriteCount,
    myPendingPhotoCount,
  } = detail;
  const isUnlocked = !locked;
  // A locked premium spot shows only a teaser: no title, text, photos,
  // updates or reviews (the loader does not even fetch them).
  const displayTitle = locked ? tUnlock("secretTitle") : location.title;

  const canContribute =
    !!userId && session?.user?.status === "APPROVED" && !locked;

  const galleryPhotos = [...inspirationPhotos, ...technicalPhotos];
  const mosaic = galleryPhotos.slice(0, 5);
  const morePhotos = Math.max(0, galleryPhotos.length - mosaic.length);
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
  const wazeUrl = `https://waze.com/ul?ll=${location.latitude},${location.longitude}&navigate=yes`;
  // One tile per amenity in the DB (yes/no), plus paid entry.
  const infoTiles = [
    ...filterOptions.amenities.map((slug) => ({
      key: slug,
      label: filterLabel(tAmenity, slug),
      Icon: amenityIcon(slug),
    })),
    { key: SYSTEM_FILTERS.paid, label: tCard("paid"), Icon: Coins },
  ];

  return (
    <article className="container max-w-6xl space-y-6 py-6">
      <Link
        href="/discover"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t("backToDiscover")}
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {isSecret && (
              <Badge className="bg-foreground text-lime hover:bg-foreground/90">
                <Sparkles className="me-1 h-3 w-3" /> {t("secretBadge")}
              </Badge>
            )}
            {styleTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="font-normal">
                {filterLabel(tTags, tag)}
              </Badge>
            ))}
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
            {displayTitle}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-muted-foreground">
            {ratingAvg != null && (
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <strong className="text-foreground">
                  {ratingAvg.toFixed(1)}
                </strong>
                ({ratingCount})
              </span>
            )}
            <span>{t("submittedBy", { name: location.submitter.fullName })}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FavoriteButton
            locationId={location.id}
            isFavorite={isFavorite}
            count={favoriteCount}
            loggedIn={!!userId}
            variant="pill"
            className="h-11 px-4"
          />
          {isUnlocked && (
            <>
              <Button asChild variant="outline" className="h-11 rounded-lg">
                <a href={wazeUrl} target="_blank" rel="noreferrer">
                  {tCommon("openIn")} Waze
                </a>
              </Button>
              <Button asChild className="h-11 rounded-lg px-5">
                <a href={googleUrl} target="_blank" rel="noreferrer">
                  <NavigationIcon className="me-1.5 h-4 w-4" />
                  {t("navigate")}
                </a>
              </Button>
            </>
          )}
        </div>
      </header>

      {locked ? (
        <div className="flex h-[220px] flex-col items-center justify-center gap-2 rounded-2xl bg-muted text-sm text-muted-foreground">
          <Lock className="h-6 w-6" aria-hidden />
          {t("unlockToSeeCoords")}
        </div>
      ) : mosaic.length > 0 ? (
        <section
          aria-label={t("photosLabel")}
          className="grid h-[300px] grid-cols-2 gap-2.5 overflow-hidden rounded-2xl md:h-[450px] md:grid-cols-4 md:grid-rows-2"
        >
          {mosaic.map((p, i) => (
            <div
              key={p.id}
              className={cn(
                "relative overflow-hidden bg-muted",
                mosaicTile(i, mosaic.length),
              )}
            >
              <img
                src={imageUrl(p.cloudinaryPublicId, {
                  width: i === 0 ? 1200 : 600,
                  height: i === 0 ? 900 : 450,
                  watermark: p.kind === "INSPIRATION",
                })}
                alt={p.caption ?? displayTitle}
                className="h-full w-full object-cover"
              />
              {i === mosaic.length - 1 && morePhotos > 0 && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-semibold text-white">
                  {t("morePhotos", { count: morePhotos })}
                </span>
              )}
            </div>
          ))}
        </section>
      ) : (
        <div className="flex h-[220px] items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">
          {tCard("noPhoto")}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-8">
          {!locked && (
          <section className="space-y-2.5">
            <h2 className="text-2xl font-semibold">{t("aboutTitle")}</h2>
            <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/85">
              {location.description}
            </p>
          </section>
          )}

          <section
            aria-label={t("amenitiesLabel")}
            className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2.5"
          >
            {infoTiles.map(({ key, label, Icon }) => {
              const on = onSlugs.has(key);
              return (
                <div
                  key={key}
                  className="flex flex-col gap-1.5 rounded-xl border bg-card p-3.5"
                >
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      on ? "text-foreground" : "text-muted-foreground/60",
                    )}
                    aria-hidden
                  />
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <strong className="text-sm">{on ? t("yes") : t("no")}</strong>
                </div>
              );
            })}
          </section>

          {!locked && (
          <>
          <Tabs defaultValue="inspiration">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
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
            <h2 className="text-2xl font-semibold">{t("realtimeUpdates")}</h2>
            <StatusUpdates
              slug={location.slug}
              canPost={!!userId && session?.user?.status === "APPROVED"}
              updates={statusUpdates.map((u) => ({
                id: u.id,
                body: u.body,
                kind: u.kind,
                verified: u.verified,
                author: u.author.fullName,
                createdAt: u.createdAt.toISOString(),
              }))}
            />
          </section>
          </>
          )}

          {!locked && (
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
          )}
        </div>

        <aside className="space-y-4">
          {isSecret && !isUnlocked && (
            <UnlockButton
              slug={location.slug}
              cost={location.unlockCost}
              userPoints={session?.user?.points ?? 0}
              loggedIn={!!userId}
            />
          )}

          <div className="rounded-2xl border bg-card p-5">
            <h3 className="font-semibold">{t("getThere")}</h3>
            {isUnlocked ? (
              <>
                {location.directions && location.directions.trim() && (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                    {location.directions}
                  </p>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  <span dir="ltr">
                    {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                  </span>
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button asChild variant="outline" className="rounded-lg">
                    <a href={googleUrl} target="_blank" rel="noreferrer">
                      Google Maps
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="rounded-lg">
                    <a href={wazeUrl} target="_blank" rel="noreferrer">
                      Waze
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

          {!locked && (
          <RatingBlock
            slug={location.slug}
            current={myRating?.stars ?? 0}
            currentTitle={myRating?.title ?? ""}
            currentBody={myRating?.body ?? ""}
            canRate={!!userId && session?.user?.status === "APPROVED"}
          />
          )}

          <div className="rounded-2xl border bg-card p-5 text-sm">
            <h3 className="font-semibold">{t("communityTitle")}</h3>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>{t("totalHelpful", { count: totalHelpful })}</li>
              <li>{t("totalPhotos", { count: photoCount })}</li>
              <li>
                {t("approvedAt", {
                  date: formatDate(location.approvedAt ?? location.createdAt, locale),
                })}
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </article>
  );
}

// Grid spans for the photo mosaic (4 columns x 2 rows on desktop), so any
// count from 1 to 5 fills the box with no empty cells.
function mosaicTile(i: number, n: number) {
  if (i === 0) {
    return n === 1 ? "col-span-2 row-span-2 md:col-span-4" : "col-span-2 row-span-2";
  }
  const base = "hidden md:block";
  if (n === 2) return `${base} md:col-span-2 md:row-span-2`;
  if (n === 3) return `${base} md:col-span-2`;
  if (n === 4 && i === 3) return `${base} md:col-span-2`;
  return base;
}
