-- AlterTable
ALTER TABLE "Location" ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Location_hidden_idx" ON "Location"("hidden");
