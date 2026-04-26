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
CREATE INDEX "ReviewFeedback_locationId_createdAt_idx" ON "ReviewFeedback"("locationId", "createdAt");

-- AddForeignKey
ALTER TABLE "ReviewFeedback" ADD CONSTRAINT "ReviewFeedback_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewFeedback" ADD CONSTRAINT "ReviewFeedback_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- MigrateData: copy existing reviewFeedback values into the new table.
-- Uses the location's submitterId as authorId since we don't know which admin wrote it.
-- Uses the location's current status as the decision.
INSERT INTO "ReviewFeedback" ("id", "locationId", "authorId", "decision", "body", "createdAt")
SELECT
    gen_random_uuid(),
    l."id",
    l."submitterId",
    l."status",
    l."reviewFeedback",
    l."updatedAt"
FROM "Location" l
WHERE l."reviewFeedback" IS NOT NULL;

-- DropColumn
ALTER TABLE "Location" DROP COLUMN "reviewFeedback";
