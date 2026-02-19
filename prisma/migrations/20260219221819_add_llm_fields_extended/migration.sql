-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "llmBackgroundQuality" TEXT,
ADD COLUMN     "llmBestInGroup" BOOLEAN,
ADD COLUMN     "llmComposition" TEXT,
ADD COLUMN     "llmHighlights" TEXT[],
ADD COLUMN     "llmIssues" TEXT[],
ADD COLUMN     "llmPoseQuality" TEXT,
ADD COLUMN     "llmTokensUsed" INTEGER;
