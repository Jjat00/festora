-- CreateEnum
CREATE TYPE "AiStatus" AS ENUM ('PENDING', 'QUEUED', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "aiProcessedAt" TIMESTAMP(3),
ADD COLUMN     "aiStatus" "AiStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "blurScore" DOUBLE PRECISION,
ADD COLUMN     "brisqueScore" DOUBLE PRECISION,
ADD COLUMN     "nimaScore" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Photo_projectId_aiStatus_idx" ON "Photo"("projectId", "aiStatus");
