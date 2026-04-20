import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Bus,
  Coins,
  ExternalLink,
  Lock,
  MapPin,
  ShowerHead,
  Star,
  Users,
  Sparkles,
} from "lucide-react";
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

export const dynamic = "force-dynamic";

export default async function LocationDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const location = await prisma.location.findUnique({
    where: { slug: params.slug },
    include: {
      submitter: { select: { fullName: true } },
      photos: {
        orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
        include: { uploader: { select: { fullName: true } } },
      },
      statusUpdates: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { fullName: true } } },
        take: 30,
      },
      ratings: { select: { stars: true } },
    },
  });

  if (!location || location.status !== "PUBLISHED") {
    return notFound();
  }

  const isAdmin = session?.user?.role === "ADMIN";
  const unlock = userId
    ? await prisma.secretUnlock.findUnique({
        where: { userId_locationId: { userId, locationId: location.id } },
      })
    : null;
  const isUnlocked = !location.isSecret || isAdmin || !!unlock;

  const ratingAvg =
    location.ratings.length === 0
      ? null
      : location.ratings.reduce((a, b) => a + b.stars, 0) /
        location.ratings.length;

  const inspirationPhotos = location.photos.filter((p) => p.kind === "INSPIRATION");
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
            {location.isSecret && (
              <Badge className="bg-amber-500 text-white hover:bg-amber-500/90">
                <Sparkles className="mr-1 h-3 w-3" /> Secret
              </Badge>
            )}
            {location.styleTags.map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
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
              {location.publicTransport && (
                <Bus className="h-4 w-4" aria-label="Transport" />
              )}
              {location.wheelchair && (
                <Users className="h-4 w-4" aria-label="Accessible" />
              )}
              {location.restroom && (
                <ShowerHead className="h-4 w-4" aria-label="Restroom" />
              )}
              {location.paid && (
                <Coins className="h-4 w-4" aria-label="Paid" />
              )}
            </span>
            <span className="opacity-80">
              Submitted by {location.submitter.fullName}
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
            <TabsList>
              <TabsTrigger value="inspiration">
                Inspiration ({inspirationPhotos.length})
              </TabsTrigger>
              <TabsTrigger value="technical">
                Technical ({technicalPhotos.length})
              </TabsTrigger>
            </TabsList>
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
              <h2 className="text-xl font-semibold">Real-time updates</h2>
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
        </div>

        <aside className="space-y-4">
          {location.isSecret && !isUnlocked && (
            <UnlockButton
              slug={location.slug}
              cost={location.unlockCost}
              userPoints={session?.user?.points ?? 0}
              loggedIn={!!userId}
            />
          )}

          <div className="rounded-xl border p-4">
            <h3 className="font-semibold">Get there</h3>
            {isUnlocked ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                </p>
                <Button asChild className="mt-3 w-full" variant="outline">
                  <Link
                    href={`https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`}
                    target="_blank"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Open in Google Maps
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </Link>
                </Button>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                <Lock className="mr-1 inline h-3 w-3" />
                Unlock with points to see exact coordinates.
              </p>
            )}
          </div>

          <RatingBlock
            slug={location.slug}
            current={myRating?.stars ?? 0}
            canRate={!!userId && session?.user?.status === "APPROVED"}
          />

          <div className="rounded-xl border p-4 text-sm">
            <h3 className="font-semibold">Community</h3>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>{totalHelpful} helpful votes total</li>
              <li>{location.photos.length} photos</li>
              <li>Approved {formatDate(location.approvedAt ?? location.createdAt)}</li>
            </ul>
          </div>
        </aside>
      </div>
    </article>
  );
}
