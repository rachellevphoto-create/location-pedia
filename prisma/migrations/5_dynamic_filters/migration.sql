-- CreateEnum
CREATE TYPE "FilterCategory" AS ENUM ('AMENITY', 'PRICE', 'STYLE', 'SPECIAL');

-- CreateTable
CREATE TABLE "FilterDefinition" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "FilterCategory" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FilterDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FilterDefinition_slug_key" ON "FilterDefinition"("slug");

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

CREATE UNIQUE INDEX "LocationFilter_locationId_filterId_key" ON "LocationFilter"("locationId", "filterId");
CREATE INDEX "LocationFilter_filterId_idx" ON "LocationFilter"("filterId");
CREATE INDEX "LocationFilter_locationId_idx" ON "LocationFilter"("locationId");

ALTER TABLE "LocationFilter"
    ADD CONSTRAINT "LocationFilter_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LocationFilter"
    ADD CONSTRAINT "LocationFilter_filterId_fkey"
    FOREIGN KEY ("filterId") REFERENCES "FilterDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed filter definitions
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

-- Migrate existing data: boolean amenity filters
INSERT INTO "LocationFilter" ("id", "locationId", "filterId", "boolValue")
SELECT gen_random_uuid()::text, id, 'fd_wheelchair', true
FROM "Location" WHERE "wheelchair" = true;

INSERT INTO "LocationFilter" ("id", "locationId", "filterId", "boolValue")
SELECT gen_random_uuid()::text, id, 'fd_publicTransport', true
FROM "Location" WHERE "publicTransport" = true;

INSERT INTO "LocationFilter" ("id", "locationId", "filterId", "boolValue")
SELECT gen_random_uuid()::text, id, 'fd_restroom', true
FROM "Location" WHERE "restroom" = true;

INSERT INTO "LocationFilter" ("id", "locationId", "filterId", "boolValue")
SELECT gen_random_uuid()::text, id, 'fd_changingRoom', true
FROM "Location" WHERE "changingRoom" = true;

INSERT INTO "LocationFilter" ("id", "locationId", "filterId", "boolValue")
SELECT gen_random_uuid()::text, id, 'fd_paid', true
FROM "Location" WHERE "paid" = true;

INSERT INTO "LocationFilter" ("id", "locationId", "filterId", "boolValue", "numValue")
SELECT gen_random_uuid()::text, id, 'fd_priceMin', true, "priceMin"
FROM "Location" WHERE "priceMin" IS NOT NULL;

INSERT INTO "LocationFilter" ("id", "locationId", "filterId", "boolValue", "numValue")
SELECT gen_random_uuid()::text, id, 'fd_priceMax', true, "priceMax"
FROM "Location" WHERE "priceMax" IS NOT NULL;

INSERT INTO "LocationFilter" ("id", "locationId", "filterId", "boolValue")
SELECT gen_random_uuid()::text, id, 'fd_isSecret', true
FROM "Location" WHERE "isSecret" = true;

-- Migrate styleTags array into individual rows
INSERT INTO "LocationFilter" ("id", "locationId", "filterId", "boolValue")
SELECT gen_random_uuid()::text, l.id, fd.id, true
FROM "Location" l, unnest(l."styleTags") AS tag
JOIN "FilterDefinition" fd ON fd."slug" = tag;

-- Drop old columns
ALTER TABLE "Location" DROP COLUMN "wheelchair";
ALTER TABLE "Location" DROP COLUMN "publicTransport";
ALTER TABLE "Location" DROP COLUMN "restroom";
ALTER TABLE "Location" DROP COLUMN "changingRoom";
ALTER TABLE "Location" DROP COLUMN "paid";
ALTER TABLE "Location" DROP COLUMN "priceMin";
ALTER TABLE "Location" DROP COLUMN "priceMax";
ALTER TABLE "Location" DROP COLUMN "styleTags";
ALTER TABLE "Location" DROP COLUMN "isSecret";
