-- CreateEnum
CREATE TYPE "PhotoStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable Photo
ALTER TABLE "Photo" ADD COLUMN     "status" "PhotoStatus" NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "Photo" ADD COLUMN     "reviewNote" TEXT;

-- CreateIndex
CREATE INDEX "Photo_locationId_status_idx" ON "Photo"("locationId", "status");
CREATE INDEX "Photo_status_idx" ON "Photo"("status");

-- AlterTable Rating
ALTER TABLE "Rating" ADD COLUMN     "title" TEXT;
ALTER TABLE "Rating" ADD COLUMN     "body" TEXT;

-- AlterTable Location
ALTER TABLE "Location" ADD COLUMN     "city" TEXT;
ALTER TABLE "Location" ADD COLUMN     "area" TEXT;
ALTER TABLE "Location" ADD COLUMN     "country" TEXT;

-- CreateIndex
CREATE INDEX "Location_city_idx" ON "Location"("city");
CREATE INDEX "Location_area_idx" ON "Location"("area");
