-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "compositeScore" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Photo_projectId_compositeScore_idx" ON "Photo"("projectId", "compositeScore");
