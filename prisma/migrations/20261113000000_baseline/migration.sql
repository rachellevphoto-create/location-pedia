-- Baseline: the full schema in one migration, so `prisma migrate deploy`
-- can build a new, empty database (e.g. Neon). It replaces migrations 0-6,
-- which could not: the first one was empty and the tables had been created
-- outside migrations.
--
-- Generated with:
--   prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
-- plus the filter definitions and the PostGIS spatial index at the end.

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'BANNED');

-- CreateEnum
CREATE TYPE "LocationStatus" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "PhotoKind" AS ENUM ('INSPIRATION', 'TECHNICAL');

-- CreateEnum
CREATE TYPE "PhotoStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "UpdateKind" AS ENUM ('BLOOM', 'CONSTRUCTION', 'ACCESS', 'WEATHER', 'EVENT', 'OTHER');

-- CreateEnum
CREATE TYPE "PointsReason" AS ENUM ('SUBMIT_LOCATION', 'ADD_PHOTO', 'STATUS_UPDATE', 'HELPFUL_RECEIVED', 'UNLOCK_SECRET', 'ADMIN_ADJUST');

-- CreateEnum
CREATE TYPE "FilterCategory" AS ENUM ('AMENITY', 'PRICE', 'STYLE', 'SPECIAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "teacherOrSchool" TEXT,
    "portfolioUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "image" TEXT,
    "locale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "LocationStatus" NOT NULL DEFAULT 'PENDING',
    "awardedPoints" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "city" TEXT,
    "area" TEXT,
    "country" TEXT,
    "directions" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "unlockCost" INTEGER NOT NULL DEFAULT 100,
    "submitterId" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilterDefinition" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "FilterCategory" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilterDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationFilter" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "filterId" TEXT NOT NULL,
    "boolValue" BOOLEAN NOT NULL DEFAULT true,
    "numValue" INTEGER,
    "strValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationFilter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "kind" "PhotoKind" NOT NULL,
    "status" "PhotoStatus" NOT NULL DEFAULT 'APPROVED',
    "reviewNote" TEXT,
    "cloudinaryPublicId" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "caption" TEXT,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusUpdate" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" "UpdateKind" NOT NULL DEFAULT 'OTHER',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Helpful" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Helpful_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "PointsReason" NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecretUnlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "pointsSpent" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecretUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewFeedback" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "decision" "LocationStatus" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Location_slug_key" ON "Location"("slug");

-- CreateIndex
CREATE INDEX "Location_status_idx" ON "Location"("status");

-- CreateIndex
CREATE INDEX "Location_submitterId_idx" ON "Location"("submitterId");

-- CreateIndex
CREATE INDEX "Location_latitude_longitude_idx" ON "Location"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Location_city_idx" ON "Location"("city");

-- CreateIndex
CREATE INDEX "Location_area_idx" ON "Location"("area");

-- CreateIndex
CREATE INDEX "Location_hidden_idx" ON "Location"("hidden");

-- CreateIndex
CREATE UNIQUE INDEX "FilterDefinition_slug_key" ON "FilterDefinition"("slug");

-- CreateIndex
CREATE INDEX "LocationFilter_filterId_idx" ON "LocationFilter"("filterId");

-- CreateIndex
CREATE INDEX "LocationFilter_locationId_idx" ON "LocationFilter"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationFilter_locationId_filterId_key" ON "LocationFilter"("locationId", "filterId");

-- CreateIndex
CREATE INDEX "Photo_locationId_kind_idx" ON "Photo"("locationId", "kind");

-- CreateIndex
CREATE INDEX "Photo_locationId_status_idx" ON "Photo"("locationId", "status");

-- CreateIndex
CREATE INDEX "Photo_status_idx" ON "Photo"("status");

-- CreateIndex
CREATE INDEX "StatusUpdate_locationId_createdAt_idx" ON "StatusUpdate"("locationId", "createdAt");

-- CreateIndex
CREATE INDEX "Helpful_photoId_idx" ON "Helpful"("photoId");

-- CreateIndex
CREATE UNIQUE INDEX "Helpful_userId_photoId_key" ON "Helpful"("userId", "photoId");

-- CreateIndex
CREATE INDEX "Rating_locationId_idx" ON "Rating"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_userId_locationId_key" ON "Rating"("userId", "locationId");

-- CreateIndex
CREATE INDEX "PointsLedger_userId_idx" ON "PointsLedger"("userId");

-- CreateIndex
CREATE INDEX "PointsLedger_reason_idx" ON "PointsLedger"("reason");

-- CreateIndex
CREATE UNIQUE INDEX "SecretUnlock_userId_locationId_key" ON "SecretUnlock"("userId", "locationId");

-- CreateIndex
CREATE INDEX "Favorite_userId_idx" ON "Favorite"("userId");

-- CreateIndex
CREATE INDEX "Favorite_locationId_idx" ON "Favorite"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_locationId_key" ON "Favorite"("userId", "locationId");

-- CreateIndex
CREATE INDEX "ReviewFeedback_locationId_createdAt_idx" ON "ReviewFeedback"("locationId", "createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationFilter" ADD CONSTRAINT "LocationFilter_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationFilter" ADD CONSTRAINT "LocationFilter_filterId_fkey" FOREIGN KEY ("filterId") REFERENCES "FilterDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusUpdate" ADD CONSTRAINT "StatusUpdate_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusUpdate" ADD CONSTRAINT "StatusUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Helpful" ADD CONSTRAINT "Helpful_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Helpful" ADD CONSTRAINT "Helpful_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsLedger" ADD CONSTRAINT "PointsLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretUnlock" ADD CONSTRAINT "SecretUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretUnlock" ADD CONSTRAINT "SecretUnlock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewFeedback" ADD CONSTRAINT "ReviewFeedback_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewFeedback" ADD CONSTRAINT "ReviewFeedback_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Filter definitions the app expects (amenities, price, premium, styles).
INSERT INTO "FilterDefinition" ("id", "slug", "category", "sortOrder") VALUES
    ('fd_wheelchair',       'wheelchair',       'AMENITY',  0),
    ('fd_publicTransport',  'publicTransport',  'AMENITY',  1),
    ('fd_restroom',         'restroom',         'AMENITY',  2),
    ('fd_changingRoom',     'changingRoom',     'AMENITY',  3),
    ('fd_drone',            'drone',            'AMENITY',  4),
    ('fd_paid',             'paid',             'PRICE',    0),
    ('fd_priceMin',         'priceMin',         'PRICE',    1),
    ('fd_priceMax',         'priceMax',         'PRICE',    2),
    ('fd_isSecret',         'isSecret',         'SPECIAL',  0),
    ('fd_urban',            'urban',            'STYLE',    0),
    ('fd_rustic',           'rustic',           'STYLE',    1),
    ('fd_nature',           'nature',           'STYLE',    2),
    ('fd_water',            'water',            'STYLE',    3),
    ('fd_graffiti',         'graffiti',         'STYLE',    4),
    ('fd_industrial',       'industrial',       'STYLE',    5),
    ('fd_interior',         'interior',         'STYLE',    6),
    ('fd_fashion',          'fashion',          'STYLE',    7),
    ('fd_moody',            'moody',            'STYLE',    8),
    ('fd_golden-hour',      'golden-hour',      'STYLE',    9),
    ('fd_minimalist',       'minimalist',       'STYLE',   10),
    ('fd_wedding',          'wedding',          'STYLE',   11);

-- Spatial index for distance queries (was prisma/postgis-index.sql).
CREATE INDEX IF NOT EXISTS "Location_coords_gix"
  ON "Location"
  USING GIST (
    (ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography)
  );
